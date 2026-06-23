import json
import os

def main():
    os.makedirs('data/processed', exist_ok=True)
    dataset = [
        {
            "user": "Analyze this verse: The dark sky weeps upon my broken heart.",
            "assistant": "Summary: The line conveys sadness but uses heavy clichés.\nWhy it works: The emotional intent is clear.\nWhat is weak: 'Dark sky weeps' and 'broken heart' are highly cliché.\nRevision options:\n1. The bruised clouds bleed over shattered ribs.\nBest version: The bruised clouds bleed... it maintains the anatomical/weather link.\nNext move: Try replacing 'dark' with a specific color or texture."
        }
    ]
    with open('data/processed/train.json', 'w') as f:
        json.dump(dataset, f, indent=2)
    print("Dataset built.")

if __name__ == "__main__":
    main()