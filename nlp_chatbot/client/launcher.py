import sys

def main():
    if "--cli" in sys.argv:
        from nlp_chatbot.client.cli import main as run_cli
        run_cli()
    else:
        try:
            from nlp_chatbot.client.gui import main as run_gui
            run_gui()
        except ImportError as e:
            if "pyside6" in str(e).lower():
                print("Error: PySide6 is not installed on your system.")
                print("Please install it inside the virtual environment: 'pip install PySide6'")
                print("Falling back to CLI mode...")
                from nlp_chatbot.client.cli import main as run_cli
                run_cli()
            else:
                raise e

if __name__ == "__main__":
    main()
