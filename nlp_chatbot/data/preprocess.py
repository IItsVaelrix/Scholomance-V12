import json
from typing import List, Dict
from safety.filters import filter_unsafe

def clean_message(msg: str) -> str:
    return msg.strip()

def load_and_preprocess(filepath: str) -> List[Dict]:
    """Loads a jsonl dataset, cleans it, and filters unsafe samples."""
    dataset = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            data = json.loads(line)
            history = [clean_message(m) for m in data.get("history", []) if clean_message(m)]
            response = clean_message(data.get("response", ""))
            
            if not response or not history:
                continue
                
            if all(filter_unsafe(m) for m in history) and filter_unsafe(response):
                dataset.append({"history": history, "response": response})
    return dataset

def split_dataset(dataset: List[Dict], split_ratio: float = 0.8) -> tuple[List, List]:
    split_idx = int(len(dataset) * split_ratio)
    return dataset[:split_idx], dataset[split_idx:]
