#!/usr/bin/env python3

import sys
import asyncio
import logging
from .base import run

# parse command parameters

level = logging.INFO
server = {'host': 'localhost', 'port': 8765}
auth = {'database': 'mimir', 'timeout': 180, 'minsize': 0, 'maxsize': 3}
conn = {'timeout': 180, 'minsize': 0, 'maxsize': 3}

for arg in sys.argv[1:]:
	if arg.startswith('-'):  # flag
		if arg == '-d': level = logging.DEBUG

	elif arg[0] in ['~', '@', '*']:
		key, value = arg.split('=', 1)
		type, key = key[0], key[1:]

		if type == '~': server[key] = value
		elif type == '@': auth[key] = value
		elif type == '*': conn[key] = value

handler = logging.StreamHandler(stream=sys.stdout)
logging.basicConfig(level=level, format='{asctime} [{name}] {message}', datefmt='%Y-%m-%d %H:%M:%S', style='{', handlers=[handler])


# setup
loop = asyncio.get_event_loop()

start = run(server=server, auth=auth, conn=conn)
start = asyncio.ensure_future(start, loop=loop)
loop.run_until_complete(start)


# run
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
