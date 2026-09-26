
import os
import requests
import io
from PIL import Image
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
from fastapi import FastAPI, File, UploadFile
import uvicorn
import numpy as np
import cv2
import onnxruntime as ort
import scipy.io as sio
import base64
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(title="SIH Telemedicine AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    session = ort.InferenceSession("dr_model_cam.onnx")
    input_name = session.get_inputs()[0].name
    
    # Load mathematically correct CAM weights
    mat = sio.loadmat('cam_weights.mat')
    fc_weights = mat['fcWeights'] 
    print(f"Success: AI Model + CAM Weights loaded successfully! Ready for inference.")
except Exception as e:
    print(f"WAITING FOR FILES: Please put dr_model_cam.onnx and cam_weights.mat in this folder. Error: {e}")

def preprocess_image(image_bytes):
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    img_resized = cv2.resize(img_rgb, (224, 224))
    
    lab = cv2.cvtColor(img_resized, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    cl = clahe.apply(l)
    
    limg = cv2.merge((cl, a, b))
    enhanced_img = cv2.cvtColor(limg, cv2.COLOR_LAB2RGB)
    
    input_data = np.array(enhanced_img, dtype=np.float32)
    input_data = np.transpose(input_data, (2, 0, 1))
    input_data = np.expand_dims(input_data, axis=0)
    
    return input_data, img_resized, enhanced_img

def segment_vessels(enhanced_img):
    # Classical morphological segmentation mirroring MATLAB's segment_retina
    b, g, r = cv2.split(enhanced_img)
    # Vessels are most prominent in the green channel
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    g_clahe = clahe.apply(g)
    
    # Morphological Top-Hat to extract vessels
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    tophat = cv2.morphologyEx(g_clahe, cv2.MORPH_TOPHAT, kernel)
    
    _, mask = cv2.threshold(tophat, 15, 255, cv2.THRESH_BINARY)
    
    # Create overlay (red vessels)
    overlay = enhanced_img.copy()
    overlay[mask == 255] = [255, 0, 0] # Red in RGB
    return overlay

def encode_base64(img_rgb):
    img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    _, buffer = cv2.imencode('.jpg', img_bgr)
    return base64.b64encode(buffer).decode('utf-8')

@app.get("/")
def health_check():
    return {"status": "AI Server is running perfectly"}

def is_valid_retina(img_rgb):
    import numpy as np
    import cv2
    # 1. Color Profile Check (Retinas are predominantly red, low blue)
    mean_r = np.mean(img_rgb[:, :, 0])
    mean_g = np.mean(img_rgb[:, :, 1])
    mean_b = np.mean(img_rgb[:, :, 2])
    
    if mean_b > mean_r:
        return False, "Image rejected by Quality Gate: Color profile mismatch (Excessive blue tones). Please upload a valid retinal fundus scan."
        
    # 2. Texture/Edge Density Check (Retinas are mostly smooth)
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 100, 200)
    edge_density = np.sum(edges / 255.0) / (edges.shape[0] * edges.shape[1])
    
    # Random objects (like dogs) have high edge density
    if edge_density > 0.35:
        return False, f"Image rejected by Quality Gate: Excessive high-frequency texture (Edge density: {edge_density:.2f}). Please upload a clear fundus scan."
        
    return True, "Valid"

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        
        # 1. Preprocess
        input_tensor, orig_img, enhanced_img = preprocess_image(contents)
        
        # 1.5 Quality Gate Check
        is_valid, reject_reason = is_valid_retina(orig_img)
        if not is_valid:
            return {"success": False, "error": reject_reason}

        
        # 2. Run AI Prediction (needs the CAM model)
        outputs = session.run(None, {input_name: input_tensor})
        predictions = outputs[0][0]
        feature_map = outputs[1][0] # From dr_model_cam.onnx
        
        # 3. Get Class
        predicted_class = int(np.argmax(predictions))
        confidence = float(np.max(predictions))
        
        # 4. Mathematically Correct Grad-CAM
        class_weights = fc_weights[predicted_class, :] 
        cam = np.zeros((feature_map.shape[1], feature_map.shape[2]), dtype=np.float32)
        for i, w in enumerate(class_weights):
            cam += w * feature_map[i, :, :]
            
        cam = np.maximum(cam, 0) # ReLU
        cam = cv2.resize(cam, (224, 224))
        cam_min, cam_max = np.min(cam), np.max(cam)
        if cam_max > cam_min:
            cam = (cam - cam_min) / (cam_max - cam_min)
        cam = np.uint8(255 * cam)
        
        heatmap = cv2.applyColorMap(cam, cv2.COLORMAP_JET)
        heatmap_rgb = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
        grad_cam_img = np.uint8(heatmap_rgb * 0.4 + orig_img * 0.6)
        
        # 5. Segmentation
        segmentation_img = segment_vessels(enhanced_img)
        
        # 6. Create proper subplot-style padded grid
        def create_padded_grid(img1, img2, img3, img4, t1, t2, t3, t4):
            # Resize all images to 300x300 for clarity
            sz = 300
            i1 = cv2.resize(img1, (sz, sz))
            i2 = cv2.resize(img2, (sz, sz))
            i3 = cv2.resize(img3, (sz, sz))
            i4 = cv2.resize(img4, (sz, sz))
            
            pad_top = 40
            pad_side = 20
            
            canvas_h = sz * 2 + pad_top * 2 + pad_side * 3
            canvas_w = sz * 2 + pad_side * 3
            # Background color (using dark gray/black to match MATLAB)
            canvas = np.zeros((canvas_h, canvas_w, 3), dtype=np.uint8)
            canvas[:] = (30, 30, 30) # slight dark gray
            
            def paste(img, title, row, col):
                y = pad_side + row * (sz + pad_top + pad_side) + pad_top
                x = pad_side + col * (sz + pad_side)
                
                # Paste image
                canvas[y:y+sz, x:x+sz] = img
                
                # Center text above image
                font = cv2.FONT_HERSHEY_SIMPLEX
                font_scale = 0.6
                thickness = 1
                text_size = cv2.getTextSize(title, font, font_scale, thickness)[0]
                text_x = x + (sz - text_size[0]) // 2
                text_y = y - 15
                cv2.putText(canvas, title, (text_x, text_y), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)
            
            paste(i1, t1, 0, 0)
            paste(i2, t2, 0, 1)
            paste(i3, t3, 1, 0)
            paste(i4, t4, 1, 1)
            return canvas
            
        cam_title = f"Grad-CAM (Grade: {predicted_class}, {confidence*100:.1f}%)"
        grid_img = create_padded_grid(orig_img, enhanced_img, segmentation_img, grad_cam_img, 
                                      "Original Image", "Enhanced Image", 
                                      "Lesion & Vessel Segmentation", cam_title)
        
        # Encode Grid to Base64
        grid_base64 = encode_base64(grid_img)
        
        return {
            "success": True,
            "grade": predicted_class,
            "confidence": confidence,
            "raw_scores": predictions.flatten().tolist(),
            "heatmap_base64": grid_base64
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


class ChatRequest(BaseModel):
    message: str
    history: list = []

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return {"response": "Error: GEMINI_API_KEY not found."}
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name="gemini-3.6-flash")
        
        try:
            with open("my_rag_data.txt", "r", encoding="utf-8") as f:
                rag_data = f.read()
        except FileNotFoundError:
            rag_data = "No knowledge base found."
            
        system_prompt = f"You are Madhu AI, a highly specialized assistant for Diabetic Retinopathy. Use this knowledge base:\n{rag_data}"
        
        chat = model.start_chat(history=[])
        response = chat.send_message(system_prompt + "\n\nUser query: " + req.message)
        
        return {"response": response.text}
    except Exception as e:
        return {"response": f"Error: {str(e)}"}

class ReportRequest(BaseModel):
    image_url: str
    grade: int

@app.post("/generate_clinical_note")
async def generate_clinical_note(req: ReportRequest):
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return {"note": "GEMINI_API_KEY missing."}
            
        import google.generativeai as genai
        from PIL import Image
        import io
        import requests
        
        img_response = requests.get(req.image_url)
        img_response.raise_for_status()
        img = Image.open(io.BytesIO(img_response.content)).convert("RGB")
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name="gemini-3.6-flash")
        
        prompt = f"This is a retinal scan grid for a patient with Grade {req.grade} Diabetic Retinopathy. The bottom right panel is the Grad-CAM heatmap highlighting the specific pathological regions. In exactly two highly clinical sentences, describe what specific lesions (like microaneurysms, hard exudates, or hemorrhages) the AI is focusing on in those red areas to justify this diagnosis."
        
        resp = model.generate_content([prompt, img])
        return {"note": resp.text}
    except Exception as e:
        return {"note": f"Error: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)