import { create } from "zustand";
import { Panel, StreamEvent, StoryboardState } from "@/types";

interface StoryboardStore extends StoryboardState {
  // panel actions
  addEvent: (event: StreamEvent) => void;
  reset: () => void;
  setError: (msg: string) => void;
  setGenerating: (val: boolean) => void;
  activePlayIndex: number | null;
  setActivePlayIndex: (index: number | null) => void;
  // concept (mood text entered by user)
  concept: string;
  setConcept: (concept: string) => void;
  // animatic
  showAnimatic: boolean;
  animaticStartScene: number;
  openAnimatic: (startScene?: number) => void;
  closeAnimatic: () => void;
}

function ensurePanel(panels: Panel[], index: number): Panel[] {
  if (panels.find((p) => p.index === index)) return panels;
  const newPanel: Panel = {
    index,
    narration: null,
    sceneDirection: null,
    imagePrompt: null,
    imageUrl: null,
    audioUrl: null,
    character: null,
    status: "loading",
  };
  return [...panels, newPanel].sort((a, b) => a.index - b.index);
}

function updatePanel(panels: Panel[], index: number, update: Partial<Panel>): Panel[] {
  return panels.map((p) => (p.index === index ? { ...p, ...update } : p));
}

function deriveStatus(panel: Panel): Panel["status"] {
  if (panel.status === "error") return "error";
  if (panel.imageUrl && panel.narration) return "complete";
  if (panel.narration) return "partial";
  return "loading";
}

const initialState: StoryboardState = {
  panels: [],
  isGenerating: false,
  isComplete: false,
  error: null,
};

export const useStoryboardStore = create<StoryboardStore>((set) => ({
  ...initialState,
  activePlayIndex: null,
  concept: "",
  showAnimatic: false,
  animaticStartScene: 0,

  setGenerating: (val) => set({ isGenerating: val }),

  setConcept: (concept) => set({ concept }),

  openAnimatic: (startScene = 0) =>
    set({ showAnimatic: true, animaticStartScene: startScene }),

  closeAnimatic: () => set({ showAnimatic: false }),

  addEvent: (event) =>
    set((state) => {
      if (event.type === "done") {
        return { isGenerating: false, isComplete: true };
      }
      if (event.type === "error") {
        return { isGenerating: false, error: event.content ?? "Unknown error" };
      }
      if (event.index === null) return state;

      let panels = ensurePanel(state.panels, event.index);

      switch (event.type) {
        case "narration":
          panels = updatePanel(panels, event.index, { narration: event.content });
          break;
        case "character":
          panels = updatePanel(panels, event.index, { character: event.content });
          break;
        case "scene_direction":
          panels = updatePanel(panels, event.index, { sceneDirection: event.content });
          break;
        case "image_prompt":
          panels = updatePanel(panels, event.index, { imagePrompt: event.content });
          break;
        case "image_url":
          panels = updatePanel(panels, event.index, { imageUrl: event.content });
          break;
        case "audio_url":
          panels = updatePanel(panels, event.index, { audioUrl: event.content });
          break;
      }

      panels = panels.map((p) =>
        p.index === event.index ? { ...p, status: deriveStatus(p) } : p
      );

      return { panels };
    }),

  reset: () =>
    set({ ...initialState, activePlayIndex: null }),

  setError: (msg) => set({ error: msg, isGenerating: false }),

  setActivePlayIndex: (index) => set({ activePlayIndex: index }),
}));
