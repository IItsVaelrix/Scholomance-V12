import re
from typing import Dict, List, Any
try:
    from textblob import TextBlob
except ImportError:
    TextBlob = None
try:
    import pronouncing
except ImportError:
    pronouncing = None
try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
except (ImportError, OSError):
    nlp = None

class LiteraryAnalyzers:
    CLICHES = [
        "darkness falls", "broken heart", "cold as ice", "time heals", 
        "tears falling", "lost in your eyes", "soul on fire", "end of the road",
        "scars of the past", "fighting my demons", "into the void"
    ]
    
    CONCRETE_WORDS = {"table", "chair", "rain", "blood", "stone", "mirror", "glass", "blade", "skin", "bone", "tree", "river"}
    ABSTRACT_WORDS = {"love", "hate", "time", "pain", "sorrow", "joy", "peace", "soul", "mind", "truth", "justice"}
    SENSORY_WORDS = {"cold", "hot", "sharp", "soft", "loud", "quiet", "bright", "dark", "sweet", "bitter"}
    WEAK_VERBS = {"is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "did", "does", "get", "got", "make", "made"}

    @staticmethod
    def analyze(text: str) -> dict:
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if not lines:
            return {}
            
        words = re.findall(r'\b\w+\b', text.lower())
        num_words = len(words)
        if num_words == 0:
            return {}

        # 1. Emotional Polarity
        polarity = 0.0
        subjectivity = 0.0
        if TextBlob:
            blob = TextBlob(text)
            polarity = blob.sentiment.polarity
            subjectivity = blob.sentiment.subjectivity

        # 2. Cliché Detection
        found_cliches = [c for c in LiteraryAnalyzers.CLICHES if c in text.lower()]

        # 3. Rhyme Analysis
        rhyme_density = 0.0
        internal_rhymes = 0
        end_rhymes = 0
        if pronouncing:
            line_ends = [re.findall(r'\b\w+\b', line.lower())[-1] for line in lines if re.findall(r'\b\w+\b', line.lower())]
            for i in range(len(line_ends)):
                for j in range(i + 1, len(line_ends)):
                    if line_ends[j] in pronouncing.rhymes(line_ends[i]):
                        end_rhymes += 1
            
            rhyme_phones = set()
            rhyme_hits = 0
            for w in words:
                phones = pronouncing.phones_for_word(w)
                if phones:
                    vowel_part = "".join(re.findall(r'[A-Z0-9]+', phones[0]))
                    if vowel_part in rhyme_phones:
                        rhyme_hits += 1
                    rhyme_phones.add(vowel_part)
            rhyme_density = rhyme_hits / num_words if num_words > 0 else 0
            internal_rhymes = rhyme_hits - end_rhymes

        # 4. Imagery and Abstract Density
        word_set = set(words)
        concrete_hits = len(word_set.intersection(LiteraryAnalyzers.CONCRETE_WORDS))
        abstract_hits = len(word_set.intersection(LiteraryAnalyzers.ABSTRACT_WORDS))
        sensory_hits = len(word_set.intersection(LiteraryAnalyzers.SENSORY_WORDS))
        weak_verb_hits = len(word_set.intersection(LiteraryAnalyzers.WEAK_VERBS))
        
        imagery_density = concrete_hits / num_words if num_words > 0 else 0.0
        abstract_density = abstract_hits / num_words if num_words > 0 else 0.0
        sensory_density = sensory_hits / num_words if num_words > 0 else 0.0

        # 5. Line Length Variance
        line_lengths = [len(re.findall(r'\b\w+\b', line)) for line in lines]
        line_length_variance = sum((l - (sum(line_lengths)/len(line_lengths)))**2 for l in line_lengths) / len(line_lengths) if len(line_lengths) > 0 else 0.0

        # 6. Motif Extraction (Words appearing > 2 times, length > 4)
        word_counts = {}
        for w in words:
            if len(w) > 4:
                word_counts[w] = word_counts.get(w, 0) + 1
        repeated_motifs = [w for w, c in word_counts.items() if c >= 2]

        # 7. Passive Phrasing Detection (Using spaCy)
        passive_count = 0
        if nlp:
            doc = nlp(text)
            for token in doc:
                if token.dep_ == "auxpass":
                    passive_count += 1

        # 8. Alliteration, Assonance, Consonance (Heuristic)
        first_letters = [w[0] for w in words if w]
        alliteration_score = len(first_letters) - len(set(first_letters))

        return {
            "word_count": num_words,
            "line_count": len(lines),
            "emotional_polarity": round(polarity, 2),
            "subjectivity": round(subjectivity, 2),
            "cliche_count": len(found_cliches),
            "found_cliches": found_cliches,
            "rhyme_density": round(rhyme_density, 2),
            "end_rhymes": end_rhymes,
            "internal_rhymes": max(0, internal_rhymes),
            "imagery_density": round(imagery_density, 2),
            "abstract_density": round(abstract_density, 2),
            "sensory_language_density": round(sensory_density, 2),
            "weak_verb_count": weak_verb_hits,
            "passive_phrasing_count": passive_count,
            "line_length_variance": round(line_length_variance, 2),
            "repeated_motifs": repeated_motifs,
            "alliteration_score": alliteration_score
        }