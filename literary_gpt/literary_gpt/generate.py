import torch
import yaml
from transformers import AutoModelForCausalLM, AutoTokenizer
from literary_gpt.prompt_builder import PromptBuilder
from literary_gpt.memory import VectorMemory

class LiteraryGenerator:
    def __init__(self, model_path: str, config_path: str):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForCausalLM.from_pretrained(model_path).to(self.device)
        self.model.eval()
        
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
            
        self.memory = VectorMemory()

    def generate(self, text: str, task: str = "Analyze and revise"):
        # Retrieve
        memories = self.memory.search(text)
        
        # Build prompt
        prompt = PromptBuilder.build(text, memories, task)
        
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
        
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=self.config.get("max_new_tokens", 150),
                temperature=self.config.get("temperature", 0.7),
                top_p=self.config.get("top_p", 0.92),
                repetition_penalty=self.config.get("repetition_penalty", 1.15),
                pad_token_id=self.tokenizer.eos_token_id,
                do_sample=True
            )
            
        response = self.tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)
        return {
            "response": response,
            "retrieved_memories": memories,
            "prompt": prompt
        }