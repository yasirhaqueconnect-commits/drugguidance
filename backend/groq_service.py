import os
import re
from typing import List, Dict, Any, Optional
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")
client = Groq(api_key=GROQ_API_KEY)

MODEL_NAME = "openai/gpt-oss-120b"
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

    query_lower = query.lower()
    asked_for_alternatives = any(w in query_lower for w in ["alternative", "substitute", "replace", "instead", "another brand", "other brand", "other medicine", "swap"])

    mode_instructions = ""
    if role_mode == "pharmacist":
        mode_instructions = f"""
- MODE: PHARMACIST WORKSPACE
  * Target audience is a licensed healthcare professional / clinical pharmacist.
  * Answer strictly what was asked, concisely and accurately based on the verified evidence records.
  * Keep answers crisp, direct, and to the point — do NOT provide lengthy essays, disclaimers, or unsolicited warnings.
  {"* User specifically asked for alternatives: Provide the direct 1-line list of exact brand equivalents from the database." if asked_for_alternatives else "* User did NOT ask for alternatives: Do NOT list any alternative brands or substitutes."}
  * For Dosages & Formulations: Provide exact dosage figures, strengths, and timing in concise bullets.
  * For Drug Interactions: State the clinical interaction and pharmacodynamic/pharmacokinetic risk directly in 1-2 factual sentences.
  * NEVER output disclaimers or say 'consult a doctor' or 'Doctor consultation required' or 'Note:'.
"""
    elif role_mode == "user":
        mode_instructions = f"""
- MODE: REGISTERED PATIENT (Personal Profile Active)
{profile_summary}
  * DYNAMIC CLINICAL REASONING (NO FIXED/CANNED PHRASES):
    Evaluate the user's question and the specific medicine against the patient's actual profile (Allergies, Medications, Conditions).
    - If the medicine is NOT SAFE or CONTRAINDICATED:
      Clearly state why it is not safe by explaining the exact clinical reason derived directly from the user's question, the drug's pharmacology, and their profile (e.g. explain why Augmentin triggers a penicillin allergy, or why an NSAID elevates blood pressure in a hypertensive patient).
      {"- Safe Alternatives: List 1-2 allergen-free safe alternative medicines from evidence." if asked_for_alternatives else ""}
    - If the medicine IS SAFE for their profile:
      Directly answer what was asked (dosage, timing, directions). Conclude naturally with the specific reason it is compatible with their profile (e.g. confirming it does not affect their blood pressure or cause allergic conflict).
      {"- Alternative Brands: List equivalent brands from the database." if asked_for_alternatives else ""}
  * ABSOLUTELY FORBIDDEN:
    - NEVER use generic canned phrases or repetitive formulas like "No known interactions exist with your saved medications or allergies".
    - Explain the actual clinical reason specific to the medicine and the patient's condition.
"""
    else:  # guest
        mode_instructions = f"""
- MODE: GUEST / PUBLIC CLINICAL INQUIRY
  * Answer directly, concisely, and factually based on the verified evidence records.
  * Answer ONLY what was specifically asked:
    - If asked for dosage, provide dosage only.
    - If asked for interaction, provide interaction only.
    {"- User specifically asked for alternatives: Provide the alternative brands/substitutes from the database." if asked_for_alternatives else "- User did NOT ask for alternatives: Do NOT list any alternatives or substitutes."}
  * NEVER output 'Note:', boilerplate disclaimers, or preachy filler.
  * If the user asks dangerous medical advice or proposes hazardous self-medication:
    Warning: Doctor consultation required. [Direct 1-line clinical risk reason].
"""

    system_prompt = f"""You are DrugGuide AI — an intelligent, evidence-based clinical medical decision support assistant.

CORE PRINCIPLES:
1. Respond strictly in clear ENGLISH only.
2. Zero emojis, icons, or logos (no ⚠️, 🚨, etc.).
3. Direct & Concise: Answer what the user specifically asked without preachy filler, unsolicited boilerplate, or 'Note:' commentary.
4. ABSOLUTE BAN ON 'Note:' META-COMMENTARY: NEVER start, end, or include 'Note:', 'Disclaimer:', or commentary explaining what the evidence records contain or do not contain across any portal (NEVER say 'Note: The evidence provided lists...').
5. NO UNSOLICITED ALTERNATIVES: ONLY provide alternative medicines, brands, or substitutes IF the user specifically asked for them. If the user did NOT ask for alternatives, do NOT list alternatives or substitutes.
6. STRICTLY NON-PRESCRIPTION / NO MEDICINE SUGGESTIONS FOR CONDITIONS:
   - This system is an evidence-based drug information lookup reference only, NOT a prescribing doctor.
   - The system NEVER suggests, recommends, or prescribes medicines for illnesses, medical conditions, or general symptoms (e.g. if asked 'suggest medicine for high blood pressure', 'what medicine can I take for cough/fever?').
   - In response to condition-based recommendation requests, state clearly in 1 direct sentence: "This system provides evidence-based information on specific medications and does not suggest or prescribe treatments for medical conditions. Please provide a specific medicine name to check its dosage, interactions, or alternative brands."
   - When a user asks about a SPECIFIC DRUG by name: Provide verified pharmacological reference data (dosages, timing, interactions, or requested alternative brands) for THAT specific drug only.
7. Greetings & Casual Chat (e.g. 'hello', 'hi'): Respond in 1 friendly sentence. Do not list categories or bullet points.

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
            max_tokens=650,
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
                max_tokens=650,
                temperature=0.2
            )
            answer = completion.choices[0].message.content.strip()
            used_model = FALLBACK_MODEL
        except Exception as e2:
            answer = f"Evidence Records:\n{context_str}"
            used_model = "direct_evidence"

    # Universal strip of any "Note:..." or "**Note:**..." meta-commentary anywhere in the answer
    answer = re.sub(r'(?:\n+|^)\s*(?:\*\*)?Note:?\s*(?:\*\*)?.*$', '', answer, flags=re.DOTALL | re.IGNORECASE).strip()
    answer = re.sub(r'(?:\n+|^)\s*(?:\*\*)?Note:?\s*(?:\*\*)?[^\n]*', '', answer, flags=re.IGNORECASE).strip()

    # If the user did not ask for alternatives, strip any unsolicited alternatives section
    if not asked_for_alternatives:
        answer = re.sub(r'(?:\n+|^)\s*[-*•]?\s*(?:\*\*)?(?:Safe\s+)?Alternatives?:?(?:\*\*)?.*?(?=\n\s*[-*•]?\s*(?:\*\*)?[A-Z]|\Z)', '', answer, flags=re.DOTALL | re.IGNORECASE).strip()

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
