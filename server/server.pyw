#!/usr/bin/env python

import sys
import json
import yaml
import hashlib
import decimal
import time, datetime
import traceback

import aiopg, psycopg2 as pg
import asyncio, websockets as ws

## encoder ###################################################################

class Encoder(json.JSONEncoder):
    def __init__(self, **kwargs):
        self.args = dict(kwargs)
        if 'indent' in self.args:
            del self.args['indent']
        super(Encoder, self).__init__(**kwargs)

    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        elif isinstance(obj, datetime.date):
            return obj.isoformat()
        elif isinstance(obj, datetime.time):
            return obj.isoformat()
        elif isinstance(obj, datetime.timedelta):
            return obj.total_seconds()
        elif isinstance(obj, decimal.Decimal):
            return str(obj)
        else:
            try:
                return json.JSONEncoder.default(self, obj)
            except:
                return repr(obj)
enc = Encoder(indent=None, sort_keys=True)

## session ###################################################################

class Session:
    def __init__(self, socket):
        self.socket = socket
        self._user = None
        self._db, self._cur = None, None

    ## socket ################################################################

    @asyncio.coroutine
    def send(self, data): return (yield from self.socket.send(data))

    @asyncio.coroutine
    def recv(self): return (yield from self.socket.recv())

    ## loop ##################################################################

    @asyncio.coroutine
    def run(self):
        if not (yield from self.login()): return

        ready = True
        while True:
            if ready: yield from self.send('>')
            req = yield from self.recv()
            if req is None: break

            ready = True
            try:
                cmd = req.strip()
                if cmd == '~':              # ping
                    ready = False
                elif cmd.startswith('#'):   # list
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
                    if self._cur is not None:
                        self._cur.close()
                        self._cur = None
                elif self._user in ['alexkoay', 'root'] and cmd == 'reload':
                    yield from self.send('!Terminating...')
                    loop.stop()
                else:
                    yield from self.send('!Invalid request')
            except Exception as e:
                print(traceback.format_exc())
                yield from self.send('!Unknown error')

    ## methods ###############################################################

    @asyncio.coroutine
    def login(self):
        db = yield from aiopg.connect(sys.argv[1])
        cur = yield from db.cursor()

        while True:
            try:
                yield from self.send('@')
                user = yield from self.recv()
                yield from self.send('*')
                password = yield from self.recv()
            except ws.InvalidState as e:
                return False

            yield from cur.execute('select hash from mimir.users where uid = %s', [user])
            data = yield from cur.fetchone()
            if data and hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), b'salt', 200000) != data[0].tobytes():
            # if not data or hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), b'salt', 100000) != data[0].tobytes():
                yield from self.send('!Could not authenticate')
                continue

            try:
                self._db = yield from aiopg.connect(database=sys.argv[2], user=user)
            except pg.Error as e:
                yield from self.send('!Error connecting to database')
                continue

            self._user = user
            if not data: yield from cur.execute('insert into mimir.users values (%s, %s)', [user, hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), b'salt', 200000)])

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
            else: schema, table = name, 'public'

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

## main loop #################################################################

@asyncio.coroutine
def handler(socket, path):
    try: yield from Session(socket).run()
    except ws.InvalidState: pass

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: {} <auth connect string> <querydb>'.format(sys.argv[0]))
    else:
        loop = asyncio.get_event_loop()
        server = ws.serve(handler, 'localhost', 8765)
        try:
            asyncio.async(server)
            loop.run_forever()
        finally:
            loop.close()
