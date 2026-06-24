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