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


async def run(opts, conn_opts):
    await Session.connect(opts, conn_opts)
    return await ws.serve(handler, 'localhost', 8765)
