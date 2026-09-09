# SIH Telemedicine Diabetic Retinopathy (DR) Pipeline
**Master Project Context Document**

## 🎯 Project Overview
We are building a full-stack telemedicine platform for the Smart India Hackathon (SIH) to screen for Diabetic Retinopathy in rural clinics. 
- **Core AI**: ResNet-50 trained in MATLAB on the APTOS dataset (82.5% accuracy).
- **Architecture**: React (Frontend) <-> FastAPI (Python Backend) <-> Supabase (Database/Auth).

---

## 🏗️ Phase Tracker & Roadmap

- **[COMPLETED] Phase 1: Python AI Server**
  - Exported MATLAB model to `dr_model.onnx`.
  - Built `main.py` using FastAPI and `onnxruntime`.
  - **CRITICAL NOTE**: The Python backend uses OpenCV to intercept uploaded images, resize them to 224x224, and apply **CLAHE** (L-channel, clip limit 2.0, 8x8 grid) *before* feeding them to the ONNX model, perfectly replicating the MATLAB training conditions.
  - Endpoint `POST /predict` is fully functional on `localhost:8000`.

- **[COMPLETED] Phase 2: Database & Auth (Supabase)**
  - Created a Supabase project.
  - Disabled RLS (Row Level Security) for rapid prototyping.
  - Created a public Storage Bucket named `retinal-images`.
  - Created the PostgreSQL schema (see below).

- **[IN PROGRESS] Phase 3: React Frontend**
  - Initialized `sih-frontend` using Vite + React.
  - Installed dependencies: `@supabase/supabase-js`, `react-router-dom`, `lucide-react`.
  - *Note*: NPM had a caching bug, so `tailwind.config.js` and `postcss.config.js` were created manually. Tailwind is fully configured and running via `npm run dev`.
  - **NEXT IMMEDIATE STEP**: Build the Authentication UI (Login / Sign Up) and Dashboard.

- **[PLANNED] Phase 4: SIH Winning Features**
  - **Multi-language Support**: Implement `i18next` for English, Hindi, Tamil, Telugu, Gujarati, Kannada, Bengali, and Marathi.
  - **DR Chatbot**: A floating widget on the frontend to answer basic DR patient queries.

---

## 🗄️ Database Schema
We created the following table in Supabase. Any new AI agent writing React code must use these exact column names:

```sql
create table diagnoses (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Patient Demographics
  patient_name text not null,
  patient_id text,
  patient_age integer not null,
  gender text not null,
  patient_mobile text not null,
  patient_email text, 
  blood_group text,
  
  -- Clinical Data
  blood_sugar_level numeric not null,
  diabetes_duration_years integer,
  
  -- AI Analysis Results
  image_url text not null,
  ai_grade integer not null,
  confidence numeric not null,
  
  -- Security / Auth
  doctor_id uuid references auth.users
);
```

---

## 📂 Current File Structure
```text
/sih_backend
  ├── dr_model.onnx
  ├── main.py (FastAPI Server)
  └── requirements.txt
/sih-frontend
  ├── /src
  │   ├── index.css (Tailwind injected)
  │   ├── App.jsx
  │   └── main.jsx
  ├── tailwind.config.js
  ├── postcss.config.js
  └── package.json
```

## 🚀 How to proceed in a new session
If handing this context to a new AI agent, instruct them to start at **Phase 3 (React Frontend)** by building `supabaseClient.js` to connect to Supabase, followed by building the `Auth.jsx` component for Doctor Login/Sign up.
