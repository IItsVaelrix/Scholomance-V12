import os
import glob
import json
import random

SONGS_DIR = "../nlp_chatbot/Songs/"
OUTPUT_JSON = "data/processed/train.json"

def chunk_song(text, chunk_size=8):
    """Splits a song into stanza chunks of roughly `chunk_size` lines."""
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    chunks = []
    for i in range(0, len(lines), chunk_size):
        chunk = "\n".join(lines[i:i+chunk_size])
        if len(chunk.split()) > 10:  # Ignore tiny interludes
            chunks.append(chunk)
    return chunks

def build_dataset():
    dataset = []
    song_files = glob.glob(os.path.join(SONGS_DIR, "*.txt"))
    
    print(f"Found {len(song_files)} songs. Processing...")
    
    for file_path in song_files:
        song_title = os.path.basename(file_path).replace(".txt", "")
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
            
        chunks = chunk_song(text, chunk_size=6)
        
        for i, chunk in enumerate(chunks):
            # 1. GENERATION TASK
            dataset.append({
                "user": f"Write a verse for a song titled '{song_title}' with this exact cadence and style.",
                "assistant": chunk
            })
            
            # 2. CONTINUATION TASK
            if i < len(chunks) - 1:
                next_chunk = chunks[i+1]
                dataset.append({
                    "user": f"Continue this verse naturally:\n\n{chunk}",
                    "assistant": next_chunk
                })
                
            # 3. CRITIQUE/REVISION TASK (Simulating the user providing a weak version and the model providing the master version)
            # We scramble or weaken the chunk to simulate a rough draft
            lines = chunk.split('\n')
            if len(lines) >= 4:
                weak_draft = "\n".join(lines[:-2]) + "\n[...struggling to finish...]"
                dataset.append({
                    "user": f"Can you help me finish and polish this draft? I want it to sound raw and intense.\n\n{weak_draft}",
                    "assistant": f"Here is a sharper, more impactful way to resolve those lines:\n\n{chunk}"
                })

    # Save to JSON
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=4)
        
    print(f"Successfully generated {len(dataset)} training examples from {len(song_files)} songs!")
    print(f"Saved dataset to: {OUTPUT_JSON}")

if __name__ == "__main__":
    build_dataset()
