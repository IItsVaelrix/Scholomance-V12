import json
import random

def shrink_dataset():
    input_path = 'data/processed/train.json'
    output_path = 'data/processed/train_small.json'
    
    with open(input_path, 'r') as f:
        data = json.load(f)
        
    # We only need about 200 highly-targeted examples to change the style with LoRA
    random.seed(42)
    random.shuffle(data)
    small_data = data[:200]
    
    with open(output_path, 'w') as f:
        json.dump(small_data, f, indent=4)
        
    print(f"Dataset successfully shrunk from {len(data)} to {len(small_data)} examples.")

if __name__ == "__main__":
    shrink_dataset()
