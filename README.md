# CareLoop 💊
### Intelligent Eldercare Management & Medication Adherence Platform

CareLoop is a compassionate, modern healthcare platform designed to bridge the gap between elderly patients, family caregivers, and professional caretakers. Built with an intuitive **PillPop** senior-friendly aesthetic, CareLoop pairs intelligent prescription OCR scanning, multi-Indian regional language support, and a DeepSeek AI voice companion with clinical-grade safety and role-based access control.

---

## 🌟 Key Features

### 1. 🌐 Universal Multi-Indian Language Support
CareLoop natively supports **9 Indian and regional languages** across the entire platform, complete with real-time UI localization and speech recognition/synthesis:
- **English** (`en` - `en-IN`)
- **हिन्दी (Hindi)** (`hi` - `hi-IN`)
- **தமிழ் (Tamil)** (`ta` - `ta-IN`)
- **తెలుగు (Telugu)** (`te` - `te-IN`)
- **বাংলা (Bengali)** (`bn` - `bn-IN`)
- **ಕನ್ನಡ (Kannada)** (`kn` - `kn-IN`)
- **മലയാളം (Malayalam)** (`ml` - `ml-IN`)
- **मराठी (Marathi)** (`mr` - `mr-IN`)
- **ગુજરાતી (Gujarati)** (`gu` - `gu-IN`)

A persistent, 1-click **Language Selector** is available in the top navigation, on the login screen, and directly on the senior dashboard.

---

### 2. 🎙️ DeepSeek AI Voice Assistant ("CareBuddy")
- **AI Engine:** Integrated with DeepSeek API (`deepseek-chat`).
- **Text-to-Speech (TTS):** Browser-native `window.speechSynthesis` speaks replies aloud gently in the senior's preferred Indian language.
- **Speech-to-Text (STT):** Microphone dictation via Web Speech API (`webkitSpeechRecognition`) tuned to regional Indian locales (`hi-IN`, `ta-IN`, etc.).
- **Clinical Context Awareness:** Ingests the senior's active medications, dosages, and meal instructions so it can answer questions like *"Should I take my blood pressure medicine before or after food?"* with reassuring guidance.

---

### 3. 📄 Prescription PDF & Photo OCR Scanner
- **Dual Format Support:** Upload digital prescription PDFs or capture photos of handwritten doctor prescriptions.
- **Client-Side Extraction Engine:** Leverages `pdfjs-dist` and `tesseract.js` OCR (with optional Google Gemini Vision fallback).
- **Clinical Entity Extraction:** Automatically parses:
  - Medication name & generic name
  - Dosage (e.g., `500mg`, `10ml`)
  - Form (tablet, capsule, syrup, injection)
  - Frequency & timings (daily, twice daily, with meals)
  - Prescribing doctor and clinic metadata
- **Mandatory Human Verification:** Extracted items are reviewed in an editable verification table before any schedule is saved to the database.

---

### 4. 🔑 Unique Patient ID & Dual Login
- **Unique Patient Code:** When an elderly patient profile is created, a distinct, readable ID is generated (format: `CARE-XXXXXX`, e.g., `CARE-14EC01`).
- **Dual Login Modes (`/login`):**
  - **Family / Admin Tab:** Sign in with email and password to manage the entire care circle.
  - **Senior Patient Tab:** Zero-friction login with **Unique Patient ID** or **Gmail** + **PIN** (e.g., `1234`).
- **Direct Route Dispatch:** Senior patients are routed straight to their simplified, distraction-free **Patient Screen** (`/elderly`).

---

### 5. 🛡️ CareCircle Role-Based Access Control & Caretaker Locking
To ensure patient safety, CareLoop enforces strict clinical boundaries:
- **Primary Family Admin:** The user who registers and creates the patient profile holds primary administrative authority (authoring prescriptions, managing members, adjusting doses).
- **Caretaker Role Locking:**
  - Direct additions, edits, deletions, and OCR imports of prescriptions are locked for caretakers.
  - Displays a clear clinical safety notice explaining authorization requirements.
  - Includes a 1-click **"Request Medication Change / Refill"** modal (Dose Adjustment, Refill, Side Effect, New Prescription).
  - Submitting a request instantly dispatches an in-app escalation alert and EmailJS notification to the Primary Family Admin.
- **Approval Center:** Primary Family Admins see pending caretaker requests and senior health notes directly on the Family Dashboard to review and resolve with 1 click.

---

### 6. 💬 Senior Status & Family Alerts ("Tell Family How You're Feeling")
- Seniors can tap quick feeling chips (*Feeling Well 😊*, *Mild Headache 🤕*, *Feeling Dizzy 🌀*, *Need Refill 💊*, *Just Saying Hello 👋*) or type a note.
- Submitting dispatches an immediate in-app notification and email alert to the Primary Family Admin and caregivers.

---

### 7. 📬 Multi-Channel Notification Engine (EmailJS + In-App)
Integrated with EmailJS (`@emailjs/browser`) for live automated delivery:
- **CareCircle Invitations:** Invitation emails with secure join links (`/invite/:token`).
- **Dose Verification Alerts:** Verification emails when a senior confirms their dose.
- **Escalation Alerts:** High-priority alerts for missed doses, caretaker change requests, or senior distress notes.
- **Appointment Reminders:** Consultations, specialist visits, and clinic reminders.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 19, TypeScript, Vite |
| **Styling & UI** | TailwindCSS v4, Lucide React Icons |
| **Backend & Database** | Supabase (PostgreSQL, Realtime, Row-Level Security) |
| **AI & Voice Services** | DeepSeek API (`deepseek-chat`), Web Speech API (STT & TTS) |
| **Prescription OCR** | `pdfjs-dist`, `tesseract.js`, Google Gemini Vision API |
| **Notification Services**| EmailJS Browser SDK, In-App Notification Center |
| **Testing Suite** | Vitest (22 unit tests across permissions, OCR, semantics, i18n) |

---

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   ├── layout/            # AppLayout, ProtectedRoute
│   │   ├── medications/       # PrescriptionOcrModal, Schedule modals
│   │   ├── ui/                # PillPop buttons, badges, modals, LanguageSelector
│   │   └── voice/             # ElderlyVoiceAssistant (DeepSeek STT/TTS)
│   ├── config/                # Supabase client configuration
│   ├── contexts/              # AuthContext, PatientContext, LanguageContext
│   ├── hooks/                 # Custom React hooks (useMedications, useNotifications, etc.)
│   ├── lib/                   # Database mappers, formatting utilities
│   ├── pages/
│   │   ├── auth/              # LoginPage (Dual Tab), RegisterPage, AcceptInvitationPage
│   │   ├── caretaker/         # CaretakerDashboard (Locked prescription requests)
│   │   ├── carecircle/        # CareCirclePage (Member invites, Senior PIN management)
│   │   ├── elderly/           # ElderlyDashboard (Pill tracker, feelings, voice assistant)
│   │   ├── family/            # FamilyDashboard (Care circle alerts, review requests)
│   │   └── medications/       # MedicationManagement (OCR scanner, prescriptions)
│   ├── services/              # Supabase, EmailJS, DeepSeek, OCR & Audit services
│   ├── types/                 # TypeScript schemas & role permissions
│   └── __tests__/             # Vitest test suites (22/22 passing)
├── .env.example               # Environment variables template
├── package.json
└── vite.config.ts
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm** or **pnpm**
- **Supabase Account**
- **EmailJS Account** (optional for live email delivery)
- **DeepSeek API Key** (for voice assistant)

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/naitikraj9112-max/Careloop.git
cd Careloop
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory by copying `.env.example`:
```bash
cp .env.example .env
```

Configure the following variables in `.env`:
```ini
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# EmailJS Service Configuration
VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxx
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key

# DeepSeek Voice Assistant
VITE_DEEPSEEK_API_KEY=sk-your_deepseek_api_key

# Optional: Google Gemini Vision API (for OCR fallback)
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Running the Test Suite
CareLoop includes a Vitest test suite covering RBAC permissions, medication lifecycle semantics, prescription OCR regex extraction, and multi-language locales:
```bash
npm test
```

### 6. Building for Production
```bash
npm run build
```
Generates optimized static assets in the `dist/` directory.

---

## 🔒 Security & Privacy
- **Credentials Protection:** Sensitive keys (`.env`) are excluded via `.gitignore`.
- **Role Isolation:** Caretakers and secondary caregivers cannot alter prescriptions without primary family authorization.
- **Audit Trails:** All dose confirmations, schedule changes, and member invites produce tamper-evident audit logs.

---

## 📄 License
This project is licensed under the MIT License.
