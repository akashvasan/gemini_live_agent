from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv
import os
import re
import json
import base64
import asyncio

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
        model="imagen-4.0-fast-generate-001",
        prompt=prompt,
        config={"number_of_images": 1}
    )
    
    image_bytes = response.generated_images[0].image.image_bytes
    return f"data:image/png;base64,{base64.b64encode(image_bytes).decode()}"


async def generate_video_clip(scene: dict, index: int, duration: int = 5) -> dict:
    prompt = scene.get("image_prompt", scene.get("narration", ""))
    if not prompt:
        return {"scene_index": index, "video_url": None}
    
    try:
        operation = client.models.generate_videos(
            model="veo-3.0-fast-generate-001",
            prompt=prompt,
            config=types.GenerateVideosConfig(
                aspect_ratio="16:9",
                number_of_videos=1,
            )
        )

        while not operation.done:
            await asyncio.sleep(5)
            operation = client.operations.get(operation)

        # Get the video URI and download it
        video_uri = operation.response.generated_videos[0].video.uri
        print(f"DEBUG video_uri: {video_uri}")

        import httpx
        async with httpx.AsyncClient(follow_redirects=True) as http_client:
            download_url = f"{video_uri}&key={os.getenv('GEMINI_API_KEY')}"
            response = await http_client.get(download_url)
            video_bytes = response.content

        video_b64 = base64.b64encode(video_bytes).decode()
        return {"scene_index": index, "video_url": f"data:video/mp4;base64,{video_b64}"}

    except Exception as e:
        print(f"DEBUG error: {e}")
        return {"scene_index": index, "video_url": None, "error": str(e)}

async def movie_stream(scenes: list, duration: int):
    try:
        tasks = [
            generate_video_clip(scene, i, duration)
            for i, scene in enumerate(scenes)
        ]

        for coro in asyncio.as_completed(tasks):
            result = await coro
            yield make_sse("video_clip", result["scene_index"], result)
            await asyncio.sleep(0.05)

        yield make_sse("done", None, None)

    except Exception as e:
        yield make_sse("error", None, str(e))


def extract_tagged_blocks(text: str, tag: str) -> list[str]:
    pattern = rf"<{tag}>(.*?)</{tag}>"
    return [m.strip() for m in re.findall(pattern, text, re.DOTALL)]


def make_sse(event_type: str, index, content) -> str:
    data = json.dumps({"type": event_type, "index": index, "content": content})
    return f"data: {data}\n\n"


SYSTEM_PROMPT = """You are a film director writing a short film. You are given a location photo and a mood/genre.

BEFORE WRITING: Decide silently — who is this person, what do they want, what is the last image, what detail in scene 1 will mean something different by the end. Only output after you have planned the complete arc of all 8 scenes.

STORY RULES:
- One protagonist. Named. Specific age. Specific job. One physical habit. One secret.
- Every scene: the character does something concrete, something changes, it causes the next scene.
- Narration voice: present tense, specific nouns, active verbs, calm and slightly complicit.
  BAD: "She felt afraid." GOOD: "She has memorized every exit. Today there are only two."
- Location: use the actual physical space from the photo. Transform its meaning, not its furniture.
  Objects accumulate meaning. A door that was open is now closed. The audience reads this.
- Image prompts MUST show the ACTUAL location from the photo — same room, same furniture, same architecture.
  Change the lighting and atmosphere to match the mood. Do not invent a different setting.

OUTPUT: Return a JSON array of exactly 8 scene objects. No markdown, no commentary, just the array.
Each object has exactly these keys:
  "narration": string — 2-3 sentences, present tense, builds causally from the previous scene
  "character": string — "NAME, age. Job title. What their hands are doing. What they want right now."
  "scene_direction": string — "INT/EXT. LOCATION — TIME. Camera: Xmm, movement. Frame: subject/background. Sound: one sound, its meaning."
  "image_prompt": string — photorealistic cinematic still, 35mm Kodak Vision3 500T, anamorphic 2.39:1, shallow DOF, natural grain. Describe exact lighting (Kelvin, direction, hard/soft), composition (rule of thirds, depth layers), subject (exact appearance, action, facial expression as physical description), and THREE specific details from the ACTUAL location in the photo."""


async def generation_stream(mood: str, frame_b64: str):
    try:
        has_image = bool(frame_b64)

        user_text = (
            f'Mood/genre: "{mood}"\n\n'
            + ("The location image is provided. Invent a story set here."
               if has_image else
               "No location image provided — invent a story set in an imagined location that fits the mood.")
        )

        parts = []
        if has_image:
            raw_b64 = frame_b64.split(",")[-1] if "," in frame_b64 else frame_b64
            img_bytes = base64.b64decode(raw_b64)
            parts.append(types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"))
        parts.append(types.Part(text=user_text))

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=parts,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=1.2,
                max_output_tokens=16000,
            ),
        )

        raw = response.text.strip()
        # Strip markdown fences if present
        if "```" in raw:
            raw = re.sub(r"```[a-z]*\n?", "", raw)
            raw = raw.replace("```", "")
        # Extract just the JSON array (handles trailing commentary)
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if not match:
            raise ValueError("No JSON array found in response")
        scenes = json.loads(match.group(0))
        print(f"DEBUG scene_count={len(scenes)}", flush=True)

        # Stream text events immediately
        for i, scene in enumerate(scenes):
            yield make_sse("narration",       i, scene.get("narration", ""))
            yield make_sse("character",       i, scene.get("character", ""))
            yield make_sse("scene_direction", i, scene.get("scene_direction", ""))
            await asyncio.sleep(0.05)

        # Generate images via Imagen — all parallel via gather
        async def _gen_one(idx: int, prompt: str):
            img_response = await asyncio.to_thread(
                client.models.generate_images,
                model="imagen-4.0-fast-generate-001",
                prompt=prompt,
                config={"number_of_images": 1, "aspect_ratio": "16:9"},
            )
            img_bytes = img_response.generated_images[0].image.image_bytes
            return idx, base64.b64encode(img_bytes).decode()

        img_coros = [
            _gen_one(i, scene.get("image_prompt", ""))
            for i, scene in enumerate(scenes)
            if scene.get("image_prompt")
        ]
        results = await asyncio.gather(*img_coros, return_exceptions=True)
        for result in results:
            if isinstance(result, Exception):
                print(f"DEBUG imagen error: {result}", flush=True)
                continue
            idx, img_b64 = result
            yield make_sse("image_url", idx, f"data:image/png;base64,{img_b64}")
            await asyncio.sleep(0.05)

        yield make_sse("done", None, None)

    except Exception as e:
        yield make_sse("error", None, str(e))


class GenerateRequest(BaseModel):
    mood: str
    frame: str = ""


class MovieRequest(BaseModel):
    scenes: list
    duration_seconds: int = 5

    def validated_duration(self) -> int:
        return max(4, min(8, self.duration_seconds))


@app.post("/generate")
async def generate(req: GenerateRequest):
    return StreamingResponse(
        generation_stream(req.mood, req.frame),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.get("/models")
async def list_models():
    models = client.models.list()
    return {"models": [m.name for m in models]}


@app.post("/edit-scene")
async def edit_scene(audio: UploadFile = File(...), scene: str = Form(...)):
    audio_bytes = await audio.read()
    current_scene = json.loads(scene)

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
                        "text": f"""You are a film director's assistant. The user has an existing storyboard scene and wants to edit it based on their voice instruction.

Current scene:
Narration: {current_scene.get("narration", "")}
Character: {current_scene.get("character", "")}
Scene direction: {current_scene.get("scene_direction", "")}
Image prompt: {current_scene.get("image_prompt", "")}

Listen to the user's voice instruction and update the scene accordingly.
Keep any parts of the scene the user didn't mention unchanged.

Respond ONLY with XML blocks in this exact format, no extra text, no markdown:

<narration>
Present tense. Specific nouns. Active verbs. 2-4 sentences.
</narration>

<character>
FIRSTNAME, exact age. Exact job title. Physical detail. What hands are doing. What they want right now.
</character>

<scene_direction>
INT/EXT. LOCATION — TIME OF DAY.
Camera: [focal length] [movement].
Frame: [foreground] / [background] / [what is kept out of frame].
Sound: [one diegetic sound] [emotional meaning].
Transition: [cut type] — [why].
</scene_direction>

<image_prompt>
Photorealistic cinematic still photograph.
Lighting: [exact setup].
Composition: [subject position, leading lines, depth layers].
Subject: [exact appearance] [exact action] [exact expression].
Environment: [three background details].
Color grade: [specific palette].
Technical: 35mm Kodak Vision3 500T. Anamorphic 2.39:1. Shallow depth of field.
</image_prompt>"""
                    }
                ]
            }
        ]
    )

    raw = response.text.strip()

    updated_scene = {
        "narration":       next(iter(extract_tagged_blocks(raw, "narration")), ""),
        "character":       next(iter(extract_tagged_blocks(raw, "character")), ""),
        "scene_direction": next(iter(extract_tagged_blocks(raw, "scene_direction")), ""),
        "image_prompt":    next(iter(extract_tagged_blocks(raw, "image_prompt")), ""),
        "scene_index":     current_scene.get("scene_index", 0)
    }

    if updated_scene["image_prompt"]:
        try:
            img_response = client.models.generate_images(
                model="imagen-4.0-fast-generate-001",
                prompt=updated_scene["image_prompt"],
                config={"number_of_images": 1, "aspect_ratio": "16:9"},
            )
            img_bytes = img_response.generated_images[0].image.image_bytes
            updated_scene["image_url"] = f"data:image/png;base64,{base64.b64encode(img_bytes).decode()}"
        except Exception:
            updated_scene["image_url"] = current_scene.get("image_url", "")

    return updated_scene


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    audio_bytes = await audio.read()

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            {
                "parts": [
                    {"inline_data": {"mime_type": "audio/webm", "data": audio_bytes}},
                    {"text": "Transcribe exactly what was spoken in this audio. Return only the spoken words, nothing else."},
                ]
            }
        ],
    )
    return {"transcript": response.text.strip()}


@app.post("/generate-movie")
async def generate_movie(req: MovieRequest):
    return StreamingResponse(
        movie_stream(req.scenes, req.validated_duration()),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )