import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "DUMMY");

// ─── Spatial Cleanup ─────────────────────────────────────────────────────────
const performSpatialCleanup = (objects, hasSemanticProcessed) => {
  const SPACING_X = 150;
  const SPACING_Y = 150;
  const START_X = 100;
  let START_Y = 100;
  
  // Find the lowest point of semantic text so we place shapes below them
  if (hasSemanticProcessed) {
    let maxY = 100;
    objects.forEach(obj => {
      if (obj.top > maxY) maxY = obj.top;
    });
    START_Y = maxY + 150;
  }

  // If semantic AI ran, we only organize shapes (non-texts). 
  // If AI didn't run, we organize EVERYTHING.
  const objectsToOrganize = hasSemanticProcessed 
    ? objects.filter(o => o.type !== 'i-text' && o.type !== 'textbox' && !o.id?.startsWith('theme-'))
    : objects.filter(o => !o.id?.startsWith('theme-'));

  // Sort objects loosely by their original Y then X (quantized bands)
  objectsToOrganize.sort((a, b) => {
    const bandA = Math.round((a.top || 0) / 100);
    const bandB = Math.round((b.top || 0) / 100);
    if (bandA !== bandB) return bandA - bandB;
    return (a.left || 0) - (b.left || 0);
  });

  const COLUMNS = 5;
  let col = 0;
  let row = 0;

  objectsToOrganize.forEach((obj) => {
    // Snap to neat grid
    obj.left = START_X + (col * SPACING_X);
    obj.top = START_Y + (row * SPACING_Y);
    
    // Fix chaotic rotations!
    if (obj.angle !== undefined) {
      obj.angle = 0;
    }
    
    // For messy chaotic lines, straighten them horizontally
    if (obj.type === 'line') {
      const width = Math.abs((obj.x2 || 0) - (obj.x1 || 0)) || 100;
      obj.x1 = obj.left;
      obj.y1 = obj.top;
      obj.x2 = obj.left + width;
      obj.y2 = obj.top;
    }

    col++;
    if (col >= COLUMNS) {
      col = 0;
      row++;
    }
  });

  return objects;
};

// ─── Semantic Cleanup ────────────────────────────────────────────────────────
const performSemanticCleanup = async (objects) => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "YOUR_API_KEY_HERE") {
    console.warn("No GEMINI_API_KEY found. Skipping semantic LLM cleanup.");
    return { objects, semanticSuccess: false };
  }
  
  const textObjects = objects.filter(o => o.type === 'i-text' || o.type === 'textbox');
  if (textObjects.length < 2) return { objects, semanticSuccess: false }; // Not enough texts to cluster
  
  const texts = textObjects.map((o, idx) => `ID ${idx}: ${o.text}`).join('\n');
  
  const prompt = `
You are an AI that organizes messy whiteboard notes into meaningful clusters based on their semantic meaning.
Here is a list of text nodes with their IDs:
${texts}

Please group these IDs into 2-4 themes based on meaning.
Return ONLY valid JSON in this exact format, with no markdown code blocks around it:
{
  "clusters": [
    { "theme": "Theme Name", "ids": [0, 2] }
  ]
}
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith('```json')) text = text.replace(/```json\n?/, '').replace(/```\n?$/, '');
    
    const parsed = JSON.parse(text);
    
    const COLUMN_WIDTH = 350;
    const START_Y = 150;
    const SPACING = 80;
    
    parsed.clusters.forEach((cluster, clusterIndex) => {
      let currentY = START_Y;
      const xPos = 200 + (clusterIndex * COLUMN_WIDTH);
      
      cluster.ids.forEach(id => {
        const obj = textObjects[id];
        if (obj) {
          // Add a theme name above the cluster if it's the first item
          if (currentY === START_Y) {
            objects.push({
              type: 'i-text',
              text: `[ ${cluster.theme.toUpperCase()} ]`,
              left: xPos,
              top: currentY - 50,
              fontSize: 24,
              fill: '#6366f1',
              fontWeight: 'bold',
              fontFamily: '"DM Sans", sans-serif',
              id: `theme-${Date.now()}-${Math.random()}`
            });
          }
          
          obj.left = xPos;
          obj.top = currentY;
          currentY += SPACING;
        }
      });
    });
    
    return { objects, semanticSuccess: true };
  } catch (error) {
    console.error("Semantic Cleanup Error:", error);
    return { objects, semanticSuccess: false };
  }
};

// ─── Main Pipeline ───────────────────────────────────────────────────────────
export const processCleanup = async (canvasData) => {
  if (!canvasData || !canvasData.objects) return canvasData;
  
  let objects = canvasData.objects;
  
  // 1. Semantic grouping
  const semanticResult = await performSemanticCleanup(objects);
  objects = semanticResult.objects;
  
  // 2. Spatial alignment
  objects = performSpatialCleanup(objects, semanticResult.semanticSuccess);
  
  canvasData.objects = objects;
  return canvasData;
};
