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