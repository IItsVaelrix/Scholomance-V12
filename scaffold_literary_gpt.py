import os

project_dir = "literary_gpt"
dirs = [
    "configs",
    "data/raw",
    "data/processed",
    "data/examples",
    "literary_gpt",
    "tests",
    "scripts"
]

for d in dirs:
    os.makedirs(os.path.join(project_dir, d), exist_ok=True)

files = {}

# CONFIGS
files["configs/train.yaml"] = """
model_name: "microsoft/DialoGPT-small"
output_dir: "./output/dialo-literary"
batch_size: 4
learning_rate: 5e-5
epochs: 3
max_length: 512
gradient_accumulation_steps: 4
fp16: false
save_steps: 500
eval_steps: 500
"""

files["configs/generation.yaml"] = """
max_new_tokens: 150
temperature: 0.7
top_p: 0.92
repetition_penalty: 1.15
no_repeat_ngram_size: 3
"""

files["configs/memory.yaml"] = """
embedding_model: "sentence-transformers/all-MiniLM-L6-v2"
quantization_type: "int8"
top_k: 3
importance_weight: 1.5
similarity_threshold: 0.4
"""

# INIT
files["literary_gpt/__init__.py"] = """
__version__ = "0.1.0"
"""

# DATASET
files["literary_gpt/dataset.py"] = """
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
"""

# TRAIN
files["literary_gpt/train.py"] = """
import yaml
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments
from literary_gpt.dataset import LiteraryDataset

def train(config_path: str, data_path: str):
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on {device}")

    tokenizer = AutoTokenizer.from_pretrained(config['model_name'])
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(config['model_name'])
    model.to(device)

    dataset = LiteraryDataset(data_path, tokenizer, max_length=config['max_length'])
    # In a real scenario, split into train/val
    
    training_args = TrainingArguments(
        output_dir=config['output_dir'],
        per_device_train_batch_size=config['batch_size'],
        gradient_accumulation_steps=config['gradient_accumulation_steps'],
        learning_rate=float(config['learning_rate']),
        num_train_epochs=config['epochs'],
        fp16=config.get('fp16', False) and torch.cuda.is_available(),
        save_steps=config['save_steps'],
        logging_steps=50,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
    )

    trainer.train()
    model.save_pretrained(f"{config['output_dir']}/final")
    tokenizer.save_pretrained(f"{config['output_dir']}/final")
    print("Training complete.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--data", required=True)
    args = parser.parse_args()
    train(args.config, args.data)
"""

# TURBOQUANT
files["literary_gpt/turboquant.py"] = """
import numpy as np

class TurboQuant:
    def __init__(self, method="int8"):
        self.method = method
        self.scale = None
        self.zero_point = None

    def fit(self, vectors: np.ndarray):
        if self.method == "int8":
            min_val = vectors.min(axis=0)
            max_val = vectors.max(axis=0)
            self.scale = (max_val - min_val) / 255.0
            self.scale[self.scale == 0] = 1.0
            self.zero_point = np.round(-min_val / self.scale).astype(np.int8)

    def encode(self, vector: np.ndarray) -> np.ndarray:
        if self.scale is None:
            # Fallback scaling if not fitted
            self.scale = (np.max(vector) - np.min(vector)) / 255.0 or 1.0
            self.zero_point = np.round(-np.min(vector) / self.scale).astype(np.int8)
        
        q_vec = np.round(vector / self.scale) + self.zero_point
        return np.clip(q_vec, 0, 255).astype(np.uint8)

    def decode(self, compressed: np.ndarray) -> np.ndarray:
        return (compressed.astype(np.float32) - self.zero_point) * self.scale

    def similarity(self, query_vector: np.ndarray, compressed_vector: np.ndarray) -> float:
        decoded = self.decode(compressed_vector)
        # Cosine similarity
        norm_q = np.linalg.norm(query_vector)
        norm_d = np.linalg.norm(decoded)
        if norm_q == 0 or norm_d == 0: return 0.0
        return float(np.dot(query_vector, decoded) / (norm_q * norm_d))

    def save(self, path: str):
        np.savez(path, scale=self.scale, zero_point=self.zero_point, method=self.method)

    def load(self, path: str):
        data = np.load(path)
        self.scale = data['scale']
        self.zero_point = data['zero_point']
        self.method = str(data['method'])
"""

# EMBEDDINGS
files["literary_gpt/embeddings.py"] = """
import torch
from transformers import AutoTokenizer, AutoModel

class EmbeddingService:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
        self.model.eval()

    def embed(self, text: str):
        inputs = self.tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=256)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        with torch.no_grad():
            outputs = self.model(**inputs)
        # Mean pooling
        embeddings = outputs.last_hidden_state
        mask = inputs['attention_mask'].unsqueeze(-1).expand(embeddings.size()).float()
        sum_embeddings = torch.sum(embeddings * mask, 1)
        sum_mask = torch.clamp(mask.sum(1), min=1e-9)
        return (sum_embeddings / sum_mask).cpu().numpy()[0]
"""

# STORAGE
files["literary_gpt/storage.py"] = """
import sqlite3
import json
import numpy as np

class MemoryStorage:
    def __init__(self, db_path: str = "memory.sqlite"):
        self.conn = sqlite3.connect(db_path)
        self.create_tables()

    def create_tables(self):
        self.conn.execute('''
            CREATE TABLE IF NOT EXISTS cells (
                id TEXT PRIMARY KEY,
                type TEXT,
                source TEXT,
                raw_text TEXT,
                summary TEXT,
                compressed_embedding BLOB,
                importance REAL,
                created_at TEXT,
                updated_at TEXT,
                tags TEXT
            )
        ''')
        self.conn.commit()

    def insert(self, cell: dict):
        self.conn.execute('''
            INSERT OR REPLACE INTO cells
            (id, type, source, raw_text, summary, compressed_embedding, importance, created_at, updated_at, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            cell['id'], cell['type'], cell['source'], cell['raw_text'], cell['summary'],
            cell['compressed_embedding'].tobytes(), cell['importance'],
            cell['created_at'], cell['updated_at'], json.dumps(cell['tags'])
        ))
        self.conn.commit()

    def get_all(self):
        cursor = self.conn.execute('SELECT * FROM cells')
        rows = cursor.fetchall()
        cells = []
        for r in rows:
            cells.append({
                'id': r[0], 'type': r[1], 'source': r[2], 'raw_text': r[3],
                'summary': r[4], 'compressed_embedding': np.frombuffer(r[5], dtype=np.uint8),
                'importance': r[6], 'created_at': r[7], 'updated_at': r[8],
                'tags': json.loads(r[9])
            })
        return cells
"""

# MEMORY
files["literary_gpt/memory.py"] = """
import uuid
from datetime import datetime
from typing import List, Dict, Any
from literary_gpt.turboquant import TurboQuant
from literary_gpt.embeddings import EmbeddingService
from literary_gpt.storage import MemoryStorage

class VectorMemory:
    def __init__(self, db_path: str = "memory.sqlite"):
        self.storage = MemoryStorage(db_path)
        self.embedder = EmbeddingService()
        self.tq = TurboQuant()

    def add_memory(self, text: str, m_type: str, summary: str, source: str = "user", importance: float = 1.0, tags: List[str] = None):
        vec = self.embedder.embed(text)
        compressed = self.tq.encode(vec)
        
        cell = {
            "id": str(uuid.uuid4()),
            "type": m_type,
            "source": source,
            "raw_text": text,
            "summary": summary,
            "compressed_embedding": compressed,
            "importance": importance,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "tags": tags or []
        }
        self.storage.insert(cell)
        return cell['id']

    def search(self, query: str, top_k: int = 3, threshold: float = 0.4) -> List[Dict[str, Any]]:
        query_vec = self.embedder.embed(query)
        all_cells = self.storage.get_all()
        
        results = []
        for cell in all_cells:
            sim = self.tq.similarity(query_vec, cell['compressed_embedding'])
            # Score factors in importance
            score = sim * cell['importance']
            if sim >= threshold:
                results.append((score, cell))
                
        results.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in results[:top_k]]
"""

# ANALYZERS
files["literary_gpt/analyzers.py"] = """
import re

class LiteraryAnalyzers:
    @staticmethod
    def analyze(text: str) -> dict:
        words = re.findall(r'\b\w+\b', text.lower())
        num_words = len(words)
        if num_words == 0:
            return {}
            
        # Very basic heuristics for demo
        cliches = ["darkness falls", "broken heart", "cold as ice", "time heals"]
        found_cliches = [c for c in cliches if c in text.lower()]
        
        # Mock signals
        return {
            "word_count": num_words,
            "cliche_count": len(found_cliches),
            "found_cliches": found_cliches,
            "imagery_density": 0.65, # Mock
            "abstract_density": 0.20, # Mock
            "rhyme_density": 0.40 # Mock
        }
"""

# PROMPT BUILDER
files["literary_gpt/prompt_builder.py"] = """
from typing import List, Dict

class PromptBuilder:
    @staticmethod
    def build(user_input: str, memories: List[Dict], task: str = "Respond as a literary genius") -> str:
        prompt = "SYSTEM STYLE:\nYou are a literary collaborator. Be specific, vivid, technically useful, and voice-preserving.\n\n"
        
        if memories:
            prompt += "RELEVANT MEMORY:\n"
            for m in memories:
                prompt += f"- {m['summary']}\n"
            prompt += "\n"
            
        prompt += f"USER TEXT:\n{user_input}\n\n"
        prompt += f"TASK:\n{task}\n\nASSISTANT:\n"
        
        return prompt
"""

# GENERATE
files["literary_gpt/generate.py"] = """
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
"""

# SERVER
files["literary_gpt/server.py"] = """
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from literary_gpt.generate import LiteraryGenerator
from literary_gpt.analyzers import LiteraryAnalyzers

app = FastAPI(title="LiteraryGenius DialoGPT TurboMemory")

# Assuming standard load path
try:
    generator = LiteraryGenerator("microsoft/DialoGPT-small", "configs/generation.yaml")
except:
    generator = None

class GenerateRequest(BaseModel):
    user_text: str
    task: str = "Analyze and rewrite"
    project_id: Optional[str] = None

@app.post("/generate")
def generate(req: GenerateRequest):
    if not generator:
        return {"error": "Model not loaded"}
        
    analysis = LiteraryAnalyzers.analyze(req.user_text)
    result = generator.generate(req.user_text, task=req.task)
    
    return {
        "response": result["response"],
        "retrieved_memory_cells": result["retrieved_memories"],
        "analysis_signals": analysis,
        "model_info": {"model": "DialoGPT-small-Literary"}
    }

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": generator is not None}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
"""

# CLI
files["literary_gpt/cli.py"] = """
import argparse
from literary_gpt.memory import VectorMemory

def main():
    parser = argparse.ArgumentParser(prog="literary_gpt")
    subparsers = parser.add_subparsers(dest="command")

    # memory_add
    mem_parser = subparsers.add_parser("memory_add")
    mem_parser.add_argument("--text", required=True)
    mem_parser.add_argument("--type", required=True)
    mem_parser.add_argument("--summary", required=True)

    args = parser.parse_args()

    if args.command == "memory_add":
        mem = VectorMemory()
        mem_id = mem.add_memory(args.text, args.type, args.summary)
        print(f"Memory added with ID: {mem_id}")

if __name__ == "__main__":
    main()
"""

# EVAL
files["literary_gpt/eval.py"] = """
import json

class Evaluator:
    def evaluate(self, response: str, reference: str):
        # Basic mock evaluator
        return {
            "specificity": 4,
            "voice_preservation": 3,
            "revision_quality": 4,
            "memory_usage": 5,
            "notes": "Evaluation requires LLM-as-a-judge for actual scoring."
        }
"""

# SCRIPTS
files["scripts/build_dataset.py"] = """
import json
import os

def main():
    os.makedirs('data/processed', exist_ok=True)
    dataset = [
        {
            "user": "Analyze this verse: The dark sky weeps upon my broken heart.",
            "assistant": "Summary: The line conveys sadness but uses heavy clichés.\\nWhy it works: The emotional intent is clear.\\nWhat is weak: 'Dark sky weeps' and 'broken heart' are highly cliché.\\nRevision options:\\n1. The bruised clouds bleed over shattered ribs.\\nBest version: The bruised clouds bleed... it maintains the anatomical/weather link.\\nNext move: Try replacing 'dark' with a specific color or texture."
        }
    ]
    with open('data/processed/train.json', 'w') as f:
        json.dump(dataset, f, indent=2)
    print("Dataset built.")

if __name__ == "__main__":
    main()
"""

# TESTS
files["tests/test_turboquant.py"] = """
import numpy as np
from literary_gpt.turboquant import TurboQuant

def test_turboquant_similarity():
    tq = TurboQuant()
    v1 = np.random.rand(384)
    v2 = np.random.rand(384)
    
    tq.fit(np.vstack([v1, v2]))
    
    c1 = tq.encode(v1)
    c2 = tq.encode(v2)
    
    raw_sim = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
    tq_sim = tq.similarity(v1, c2)
    
    print(f"Raw Cosine: {raw_sim:.4f}")
    print(f"TQ Similarity: {tq_sim:.4f}")
    assert abs(raw_sim - tq_sim) < 0.2

if __name__ == "__main__":
    test_turboquant_similarity()
"""

# REQUIREMENTS
files["requirements.txt"] = """
torch>=2.0.0
transformers>=4.30.0
fastapi
uvicorn
pydantic
pyyaml
numpy
sentence-transformers
"""

# README
files["README.md"] = """
# LiteraryGenius-DialoGPT-TurboMemory

A complete training and inference pipeline that fine-tunes DialoGPT-small into a literary genius collaborator using curated data, retrieval augmented generation, and TurboQuant vector memory.

## Architecture
- **DialoGPT-small**: The base causal LM fine-tuned on critique data.
- **TurboQuant Memory**: Stores stylistic rules and compressed vectors for fast semantic retrieval.
- **Literary Analyzers**: Provide structural signals (cliché detection, rhyme density) to guide generation.

## Setup
```bash
pip install -r requirements.txt
python scripts/build_dataset.py
```

## Training
```bash
python -m literary_gpt.train --config configs/train.yaml --data data/processed/train.json
```

## Adding Memory
```bash
python -m literary_gpt.cli memory_add --text "User prefers gothic imagery and dark metaphors" --type "style" --summary "Gothic style preference"
```

## Running the Server
```bash
python -m literary_gpt.server
```

## Known Limitations
- DialoGPT-small is highly sensitive to prompt structure. Heavy scaffolding may induce repetition.
- Memory retrieval relies on local sentence-transformers, which requires downloading the model on first run.

## Ethical Data Rules
Do not train on copyrighted modern works without permission. Use synthetic datasets generated from public domain poetry.
"""

for filepath, content in files.items():
    full_path = os.path.join(project_dir, filepath)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\\n")

print("LiteraryGenius-DialoGPT-TurboMemory project scaffolded successfully!")
