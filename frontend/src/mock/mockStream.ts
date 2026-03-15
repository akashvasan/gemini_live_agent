import { StreamEvent } from "@/types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface SceneData {
  narration: string;
  character: string;
  sceneDirection: string;
  imageUrl: string;
}

const SCENES: SceneData[] = [
  {
    narration: "The room hadn't changed in twenty years. Neither had the guilt.",
    character: "DETECTIVE COLE, 50s. Three days without sleep. Knows something he shouldn't.",
    sceneDirection: "INT. LOCATION — NIGHT. Wide establishing. Detective enters frame from left. Hold 4 seconds.",
    imageUrl: "https://picsum.photos/seed/noir_room/800/450",
  },
  {
    narration: "She was already there. She was always already there.",
    character: "ELENA, 40s. Immaculate. The kind of calm that only comes from having nothing left to lose.",
    sceneDirection: "MEDIUM SHOT. Elena turns slowly. Eye contact with Cole. Neither speaks. Tension holds.",
    imageUrl: "https://picsum.photos/seed/noir_figure/800/450",
  },
  {
    narration: "The envelope on the table contained either salvation or the end of everything. Possibly both.",
    character: "COLE — closer now. Hand reaches for the envelope. Hesitates.",
    sceneDirection: "CLOSE UP — hands, envelope, table surface. Rack focus front to back. Sound of rain begins.",
    imageUrl: "https://picsum.photos/seed/noir_detail/800/450",
  },
  {
    narration: "Outside, the city continued its indifferent hum. Inside, a twenty-year secret finally exhaled.",
    character: "BOTH — framed together for the first time. The distance between them tells the whole story.",
    sceneDirection: "WIDE — two figures, maximum separation in frame. Static camera. Let them breathe.",
    imageUrl: "https://picsum.photos/seed/noir_wide/800/450",
  },
];

// Timing constants (ms)
const INITIAL_DELAY = 400;
const NARRATION_GAP = 600;   // between each scene's narration
const CHAR_AFTER_NAR = 300;  // character arrives after narration
const DIR_AFTER_CHAR = 300;  // scene_direction arrives after character
const IMG_AFTER_DIR = 3000;  // image arrives after scene_direction

export async function mockGenerate(
  _prompt: string,
  onEvent: (e: StreamEvent) => void
): Promise<void> {
  const scenePromises = SCENES.map(async (scene, i) => {
    await sleep(INITIAL_DELAY + i * NARRATION_GAP);
    onEvent({ type: "narration",       index: i, content: scene.narration });

    await sleep(CHAR_AFTER_NAR);
    onEvent({ type: "character",       index: i, content: scene.character });

    await sleep(DIR_AFTER_CHAR);
    onEvent({ type: "scene_direction", index: i, content: scene.sceneDirection });

    await sleep(IMG_AFTER_DIR);
    onEvent({ type: "image_url",       index: i, content: scene.imageUrl });
  });

  await Promise.all(scenePromises);
  await sleep(300);
  onEvent({ type: "done", index: null, content: null });
}
