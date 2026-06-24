import asyncio
from tui.ui.app import DivTubeAgentApp

async def test_app():
    app = DivTubeAgentApp()
    async with app.run_test() as pilot:
        await pilot.pause(0.5)
        # Type '@' to open modal
        await pilot.press("@")
        await pilot.pause(0.5)
        
        # We should be in FileSelectScreen
        # Type something to filter
        await pilot.press("s", "r", "c")
        await pilot.pause(0.5)
        
        # Press enter!
        await pilot.press("enter")
        await pilot.pause(0.5)
        
        # See what happens
        print("Test finished successfully!")

if __name__ == "__main__":
    asyncio.run(test_app())
