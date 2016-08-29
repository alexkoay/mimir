import json
import asyncio
import logging
import traceback
import psycopg2 as pg
import websockets as ws
import concurrent.futures as futures

from . import auth
from .data import enc, dec


class Error(Exception):
    pass


class Session:
    count = 0
    log = logging.getLogger('mimir.session')
    auth = None

    @classmethod
    async def connect(cls, opts=None, conn_opts=None):
        if 'application_name' not in opts:
            opts['application_name'] = 'mimir Authenticator'
        if 'application_name' not in conn_opts:
            conn_opts['application_name'] = 'mimir Query Connection'

        cls.auth = await auth.Authenticator.create(opts, conn_opts)

    ## instance ##############################################################

    def __init__(self, socket):
        Session.count += 1
        self._id = Session.count

        self._socket = socket
        self._key = None
        self._types = { }
        self._query = { }

    async def __aenter__(self): return self
    async def __aexit__(self, exc_type, exc_val, traceback):
        await self.cleanup(exc_type, exc_val, traceback)

    ## methods ###############################################################

    async def ping(self, data=None):
        await self._socket.ping(data)

    async def send(self, data):
        return await self._socket.send(data)

    async def recv(self):
        data = await self._socket.recv()
        return data

    async def acquire(self):
        conn = await self._context.acquire()
        cur = await conn.cursor()
        return conn, cur

    async def release(self, conn, cur):
        cur.close()
        await self._context.release(conn)

    ## loop ##################################################################

    async def run(self):
        self.log.info('(%s) Connected to %s', self._id, self._socket.request_headers.get('X-Real-IP', self._socket.remote_address[0]), '({})'.format(self._socket.request_headers.get('User-Agent', 'unknown')))
        error = False
        done, self._pending = set(), set([self.login()])
        while not error and self._pending:
            (done, self._pending) = await asyncio.wait(self._pending, return_when=futures.FIRST_COMPLETED, timeout=60)

            if not done:
                self._pending.add(self.ping())

            for task in done:
                try:
                    out = task.result()
                    if out: self._pending.update(out)
                except ws.ConnectionClosed:
                    error = True
                except Exception as e:
                    error = True
                    self.log.error('(%s) Encountered critical error: %s', self._id, e)
                    self.log.debug('(%s) Traceback\n%s', self._id, traceback.format_exc())
        self._socket.close()


    async def cleanup(self, exc_type, exc_val, traceback):
        self.log.info('(%s) Cleaning up', self._id)

        # cancel outstanding queries
        if self._query:
            self._pending.update([self.cancel(token) for token in self._query])

        while self._pending:
            # ensure the tasks will complete in a short time
            self._pending = { asyncio.wait_for(task, 10) if not isinstance(task, asyncio.Future) else task for task in self._pending }

            # run the logic
            done, self._pending = await asyncio.wait(self._pending)
            for task in done:
                try:
                    out = task.result()
                    if isinstance(out, list): self._pending.update(out)
                except ws.ConnectionClosed: pass
                except futures.TimeoutError:
                    self.log.debug('(%s) Task took too long to clean up: %s', self._id, task)
                except Exception as e:
                    self.log.error('(%s) Encountered cleanup error: %s', self._id, e)
                    self.log.error('(%s) Traceback\n%s', self._id, traceback.format_exc())

        if self._key is not None:
            Session.auth.logout(self._key)


    ## stages ################################################################

    async def login(self):
        # get login
        await self.send('@:?username')
        user = await self.recv()
        await self.send('@:?password')
        password = await self.recv()

        # validate credentials
        key = await Session.auth.login(user, password)
        if not key:
            return [self.send('@:!Invalid credentials'), self.login()]

        # tag session key
        self._key = key
        self._context = await Session.auth.context(key)

        # get type mapping
        async with self._context as conn:
            async with conn.cursor() as cur:
                await cur.execute('SELECT oid, typname FROM pg_type')
                self._types = {oid: name for oid, name in (await cur.fetchall())}

        # continue to main loop
        return [self.send('@:Successfully logged in'), self.main()]


    async def main(self):
        # receive
        data = await self.recv()

        # parse
        try: cmd, args = data.split(':', 1)
        except ValueError: cmd, args = data, ''
        cmd, token = cmd[0], cmd[1:]

        # route
        return [self.route(cmd, token, args), self.main()]

    ## interface #############################################################

    async def route(self, cmd, token, args):
        output = None
        try:
            if cmd == '=':                                              # status
                output = await self.status([token] if token else None)
            elif cmd == '-':                                            # cancel
                output = await self.cancel(token)
            elif not token:                                             # require token after this
                raise Error('Invalid token')
            elif cmd == '*':                                            # queries
                output = await self.queries(token, args)
            elif cmd == '#':                                            # list
                output = await self.list(token)
            elif cmd == '$':                                            # schema
                output = await self.schema(token, args)
            elif cmd == '?':                                            # query
                try: args = dec.decode(args)
                except json.JSONDecodeError: pass
                if not isinstance(args, list): args = [args]
                output = await self.query(token, *args)
            elif cmd == '+':                                            # data
                try: num = int(args)
                except ValueError: num = 0
                output = await self.data(token, num if num > 0 else 50)
            elif cmd == '!':                                            # admin
                output = await self.admin(token, args)
            else:
                raise Error('Invalid request')

            if output is not None:
                await self.send('{}{}:{}'.format(cmd, token, output if isinstance(output, str) else enc.encode(output)))

        except Error as e:
            self.log.info('(%s:%s) Error: %s', self._id, token, e)
            await self.send('{}{}:!{}'.format(cmd, token, e))
        except Exception as e:
            await self.send('{}{}:!Unknown error occured'.format(cmd, token, e))
            raise


    async def queries(self, token, args):
        token = token.lower()
        if token.startswith('save'):
            return (await Session.auth.save(self._key, *dec.decode(args)))
        elif token.startswith('report'):
            return (await Session.auth.reports(self._key))
        elif token.startswith('query'):
            return (await Session.auth.queries(self._key))


    async def list(self, token):
        # query = '''SELECT table_schema || '.' || table_name AS table_name
        #    FROM information_schema.tables
        #    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        #        AND has_table_privilege(table_schema || '.' || table_name, 'select')
        #    ORDER BY table_schema, table_name'''
        query = '''SELECT ns.nspname || '.' || cls.relname, dc.description
            FROM pg_class cls
                JOIN pg_namespace ns ON cls.relnamespace = ns.oid
                LEFT JOIN pg_description dc ON dc.objoid = cls.oid
            WHERE ns.nspname NOT IN ('information_schema', 'pg_catalog')
                AND relkind IN ('r', 'v', 'm')
            ORDER BY ns.nspname, cls.relname'''

        meta = await self.query(token, query)
        return (await self.data(token, meta[0]))


    async def schema(self, token, name):
        if '.' not in name:
            name = '{}.{}'.format('public', name)
        schema, table = name.split('.', 1)

        query = '''SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = %s AND table_name = %s ORDER BY ordinal_position'''
        meta = await self.query(token, query, [schema, table])

        if meta[0] == 0:
            await self.cancel(token)
            raise Error('Could not find table: {}'.format(name))

        return (await self.data(token, meta[0]))


    async def query(self, token, query, params=None):
        # check for unique token
        if token in self._query:
            raise Error('Token is used for another outstanding query')

        self.log.info('(%s:%s) Query: %s', self._id, token, query)
        if params: self.log.info('(%s:%s) Params: %s', self._id, token, params)

        try:
            self._query[token] = { }

            # acquire connection
            self._query[token]['status'] = 1
            conn, cur = await self.acquire()

            try:
                self._query[token]['conn'] = conn
                self._query[token]['cur'] = cur
            except KeyError:
                self.release(conn, cur)
                raise

            # execute query
            self._query[token]['status'] = 2
            await cur.execute(query, params)

            # announce completion
            self.log.info('(%s:%s) Retrieved %s rows', self._id, token, cur.rowcount)
            self._query[token]['total'] = cur.rowcount
            self._query[token]['fetch'] = 0
            self._query[token]['status'] = 3
            return [cur.rowcount, [(col[0], self._types.get(col[1], 'text')) for col in cur.description]]

        except Exception as e:
            if token in self._query:
                del self._query[token]
            await self.release(conn, cur)

            if isinstance(e, pg.Error):
                raise Error('SQL error: {}'.format(e))
            elif isinstance(e, futures.TimeoutError):
                raise Error('Query took too long to execute')
            elif isinstance(e, KeyError):
                raise Error('Query token removed')
            elif isinstance(e, futures.CancelledError):
                raise Error('Query task cancelled')
            else:
                self.log.error('(%s:%s) Unknown query error of type %s: %s', self._id, token, type(e), e)


    async def status(self, tokens=None):
        # check if any tokens are specified, provide status for all otherwise
        if not tokens:
            tokens = self._query.keys()

        # get status
        data = { }
        for tok in tokens:
            meta, part = self._query.get(tok, { }), { }
            for key in ['status', 'total', 'fetch']:
                if key in meta: part[key] = meta[key]
            data[tok] = part if part else None
        return data


    async def data(self, token, num):
        # check for unique token
        if token not in self._query:
            raise Error('Token does not exist')

        # remove token from set
        meta = self._query[token]
        if meta['status'] != 3:
            raise Error('Query not ready')
        del self._query[token]

        # retrieve data
        cur = meta['cur']
        data = await cur.fetchmany(num)
        meta['fetch'] += len(data)

        # put token back into set if still incomplete
        if meta['fetch'] < meta['total']:
            self._query[token] = meta
        else:
            await self.release(meta['conn'], meta['cur'])

        self.log.info('(%s:%s) Delivered %s rows', self._id, token, meta['fetch'])
        return data


    async def cancel(self, token, timeout=None):
        # check for unique token
        if token not in self._query:
            # raise Error('Token does not exist')
            return None

        # remove token from set
        meta = self._query[token]
        del self._query[token]

        # check status
        if meta['status'] == 3:
            await self.release(meta['conn'], meta['cur'])
        elif meta['status'] == 2:
            # psycopg2's cancel implementation raises the exception at the query method
            # aiopg implements cancel by an exception which doesn't always raise
            try:
                if meta['conn']._waiter is not None:
                    meta['conn']._waiter.cancel()
                if meta['conn']._isexecuting():
                    meta['conn']._conn.cancel()
            except pg.extensions.QueryCanceledError:
                pass

        # return 'Token cancelled'
        return None


    async def admin(self, token, args):
        try:
            if token.startswith('password'):
                if await Session.auth.password(self._key, *dec.decode(args)):
                    return 'Successfully changed password'
                raise Error('Unknown error occured')
            elif token == 'disconnect':
                self._socket.close()
            elif self.auth.superuser(self._key):
                if token == '*shutdown':
                    asyncio.get_event_loop().stop()
                elif token.startswith('*register'):
                    id = await Session.auth.register(self._key, *dec.decode(args))
                    if id:
                        return 'Sucessfully registered user {}'.format(id)
                    else:
                        raise Error('Unknown error occured')
                elif token.startswith('*profile'):
                    id = await Session.auth.profile(self._key, *dec.decode(args))
                    if id:
                        return 'Sucessfully registered profile {}'.format(id)
                    else:
                        raise Error('Unknown error occured')
                else:
                    raise Error('Unknown function requested')
            else:
                raise Error('Unknown function requested')
        except json.JSONDecodeError:
            raise Error('Error parsing arguments')
