import sys
import asyncio
import websockets as ws
from concurrent import futures
from prompt_toolkit.interface import CommandLineInterface
from prompt_toolkit.shortcuts import create_prompt_application, create_asyncio_eventloop, prompt_async


class Session:
    def __init__(self, host):
        self.host = host
        self.socket = None
        self.cli = CommandLineInterface(application=create_prompt_application('> '), eventloop=create_asyncio_eventloop())
        sys.stdout = self.cli.stdout_proxy()

    async def connect(self):
        self.socket = await ws.connect(self.host)

    async def send(self):
        while self.socket.open:
            try:
                result = await self.cli.run_async()
                if result.text: await self.socket.send(result.text)
            except ws.ConnectionClosed:
                print('! send closed')
                break
            except KeyboardInterrupt:
                print('! interrupted')
                break

    async def recv(self):
        while self.socket.open:
            try:
                result = await self.socket.recv()
                print('<', result)
            except ws.ConnectionClosed:
                print('! recv closed')
                break

    async def loop(self):
        await self.connect()
        done, pending = await asyncio.wait([self.send(), self.recv()], return_when=futures.FIRST_COMPLETED)
        for task in done:
            try: task.result()
            except Exception as e:
                import traceback
                traceback.print_exc()

        await self.socket.close()
        if pending: await asyncio.wait(pending)


if __name__ == '__main__':
    loop = asyncio.get_event_loop()
    session = Session('ws://' + sys.argv[1])

    loop.run_until_complete(session.loop())
    loop.close()
