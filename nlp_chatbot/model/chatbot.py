import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from typing import List
from safety.filters import filter_unsafe, get_fallback_response, hallucination_guard

class ChatbotModel:
    def __init__(self, model_name: str = "microsoft/DialoGPT-small"):
        """
        Option A: Fine-tune/use a small transformer.
        DialoGPT handles multi-turn conversation beautifully and is extremely lightweight for MVP use.
        """
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        # DialoGPT expects EOS token as pad token
        self.tokenizer.pad_token = self.tokenizer.eos_token
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Load in half-precision on GPU, but keep float32 on CPU to prevent crash
        if self.device.type == "cuda":
            self.model = AutoModelForCausalLM.from_pretrained(model_name, torch_dtype=torch.float16)
        else:
            self.model = AutoModelForCausalLM.from_pretrained(model_name)
        
        self.model.to(self.device)
        self.model.eval()

    def generate_response(self, history: List[str], max_length: int = 1000) -> str:
        # Safety Check on the latest user input
        if history and not filter_unsafe(history[-1]):
            return get_fallback_response()
            
        # Append EOS token to every message and concatenate
        # DialoGPT uses EOS to separate turns
        chat_history_str = self.tokenizer.eos_token.join(history) + self.tokenizer.eos_token
        
        encoded = self.tokenizer(chat_history_str, return_tensors='pt')
        input_ids = encoded['input_ids'].to(self.device)
        attention_mask = encoded['attention_mask'].to(self.device)
        
        # Prevent input from exceeding max_length
        if input_ids.shape[1] >= max_length:
            input_ids = input_ids[:, -max_length:]
            attention_mask = attention_mask[:, -max_length:]

        with torch.no_grad():
            output_ids = self.model.generate(
                input_ids,
                attention_mask=attention_mask,
                max_new_tokens=60, # Greatly speeds up generation by capping output length
                pad_token_id=self.tokenizer.eos_token_id,
                no_repeat_ngram_size=3,
                do_sample=True,
                top_k=50,
                top_p=0.95,
                temperature=0.7,
                repetition_penalty=1.2 # Prevent repeating the same response
            )
            
        # Extract only the newly generated tokens
        bot_output_ids = output_ids[:, input_ids.shape[-1]:]
        response = self.tokenizer.decode(bot_output_ids[0], skip_special_tokens=True)
        
        # If model generated an empty response or hit a block
        if not response.strip():
            response = "Could you elaborate on that?"
            
        # Apply Hallucination Guard
        if history:
            response = hallucination_guard(history[-1], response)
            
        return response
