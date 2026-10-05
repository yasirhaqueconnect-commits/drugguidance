# Drug Guidance Clinical Datasets

This directory contains the core clinical pharmacology datasets utilized by the **Drug Guidance RAG Engine** to index and synthesize medical evidence.

## Included Clinical Knowledge Collections:

1. **`ALLERGY-BASED DRUG FILTERING.xlsx`**
   - Active drug ingredients, formulation chemical classes, known allergens, sensitizing agents, and allergen-free substitutes.

2. **`ALTERNATIVE MEDICINE.xlsx`**
   - Direct active ingredient bio-equivalents, brand substitutes, dosage forms, manufacturers, prescription schedules, and pricing.

3. **`Dosage Guidance.xlsx`**
   - Clinical dosing guidelines, adult vs. pediatric recommendations, maximum daily thresholds, and administration frequencies.

4. **`DRUG-DRUG INTERACTIONS.xlsx`**
   - Pharmacodynamic & pharmacokinetic interaction matrices, severity gradations (Mild, Moderate, Severe, Contraindicated), mechanism explanations, and clinical management guidelines.

*Note: Datasets are automatically extracted, normalized, and cached into `backend/chunks_store.json` by `backend/data_loader.py`.*
