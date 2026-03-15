export type EventType =
  | "narration"
  | "scene_direction"
  | "image_prompt"
  | "image_url"
  | "audio_url"
  | "character"
  | "done"
  | "error";

export interface StreamEvent {
  type: EventType;
  index: number | null;
  content: string | null;
}

export interface Panel {
  index: number;
  narration: string | null;
  sceneDirection: string | null;
  imagePrompt: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  character: string | null;
  status: "loading" | "partial" | "complete" | "error";
}

export interface StoryboardState {
  panels: Panel[];
  isGenerating: boolean;
  isComplete: boolean;
  error: string | null;
}

export type StyleOption = "Cinematic" | "Commercial" | "Documentary";
export type ToneOption = "Dramatic" | "Upbeat" | "Melancholic";
export type SceneCount = 3 | 4 | 5;

export interface GenerationOptions {
  prompt: string;
  style: StyleOption;
  tone: ToneOption;
  sceneCount: SceneCount;
}
