# 🩺 DrugGuide AI — End-to-End System Architecture & Technical Manual (A to Z)

An enterprise-grade, evidence-based **Clinical Pharmacological Decision Support System (CDSS)** combining an ultra-fast in-memory **Retrieval-Augmented Generation (RAG)** engine with **Groq AI Clinical LLM Inference**, backed by a multi-tenant **Neon Cloud PostgreSQL** database and a modern **Next.js 14 (TypeScript)** frontend.

---

## 📑 Table of Contents
1. [Executive Summary & Core Mission](#1-executive-summary--core-mission)
2. [End-to-End System Architecture Diagram](#2-end-to-end-system-architecture-diagram)
3. [Step-by-Step Life of a Clinical Query (A to Z Pipeline)](#3-step-by-step-life-of-a-clinical-query-a-to-z-pipeline)
4. [The 3 Core Modules Detailed](#4-the-3-core-modules-detailed)
   - [Module 1: Registered Patient Portal](#module-1-registered-patient-portal-userchat)
   - [Module 2: Licensed Pharmacist Workspace](#module-2-licensed-pharmacist-workspace-pharmacistchat)
   - [Module 3: Public Guest Portal](#module-3-public-guest-portal-chatguest)
5. [In-Memory Hybrid RAG Engine (<1ms Sub-Millisecond Retrieval)](#5-in-memory-hybrid-rag-engine-1ms-sub-millisecond-retrieval)
6. [Clinical Datasets & Evidence Knowledge Base](#6-clinical-datasets--evidence-knowledge-base)
7. [Multi-Tenant Database Architecture & 9-Table Isolation Matrix](#7-multi-tenant-database-architecture--9-table-isolation-matrix)
8. [Security, Cryptography & Access Control](#8-security-cryptography--access-control)
9. [Project Directory & Clean Architecture Layout](#9-project-directory--clean-architecture-layout)
10. [Complete RESTful API Reference](#10-complete-restful-api-reference)
11. [Quick Start & 1-Click Launch Guide](#11-quick-start--1-click-launch-guide)

---

## 1. Executive Summary & Core Mission

DrugGuide AI is engineered to bridge the critical safety gap in pharmaceutical decision-making. By cross-referencing patient clinical profiles (allergies, pre-existing conditions, concurrent medications) against **1,987 curated medical evidence chunks**, the platform:
* Prevents severe **Drug-Drug Interactions (DDIs)**.
* Detects **Drug-Allergy Cross-Reactivity** (e.g., Penicillins and Cephalosporins).
* Supplies verified **Dosage Guidelines** (adult, pediatric, renal adjustments).
* Suggests bio-equivalent **Generic & Brand Substitutes** tailored for regional healthcare markets.
* Provides healthcare practitioners with **Audit-Ready PDF and CSV Documentation**.

---

## 2. End-to-End System Architecture Diagram

```text
+----------------------------------------------------------------------------------------------------+
|                                      CLIENT PRESENTATION LAYER                                     |
|                                    Next.js 14 • React • TypeScript                                 |
|                                                                                                    |
|    +------------------------+    +-------------------------------+    +------------------------+   |
|    |     PATIENT PORTAL     |    | PHARMACIST CLINICAL WORKSPACE |    |   GUEST PUBLIC PORTAL  |   |
|    |      (/user/chat)      |    |      (/pharmacist/chat)       |    |      (/chat/guest)     |   |
|    |  - Health Profile Scan |    |  - Drug Interaction Matrix    |    |  - Zero Login Inquiries|   |
|    |  - Allergy Guardrails  |    |  - Private Clinical Notes     |    |  - Fast Dosage Lookup  |   |
|    |  - Consultation History|    |  - Audit PDF / CSV Exports    |    |  - Strict Anonymity    |   |
|    +------------------------+    +-------------------------------+    +------------------------+   |
+--------------------------------------------------+-------------------------------------------------+
                                                   |
                                     HTTPS REST / JWT Bearer Auth
                                                   |
+--------------------------------------------------v-------------------------------------------------+
|                                    APPLICATION API GATEWAY                                         |
|                                     FastAPI • ASGI • Python                                        |
|                                                                                                    |
|    +----------------------+  +----------------------+  +---------------------+  +----------------+ |
|    |     Auth Router      |  |    Profile Router    |  |     Chat Router     |  | Conversations  | |
|    |   /auth/user/*       |  |   /profile/user      |  |     /api/chat       |  | /conversations | |
|    |   /auth/pharmacist/* |  |   /profile/pharmacist|  | (Unified RAG Route) |  | - Notes Modal  | |
|    |   /auth/me           |  |   /profile/me        |  |                     |  | - PDF/CSV Exp  | |
|    +----------------------+  +----------------------+  +---------------------+  +----------------+ |
+--------------------------------------------------+-------------------------------------------------+
                                                   |
                        +--------------------------+--------------------------+
                        |                                                     |
+-----------------------v--------------------------+   +----------------------v----------------------+
|             BUSINESS LOGIC & ENGINE              |   |                 DATA LAYER                  |
|                                                  |   |                                             |
|  +--------------------------------------------+  |   |  +---------------------------------------+  |
|  |    IN-MEMORY HYBRID RAG (<1ms LATENCY)     |  |   |  |   NEON CLOUD POSTGRESQL (RELATIONAL)  |  |
|  |  - Inverted Token Index                    |  |   |  |                                       |  |
|  |  - 1,987 Pre-Indexed Clinical Chunks       |  |   |  |  1. PATIENT DEDICATED TABLES:         |  |
|  |  - Allergy, Dosage, Substitutes, DDIs      |  |   |  |     - users                           |  |
|  +--------------------------------------------+  |   |  |     - user_conversations              |  |
|                                                  |   |  |     - user_messages                   |  |
|  +--------------------------------------------+  |   |  |                                       |  |
|  |       GROQ AI INFERENCE CLOUD              |  |   |  |  2. PHARMACIST DEDICATED TABLES:      |  |
|  |  - Llama 3 70B / Qwen 2.5 Clinical Engine  |  |   |  |     - pharmacists                     |  |
|  |  - Medical Ground-Truth Context Injection  |  |   |  |     - pharmacist_conversations        |  |
|  |  - Amber Warning Flag Protocol             |  |   |  |     - pharmacist_messages             |  |
|  +--------------------------------------------+  |   |  |     - pharmacist_notes                |  |
|                                                  |   |  |                                       |  |
|  +--------------------------------------------+  |   |  |  3. GUEST DEDICATED TABLES:           |  |
|  |       CLINICAL AUDIT EXPORT ENGINE         |  |   |  |     - guest_conversations             |  |
|  |  - ReportLab Publication Medical PDF       |  |   |  |     - guest_messages                  |  |
|  |  - Excel UTF-8 BOM CSV Generator          |  |   |  +---------------------------------------+  |
|  +--------------------------------------------+  |                                                 |
+--------------------------------------------------+-------------------------------------------------+
```

---

## 3. Step-by-Step Life of a Clinical Query (A to Z Pipeline)

Every single clinical consultation query executes through a deterministic, high-security 7-stage pipeline:

```text
[1. User Enters Query] 
        │
        ▼
[2. Frontend API Dispatch] ──► Passes JWT Token (if authenticated) + Session ID + User Message
        │
        ▼
[3. Session & Profile Extraction]
        ├─ If Patient: Fetches allergies, conditions, current meds from 'users' table.
        ├─ If Pharmacist: Extracts license, clinical setting & switches to Practitioner Mode.
        └─ If Guest: Uses guest session or provisions new 'guest_conversations' record.
        │
        ▼
[4. Sub-Millisecond Hybrid RAG Search (<1ms)]
        ├─ Inverted index matches keywords, generic drug names, brand names, and allergens.
        ├─ Retrieves top-5 highest-scoring clinical evidence chunks (from 1,987 dataset items).
        └─ Formats evidence as verified medical grounding context.
        │
        ▼
[5. Clinical Prompt Synthesis & Groq AI Inference]
        ├─ Patient Profile + RAG Ground-Truth + Conversation History injected into system prompt.
        ├─ Groq Cloud LLM analyzes contraindications, dosage limits, and active ingredients.
        └─ Generates structured response with bold status, dosage guidance, and safety flags.
        │
        ▼
[6. Isolated Multi-Tenant Persistence]
        ├─ Patient query & response ──► Appended to 'user_messages'.
        ├─ Pharmacist query & response ──► Appended to 'pharmacist_messages'.
        └─ Guest query & response ──► Appended to 'guest_messages'.
        │
        ▼
[7. Presentation & Audit Ready]
        ├─ UI renders markdown formatted guidance with distinct warning badges.
        └─ Pharmacist can attach private clinical notes or export PDF/CSV on demand.
```

---

## 4. The 3 Core Modules Detailed

### Module 1: Registered Patient Portal (`/user/chat`)
* **Purpose**: Personalized consumer healthcare safety and medicine guidance.
* **Automatic Profile Scan**: When a patient asks about any medicine, the backend automatically reads their background health profile (`allergies`, `medical_conditions`, `current_medications`, `pregnancy_status`, `age`).
* **Active Guardrails**: If a patient with a documented penicillin allergy asks for *Augmentin* (Amoxicillin + Clavulanic acid), the system suppresses casual advice and immediately displays:
  > **⚠️ Warning: Doctor consultation required.** Augmentin contains Amoxicillin, which belongs to the Penicillin (Beta-Lactam) class. Taking this medication poses a severe risk of allergic reaction.
* **Session Management**: Patients can view previous consultation transcripts, rename threads, and bookmark important sessions. All history is strictly isolated in `user_conversations` and `user_messages`.

### Module 2: Licensed Pharmacist Workspace (`/pharmacist/chat`)
* **Purpose**: Advanced clinical pharmacology workspace for registered pharmacists.
* **Authentication**: Requires professional verification with state/national registration (e.g. `RPH-99214-PK`).
* **Clinical Mode Output**: Strips away generic disclaimers and delivers direct clinical pharmacology:
  - Exact pharmacokinetic/pharmacodynamic interaction mechanisms.
  - CYP450 enzyme induction/inhibition details (e.g., Omeprazole inhibiting CYP2C19 activation of Clopidogrel).
  - Therapeutic alternative recommendations and bio-equivalents.
* **Private Clinical Notes**: Pharmacists can attach private observations and patient counseling notes (`pharmacist_notes`) to any session.
* **Clinical Audit Exports**:
  - **Publication-Grade PDF**: Formatted using ReportLab with Case ID, timestamp, pharmacist license, clinical inquiry, synthesized guidance, and private clinical notes.
  - **Audit CSV**: Generates Microsoft Excel-compatible UTF-8 BOM spreadsheets with clean, stripped text formatting.

### Module 3: Public Guest Portal (`/chat/guest`)
* **Purpose**: Rapid, unauthenticated medicine and dosage lookups for the public.
* **Zero Registration**: Users can immediately search dosages, generic equivalents, and side effects without logging in.
* **Privacy Isolation**: Guest sessions are tracked strictly via guest session IDs and stored exclusively in `guest_conversations` and `guest_messages`. Guest queries never touch patient tables or health profiles.

---

## 5. In-Memory Hybrid RAG Engine (<1ms Sub-Millisecond Retrieval)

Traditional vector databases (Pinecone, Chroma, Milvus) incur 150–500ms of embedding generation and HTTP round-trip latency. In a clinical setting where exact chemical and drug names must match with 100% precision, vector similarity often suffers from fuzzy semantic drift (e.g., confusing *Cefalexin* with *Ciprofloxacin*).

DrugGuide AI implements a **Deterministic In-Memory Inverted Index**:
1. **Startup Pre-Indexing**: On application boot, `rag_engine.py` loads `chunks_store.json` containing **1,987 curated medical chunks**.
2. **Token Inverted Index**: Creates a RAM dictionary mapping tokens, exact brand names, generic formulations, and allergen categories to chunk references.
3. **Hybrid Scoring Algorithm**:
   $$\text{Score}(Q, C) = \sum_{t \in Q \cap C} w_t \cdot \text{TF}(t, C) + \text{Bonus}_{\text{ExactName}} + \text{Bonus}_{\text{AllergenCategory}}$$
4. **Sub-Millisecond Execution**: RAG retrieval completes in **<0.8ms**, retrieving the top-5 most relevant chunks to ground the LLM inference.

---

## 6. Clinical Datasets & Evidence Knowledge Base

All medical datasets reside in `datasets/` and are parsed into `chunks_store.json`:

| Dataset File | Evidence Records | Clinical Domain |
| :--- | :---: | :--- |
| `ALLERGY-BASED DRUG FILTERING.xlsx` | 310 chunks | Allergen classes (Penicillins, Sulfa, NSAIDs), symptoms, cross-reactivity & safe alternatives. |
| `ALTERNATIVE MEDICINE.xlsx` | 468 chunks | Brand names, manufacturers, active ingredients, and generic bio-equivalents. |
| `DRUG-DRUG INTERACTIONS.xlsx` | 845 chunks | Pairwise interactions, severity levels (Minor, Moderate, Severe), mechanism & clinical effects. |
| `Dosage Guidance.xlsx` | 364 chunks | Indications, standard adult doses, pediatric dosing, maximum daily limits & administration timings. |
| **Total Evidence Base** | **1,987 chunks** | **100% Verified Medical Ground Truth** |

---

## 7. Multi-Tenant Database Architecture & 9-Table Isolation Matrix

The system connects to **Neon Cloud PostgreSQL** with complete table separation per tenant role:

```text
[PATIENT CLUSTER]              [PHARMACIST CLUSTER]             [GUEST CLUSTER]
┌─────────────────┐            ┌──────────────────────┐         ┌────────────────────┐
│ users           │            │ pharmacists          │         │guest_conversations │
└────────┬────────┘            └──────────┬───────────┘         └─────────┬──────────┘
         │ 1:N                            │ 1:N                           │ 1:N
┌────────▼────────┐            ┌──────────▼───────────┐         ┌─────────▼──────────┐
│user_conversatns │            │pharmacist_conversatns│         │ guest_messages     │
└────────┬────────┘            └──────┬───────────┬───┘         └────────────────────┘
         │ 1:N                        │ 1:N       │ 1:N
┌────────▼────────┐            ┌──────▼──────┐ ┌──▼───────────┐
│ user_messages   │            │pharm_messags│ │pharm_notes   │
└─────────────────┘            └─────────────┘ └──────────────┘
```

### Table Definitions & Foreign Key Rules

| Table Name | Owner Role | Primary Key | Foreign Key / Cascade | Critical Columns |
| :--- | :--- | :--- | :--- | :--- |
| `users` | Patient | `id` (SERIAL) | None | `email`, `hashed_password`, `allergies`, `medical_conditions`, `current_medications`, `age` |
| `user_conversations` | Patient | `id` (SERIAL) | `user_id ──► users.id` (CASCADE) | `title`, `category`, `is_bookmarked`, `created_at` |
| `user_messages` | Patient | `id` (SERIAL) | `conversation_id ──► user_conversations.id` (CASCADE) | `sender`, `content`, `metadata_json`, `timestamp` |
| `pharmacists` | Pharmacist | `id` (SERIAL) | None | `email`, `hashed_password`, `license_number`, `full_name`, `created_at` |
| `pharmacist_conversations` | Pharmacist | `id` (SERIAL) | `pharmacist_id ──► pharmacists.id` (CASCADE) | `title`, `category`, `is_bookmarked`, `created_at` |
| `pharmacist_messages` | Pharmacist | `id` (SERIAL) | `conversation_id ──► pharmacist_conversations.id` (CASCADE) | `sender`, `content`, `metadata_json`, `timestamp` |
| `pharmacist_notes` | Pharmacist | `id` (SERIAL) | `conversation_id ──► pharmacist_conversations.id` (CASCADE) | `note_text`, `pharmacist_id ──► pharmacists.id`, `created_at` |
| `guest_conversations` | Guest | `id` (SERIAL) | None | `title`, `created_at` |
| `guest_messages` | Guest | `id` (SERIAL) | `conversation_id ──► guest_conversations.id` (CASCADE) | `sender`, `content`, `metadata_json`, `timestamp` |

---

## 8. Security, Cryptography & Access Control

* **Password Hashing**: Uses raw `bcrypt` with automated salt generation (12 cost factor rounds). Passwords are never stored in plain text.
* **JWT Bearer Authentication**: Uses HMAC-SHA256 (`HS256`) signed tokens carrying:
  - `sub`: User/Pharmacist primary ID.
  - `email`: Authenticated email address.
  - `role`: `"user"` or `"pharmacist"`.
  - `exp`: 7-day session expiration.
* **Role Verification Middleware**: `get_current_user_required` dependency decrypts the token, extracts the caller's role, and verifies the identity against the database before executing any protected route.
* **Cross-Module Leak Prevention**: Any attempt by a patient to query pharmacist conversation IDs returns `404 Not Found` due to isolated table lookups.

---

## 9. Project Directory & Clean Architecture Layout

```text
drugguidance/
├── datasets/                            # Medical knowledge bases (Excel)
│   ├── ALLERGY-BASED DRUG FILTERING.xlsx
│   ├── ALTERNATIVE MEDICINE.xlsx
│   ├── DRUG-DRUG INTERACTIONS.xlsx
│   ├── Dosage Guidance.xlsx
│   └── README.md
│
├── backend/                             # Modular FastAPI Clean Architecture
│   ├── main.py                          # Lean root runner (<20 lines)
│   ├── chunks_store.json                # Pre-indexed 1,987 chunks cache
│   ├── .env                             # Database connection & Groq API key
│   └── app/
│       ├── main.py                      # FastAPI App Factory & CORS Middleware
│       ├── core/                        # Infrastructure
│       │   ├── config.py                # Pydantic Settings & DB URL normalizer
│       │   ├── database.py              # SQLAlchemy engine & SessionLocal
│       │   └── security.py              # Bcrypt hashing & JWT Bearer guards
│       ├── models/                      # Dedicated SQLAlchemy ORM models
│       │   ├── user.py                  # User, UserConversation, UserMessage
│       │   ├── pharmacist.py            # Pharmacist, PharmacistConv, Notes, Messages
│       │   └── guest.py                 # GuestConversation, GuestMessage
│       ├── schemas/                     # Strict Pydantic DTOs
│       │   ├── auth.py                  # Signup / Login request & response schemas
│       │   ├── profile.py               # Patient & Pharmacist Profile DTOs
│       │   ├── chat.py                  # Clinical Query & AI Response contracts
│       │   └── conversation.py          # Session & Note DTOs
│       ├── services/                    # Business logic & adapters
│       │   ├── rag_engine.py            # Sub-millisecond (<1ms) in-memory RAG
│       │   ├── groq_service.py          # Groq AI clinical LLM client
│       │   ├── export_service.py        # ReportLab PDF & CSV generator
│       │   └── data_loader.py           # Datasets parser & indexer
│       └── routers/                     # RESTful API controllers
│           ├── auth.py                  # /auth/user/*, /auth/pharmacist/*, /auth/me
│           ├── profile.py               # /profile/me, /profile/user, /profile/pharmacist
│           ├── chat.py                  # /api/chat (Unified clinical RAG)
│           └── conversations.py         # /conversations, notes, bookmark, export
│
├── frontend/                            # Next.js 14 App Router
│   ├── public/images/                   # Clinical branding & diagrams
│   └── src/
│       ├── app/                         # App Router pages
│       │   ├── layout.tsx               # Root layout
│       │   ├── page.tsx                 # Landing page
│       │   ├── chat/guest/              # Guest public portal
│       │   ├── user/                    # Patient portal (auth, chat, history)
│       │   └── pharmacist/              # Pharmacist portal (auth, chat, history)
│       ├── components/                  # Domain-grouped UI components
│       │   ├── chat/                    # ChatArea, Sidebar, ConversationDetailsDrawer
│       │   ├── layout/                  # Navbar, Header
│       │   ├── modals/                  # UserProfileModal, PharmacistNoteModal, RenameModal
│       │   ├── landing/                 # LandingPresentation
│       │   └── index.ts                 # Clean barrel export
│       ├── types/                       # Strict TypeScript interfaces (Zero 'any')
│       └── lib/
│           └── api.ts                   # Fully typed HTTP client
│
├── requirements.txt                     # Ultra-clean production dependencies (12 libraries)
├── run_project.bat                      # Unified 1-click startup script
└── System Architecture.md               # Master technical manual (This document)
```

---

## 10. Complete RESTful API Reference

| Method | Endpoint | Description | Role / Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/user/signup` | Register new patient account | Public |
| `POST` | `/auth/user/login` | Patient login (returns JWT Bearer token) | Public |
| `POST` | `/auth/pharmacist/signup`| Register licensed pharmacist (requires license #) | Public |
| `POST` | `/auth/pharmacist/login` | Pharmacist login (returns JWT Bearer token) | Public |
| `GET` | `/auth/me` | Fetch active authenticated session details | Bearer Token |
| `GET` | `/profile/me` | Fetch patient clinical profile or pharmacist info | Bearer Token |
| `PUT` | `/profile/user` | Update patient allergies, conditions, and meds | Patient Only |
| `PUT` | `/profile/pharmacist`| Update pharmacist license or profile details | Pharmacist Only |
| `POST` | `/api/chat` | Unified Clinical Decision Support Query | Optional (User/Pharma/Guest) |
| `GET` | `/conversations` | List conversation threads with search & filters | Bearer Token |
| `POST` | `/conversations` | Create new conversation session | Bearer Token |
| `GET` | `/conversations/{id}`| Fetch full consultation transcript | Optional |
| `DELETE`| `/conversations/{id}`| Delete consultation session & cascade messages | Optional |
| `PATCH`| `/conversations/{id}/rename` | Rename consultation session title | Optional |
| `POST` | `/conversations/{id}/bookmark` | Toggle consultation bookmark flag | Optional |
| `GET` | `/conversations/{id}/notes` | Get private clinical notes for session | Pharmacist Only |
| `POST` | `/conversations/{id}/notes` | Attach private practitioner clinical note | Pharmacist Only |
| `GET` | `/conversations/{id}/details` | Full clinical audit dossier metadata | Optional |
| `GET` | `/conversations/{id}/export/csv` | Download Microsoft Excel audit CSV | Optional |
| `GET` | `/conversations/{id}/export/pdf` | Download Publication-Quality Clinical PDF | Optional |

---

## 11. Quick Start & 1-Click Launch Guide

### System Prerequisites
* **Python 3.10 to 3.14**
* **Node.js 18+** & npm

### One-Click Launch (Windows)
Double-click `run_project.bat` from the root directory:
```cmd
run_project.bat
```
* **FastAPI Backend**: [http://127.0.0.1:8001](http://127.0.0.1:8001)
* **Swagger API Documentation**: [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)
* **Next.js Web Application**: [http://localhost:3000](http://localhost:3000)

### Manual Setup
```bash
# 1. Install lightweight Python dependencies
pip install -r requirements.txt

# 2. Run Backend
py -m uvicorn backend.main:app --host 127.0.0.1 --port 8001 --reload

# 3. Run Frontend
cd frontend
npm install
npm run dev
```
