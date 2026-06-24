import requests
import uuid

def run_terminal():
    print("=== NLP Chatbot Terminal ===")
    print("Type 'quit' to exit or 'clear' to reset memory.")
    
    session_id = str(uuid.uuid4())
    url = "http://localhost:8000/chat"
    
    while True:
        try:
            msg = input("You: ")
            if msg.lower() in ["quit", "exit"]:
                break
            if msg.lower() == "clear":
                session_id = str(uuid.uuid4())
                print("Session memory cleared.")
                continue
                
            resp = requests.post(url, json={"session_id": session_id, "message": msg})
            
            if resp.status_code == 200:
                print(f"Bot: {resp.json().get('response')}")
            else:
                print(f"Error: Server returned {resp.status_code}")
                
        except requests.exceptions.ConnectionError:
            print("Error: Could not connect to the server. Is it running?")
            break
        except KeyboardInterrupt:
            break

if __name__ == "__main__":
    run_terminal()
