"""ResQVision optional multimodal screening service.
Uses Gemini Vision only when GEMINI_API_KEY is configured. Not a veterinary diagnostic model.
"""
import os, io, json, base64
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

@app.get('/health')
def health():
    return jsonify({'status': 'ok', 'service': 'ResQVision vision screening', 'ai_configured': bool(os.getenv('GEMINI_API_KEY'))})

@app.post('/analyze')
def analyze():
    file = request.files.get('image')
    if not file:
        return jsonify({'error': 'image file is required'}), 400
    try:
        raw = file.read()
        image = Image.open(io.BytesIO(raw)).convert('RGB')
        width, height = image.size
        mime = file.mimetype if file.mimetype in ('image/jpeg', 'image/png', 'image/webp') else 'image/jpeg'
    except Exception:
        return jsonify({'error': 'Please upload a valid JPG, PNG or WEBP image'}), 400

    key = os.getenv('GEMINI_API_KEY')
    if not key:
        return jsonify({'model': 'not-configured', 'status': 'human_review_required',
            'image_dimensions': {'width': width, 'height': height},
            'summary': 'Image received. Configure GEMINI_API_KEY to enable AI-assisted visual screening.',
            'possible_signs': [], 'severity': 'unknown',
            'warning': 'No image analysis or injury detection was performed. Human review is required.'})

    prompt = ('You are a cautious animal welfare image-screening assistant, not a veterinarian. '
        'Describe only visible, image-supported observations. Do not diagnose, infer internal injury, '
        'or recommend medicines/treatment. If unclear, say unknown. Return ONLY JSON: '
        '{"summary":"short plain-language observation","possible_signs":["visible sign"],'
        '"severity":"low|moderate|high|unknown","needs_urgent_human_review":true,'
        '"image_quality":"clear|limited|poor"}. Use high only for clearly visible potentially life-threatening signs. '
        'Do not invent a species, injury, or certainty.')
    endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
    payload = {'contents': [{'parts': [{'text': prompt}, {'inline_data': {'mime_type': mime, 'data': base64.b64encode(raw).decode('ascii')}}]}],
               'generationConfig': {'responseMimeType': 'application/json', 'temperature': 0.1}}
    try:
        response = requests.post(endpoint, params={'key': key}, json=payload, timeout=20)
        response.raise_for_status()
        raw_text = response.json()['candidates'][0]['content']['parts'][0]['text']
        result = json.loads(raw_text.strip().removeprefix('```json').removesuffix('```').strip())
        severity = result.get('severity') if result.get('severity') in ('low', 'moderate', 'high', 'unknown') else 'unknown'
        return jsonify({'model': 'Gemini 2.5 Flash vision', 'status': 'screened',
            'image_dimensions': {'width': width, 'height': height},
            'summary': str(result.get('summary', 'Visual review inconclusive'))[:500],
            'possible_signs': [str(x)[:120] for x in result.get('possible_signs', [])[:6]],
            'severity': severity, 'needs_urgent_human_review': bool(result.get('needs_urgent_human_review', True)),
            'image_quality': result.get('image_quality', 'unknown'),
            'warning': 'AI visual screening is fallible and is not a veterinary diagnosis. A human rescuer and veterinarian must verify all findings.'})
    except Exception:
        return jsonify({'model': 'fallback', 'status': 'human_review_required',
            'image_dimensions': {'width': width, 'height': height},
            'summary': 'AI visual screening was unavailable. Please arrange human review.',
            'possible_signs': [], 'severity': 'unknown', 'needs_urgent_human_review': True,
            'warning': 'No reliable injury classification was produced. This is not a veterinary diagnosis.'})

@app.errorhandler(413)
def too_large(_):
    return jsonify({'error': 'Image exceeds the 5 MB upload limit'}), 413

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=False)
