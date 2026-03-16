# Scene One — Location-Aware Cinematic Storyboard AI

> **Point your camera. Speak a mood. Watch your surroundings become cinema.**

Scene One transforms any physical space into a fully-realized complete short film — complete with cinematic storyboard frames, narration, director's notes, and a Veo-generated animatic.

---

## What It Does

1. **Frame your location** — the live camera captures your environment (desk, living room, street corner)
2. **Set the mood** — type or speak a genre ("noir thriller", "romantic drama", "epic fantasy")
3. **Gemini reads the room** — Gemini 2.5 Flash analyzes the photo and writes a complete short film set in that exact space, complete with a named protagonist, causal scene structure, and cinematic direction
4. **Imagen renders it** — Imagen 4.0 Fast generates photorealistic 16:9 film stills for every scene in parallel (~20s total)
5. **Watch the film** — Veo 3.0 generates video clips for each scene, assembled into a playable animatic
6. **Edit by voice** — record a voice note on any scene panel to revise it ("make the lighting darker", "add rain")

---

## Features

| Feature | Technology |
|---|---|
| Live camera capture | Browser `getUserMedia` API |
| Voice mood input & transcription | Gemini 2.5 Flash (audio understanding) |
| 8-scene screenplay generation | Gemini 2.5 Flash (vision + JSON output) |
| Parallel cinematic image generation | Imagen 4.0 Fast (`asyncio.gather`) |
| Short film video generation | Veo 3.0 Fast |
| Voice scene editing | Gemini 2.5 Flash (audio + structured output) |
| Real-time SSE streaming | FastAPI `StreamingResponse` |
| State management | Zustand |
| Cinematic animatic player | Frontend Ken Burns · CSS subtitles · letterbox |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User's Browser                       │
│                                                          │
│  ┌─────────────┐   captures    ┌──────────────────────┐  │
│  │  CameraFeed │──────────────▶│     MoodInput /      │  │
│  │  (live cam) │  JPEG frame   │   VoiceCapture       │  │
│  └─────────────┘               └──────────┬───────────┘  │
│                                           │ POST /generate│
│  ┌───────────────────────────────────────▼───────────┐   │
│  │             Next.js 14 Frontend                    │   │
│  │  StreamConsumer.ts  ──SSE──▶  StoryboardGrid       │   │
│  │  (Zustand store)             StoryboardPanel ×8    │   │
│  │                              AnimaticPlayer        │   │
│  └───────────────────────────────────────┬───────────┘   │
└──────────────────────────────────────────│───────────────┘
                                           │ HTTP / SSE
                          ┌────────────────▼─────────────┐
                          │   FastAPI Backend             │
                          │   (Google Cloud Run)          │
                          │                              │
                          │  POST /generate              │
                          │  POST /transcribe            │
                          │  POST /edit-scene            │
                          │  POST /generate-movie        │
                          └──────┬────────────┬──────────┘
                                 │            │
              ┌──────────────────┘            └─────────────────┐
              │                                                  │
   ┌──────────▼──────────┐                        ┌─────────────▼──────┐
   │  Gemini 2.5 Flash   │                        │  Imagen 4.0 Fast   │
   │  - Story generation │                        │  - 8 frames        │
   │  - Transcription    │                        │  - parallel gen    │
   │  - Scene editing    │                        └────────────────────┘
   └─────────────────────┘
                                                  ┌────────────────────┐
                                                  │  Veo 3.0 Fast      │
                                                  │  - Video clips     │
                                                  │  - Animatic film   │
                                                  └────────────────────┘
```

See `architecture.png` in the repo root for the full system diagram.

---

## Tech Stack

**Frontend**
- Next.js 14 (App Router), React 18, TypeScript
- Tailwind CSS
- Zustand (state management)
- Browser MediaDevices API (camera + microphone)

**Backend**
- Python 3.11+, FastAPI, Uvicorn
- `google-genai` SDK
- Server-Sent Events (SSE) for real-time streaming

**Google AI APIs**
- Gemini 2.5 Flash — story generation, transcription, scene editing
- Imagen 4.0 Fast — cinematic still image generation
- Veo 3.0 Fast — short video clip generation

**Infrastructure**
- Google Cloud Run (backend deployment)

---

## Spin-Up Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Google AI Studio API key with Gemini, Imagen, and Veo access

### 1. Clone the repo

```bash
git clone https://github.com/SaiHarshanSanthosh/gemini_live_agent.git
cd gemini_live_agent
```

### 2. Backend setup

```bash
# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
echo "GEMINI_API_KEY=your_key_here" > .env

# Start the backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Backend runs at `http://localhost:8000`.

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Create local env file
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8000" > .env.local

# Start the dev server
./node_modules/.bin/next dev
```

Frontend runs at `http://localhost:3000`.

### 4. Use the app

1. Allow camera and microphone access when prompted
2. Frame your physical environment in the camera view
3. Type or speak a mood/genre ("noir thriller", "romantic drama")
4. Click **Generate** — scenes stream in within seconds, images render in parallel
5. Click **Watch Film →** when generation completes to view the animatic

---

## Findings & Learnings

**Prompt engineering is cinematography.** Getting Gemini to write as a film director — not a story summarizer — required deeply constrained prompts: named protagonists, causal scene chains, specific focal lengths, and an explicit rule preventing it from "cinematically transforming" the location into somewhere else entirely. The difference between "a dark room" and "the exact room in the photo, lit at 2700K from the left" is the difference between a generic AI output and something that feels authored.

**JSON beats XML for structured output.** We initially used XML tags for scene parsing. Switching to a JSON array made output more reliable, easier to strip markdown fences from, and eliminated cases where Gemini would generate 1 or 4 scenes instead of 8 due to tag confusion.

**Parallelism is the only path to usability.** Sequential Imagen calls for 8 scenes would take ~160 seconds. Using `asyncio.gather` with `asyncio.to_thread` drops this to ~20 seconds — all 8 images arrive roughly simultaneously. SSE streaming means the user sees text immediately while images load.

**SSE + streaming requires careful state management.** The frontend needs to gracefully handle streams that close before a `done` event (quota exceeded, network drop). We added a fallback `setGenerating(false)` when the stream ends without an explicit done signal, so the UI never gets permanently stuck in a loading state.

**Gemini understands ambient audio remarkably well.** The transcription endpoint passes raw WebM audio directly to Gemini 2.5 Flash with a single instruction. It handles accents, background noise, and partial sentences without any preprocessing — no Whisper, no audio chunking, no VAD.

**Removing scene count limits unlocked narrative coherence.** Initially we constrained Gemini to exactly 6 scenes. The output felt like a slideshow — each scene independent, no causal chain. Removing the fixed count and instead giving Gemini a dramatic arc (hook, wound, turn, cost, resolution, echo) with a minimum of 8 and maximum of 14 scenes produced outputs that felt authored. The model naturally generates fewer scenes for simple concepts and expands for complex ones — the constraint was fighting the storytelling.

---

## Google Cloud Deployment

The backend is deployed on **Google Cloud Run**. See [`main.py`](main.py) for API calls to:
- `gemini-2.5-flash` (Gemini API)
- `imagen-4.0-fast-generate-001` (Imagen API)
- `veo-3.0-fast-generate-001` (Veo API)

All via the `google-genai` Python SDK.

Proof of deployment: a screen recording of the Cloud Run service running is included in the submission. The backend URL and service logs are visible in the recording.

---

*Built for the Google AI Hackathon — Scene One*
