from textual.app import App
from textual.widgets import Input
from textual import on
import asyncio

class TestApp(App):
    def compose(self):
        yield Input(id="test")
        
    @on(Input.Changed)
    def on_changed(self, event):
        print(f"Changed! val={event.value!r}, cursor={event.input.cursor_position}")

async def run_test():
    app = TestApp()
    async with app.run_test() as pilot:
        inp = app.query_one(Input)
        inp.value = " @"
        inp.cursor_position = 2
        print("Ready...")
        await pilot.pause(0.1)
        
        # Now simulate the behavior
        inp.value = " @foo "
        # Notice we update cursor AFTER value
        inp.cursor_position = 6
        await pilot.pause(0.1)
        print("Done")

if __name__ == "__main__":
    asyncio.run(run_test())
