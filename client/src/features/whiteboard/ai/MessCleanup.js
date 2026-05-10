import { analyzeCanvasWithGemini } from "./aiService";

export const executeMessCleanup = async (canvas) => {
  if (!canvas) return;

  // 1. Serialize canvas data
  const rawData = canvas.toJSON(["id", "customName", "customType"]);

  // 2. Request AI to align, space evenly, and organize
  const prompt = `
    Analyze this whiteboard JSON. It contains shapes and text forming a flowchart. 
    1. Align nodes to a grid.
    2. Make sizes uniform for similar node types.
    3. Return ONLY the modified JSON structure ready to be imported back.
  `;

  try {
    const optimizedJson = await analyzeCanvasWithGemini(prompt, rawData);

    // 3. Render the newly organized data
    canvas.loadFromJSON(optimizedJson, () => {
      canvas.renderAll();
      console.log("🧹 Mess successfully cleaned up!");
    });
  } catch (error) {
    console.error("Failed to clean mess:", error);
  }
};
