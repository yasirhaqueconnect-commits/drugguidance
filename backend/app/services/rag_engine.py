import os
import sys
import re
from typing import List, Dict, Any, Optional

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from app.services.data_loader import get_stored_chunks
except ImportError:
    from data_loader import get_stored_chunks

class FastMedicalRAG:
    def __init__(self):
        self.chunks = get_stored_chunks()
        # Build inverted index for fast token lookup
        self.index = {}
        self.build_index()

    def build_index(self):
        for idx, chunk in enumerate(self.chunks):
            # Tokens from category, keywords, medicine_name, generic_name, and content
            cat = chunk.get("category", "")
            raw_text = f"{cat} {chunk.get('keywords', '')} {chunk.get('medicine_name', '')} {chunk.get('generic_name', '')} {chunk.get('content', '')}"
            if cat == "dosage":
                raw_text += " dosage dose doses dosing information administration intake"
            tokens = set(self._tokenize(raw_text))
            for token in tokens:
                if token not in self.index:
                    self.index[token] = []
                self.index[token].append(idx)

    def _tokenize(self, text: str) -> List[str]:
        # Lowercase and extract alphanumeric terms (min length 2)
        words = re.findall(r'\b[a-zA-Z0-9_\-\.]{2,}\b', text.lower())
        return words

    def search(self, query: str, top_k: int = 5, category: Optional[str] = None, user_profile: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        query_lower = query.lower()

        # 1. Normalize common clinical/phonetic typos
        norm_query = query_lower
        typo_map = {
            r"\bblod\b": "blood",
            r"\bperssure\b": "pressure",
            r"\bpresure\b": "pressure",
            r"\bhypertention\b": "hypertension",
            r"\bheadach\b": "headache",
            r"\bfevr\b": "fever",
            r"\bstomac\b": "stomach",
            r"\bmedicne\b": "medicine",
            r"\bmedicals\b": "medicine",
            r"\bsugr\b": "diabetes",
            r"\bsugar\b": "diabetes"
        }
        for pat, repl in typo_map.items():
            norm_query = re.sub(pat, repl, norm_query)

        query_tokens = self._tokenize(norm_query)
        if not query_tokens:
            return []

        # Stop words that should NOT generate raw keyword match points
        STOP_WORDS = {
            "suggest", "suggests", "recommend", "recommends", "medical", "medicine",
            "medicines", "drug", "drugs", "for", "with", "take", "taking", "can",
            "give", "tell", "what", "which", "and", "the", "of", "to", "in", "is",
            "a", "an", "high", "low", "some", "any", "please", "help"
        }

        # Detect specific query intents (interaction, dosage, alternative, allergy, treatment)
        is_interaction_query = any(w in norm_query for w in ["interaction", "together", "take with", "mix", "combine", "interact", "contraindicated"])
        is_dosage_query = any(w in norm_query for w in ["dose", "dosage", "how much", "mg", "frequency", "child", "adult", "day", "intake", "timing", "schedule"])
        is_alternative_query = any(w in norm_query for w in ["alternative", "substitute", "replace", "brand", "price", "pkr"])
        is_allergy_query = any(w in norm_query for w in ["allergic", "allergy", "rash", "reaction", "sensitiz", "safe"])
        is_treatment_query = any(w in norm_query for w in ["suggest", "recommend", "medicine for", "drug for", "treatment", "what to take", "what can i take", "treatment for"])

        # Profile context tokens (allergies, current meds, medical conditions)
        profile_allergies = []
        profile_meds = []
        profile_conditions = []
        if user_profile:
            if user_profile.get("allergies"):
                profile_allergies = self._tokenize(str(user_profile.get("allergies")))
            if user_profile.get("current_medications"):
                profile_meds = self._tokenize(str(user_profile.get("current_medications")))
            if user_profile.get("medical_conditions"):
                profile_conditions = self._tokenize(str(user_profile.get("medical_conditions")))

        expanded_tokens = [t for t in query_tokens if t not in STOP_WORDS]

        scores: Dict[int, float] = {}

        for token in expanded_tokens:
            matching_chunk_indices = self.index.get(token, [])
            for c_idx in matching_chunk_indices:
                scores[c_idx] = scores.get(c_idx, 0.0) + 1.0

        # Score boosting based on medicine name match and query intent
        scored_chunks = []
        for c_idx, base_score in scores.items():
            chunk = self.chunks[c_idx]
            score = base_score

            med_name_lower = chunk["medicine_name"].lower()
            generic_lower = chunk["generic_name"].lower()

            # Exact or substring match on medicine name (excluding stop words)
            med_matched = False
            for token in query_tokens:
                if token in STOP_WORDS:
                    continue
                if len(token) > 3 and token in med_name_lower:
                    score += 8.0
                    med_matched = True
                if len(token) > 3 and token in generic_lower:
                    score += 6.0
                    med_matched = True

            # Multi-word medicine check
            if any(med_part in norm_query for med_part in med_name_lower.split() if len(med_part) > 3 and med_part not in STOP_WORDS):
                score += 5.0
                med_matched = True

            # Boost category based on intent
            if is_interaction_query and chunk["category"] == "interaction":
                score += 15.0

            if is_dosage_query and chunk["category"] == "dosage":
                score += 18.0
                if med_matched:
                    score += 12.0

            if is_alternative_query and chunk["category"] == "alternative":
                score += 15.0
                if med_matched:
                    score += 10.0

            if is_allergy_query and chunk["category"] == "allergy":
                score += 15.0
                if med_matched:
                    score += 10.0

            # Boost if chunk directly addresses the user profile's allergies or medications
            if profile_allergies and chunk["category"] == "allergy":
                kw_lower = chunk.get("keywords", "")
                if any(al in kw_lower for al in profile_allergies if len(al) > 3):
                    score += 10.0
            if profile_meds and chunk["category"] == "interaction":
                kw_lower = chunk.get("keywords", "")
                if any(pm in kw_lower for pm in profile_meds if len(pm) > 3):
                    score += 10.0
            if profile_conditions and chunk["category"] in ["interaction", "contraindication"]:
                kw_lower = chunk.get("keywords", "")
                if any(pc in kw_lower for pc in profile_conditions if len(pc) > 3):
                    score += 8.0

            # Category filter if explicitly provided
            if category and chunk["category"] != category:
                continue

            scored_chunks.append((score, chunk))

        # Sort descending by score
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored_chunks[:top_k]]

    def find_interaction(self, drug1: str, drug2: str) -> Optional[Dict[str, Any]]:
        d1 = drug1.strip().lower()
        d2 = drug2.strip().lower()
        if not d1 or not d2:
            return None

        for chunk in self.chunks:
            if chunk["category"] == "interaction":
                m1 = str(chunk["metadata"].get("medicine_1", "")).lower()
                m2 = str(chunk["metadata"].get("medicine_2", "")).lower()
                kw = str(chunk.get("keywords", "")).lower()

                # Direct match in medicine_1 and medicine_2
                match_direct = (d1 in m1 and d2 in m2) or (d2 in m1 and d1 in m2)
                # Match in whole interaction chunk
                match_both = (d1 in kw or d1 in m1 or d1 in m2) and (d2 in kw or d2 in m1 or d2 in m2)

                if match_direct or match_both:
                    return chunk
        return None

# Singleton instance
rag_engine = FastMedicalRAG()
