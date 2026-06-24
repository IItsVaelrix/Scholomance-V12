import json
from torch.utils.data import Dataset
from transformers import AutoTokenizer

class LiteraryDataset(Dataset):
    def __init__(self, data_path: str, tokenizer: AutoTokenizer, max_length: int = 512):
        self.tokenizer = tokenizer
        self.max_length = max_length
        with open(data_path, 'r', encoding='utf-8') as f:
            self.examples = json.load(f)

    def __len__(self):
        return len(self.examples)

    def __getitem__(self, idx):
        example = self.examples[idx]
        user_text = example.get('user', '')
        assistant_text = example.get('assistant', '')
        
        # Format for DialoGPT causal modeling
        text = f"{user_text}{self.tokenizer.eos_token}{assistant_text}{self.tokenizer.eos_token}"
        
        encoded = self.tokenizer(
            text,
            truncation=True,
            max_length=self.max_length,
            padding="max_length",
            return_tensors="pt"
        )
        
        input_ids = encoded['input_ids'].squeeze(0)
        attention_mask = encoded['attention_mask'].squeeze(0)
        
        return {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "labels": input_ids.clone()
        }