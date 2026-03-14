from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from dotenv import load_dotenv
import os
import json

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

@app.post("/generate")
async def generate(audio: UploadFile = File(...)):
    # Read the audio bytes
    audio_bytes = await audio.read()

    # Send to Gemini with your prompt
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            {
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": "audio/webm",
                            "data": audio_bytes
                        }
                    },
                    {
                        "text": """You are a film director's assistant. The user has described a scene or short film idea out loud.
                        Based on their description, generate a storyboard broken into 4-6 scenes.
                        
                        Respond ONLY with a JSON object in this exact format, no extra text, no markdown:
                        {
                            "scenes": [
                                {
                                    "scene_number": 1,
                                    "title": "...",
                                    "shot_type": "wide | medium | close-up | extreme close-up",
                                    "description": "visual description for image generation",
                                    "narration": "voiceover or dialogue for this scene",
                                    "style_notes": "lighting, color, mood, film style"
                                }
                            ]
                        }"""
                    }
                ]
            }
        ]
    )

    # Parse the text response as JSON
    raw = response.text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    result = json.loads(raw.strip())
    return result

@app.get("/models")
async def list_models():
    models = client.models.list()
    return {"models": [m.name for m in models]}