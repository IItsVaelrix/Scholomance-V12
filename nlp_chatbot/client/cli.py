from nlp_chatbot.client.core import ChatbotEngine, ChatbotConfig
import sys

def main():
    print("=== NLP Chatbot Terminal ===")
    print("Type 'quit' to exit or 'clear' to reset memory.")
    
    config = ChatbotConfig()
    engine = ChatbotEngine(config)
    
    while True:
        try:
            msg = input("You: ").strip()
            if not msg:
                continue
            if msg.lower() in ["quit", "exit"]:
                break
            
            response = engine.respond(msg)
            print(f"Bot: {response}")
                
        except KeyboardInterrupt:
            print()
            break
        except EOFError:
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()
