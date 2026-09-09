# MadhuVision 👁️🏥

**AI-Powered Telemedicine Platform for Diabetic Retinopathy (DR) Screening**  
*Developed for the Smart India Hackathon (SIH)*

MadhuVision is a full-stack telemedicine solution designed to bring accessible, AI-driven eye care to rural and underserved areas. It bridges the gap between patients, rural clinics, and ophthalmologists by integrating advanced Machine Learning with a multi-lingual, accessible interface.

## ✨ Key Features

- **AI Diagnostic Engine:** Powered by a ResNet-50 model (trained via MATLAB on the APTOS dataset) and exported to ONNX for lightning-fast inference.
- **Grad-CAM Explainable AI (XAI):** Generates heatmap overlays on retinal scans so doctors can see *exactly* which regions of the eye the AI used to make its diagnosis.
- **Bhashini Multi-Lingual Support:** Real-time translation of the entire platform into 8 regional Indian languages, completely breaking the language barrier for rural health workers.
- **Madhu AI Assistant:** An integrated chatbot to assist doctors and health workers with clinical guidelines and platform navigation.
- **Secure Cloud Database:** Built on Supabase to ensure patient data, diagnostic reports, and doctor profiles are securely managed and authenticated.

## 🏗️ Architecture & Tech Stack

- **Frontend:** React.js, Vite, TailwindCSS, Framer Motion, Recharts
- **Backend:** FastAPI (Python), OpenCV, ONNX Runtime
- **Machine Learning:** MATLAB (Training) -> ONNX (Deployment)
- **Database & Auth:** Supabase (PostgreSQL)
- **External APIs:** Bhashini API (indictrans-v2)

## 📁 Repository Structure

- `/sih-frontend` - Contains the React Vite application.
- `/sih_backend` - Contains the FastAPI python server, image processing pipelines, and the deep learning **`.onnx` models**.

---

## 🚀 How to Run Locally

### 1. Start the Backend (FastAPI + AI Models)
The AI models (`dr_model.onnx` and `dr_model_cam.onnx`) are located in the `sih_backend` directory.

```bash
cd sih_backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Start the Frontend (React + Vite)
Open a new terminal and run:

```bash
cd sih-frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.

---
*Note: The raw MATLAB training data and image datasets have been intentionally omitted from this repository to ensure lightweight and fast production deployments.*
