from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from dotenv import load_dotenv
import os
import json
import asyncio
import base64

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

async def generate_image(description: str, style_notes: str) -> str:
    prompt = f"{description}. Style: {style_notes}. Cinematic, high quality, film still."
    
    response = await asyncio.to_thread(
        client.models.generate_images,
        model="imagen-4.0-generate-001",
        prompt=prompt,
        config={"number_of_images": 1}
    )
    
    # Return the image as a base64 string
    image_bytes = response.generated_images[0].image.image_bytes
    return f"data:image/png;base64,{base64.b64encode(image_bytes).decode()}"

@app.get("/models")
async def list_models():
    models = client.models.list()
    return {"models": [m.name for m in models]}

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
                            "mime_type": "audio/mp4",
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

    # Parse Gemini response
    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    result = json.loads(raw.strip())

    # Generate images for all scenes in parallel
    image_tasks = [
        generate_image(scene["description"], scene["style_notes"])
        for scene in result["scenes"]
    ]
    image_urls = await asyncio.gather(*image_tasks)

    # Add image URLs to each scene
    for i, scene in enumerate(result["scenes"]):
        scene["image_url"] = image_urls[i]

    return result