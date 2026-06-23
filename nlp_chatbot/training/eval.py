import os
from data.preprocess import load_and_preprocess
from model.chatbot import ChatbotModel

def evaluate_model():
    """
    Evaluates response repetition, length, and fallback rates.
    """
    model = ChatbotModel() # Use default or loaded checkpoint
    val_data = load_and_preprocess("data/toy_data.jsonl")
    
    total_responses = 0
    empty_responses = 0
    total_length = 0
    fallback_count = 0
    
    print("Evaluating model...")
    for item in val_data:
        history = item["history"]
        resp = model.generate_response(history, max_length=50)
        
        total_responses += 1
        total_length += len(resp.split())
        
        if not resp.strip() or resp == "Could you elaborate on that?":
            empty_responses += 1
            
        if "I'm sorry, I cannot respond to that" in resp:
            fallback_count += 1
            
    print("=== Evaluation Report ===")
    print(f"Total Samples Tested: {total_responses}")
    print(f"Average Response Length (words): {total_length / max(1, total_responses):.2f}")
    print(f"Empty/Vague Response Rate: {(empty_responses/max(1,total_responses))*100:.2f}%")
    print(f"Fallback Rate: {(fallback_count/max(1,total_responses))*100:.2f}%")

if __name__ == "__main__":
    evaluate_model()
