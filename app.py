import os
import io
import base64
from flask import Flask, request, jsonify, send_file, render_template
from werkzeug.utils import secure_filename
from PIL import Image
import numpy as np
from openai import OpenAI
from tensorflow.keras.models import load_model

# -----------------------------
# Configuration
# -----------------------------
OPENAI_API_KEY = "Add your api key of chat gpt"
client = OpenAI(api_key=OPENAI_API_KEY)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# -----------------------------
# Load brain tumor detection model
# -----------------------------
MODEL_PATH = "models/cnn-parameters-improvement-10-0.88.keras"
model = load_model(MODEL_PATH)

IMG_SIZE = (240, 240)

def preprocess_image(image: Image.Image):
    img = image.resize(IMG_SIZE)
    img_array = np.array(img)/255.0
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

def predict_image(image: Image.Image):
    img = preprocess_image(image)
    pred = model.predict(img)
    label = "Tumor Detected" if pred[0][0] > 0.5 else "No Tumor"
    confidence = float(pred[0][0])
    return label, confidence

# -----------------------------
# PDF generation
# -----------------------------
from fpdf import FPDF

def generate_pdf(title, content):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=14)
    pdf.multi_cell(0, 10, f"{title}\n\n{content}")
    pdf_bytes = io.BytesIO()
    pdf.output(pdf_bytes)
    pdf_bytes.seek(0)
    return pdf_bytes

# -----------------------------
# Flask routes
# -----------------------------
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    try:
        if "image" not in request.files:
            return jsonify({"label": "Error", "confidence": 0})

        f = request.files["image"]
        img = Image.open(f).convert("RGB")
        label, confidence = predict_image(img)
        return jsonify({"label": label, "confidence": confidence})
    except Exception as e:
        print("Prediction error:", e)
        return jsonify({"label": "Error", "confidence": 0})

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.json or {}
        message = (data.get("message") or "").strip()
        if not message:
            return jsonify({"reply": "Please enter a message."})

        system_prompt = (
            "You are a friendly AI assistant that explains brain tumors and treatments "
            "in simple terms. Do not give medical advice; encourage seeing a doctor."
        )

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            max_tokens=350,
            temperature=0.7,
        )

        reply = response.choices[0].message.content.strip()

        # Convert reply to voice
        from gtts import gTTS
        tts = gTTS(text=reply, lang="en")
        audio_bytes = io.BytesIO()
        tts.write_to_fp(audio_bytes)
        audio_bytes.seek(0)
        audio_base64 = base64.b64encode(audio_bytes.read()).decode("utf-8")
        audio_data = f"data:audio/mp3;base64,{audio_base64}"

        return jsonify({"reply": reply, "audio": audio_data})

    except Exception as e:
        print("Chat error:", e)
        return jsonify({"reply": "Sorry, cannot connect to assistant.", "audio": None})

@app.route("/pdf/<type>")
def pdf(type):
    try:
        if type == "drugs":
            pdf_file = generate_pdf("Recommended Drugs", "Temozolomide, Bevacizumab, Corticosteroids")
            return send_file(pdf_file, mimetype="application/pdf", as_attachment=True, download_name="drugs.pdf")
        elif type == "treatment":
            pdf_file = generate_pdf("Treatment Process", "Surgery, Radiation Therapy, Chemotherapy, Targeted Therapy")
            return send_file(pdf_file, mimetype="application/pdf", as_attachment=True, download_name="treatment.pdf")
        else:
            return "Invalid PDF type", 400
    except Exception as e:
        print("PDF error:", e)
        return "Error generating PDF", 500

# -----------------------------
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
