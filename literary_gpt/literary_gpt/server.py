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