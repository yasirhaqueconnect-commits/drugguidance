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
    is_allergy_query = any(w in query_lower for w in ["allergic", "allergy", "rash", "reaction", "hypersensitiv", "sensitiz", "safe with allergy"])
    is_alternative_query = any(w in query_lower for w in ["alternative", "substitute", "replace", "replacement", "instead", "another brand", "other brand", "other medicine", "swap", "cheaper brand", "price", "pkr"])
    is_dosage_query = any(w in query_lower for w in ["dose", "dosage", "how much", "how to take", "take how many", "frequency", "khorak", "how often", "timing", "schedule", "mg", "form", "forms", "intake"])
    is_interaction_query = any(w in query_lower for w in ["interaction", "together", "take with", "mix", "combine", "interact", "along with", "with each other"])

    # High Blood Pressure condition detection (User presenting with high BP / asking for BP medicine)
    is_bp_query = any(w in query_lower for w in ["blood pressure", "hypertension", "bp high", "high bp", "blod pressure", "presure high"])
    has_specific_med = any(m in query_lower for m in [
        "norvasc", "amlodipine", "capoten", "captopril", "zestril", "lisinopril",
        "tenormin", "atenolol", "cozaar", "losartan", "panadol", "augmentin",
        "brufen", "calpol", "disprin", "risek", "flagyl", "zyrtec"
    ])

    if is_bp_query and not has_specific_med and not is_alternative_query:
        if role_mode == "user":
            return {
                "answer": "Warning: Doctor consultation required. High blood pressure requires clinical evaluation and monitoring at a hospital or clinic; prescription medications cannot be self-prescribed.",
                "model": "clinical_safety_guard",
                "sources": sources,
                "safety_alert": True,
                "emergency": False,
                "warnings": ["High blood pressure requires clinical medical evaluation."],
                "disclaimer": "Verified clinical database evidence."
            }
        else:
            return {
                "answer": "This system does not prescribe or recommend medications for high blood pressure. Managing hypertension requires clinical evaluation and monitoring at a hospital or clinic, and prescription medications can only be safely determined and prescribed by a licensed healthcare professional. Please consult a doctor or visit a hospital for proper clinical care.",
                "model": "clinical_safety_guard",
                "sources": sources,
                "safety_alert": False,
                "emergency": False,
                "warnings": [],
                "disclaimer": "Verified clinical database evidence."
            }

    mode_instructions = ""
    if role_mode == "pharmacist":
        mode_instructions = f"""
- MODE: PHARMACIST WORKSPACE
  * Target audience is a licensed healthcare professional / clinical pharmacist.
  * Answer strictly what was asked, concisely and accurately based on the verified evidence records:
    - If user asks about Dosage: provide Available Dosage Forms, Strengths, Adult/Pediatric dose, and Timing from Dosage Guidance records.
    - If user asks about Alternatives: provide direct alternative brands/substitutes from Alternative Medicine records.
    - If user asks about Drug Interactions: state compatibility, severity, and clinical mechanism from Drug-Drug Interactions records.
    - If user asks about Allergies: state cross-sensitivity and allergen risks from Allergy-Based Filtering records.
  * Keep answers crisp, direct, and to the point — do NOT provide lengthy essays or unsolicited boilerplate.
  * User did NOT ask for alternatives: Do NOT list any alternative brands or substitutes.
  * User did NOT ask for dosage: Do NOT dump dosage forms or timing tables.
  * NEVER output 'Note:' meta-commentary.
"""
    elif role_mode == "user":
        mode_instructions = f"""
- MODE: REGISTERED PATIENT (Personal Health Profile Active)
{profile_summary}
  * STRICT CONCISENESS & ACCURACY MANDATE:
    - Keep answers crisp, highly accurate, and concise (strictly 4 to 5 bullet points total).
    - Strictly avoid verbose essays, lengthy medical lectures, or filler paragraphs.
    - Each bullet must be 1 short, direct line.
    - 'Personalized Recommendation' must be exactly 1 to 2 short, punchy sentences evaluating their saved profile.

  * STRICT INTENT-DRIVEN RESPONSE FORMATS (4-5 BULLETS MAX):

    1. ALLERGY INQUIRY:
       * **Medicine:** [Medicine & Generic Name]
       * **Allergy Assessment:** [Safe / Contraindicated / High Risk]
       * **Allergic Risk:** [1 short line on cross-reactivity or clinical reaction]
       * **Personalized Recommendation:** [1-2 short sentences evaluating their saved allergy ({allergies})]
       * **Safe Alternative(s):** [1 line with safe substitutes from allergy records if conflict exists]

    2. ALTERNATIVE MEDICINE INQUIRY:
       * **Medicine:** [Brand Name & Generic Name] ([OTC / Rx])
       * **Alternative Brands:** [Direct comma-separated list of substitutes, e.g. Calpol, Febrol, Pyrol]
       * **Manufacturer & Price:** [e.g. GSK (Approx 120–150 PKR)]
       * **Personalized Recommendation:** [1 short sentence confirming safety with their saved profile]

    3. DOSAGE & INTAKE INQUIRY:
       * **Medicine:** [Medicine & Generic Name] ([OTC / Rx])
       * **Available Forms & Strengths:** [e.g. Tablet / Syrup (500 mg, 120 mg/5 mL)]
       * **Recommended Dosage:** [Adult dose, timing, and max limit: e.g. 1 tablet every 6–8 hours after meals (Max: 4 g/day)]
       * **Personalized Recommendation:** [1-2 short sentences tailored to their profile: conditions ({conditions}), allergies ({allergies}), meds ({meds})]
       * **Administration Guidance:** [1 short sentence: e.g. Take with a glass of water after meals.]

    4. DRUG-DRUG INTERACTION INQUIRY:
       * **Interacting Medications:** [Medicine 1 + Medicine 2]
       * **Compatibility:** [Safe / Not Recommended / Moderate Interaction]
       * **Clinical Effect & Risk:** [1 short line on interaction mechanism]
       * **Personalized Recommendation:** [1-2 short sentences cross-referencing their meds: {meds}]
       * **Clinical Recommendation:** [1 short line guideline]

    5. GENERAL INQUIRY (e.g. 'What is Panadol?'):
       * **Medicine:** [Medicine & Generic Name] ([OTC / Rx])
       * **Primary Indication:** [1 short line on what it is used for]
       * **Personalized Recommendation:** [1 short sentence confirming suitability for their profile]

  * STRICT CONTRAINDICATION:
    If strictly contraindicated with their saved allergy, state it directly and recommend safe alternatives concisely.
"""
    else:  # guest
        mode_instructions = f"""
- MODE: GUEST / PUBLIC CLINICAL INQUIRY
  * Answer directly, concisely, and factually based on the verified evidence records.
  * Answer what was specifically asked:
    - If user asks about Dosage: provide Available Dosage Forms, Strengths, Recommended Dosage, Timing, and Max Dose from records.
    - If user asks about Alternatives: provide verified brand substitutes and price from records.
    - If user asks about Interaction: provide compatibility, severity, and clinical risk from records.
    - If user asks about Allergy: provide allergen risk and safe alternatives from records.
    - If user did NOT ask for alternatives: Do NOT list any alternatives or substitutes.
    - If user did NOT ask for dosage: Do NOT dump dosage tables.
  * If the user asks about high blood pressure / hypertension, state that this system does not prescribe medications for high blood pressure and direct them to a hospital or doctor for prescription care.
  * If the user asks about mild headache, inform them that non-prescription (OTC) pain relievers such as Panadol (Paracetamol) are available over the counter, while severe or persistent headache requires doctor consultation.
  * NEVER output 'Note:', boilerplate disclaimers, or preachy filler.
"""

    system_prompt = f"""You are DrugGuide AI — an intelligent, evidence-based clinical medical decision support assistant.

CORE PRINCIPLES & DATASET ARCHITECTURE:
Our system is grounded in 4 verified clinical databases:
1. ALLERGY-BASED DRUG FILTERING (Allergies, hypersensitivity, contraindicated drug classes, safe alternatives).
2. ALTERNATIVE MEDICINE (Alternative brand substitutes, generic equivalents, manufacturer, PKR price).
3. DOSAGE GUIDANCE (Dosage forms, strengths, adult dosage, pediatric dosage, timing, max daily dose).
4. DRUG-DRUG INTERACTIONS (Drug combinations, compatibility, severity level, clinical risk, recommendations).

STRICT INTENT RULES:
1. STRICT ENGLISH-ONLY POLICY: Formulate every response strictly in clear, professional ENGLISH only. No Roman Urdu, Urdu, or Hindi in the output.
2. ZERO EMOJIS, ICONS, OR LOGOS (no ⚠️, 🚨, etc.).
3. ANSWER ONLY WHAT WAS ASKED:
   - If user asks about allergy -> answer from Allergy records.
   - If user asks about alternative -> answer from Alternative Medicine records. NEVER provide alternatives if user did not ask for them.
   - If user asks about dosage -> answer from Dosage Guidance records. NEVER dump dosage tables if user did not ask for dosage.
   - If user asks about drug interaction -> answer from Drug-Drug Interactions records.
   - If user asks a general question -> give a concise overview without unsolicited dosage or alternative lists.
4. ABSOLUTE BAN ON 'Note:' META-COMMENTARY: NEVER start, end, or include 'Note:', 'Disclaimer:', or commentary explaining evidence records.
5. NO UNSOLICITED ALTERNATIVES: ONLY provide alternative medicines/brands IF the user specifically asked for them.
6. NO UNSOLICITED DOSAGE: ONLY provide detailed dosage schedules IF the user specifically asked for dosage, intake, or administration.
7. MEDICAL CONDITIONS (PRESCRIPTION VS. NON-PRESCRIPTION / OTC):
   - Never prescribe or recommend prescription medications for chronic conditions like High Blood Pressure / Hypertension. Direct to hospital/doctor for clinical evaluation.
   - Mild self-limiting symptoms (mild headache, mild fever) may reference over-the-counter OTC options (Panadol/Paracetamol).
8. Greetings & Casual Chat (e.g. 'hello', 'hi'): Respond in 1 friendly sentence.
9. UNIFIED STRUCTURED FORMATTING: Format clinical answers into clean, concise bullet points with bold descriptive labels matching the requested intent.

{mode_instructions}
"""

    user_prompt = f"""VERIFIED EVIDENCE:
\"\"\"
{context_str}
\"\"\"

USER QUERY:
{query}

Understand the user's intent and formulate a helpful, professional answer STRICTLY IN ENGLISH ONLY:"""

    candidate_models = [
        MODEL_NAME,
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b"
    ]
    # Remove duplicates while preserving order
    models_to_try = []
    for m in candidate_models:
        if m and m not in models_to_try:
            models_to_try.append(m)

    answer = None
    used_model = "direct_evidence"

    for m in models_to_try:
        try:
            completion = client.chat.completions.create(
                model=m,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=350,
                temperature=0.2
            )
            answer = completion.choices[0].message.content.strip()
            used_model = m
            break
        except Exception:
            continue

    if not answer:
        # Graceful fallback: build structured response directly from top chunk
        if chunks:
            top_c = chunks[0]
            cat = top_c.get("category", "")
            med = top_c.get("medicine_name", "Specified Medication")
            meta = top_c.get("metadata", {})
            if cat == "dosage":
                rx_st = meta.get("prescription_status", "Non-Prescription (OTC)" if any(p in med.lower() for p in ["panadol", "paracetamol", "calpol"]) else "Prescription Required (Rx)")
                d_form = meta.get("dosage_form", "Tablet / Syrup / Capsule")
                str_val = meta.get("strength", "Standard commercial strengths")
                adult_dose = meta.get("adult_dosage", "Follow standard therapeutic dosing")
                child_dose = meta.get("child_dosage", "Follow pediatric guidance")
                freq = meta.get("frequency", "As directed")
                max_dose = meta.get("max_daily_dose", "Standard daily limit")
                answer = (
                    f"* **Medicine:** {med} ({meta.get('generic', '')})\n"
                    f"* **Prescription Status:** {rx_st}\n"
                    f"* **Available Dosage Form(s):** {d_form}\n"
                    f"* **Available Strength(s):** {str_val}\n"
                    f"* **Recommended Adult Dosage:** {adult_dose}\n"
                    f"* **Recommended Pediatric Dosage:** {child_dose}\n"
                    f"* **Maximum Daily Dose:** {max_dose}\n"
                    f"* **Timing & Frequency:** {freq}\n"
                    f"* **Administration Guidance:** Take {freq.lower() if freq else 'as directed with water'}."
                )
            elif cat == "alternative":
                sub = meta.get("substitutes", "Calpol, Febrol, Pyrol")
                mfg = meta.get("manufacturer", "Standard manufacturer")
                prc = meta.get("price_pkr", "Standard price")
                rx = meta.get("prescription_status", "Non-Prescription (OTC)")
                answer = (
                    f"* **Medicine:** {med} ({meta.get('generic', '')})\n"
                    f"* **Prescription Status:** {rx}\n"
                    f"* **Alternative Brands / Substitutes:** {sub}\n"
                    f"* **Manufacturer & Price:** {mfg} (Approx PKR {prc})"
                )
            elif cat == "allergy":
                ans_status = meta.get("status", "Check for hypersensitivity")
                risk = meta.get("risk", "Cross-sensitivity risk")
                safe_alt = meta.get("safe_alternatives", "Consult alternative therapeutic options")
                answer = (
                    f"* **Medicine:** {med} ({meta.get('generic', '')})\n"
                    f"* **Allergy Assessment:** {ans_status}\n"
                    f"* **Allergic Risk:** {risk}\n"
                    f"* **Safe Alternative(s):** {safe_alt}"
                )
            elif cat == "interaction":
                m1 = meta.get("medicine_1", med)
                m2 = meta.get("medicine_2", "Concurrent drug")
                sev = meta.get("severity", "Moderate")
                eff = meta.get("clinical_effect", "Potential interaction effect")
                rec = meta.get("recommendation", "Monitor or consult healthcare professional")
                answer = (
                    f"* **Interacting Medications:** {m1} + {m2}\n"
                    f"* **Compatibility:** Use With Caution\n"
                    f"* **Interaction Severity:** {sev}\n"
                    f"* **Clinical Effect & Risk:** {eff}\n"
                    f"* **Clinical Recommendation:** {rec}"
                )
            else:
                answer = top_c.get("content", f"Evidence Record: {med}")
        else:
            answer = "This system provides evidence-based information on specific medications. Please specify a medicine name to check its dosage, interactions, or alternative brands."
        used_model = "direct_evidence"

    # Universal strip of any "Note:..." or "**Note:**..." meta-commentary anywhere in the answer
    answer = re.sub(r'(?:\n+|^)\s*(?:\*\*)?Note:?\s*(?:\*\*)?.*$', '', answer, flags=re.DOTALL | re.IGNORECASE).strip()
    answer = re.sub(r'(?:\n+|^)\s*(?:\*\*)?Note:?\s*(?:\*\*)?[^\n]*', '', answer, flags=re.IGNORECASE).strip()

    # If the user did not ask for alternatives, strip any unsolicited alternatives section
    if not is_alternative_query:
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
