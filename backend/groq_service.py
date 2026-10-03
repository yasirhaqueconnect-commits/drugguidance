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

    mode_instructions = ""
    if role_mode == "pharmacist":
        mode_instructions = """
- MODE: PHARMACIST WORKSPACE
  * Target audience is a licensed healthcare professional.
  * Provide high-precision, peer-level pharmacology data (mechanisms of action, formulation equivalents, pharmacokinetics, cross-sensitivities).
  * NEVER output preachy disclaimers or say 'consult a doctor' — provide objective clinical data suitable for professional clinical review.
"""
    elif role_mode == "user":
        mode_instructions = f"""
- MODE: REGISTERED PATIENT (Personal Profile Active)
{profile_summary}
  * Evaluate the inquiry strictly against the patient's personal profile (Allergies, Medications, Age, Conditions):
    - If a CONFLICT or CONTRAINDICATION is found (e.g. allergy match or interaction with ongoing meds):
      Warning: Not safe for your profile. [Direct 1-line reason: e.g. You are allergic to Penicillin, and Augmentin contains Amoxicillin].
      - **Safe Alternatives:** [Allergen-free/safe alternatives from evidence]
      - **Action:** [Consult your doctor for a prescription]
    - If SAFE for their profile:
      - **Guidance:** [Direct factual answer]
      - **Profile Safety:** [1 short confirmation that no known interaction exists with their saved medications/allergies]
"""
    else:  # guest
        mode_instructions = """
- MODE: GUEST / PUBLIC CLINICAL INQUIRY
  * Answer directly, concisely, and factually based on the verified evidence records.
  * For Direct Inquiries (Alternatives, Brand Substitutes, Indications, Formulations, Dosages):
    - **Guidance:** [Direct factual answer based on the database]
    - Do NOT append boilerplate disclaimers (e.g., do NOT add generic 'These medications are prescription-only; consult a doctor' notes on standard lookups).
    - ONLY add a second bullet point if the evidence specifically mentions a clinically significant precaution (e.g., food requirements, black box warning, or specific organ contraindication).
  * If the user asks dangerous medical advice or proposes hazardous self-medication:
    Warning: Doctor consultation required. [Direct 1-line clinical risk reason].
"""

    system_prompt = f"""You are DrugGuide AI — an intelligent, evidence-based clinical medical decision support assistant.

CORE PRINCIPLES:
1. Respond strictly in clear ENGLISH only.
2. Zero emojis, icons, or logos (no ⚠️, 🚨, etc.).
3. Direct & Concise: Answer what the user specifically asked without preachy filler or unsolicited boilerplate disclaimers.
4. Greetings & Casual Chat (e.g. 'hello', 'hi'): Respond in 1 friendly sentence. Do not list categories or bullet points.

{mode_instructions}
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
