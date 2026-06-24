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
Do not train on copyrighted modern works without permission. Use synthetic datasets generated from public domain poetry.\n