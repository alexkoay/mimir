#!/usr/bin/env python

import json
import click
import hashlib
import decimal
import time, datetime
import traceback

import aiopg, psycopg2 as pg
import asyncio, websockets as ws

## encoder #####################################################################

class Encoder(json.JSONEncoder):
    def __init__(self, **kwargs):
        super(Encoder, self).__init__(**kwargs)

    def default(self, obj):
        if isinstance(obj, datetime.datetime): return obj.isoformat()
        elif isinstance(obj, datetime.date): return obj.isoformat()
        elif isinstance(obj, datetime.time): return obj.isoformat()
        elif isinstance(obj, datetime.timedelta): return obj.total_seconds()
        elif isinstance(obj, decimal.Decimal): return str(obj)
        else:
            try: return json.JSONEncoder.default(self, obj)
            except: return repr(obj)
enc = Encoder(sort_keys=True)

## session #####################################################################

class Session:
    dsn = None

    def __init__(self, socket):
        self.socket = socket
        self._user = None
        self._db, self._cur = None, None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        yield from self.done()

    ## socket ##################################################################

    @asyncio.coroutine
    def ping(self, data=None): return (yield from self.socket.ping(data))

    @asyncio.coroutine
    def send(self, data): return (yield from self.socket.send(data))

    @asyncio.coroutine
    def recv(self):
        count = 0
        while True:
            try: return (yield from asyncio.wait_for(self.socket.recv(), timeout=5))
            except asyncio.TimeoutError:
                count += 1
                if count % 6 == 0: yield from asyncio.wait([self.done(), self.ping()])

    ## loop ####################################################################

    @asyncio.coroutine
    def run(self):
        while not (yield from self.login()): pass

        while True:
            yield from self.send('>')

            req = yield from self.recv()
            if req is None: break
            try:
                cmd = req.strip()
                if cmd.startswith('#'):     # list
                    yield from self.list()
                elif cmd.startswith('$'):   # schema
                    yield from self.schema(cmd[1:].strip())
                elif cmd.startswith('?'):   # query
                    yield from self.query(cmd[1:].strip())
                elif cmd.startswith('+'):   # data
                    try: num = int(cmd[1:])
                    except ValueError: num = 0
                    yield from self.data(num if num > 0 else 50)
                elif cmd.startswith('*'):   # done
                    yield from self.done()
                else:
                    yield from self.send('!Invalid request')
            except Exception as e:
                print(traceback.format_exc())
                yield from self.send('!Unknown error')

    ## methods #################################################################

    @asyncio.coroutine
    def login(self):
        yield from self.send('@')
        user = yield from self.recv()
        yield from self.send('*')
        password = yield from self.recv()

        with (yield from pool.cursor()) as cur:
            yield from cur.execute('select hash from mimir.users where uid = %s', [user])
            data = yield from cur.fetchone()

        if data and hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), b'salt', 200000) != data[0].tobytes():
            yield from self.send('!Could not authenticate')
            return False

        try:
            self._db = yield from aiopg.connect('{} user={}'.format(Session.dsn, user))
        except pg.Error as e:
            print(e)
            yield from self.send('!Error connecting to database')
            return False

        self._user = user

        cur = yield from self._db.cursor()
        yield from cur.execute('SELECT oid, typname FROM pg_type')
        self._types = {oid: name for oid, name in (yield from cur.fetchall())}
        return True

    @asyncio.coroutine
    def list(self):
        if self._user is None: return
        cur = yield from self._db.cursor()
        try:
            query = 'select table_schema || \'.\' || table_name from information_schema.tables where table_schema not in (%s, %s) and has_table_privilege(table_schema || \'.\' || table_name, %s) order by table_schema, table_name'
            yield from cur.execute(query, ['pg_catalog','information_schema', 'select'])

            data = yield from cur.fetchall()
            yield from self.send('<' + enc.encode([row[0] for row in data]))
        except pg.Error as e:
            yield from self.send('!{}'.format(e))
        finally:
            cur.close()

    @asyncio.coroutine
    def schema(self, name):
        if self._user is None: return
        cur = yield from self._db.cursor()
        try:
            if '.' in name: schema, table = name.split('.', 2)
            else:
                schema, table = 'public', name
                name = '{}.{}'.format(schema, name)

            query = 'select column_name, data_type from information_schema.columns where table_schema = %s and table_name = %s order by ordinal_position'
            yield from cur.execute(query, [schema, table])

            data = yield from cur.fetchall()
            if data: yield from self.send('<' + enc.encode([name, data]))
            else: yield from self.send('!{} does not exist'.format(name))
        finally:
            cur.close()

    @asyncio.coroutine
    def query(self, cmd):
        if self._user is None: return
        cur = yield from self._db.cursor()
        if len(cmd) == 0:
            yield from self.send('!Invalid query')
            return
        param = []
        if cmd[0] in '[':
            data = json.loads(cmd)
            cmd, param = data[:2]

        try:
            yield from cur.execute(cmd, param)
        except (pg.ProgrammingError, pg.DataError) as e:
            cur.close()
            yield from self.send('!SQL {}'.format(e))
        else:
            yield from self.send('<' + enc.encode([cur.rowcount, [(col[0], self._types[col[1]]) for col in cur.description]]))
            if self._cur: self._cur.close()
            self._cur = cur

    @asyncio.coroutine
    def data(self, num):
        if self._cur is None:
            yield from self.send('!No query to retrieve')
        else:
            data = yield from self._cur.fetchmany(num)
            yield from self.send('<' + enc.encode(data))
            if len(data) == 0:
                self._cur.close()
                self._cur = None

    @asyncio.coroutine
    def done(self):
        if self._cur is not None:
            self._cur.close()
            self._cur = None


## main loop ###################################################################

@asyncio.coroutine
def handler(socket, path):
    with Session(socket) as sess:
        try: yield from sess.run()
        except ws.InvalidState: pass

@click.command()
@click.argument('authdb')
@click.argument('querydb')
def main(authdb, querydb):
    loop = asyncio.get_event_loop()

    global pool
    pool = loop.run_until_complete(aiopg.create_pool(authdb))
    Session.dsn = querydb

    server = asyncio.ensure_future(ws.serve(handler, 'localhost', 8765))
    try: loop.run_forever()
    finally: loop.close()

if __name__ == '__main__':
    main()