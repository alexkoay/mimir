import logging
import websockets as ws
from .session import Session

# connection handler
async def handler(socket, path):
    try:
        async with Session(socket) as sess:
            await sess.run()
    except KeyboardInterrupt:
        print('! interrupted', type(e), e)
        loop.stop()
    except Exception as e:
        print('! connection error', type(e), e)
        import traceback
        traceback.print_exc()
    except:
        print('! unknown error')


async def run(server, auth, conn):
    log = logging.getLogger('mimir')

    await Session.connect(auth, conn)
    log.warning('Authenticator connected successfully')

    srv = await ws.serve(handler, **server)
    log.warning('Listening on ws://{}:{}/'.format(server['host'], server['port']))
    return srv
