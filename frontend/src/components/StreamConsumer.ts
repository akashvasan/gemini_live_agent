import { mockGenerate } from "@/mock/mockStream";
import { useStoryboardStore } from "@/store/storyboardStore";
import { StreamEvent } from "@/types";

// Toggle this to false when the real backend is ready
const USE_MOCK = false;

export function startGeneration(mood: string, frameBase64: string): void {
  const { addEvent, reset, setError, setGenerating, setConcept } =
    useStoryboardStore.getState();

  reset();
  setGenerating(true);
  setConcept(mood);

  if (USE_MOCK) {
    mockGenerate(mood, (event: StreamEvent) => {
      addEvent(event);
    }).catch((err) => {
      setError(err instanceof Error ? err.message : "Mock generation failed");
    });
    return;
  }

  // Real path — POST mood + frame, stream SSE response body via fetch.
  (async () => {
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, frame: frameBase64 }),
      });

      if (!response.ok || !response.body) {
        setError(`Server error: ${response.status}`);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const json = line.slice(5).trim();
          if (!json) continue;
          try {
            const event: StreamEvent = JSON.parse(json);
            addEvent(event);
            if (event.type === "done" || event.type === "error") {
              reader.cancel();
              return;
            }
          } catch {
            // malformed event — skip
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stream connection failed");
    }
  })();
}
