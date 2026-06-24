# Python Desktop Chatbot

This is the standalone Python Desktop Chatbot module, featuring a Tkinter-based GUI and a terminal CLI.

## Setup Instructions for Linux

1. **Create the Virtual Environment**
   ```bash
   python3 -m venv nlp_chatbot/venv
   ```

2. **Activate the Virtual Environment**
   ```bash
   source nlp_chatbot/venv/bin/activate
   ```

3. **Install Dependencies**
   Make sure you have `requests` and the standard Tkinter library installed (e.g., `sudo apt install python3-tk` on Debian/Ubuntu).
   ```bash
   pip install requests
   ```
   *(Note: Ensure your backend dependencies `fastapi`, `uvicorn`, `torch`, `transformers` are also installed if running the backend server locally).*

4. **Running the App**
   Make sure `export PYTHONPATH=.` is set before running, or use the provided wrapper script from the project root:
   
   **Run the GUI:**
   ```bash
   ./nlp_chatbot/chatbot-app
   ```
   *Alternatively:* `python -m nlp_chatbot.client.launcher`
   
   **Run the CLI:**
   ```bash
   ./nlp_chatbot/chatbot-app --cli
   ```
   *Alternatively:* `python -m nlp_chatbot.client.launcher --cli`

5. **Desktop Launcher Installation**
   To install the `.desktop` shortcut so it appears in your Linux application menu:
   ```bash
   chmod +x nlp_chatbot/packaging/chatbot.desktop
   desktop-file-install --dir=$HOME/.local/share/applications nlp_chatbot/packaging/chatbot.desktop
   update-desktop-database $HOME/.local/share/applications
   ```
