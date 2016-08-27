#!/usr/bin/env python3

import asyncio
from .base import run

loop = asyncio.get_event_loop()

start = run(
    opts={'user': 'root', 'database': 'mimir', 'timeout': 180, 'minsize': 0, 'maxsize': 3},
    conn_opts={'timeout': 180, 'minsize': 0, 'maxsize': 3}
)
start = asyncio.ensure_future(start, loop=loop)
loop.run_until_complete(start)

server = start.result()
try:
    loop.run_forever()
except KeyboardInterrupt: pass
finally:
    server.close()
    print([task for task in asyncio.Task.all_tasks() if not task.done()])
    pending = [asyncio.wait_for(task, 10) for task in asyncio.Task.all_tasks() if not task.done()]
    task = asyncio.gather(*pending)
    loop.run_until_complete(task)
