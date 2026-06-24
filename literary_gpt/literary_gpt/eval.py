import json
from typing import Dict, Any
from literary_gpt.analyzers import LiteraryAnalyzers
from literary_gpt.turboquant import TurboQuant
from literary_gpt.embeddings import EmbeddingService

class Evaluator:
    def __init__(self):
        self.analyzers = LiteraryAnalyzers()
        self.embedder = EmbeddingService()
        self.tq = TurboQuant(method="int8")

    def evaluate(self, user_prompt: str, generated_response: str) -> Dict[str, Any]:
        """
        Evaluates the generated response based on heuristics and structural analysis.
        Since DialoGPT-small does not have an internal critic, we use the 
        LiteraryAnalyzers to score the output.
        """
        prompt_analysis = self.analyzers.analyze(user_prompt)
        response_analysis = self.analyzers.analyze(generated_response)
        
        # 1. Cliché Avoidance (1-5)
        cliche_diff = prompt_analysis.get("cliche_count", 0) - response_analysis.get("cliche_count", 0)
        cliche_score = 3
        if response_analysis.get("cliche_count", 0) == 0:
            cliche_score = 5
        elif cliche_diff > 0:
            cliche_score = 4
        elif cliche_diff < 0:
            cliche_score = 1
            
        # 2. Specificity (1-5) based on imagery/abstract ratio
        img_density = response_analysis.get("imagery_density", 0)
        abstract_density = response_analysis.get("abstract_density", 0)
        specificity = 3
        if img_density > abstract_density * 2:
            specificity = 5
        elif img_density > abstract_density:
            specificity = 4
        elif img_density == 0:
            specificity = 1

        # 3. Voice Preservation (1-5) using vector similarity between prompt and response
        prompt_vec = self.embedder.embed(user_prompt)
        resp_vec = self.embedder.embed(generated_response)
        
        # Fake a fit for TurboQuant for quick local comparison
        import numpy as np
        self.tq.fit(np.vstack([prompt_vec, resp_vec]))
        resp_comp = self.tq.encode(resp_vec)
        sim = self.tq.similarity(prompt_vec, resp_comp)
        
        voice_preservation = 1
        if sim > 0.8:
            voice_preservation = 5
        elif sim > 0.6:
            voice_preservation = 4
        elif sim > 0.4:
            voice_preservation = 3
        elif sim > 0.2:
            voice_preservation = 2

        # 4. Revision Quality (1-5) based on reduction of weak verbs and passive phrasing
        weak_verbs_diff = prompt_analysis.get("weak_verb_count", 0) - response_analysis.get("weak_verb_count", 0)
        revision_quality = 3
        if weak_verbs_diff > 0:
            revision_quality += 1
        if response_analysis.get("passive_phrasing_count", 0) == 0:
            revision_quality += 1
            
        revision_quality = min(5, max(1, revision_quality))

        return {
            "prompt_length": len(user_prompt),
            "response_length": len(generated_response),
            "specificity": specificity,
            "voice_preservation": voice_preservation,
            "revision_quality": revision_quality,
            "cliche_avoidance": cliche_score,
            "similarity_score": round(sim, 3),
            "notes": "Evaluation generated via heuristic analysis and TurboQuant similarity mapping."
        }

if __name__ == "__main__":
    evaluator = Evaluator()
    sample_prompt = "The dark sky weeps upon my broken heart. I am sad and time heals."
    sample_resp = "The bruised clouds bleed over shattered ribs. The silence sharpens."
    result = evaluator.evaluate(sample_prompt, sample_resp)
    print(json.dumps(result, indent=2))