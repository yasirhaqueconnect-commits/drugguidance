import os
from typing import List, Dict, Any, Optional
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")
client = Groq(api_key=GROQ_API_KEY)

MODEL_NAME = "qwen/qwen3.8-27b"
FALLBACK_MODEL = "openai/gpt-oss-20b"

def generate_medical_response(
    query: str,
    chunks: List[Dict[str, Any]],
    role_mode: str = "guest",
    user_profile: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Intelligent medical assistant:
    1. Understands general conversation/greetings naturally and helpfully.
    2. Understands symptoms, dosages, interactions, alternatives, and allergies.
    3. Strictly English only, zero emojis/logos, clean structured markdown.
    """
    context_blocks = []
    sources = []
    for i, c in enumerate(chunks, 1):
        context_blocks.append(f"--- EVIDENCE RECORD {i} [{c['category'].upper()}] ---\n{c['content']}")
        sources.append({
            "id": c.get("id"),
            "category": c.get("category"),
            "medicine_name": c.get("medicine_name"),
            "metadata": c.get("metadata", {})
        })
    
    context_str = "\n\n".join(context_blocks) if context_blocks else "NO DIRECT RECORDS FOUND FOR THIS SPECIFIC TERM."

    profile_summary = ""
    if user_profile and role_mode == "user":
        allergies = user_profile.get("allergies") or "None"
        meds = user_profile.get("current_medications") or "None"
        conditions = user_profile.get("medical_conditions") or "None"
        age = user_profile.get("age") or "Not specified"
        gender = user_profile.get("gender") or "Not specified"
        pregnancy = user_profile.get("pregnancy_status") or "Not applicable"
        profile_summary = (
            f"Active Patient Profile to Evaluate:\n"
            f"- Age: {age} | Gender: {gender}\n"
            f"- Known Allergies: {allergies}\n"
            f"- Ongoing Medications: {meds}\n"
            f"- Medical Conditions: {conditions}\n"
            f"- Pregnancy Status: {pregnancy}"
        )

    system_prompt = f"""You are DrugGuide AI — an intelligent, evidence-based clinical medical assistant.

RULES:
1. GREETINGS & SHORT CHAT (e.g. 'hello', 'hi', 'can you help me'):
   - Respond in 1 single, friendly sentence (e.g. 'Hello! How can I help you with your medication or health query today?').
   - Do NOT list services or bullet points for a greeting.

2. REGISTERED USER PERSONALIZED PROFILE JUDGMENT:
   - When a registered user asks about ANY medicine, symptom, or treatment:
     Evaluate their query strictly through their personal profile (Allergies, Medications, Age, Conditions):
     * If CONFLICT or DANGER detected (e.g. allergy match or drug interaction with ongoing meds):
       Warning: Not safe for your profile. [Direct reason: e.g. You are allergic to Penicillin, and Augmentin contains Amoxicillin].
       - **Safe Alternatives:** [Allergen-free/safe alternatives from evidence]
       - **Action:** [Consult your doctor for a prescription]
     * If SAFE for their profile:
       - **Guidance:** [Direct dosage or treatment answer tailored to their age/profile]
       - **Profile Safety:** [1 short line confirming it has no known interaction with their ongoing meds/allergies]

3. FACTUAL INQUIRIES & CLINICAL QUESTIONS (ALL ROLES & GUESTS):
   - Never start with a greeting or self-introduction when answering a medical query.
   - For factual queries (e.g. alternatives, brand substitutes, indications, mechanism, classifications):
     * - **Guidance:** [Direct, accurate answer listing brand alternatives, generic active ingredients, or indications from the evidence].
     * If there is an essential pharmacological detail (e.g. combination with Clavulanic Acid, extended release), state it succinctly.
     * Do NOT attach generic, repetitive disclaimers such as "These medications are prescription-only; consult a qualified physician". Only answer the requested factual information.
   - For dosage and administration queries:
     * - **Guidance:** [Standard adult/pediatric dosage and frequency from evidence].
     * - **Precautions:** [Specific clinical rule from evidence, e.g. take after meals, max daily dose, or alcohol avoidance. Do NOT add generic filler].
   - For drug-drug interactions, self-medication dangers, or high-risk conflicts:
     * Warning: Doctor consultation required. [Direct 1-line reason identifying the interacting drugs or clinical risk].
     * - **Risks:** [Key physiological risks, adverse reactions, or toxicity].
     * - **Action:** [Safe alternative approach or clinical monitoring recommendation].

4. LANGUAGE & FORMATTING:
   - Respond strictly in clear ENGLISH only.
   - Do NOT use emojis, logos, or icons (no ⚠️, 🚨, etc.).
   - Keep answers clean, concise, and under 3-4 bullet lines.

{f"{profile_summary}" if profile_summary else ""}
"""

    user_prompt = f"""VERIFIED EVIDENCE:
\"\"\"
{context_str}
\"\"\"

USER QUERY:
{query}

Understand the user's intent and formulate a helpful, professional answer in English:"""

    try:
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=350,
            temperature=0.2
        )
        answer = completion.choices[0].message.content.strip()
        used_model = MODEL_NAME
    except Exception as e:
        try:
            completion = client.chat.completions.create(
                model=FALLBACK_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=350,
                temperature=0.2
            )
            answer = completion.choices[0].message.content.strip()
            used_model = FALLBACK_MODEL
        except Exception as e2:
            answer = f"Evidence Records:\n{context_str}"
            used_model = "direct_evidence"

    # Intelligent cleanup: Remove redundant generic boilerplate disclaimers from routine factual inquiries
    if not any(w in answer.lower() for w in ["warning:", "contraindicated", "fatal", "emergency"]):
        import re
        canned_disclaimers = [
            r'^\s*[-*•]?\s*\*\*(?:Important Note|Note):\*\*\s*(?:These medications are prescription-only[^\n]*|Consult a (?:qualified )?physician[^\n]*|Please consult[^\n]*)\s*$',
            r'^\s*[-*•]?\s*\*\*(?:Important Note|Note):\*\*\s*.*(?:prescription-only|consult a qualified physician).*\s*$'
        ]
        for pat in canned_disclaimers:
            answer = re.sub(pat, '', answer, flags=re.IGNORECASE | re.MULTILINE).strip()

    # Detect safety alerts
    safety_alert = any(w in answer.lower() for w in ["warning:", "contraindicated", "avoid using together", "allergic reaction"])
    emergency = any(w in answer.lower() for w in ["emergency", "fatal", "immediate medical attention"])

    return {
        "answer": answer,
        "model": used_model,
        "sources": sources,
        "safety_alert": safety_alert,
        "emergency": emergency,
        "warnings": ["Consult a healthcare provider before altering medications."] if safety_alert else [],
        "disclaimer": "Verified clinical database evidence."
    }
