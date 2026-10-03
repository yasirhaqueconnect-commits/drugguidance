# DrugGuide AI - Clinical Medical RAG & Drug Safety Platform

An enterprise-grade, evidence-based Clinical Decision Support System (CDSS) and Drug Information Retrieval-Augmented Generation (RAG) platform. Built with **FastAPI**, **Next.js 14**, **Groq AI**, and **Neon PostgreSQL**, featuring three completely isolated portal environments for **Guests**, **Patients**, and **Pharmacists**.

---

## 1. System Architecture & High-Level Overview

```
                                +------------------------------------------+
                                |             DRUGGUIDE PLATFORM           |
                                +------------------------------------------+
                                                     |
             +---------------------------------------+---------------------------------------+
             |                                       |                                       |
    [ 1. GUEST PORTAL ]                    [ 2. PATIENT PORTAL ]                  [ 3. PHARMACIST PORTAL ]
       /chat/guest                              /user/...                               /pharmacist/...
             |                                       |                                       |
  - Anonymous Inquiries                 - Personalized Guidance                 - Professional Workspace
  - No Auth Required                    - Medical Profile Active                - 3-Dot Action Menu
  - Zero Data Contamination             - Allergy & Drug Cross-Check            - Private Clinical Notes
  - Public Drug Lookups                 - Contraindication Alerts               - PDF & CSV Audit Exports
             |                                       |                                       |
             v                                       v                                       v
    +-----------------+                     +-----------------+                     +-----------------+
    | guest_* Tables  |                     |  user_* Tables  |                     |  pharmacist_*   |
    +-----------------+                     +-----------------+                     +-----------------+
             \                                       |                                       /
              \                                      |                                      /
               v                                     v                                     v
       +---------------------------------------------------------------------------------------+
       |                           FASTAPI CLINICAL ENGINE (Port 8001)                         |
       |  - In-Memory Clinical Vector RAG (<1ms search over 1,987 chunks)                      |
       |  - Patient Profile Safety Interceptor                                                |
       |  - Groq AI LLM Orchestrator (Qwen 3.8 27B / GPT-OSS 20B)                              |
       |  - ReportLab Native Binary PDF Generator                                              |
       +---------------------------------------------------------------------------------------+
                                                     |
                                                     v
                                +------------------------------------------+
                                |         NEON POSTGRESQL DATABASE         |
                                |     (9 Strictly Dedicated Tables)        |
                                +------------------------------------------+
```

---

## 2. Three Isolated Portal Environments

The system enforces strict architectural boundaries so that data, session history, and clinical profiles never leak between user types.

### 1. Guest Portal (`/chat/guest`)
* **Target Audience:** Public users seeking instant, anonymous medication information.
* **Authentication:** None. Does not require login or signup.
* **Privacy Isolation:** The frontend explicitly suppresses authorization tokens (`guestRequest`), guaranteeing that no logged-in user profiles or medical records contaminate public queries.
* **Storage:** Persisted into dedicated `guest_conversations` and `guest_messages` tables.

### 2. Patient / User Portal (`/user/...`)
* **Target Audience:** Registered patients seeking personalized health counseling.
* **Authentication:** Dedicated `/user/login` and `/user/signup` endpoints.
* **Personal Medical Profile:**
  - Tracks **Allergies** (e.g., Penicillin, Sulfa, Aspirin).
  - Tracks **Current Medications** (e.g., Warfarin, Metformin, Lisinopril).
  - Tracks **Chronic Conditions** (e.g., Renal impairment, Hypertension, Asthma).
  - Tracks **Age**, **Gender**, and **Pregnancy Status**.
* **Real-Time Safety Interceptor:** During every query, the backend injects the patient's active medical profile into the RAG context. The AI proactively detects cross-allergies, contraindications, and drug-drug interactions, rendering amber warning badges and alert notifications.
* **Storage:** Dedicated `users`, `user_conversations`, and `user_messages` tables.

### 3. Pharmacist Workspace (`/pharmacist/...`)
* **Target Audience:** Licensed healthcare professionals (RPh, PharmD) and clinicians.
* **Authentication:** Dedicated `/pharmacist/login` and `/pharmacist/signup` with registration credentials (License Number, Pharmacy Organization).
* **Clinical Management Toolbar (3-Dot Action Menu):**
  - **Bookmark:** Toggle bookmark state to flag complex or high-risk cases.
  - **Add Note:** Open dedicated modal to attach private clinical annotations stored in `pharmacist_notes`.
  - **View Details:** Side audit drawer showing Case ID, practitioner credentials, original query, notes history, complete transcript, and evidence citations.
  - **Rename:** In-place inline case title updates.
  - **Export PDF:** Generates and downloads an authentic binary PDF clinical audit report.
  - **Export CSV:** Exports conversation transcript as a structured CSV spreadsheet.
  - **Delete:** Cascade-deletes the conversation along with its messages and attached notes.
* **Sidebar Filters:**
  - `All`: View all clinical cases with real-time note count badges.
  - `Bookmarked`: Instant filter for flagged cases.
  - `Notes`: Filter conversations that have private clinical notes attached.
  - `Search & Sort`: Full-text title filtering and chronological sorting.
* **Storage:** Dedicated `pharmacists`, `pharmacist_conversations`, `pharmacist_messages`, and `pharmacist_notes` tables.

---

## 3. Dedicated Database Architecture (Neon PostgreSQL)

All legacy tables (`conversations`, `messages`, `chat_sessions`, `chat_messages`) have been removed. The database operates on 9 dedicated tables:

| Schema Domain | Table Name | Purpose | Primary / Foreign Keys |
| :--- | :--- | :--- | :--- |
| **Patient Domain** | `users` | Patient credentials, medical profile (allergies, meds, conditions) | `id` (PK) |
| | `user_conversations` | Patient chat sessions | `id` (PK), `user_id` -> `users.id` (CASCADE) |
| | `user_messages` | Patient chat messages & AI responses | `id` (PK), `conversation_id` -> `user_conversations.id` (CASCADE) |
| **Pharmacist Domain** | `pharmacists` | Healthcare professional profiles & license registrations | `id` (PK) |
| | `pharmacist_conversations` | Professional consultation sessions | `id` (PK), `pharmacist_id` -> `pharmacists.id` (CASCADE) |
| | `pharmacist_messages` | Professional queries, AI syntheses, sources JSON | `id` (PK), `conversation_id` -> `pharmacist_conversations.id` (CASCADE) |
| | `pharmacist_notes` | Private practitioner clinical notes | `id` (PK), `conversation_id` -> `pharmacist_conversations.id`, `pharmacist_id` -> `pharmacists.id` |
| **Guest Domain** | `guest_conversations` | Anonymous public sessions | `id` (PK) |
| | `guest_messages` | Public inquiries & evidence-based answers | `id` (PK), `conversation_id` -> `guest_conversations.id` (CASCADE) |

---

## 4. Clinical RAG & AI Pipeline

### 1. Curated Clinical Knowledge Base
The system ingests and indexes verified medical datasets directly from Excel clinical spreadsheets:
* `ALLERGY-BASED DRUG FILTERING.xlsx`: Allergen cross-reactivities, alternative safe classes.
* `ALTERNATIVE MEDICINE.xlsx`: Brand alternatives, generic equivalents, active ingredients.
* `DRUG-DRUG INTERACTIONS.xlsx`: Severity matrix (Major, Moderate, Minor), mechanistic details.
* `Dosage Guidance.xlsx`: Renal adjustments, pediatric/geriatric adjustments, standard dosing.

These datasets are parsed into **1,987 structured clinical chunks** pre-cached in `backend/chunks_store.json` for **0ms server startup time**.

### 2. High-Speed In-Memory Retrieval (<1ms)
* Queries are tokenized and scored using an optimized in-memory BM25/TF-IDF lexical matcher.
* If a patient profile is active, the engine dynamically boosts chunks related to the patient's reported allergies and active medications.
* Retrieves the top relevant evidence chunks with full metadata (dosage, severity, contraindicated pairs).

### 3. Groq AI LLM Orchestration
* Utilizes high-throughput models on Groq: `qwen/qwen3.8-27b` with automatic fallback to `openai/gpt-oss-20b`.
* **English-Only Mandate:** All clinical answers are strictly generated in English to prevent mistranslations of international drug names, dosages, and safety warnings.
* **Emergency Protocol:** Instantly detects red-flag clinical conditions (chest pain, anaphylaxis, severe respiratory distress) and prepends an emergency dispatch protocol.

---

## 5. ReportLab Native Binary PDF Generator

Unlike basic web apps that export plain text with a `.pdf` extension, DrugGuide uses **ReportLab 5.0** to generate authentic binary PDF documents (`%PDF-1.4`):
* **Document Layout:** Clean 36pt margins, professional typography, and responsive clinical tables.
* **Header & Case Metadata:** Case ID, Timestamp, Consultation Topic, Practitioner Full Name, License Number, and Pharmacy Organization.
* **Clinical Notes Section:** Formatted callout cards with exact timestamps for each private note recorded by the pharmacist.
* **Consultation Transcript:** Distinct visual cards separating Practitioner Inquiries from Evidence Syntheses with verified source citations.
* **Compliance Footer:** Medical confidentiality notice and legal audit disclaimer.
* **Compatibility:** Opens immediately in Adobe Acrobat Reader, Google Chrome, Microsoft Edge, macOS Preview, and mobile PDF viewers without format corruption errors.

---

## 6. Project Directory Structure

```
c:/Users/Yasir/Desktop/data/
├── ALLERGY-BASED DRUG FILTERING.xlsx   # Clinical dataset: Allergies & cross-reactions
├── ALTERNATIVE MEDICINE.xlsx            # Clinical dataset: Generic & brand alternatives
├── DRUG-DRUG INTERACTIONS.xlsx         # Clinical dataset: Interaction severity matrix
├── Dosage Guidance.xlsx                 # Clinical dataset: Age & renal dosage guidelines
├── run_project.bat                      # One-click desktop launcher (Starts Backend & Frontend)
├── README.md                            # Comprehensive system architecture & documentation
│
├── backend/
│   ├── .env                             # Environment config (DATABASE_URL, GROQ_API_KEY, JWT_SECRET)
│   ├── main.py                          # FastAPI application, REST endpoints, ReportLab PDF export
│   ├── database.py                      # SQLAlchemy models for the 9 dedicated Neon tables
│   ├── auth.py                          # JWT token creation, password hashing, user context dependencies
│   ├── rag_engine.py                    # In-memory sub-millisecond clinical search engine
│   ├── data_loader.py                   # Excel parser & knowledge chunking pipeline
│   ├── groq_service.py                  # Groq AI prompt engineering & clinical safety synthesis
│   └── chunks_store.json                # 1,987 pre-computed clinical knowledge chunks
│
└── frontend/
    ├── .env.local                       # Next.js API URL configuration (http://127.0.0.1:8001)
    ├── package.json                     # Dependencies: Next 14, React 18, Lucide React, Tailwind
    ├── tailwind.config.js               # Theme configuration (custom glassmorphism & color tokens)
    ├── public/images/                   # Clean medical branding icons & logos
    └── src/
        ├── app/
        │   ├── page.tsx                 # Landing page presentation
        │   ├── layout.tsx               # Root HTML shell & ThemeProvider
        │   ├── globals.css              # Global styles, glass-panels, scrollbars
        │   ├── chat/guest/page.tsx      # Dedicated Guest Portal (No auth, zero leakage)
        │   ├── user/
        │   │   ├── login/page.tsx       # Dedicated Patient Login
        │   │   ├── signup/page.tsx      # Dedicated Patient Registration
        │   │   └── chat/page.tsx        # Patient Chat with Profile Interceptor
        │   └── pharmacist/
        │       ├── login/page.tsx       # Dedicated Pharmacist Login
        │       ├── signup/page.tsx      # Dedicated Pharmacist Registration
        │       └── chat/page.tsx        # Pharmacist Workspace with 3-Dot Actions & Drawer
        ├── components/
        │   ├── ChatArea.tsx             # Interactive chat interface & source explorer
        │   ├── Sidebar.tsx              # Conversation history, filters, 3-dot dropdowns
        │   ├── ConversationDetailsDrawer.tsx # Pharmacist audit record drawer
        │   ├── PharmacistNoteModal.tsx  # Private clinical note editor modal
        │   ├── RenameConversationModal.tsx   # Inline conversation title rename modal
        │   ├── UserProfileModal.tsx     # Medical profile editor (Allergies, Meds, Conditions)
        │   ├── LandingPresentation.tsx  # Interactive product overview carousel
        │   └── Navbar.tsx               # Top navigation bar
        ├── context/
        │   └── ThemeContext.tsx         # Dark / Light theme toggle provider
        └── lib/
            ├── api.ts                   # Unified API client & authenticated file downloaders
            └── dateUtils.ts             # Clinical timestamp formatters
```

---

## 7. How to Run the Project

### Option A: One-Click Desktop Launcher
Double-click the [`run_project.bat`](file:///c:/Users/Yasir/Desktop/data/run_project.bat) file in the root directory. It automatically:
1. Launches the **FastAPI Backend** on `http://127.0.0.1:8001`.
2. Launches the **Next.js Frontend** on `http://localhost:3000`.
3. Opens your default web browser to `http://localhost:3000`.

### Option B: Manual Terminal Execution

#### 1. Start the Backend:
```bash
cd backend
py -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```
*Health Check:* Open `http://127.0.0.1:8001/` -> Returns `{"status": "online", "system": "DrugGuide Clinical Assistant API"}`.

#### 2. Start the Frontend:
```bash
cd frontend
npm run dev -- -p 3000
```
*Access:* Open `http://localhost:3000` in your browser.

---

## 8. Summary of API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/user/signup` | Register new Patient |
| `POST` | `/auth/user/login` | Login Patient (Returns JWT token) |
| `POST` | `/auth/pharmacist/signup` | Register new Pharmacist (with License & Organization) |
| `POST` | `/auth/pharmacist/login` | Login Pharmacist (Returns JWT token) |
| `GET` | `/auth/me` | Current authenticated session identity |
| `GET` | `/profile/me` | Fetch active Patient Medical Profile |
| `PUT` | `/profile/user` | Update Patient Allergies, Medications, and Conditions |
| `GET` | `/conversations` | Get conversations (Supports `q`, `bookmarked`, `category`, `sort`) |
| `POST` | `/conversations` | Create a new conversation |
| `GET` | `/conversations/{id}` | Get messages and verified sources for a conversation |
| `DELETE`| `/conversations/{id}` | Cascade-delete conversation, messages, and notes |
| `PATCH`| `/conversations/{id}/rename`| Rename conversation title |
| `POST` | `/conversations/{id}/bookmark`| Toggle bookmark status |
| `GET` | `/conversations/{id}/notes` | Get private pharmacist notes |
| `POST` | `/conversations/{id}/notes` | Add private clinical note |
| `GET` | `/conversations/{id}/details` | Get comprehensive case audit details |
| `GET` | `/conversations/{id}/export/pdf` | Download ReportLab native binary PDF report |
| `GET` | `/conversations/{id}/export/csv` | Download RFC 4180 CSV transcript |
| `POST` | `/api/chat` | Send medical inquiry to RAG & Groq AI engine |

---

## 9. Compliance & Quality Assurance

* **Strict English Output:** Ensures international medical terminologies, chemical names, and dosage units remain accurate and ungarbled.
* **Zero Logos in Text:** Responses never include emojis or extraneous branding text within critical clinical warnings.
* **Separation of Concerns:** Patients cannot access pharmacist tools; guest sessions never access user profile caches; pharmacists have dedicated private audit spaces.
