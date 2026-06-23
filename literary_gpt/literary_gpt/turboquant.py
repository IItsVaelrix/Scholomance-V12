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