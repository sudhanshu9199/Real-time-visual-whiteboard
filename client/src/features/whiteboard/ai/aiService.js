// This file manages the HTTP requests to your backend/Gemini API
export const analyzeCanvasWithGemini = async (prompt, canvasJson) => {
  try {
    const response = await fetch("/api/gemini/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, canvasData: canvasJson }),
    });

    if (!response.ok) throw new Error("AI Request Failed");
    return await response.json();
  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
};
