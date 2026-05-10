import { analyzeCanvasWithGemini } from "./aiService";

export const generateArchitecture = async (canvas, userPrompt) => {
  if (!canvas) return;

  const prompt = `
    The user wants an architecture diagram for: "${userPrompt}".
    Generate a FabricJS compatible JSON output containing interconnected shapes and text labels representing this architecture. 
    Use attractive, modern colors (e.g., #6366f1 for backend, #10b981 for database).
    Do not wrap the JSON in markdown blocks, return pure JSON.
  `;

  try {
    // Pass empty board or current context depending on requirements
    const currentData = canvas.toJSON();
    const generatedDiagramJson = await analyzeCanvasWithGemini(
      prompt,
      currentData,
    );

    canvas.loadFromJSON(generatedDiagramJson, () => {
      canvas.renderAll();
    });
  } catch (error) {
    console.error("Failed to generate architecture:", error);
  }
};
