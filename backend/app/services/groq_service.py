import os
import re
from typing import List, Dict, Any, Optional
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")
client = Groq(api_key=GROQ_API_KEY)

MODEL_NAME = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
FALLBACK_MODEL = "openai/gpt-oss-120b"

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
        height = user_profile.get("height") or "Not specified"
        weight = user_profile.get("weight") or "Not specified"
        pregnancy = user_profile.get("pregnancy_status") or "Not applicable"
        profile_summary = (
            f"Active Patient Profile to Evaluate:\n"
            f"- Age: {age} | Gender: {gender} | Height: {height} | Weight: {weight}\n"
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
- MODE: REGISTERED PATIENT (Personal Health Profile Active)
{profile_summary}
  * MANDATORY PERSONALIZED PROFILE SCANNING & CLINICAL EVALUATION:
    You MUST rigorously cross-reference the user's inquiry and any referenced medicine against EVERY parameter of their saved patient profile in the background:
    1. ALLERGIES: Cross-check drug composition/class against their saved allergies (e.g., penicillin/beta-lactams, sulfa, aspirin, NSAIDs). If allergic conflict exists, it is strictly contraindicated.
    2. MEDICAL CONDITIONS: Cross-check if the medicine exacerbates or is contraindicated with their saved conditions (e.g., NSAIDs in Hypertension, Kidney disease, or Asthma; decongestants in Hypertension).
    3. CURRENT MEDICATIONS: Cross-check drug-drug interactions between what they ask about and their ongoing medications.
    4. PREGNANCY & AGE: If pregnancy is indicated, check trimester safety and fetal risk. If pediatric or elderly age is noted, evaluate dosage sensitivity.

  * WARNINGS FORMAT (EXACT SAME AS GUEST & PHARMACIST):
    If the requested medicine is STRICTLY CONTRAINDICATED with the patient's saved profile (e.g. allergy conflict, pregnancy risk, or exacerbation of their medical condition) OR dangerous self-medication is proposed:
    Output ONLY the single direct warning line (without extra preamble, so it renders in the amber warning card):
    Warning: Doctor consultation required. [Direct clinical risk reason naming the specific profile conflict].

  * UNIFIED STRUCTURED LAYOUT (WHEN PERMITTED / CLINICALLY GUIDED):
    When the medicine is permitted or guidance is safe for their profile, format the response into clean, concise bullets with bold labels matching the exact standard layout:
    * **Status:** Permitted (or Use With Caution).
    * **Clinical Guidance & Dosage:** [Accurate dosage, strength, and frequency from verified database records].
    * **Profile Safety Evaluation:** [Confirm safety against their background profile — explicitly naming their saved conditions, allergies, and ongoing medications].
    * **Administration:** [Timing instructions, e.g. Take after meals, with water].
    {"* **Safe Alternative:** [List 1-2 safe alternatives from database that do not conflict with their allergies or conditions]." if asked_for_alternatives else ""}

  * ABSOLUTELY FORBIDDEN:
    - NEVER give a generic canned statement like 'No interactions found with your profile'. Always name their actual condition, allergy, or medication specifically to demonstrate real profile awareness.
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
6. SYMPTOMS & CLINICAL INDICATIONS (e.g. fever, headache, pain, acidity, allergy):
   - When the user asks about symptoms or conditions (e.g. 'I have a fever, what medicine and dose?', 'acidity and heartburn', 'headache'):
   - Identify the appropriate first-line medicine(s) from the verified evidence records (e.g. Panadol / Paracetamol or Brufen / Ibuprofen for fever/pain; Risek / Omeprazole for acidity; Zyrtec for allergies).
   - Provide the exact verified adult and/or pediatric dosage, frequency, and timing directly and concisely from the evidence records.
   - Do NOT refuse to answer common symptoms when the evidence contains verified first-line treatments for them.
7. Greetings & Casual Chat (e.g. 'hello', 'hi'): Respond in 1 friendly sentence. Do not list categories or bullet points.
8. UNIFIED STRUCTURED FORMATTING (EXCEPT FOR WARNINGS):
   - Except for doctor warnings, ALWAYS format clinical answers (dosage, intake confirmation, interactions, symptom guidance) into clean, concise bullet points with bold descriptive labels.
   - For intake / dosage confirmation (e.g. 'Can I take two capsules of omeprazole 20mg per day'):
     * **Status:** Yes, permitted (or Not recommended).
     * **Dosage Guidance:** [Explain specific dose, e.g. Maximum daily dose for Omeprazole (Risek) is 40 mg/day, corresponding to two 20 mg capsules].
     * **Administration:** [e.g. Take 30-60 minutes before meals].
   - For drug interaction questions:
     * **Compatibility:** Not recommended / Safe.
     * **Interaction Severity:** Severe / Moderate (e.g. both are NSAIDs).
     * **Clinical Risk:** [Specific risk, e.g. Increased stomach ulcers and bleeding].
   - For symptom & medicine guidance:
     * **First-Line Medicine:** [Drug name and brand]
     * **Adult Dosage:** [Dose and frequency]
     * **Child Dosage:** [Syrup dose if available]
     * **Administration:** [Timing, e.g. After meal, max daily dose]
   - SAFETY WARNINGS EXCEPTION: When doctor consultation is required or dangerous self-medication is proposed, output ONLY the single direct warning line without any bullets or extra paragraphs before or after:
     Warning: Doctor consultation required. [Direct 1-line clinical risk reason].

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
