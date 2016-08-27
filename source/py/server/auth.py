import os
import asyncio
import aiopg, psycopg2 as pg
import hashlib

class Authenticator:
    @classmethod
    async def create(cls, opts, conn_opts=None):
        self = cls()
        await self.initialise(opts, conn_opts)
        return self

    async def initialise(self, opts, conn_opts=None):
        self.auth = Pool(await aiopg.create_pool(None, cursor_factory=pg.extras.DictCursor, **opts))
        self.hash = { }
        self.pool = { }
        self.conn_opts = conn_opts if conn_opts is not None else { }

        # check first-time
        init = False
        async with self.auth as conn, conn.cursor() as cur:
            await cur.execute('''
                CREATE TABLE IF NOT EXISTS profiles
                (   id serial PRIMARY KEY,
                    profile text UNIQUE,
                    opts json
                )''')
            await cur.execute('''
                CREATE TABLE IF NOT EXISTS users
                (   id serial PRIMARY KEY,
                    username text UNIQUE, hash bytea,
                    profile_id integer REFERENCES profiles(id),
                    superuser boolean
                )''')

            await cur.execute('''
                CREATE TABLE IF NOT EXISTS reports
                (   id serial PRIMARY KEY,
                    name text UNIQUE, query text
                )''')

            await cur.execute('''
                CREATE TABLE IF NOT EXISTS profile_reports
                (   profile_id integer REFERENCES profiles(id), report_id integer REFERENCES reports(id),
                    PRIMARY KEY (profile_id, report_id)
                )''')

            await cur.execute('''
                CREATE TABLE IF NOT EXISTS queries
                (   id serial PRIMARY KEY,
                    name text, query text,
                    user_id integer REFERENCES users(id),
                    profile_id integer REFERENCES profiles(id)
                )''')

            await cur.execute('SELECT * FROM users WHERE username = %s', ['root'])
            if cur.rowcount == 0:
                self.hash['init'] = { 'superuser': True }

        if 'init' in self.hash:
            profile = await self.profile('init', 'root', opts)
            await self.register('init', 'root', 'root', profile, True)
            del self.hash['init']


    ## registration #########################################################

    def generate_hash(self, password):
        return hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), b'salt', 200000)


    def validate_hash(self, password, hash):
        return self.generate_hash(password) == hash.tobytes()


    async def profile(self, key, profile, opts):
        if key not in self.hash: return
        if not self.hash[key]['superuser']: return

        async with self.auth as conn, conn.cursor() as cur:
            await cur.execute('INSERT INTO profiles (profile, opts) VALUES (%s, %s) RETURNING id', [profile, pg.extras.Json(opts)])
            return (await cur.fetchone())['id']


    async def register(self, key, user, password, profile, superuser):
        if key not in self.hash: return
        if not self.hash[key]['superuser']: return

        async with self.auth as conn, conn.cursor() as cur:
            await cur.execute('INSERT INTO users (username, hash, profile_id, superuser) VALUES (%s, %s, %s, %s) RETURNING id',
                [user, self.generate_hash(password), profile, superuser])
            return (await cur.fetchone())['id']


    ## authentication ########################################################

    async def login(self, user, password):
        # get user profile
        async with self.auth as conn, conn.cursor() as cur:
            await cur.execute('SELECT u.id, username, hash, superuser, p.id as pid, profile, opts FROM users u JOIN profiles p ON u.profile_id = p.id WHERE username = %s', [user])
            data = await cur.fetchone()

        # get user profile
        if data and self.validate_hash(password, data['hash']):
            key = None
            while not key or key in self.hash: key = os.urandom(16)
            self.hash[key] = data
            return key


    async def password(self, key, old, new):
        if key not in self.hash: return False
        data = self.hash[key]

        if not self.validate_hash(old, data['hash']): return False

        hash = self.generate_hash(new)
        async with self.auth as conn, conn.cursor() as cur:
            await cur.execute('UPDATE users SET hash = %s WHERE id = %s AND hash = %s', [hash, data['id'], data['hash']])
            data['hash'] = memoryview(hash)
            return True


    def superuser(self, key):
        if key not in self.hash: return False
        return self.hash[key]['superuser']


    def logout(self, key):
        del self.hash[key]

    ## connection ############################################################

    async def context(self, key):
        if key not in self.hash: return
        data = self.hash[key]

        if data['profile'] not in self.pool:
            self.pool[data['profile']] = await aiopg.create_pool(None, **{**self.conn_opts, **data['opts']})
        return Pool(self.pool[data['profile']])

    ## reports/saved queries #################################################

    async def reports(self, key):
        if key not in self.hash: return []
        data = self.hash[key]

        # get user profile
        async with self.auth as conn, conn.cursor() as cur:
            query = '''SELECT r.id, r.name, r.query FROM reports r JOIN profile_reports p ON r.id = p.report_id WHERE p.profile_id = %s'''
            await cur.execute(query, [data['pid']])
            return (await cur.fetchall())


    async def queries(self, key):
        if key not in self.hash: return []
        data = self.hash[key]

        # get user profile
        async with self.auth as conn, conn.cursor() as cur:
            query = '''SELECT q.id, q.name, q.query, u.username FROM queries q JOIN users u ON q.user_id = u.id WHERE q.profile_id = %s'''
            await cur.execute(query, [data['pid']])
            return (await cur.fetchall())


    async def save(self, key, name, query, id=None):
        if key not in self.hash: return []
        data = self.hash[key]

        # get user profile
        async with self.auth as conn, conn.cursor() as cur:
            query = '''INSERT INTO queries VALUES (%s, %s, %s, %s, %s) ON CONFLICT id DO UPDATE SET name = EXCLUDED.name, query = EXCLUDED.query, user = EXCLUDED.user, profile = EXCLUDED.profile RETURNING id'''
            await cur.execute(query, [id, name, query, data['id'], data['pid']])
            return (await cur.fetchone())


class Pool:
    def __init__(self, pool):
        self.pool = pool
        self.conn = None

    async def __aenter__(self):
        self.conn = await self.pool.acquire()
        return self.conn

    async def __aexit__(self, type, exc, traceback):
        out = await self.pool.release(self.conn)
        if out is not None: print('! could not release connection')

    async def acquire(self):
        return await self.pool.acquire()

    async def release(self, conn):
        return await self.pool.release(conn)
