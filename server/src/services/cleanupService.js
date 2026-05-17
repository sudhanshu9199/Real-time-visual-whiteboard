import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import dagre from "dagre";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "DUMMY");

// ─── Spatial Cleanup ─────────────────────────────────────────────────────────
const performSpatialCleanup = (objects, hasSemanticProcessed) => {
  const nodes = [];
  const lines = [];

  objects.forEach(obj => {
    if (obj.id?.startsWith('theme-')) return;
    
    // Sort into lines/arrows and shapes
    if (obj.type === 'line' || obj.type === 'arrow' || (obj.type === 'group' && obj.customName === 'arrow')) {
      lines.push(obj);
    } else if (
      obj.type === 'rect' || obj.type === 'circle' || obj.type === 'triangle' || obj.type === 'polygon' || obj.type === 'group'
    ) {
      nodes.push(obj);
    }
  });

  if (nodes.length === 0) return objects;

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 150, ranksep: 150 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach(node => {
    const w = (node.width || 100) * (node.scaleX || 1);
    const h = (node.height || 100) * (node.scaleY || 1);
    g.setNode(node.id, { width: w, height: h, obj: node });
  });

  const getDistance = (x1, y1, x2, y2) => Math.sqrt((x2-x1)**2 + (y2-y1)**2);

  const getCenter = (node) => {
     let x = node.left || 0;
     let y = node.top || 0;
     if (node.originX !== 'center') x += ((node.width || 0) * (node.scaleX || 1)) / 2;
     if (node.originY !== 'center') y += ((node.height || 0) * (node.scaleY || 1)) / 2;
     return { x, y };
  };

  const edgeMappings = [];

  lines.forEach(line => {
    let x1 = line.x1 !== undefined ? line.x1 : line.left;
    let y1 = line.y1 !== undefined ? line.y1 : line.top;
    let x2 = line.x2 !== undefined ? line.x2 : line.left + (line.width || 0);
    let y2 = line.y2 !== undefined ? line.y2 : line.top + (line.height || 0);

    if (line.type === 'group' && line.customName === 'arrow') {
        x1 = line.left;
        y1 = line.top;
        x2 = line.left + line.width;
        y2 = line.top + line.height;
    }

    let closestFrom = null; let minFromDist = Infinity;
    let closestTo = null;   let minToDist = Infinity;

    nodes.forEach(node => {
      const c = getCenter(node);
      const distFrom = getDistance(x1, y1, c.x, c.y);
      const distTo = getDistance(x2, y2, c.x, c.y);

      if (distFrom < minFromDist) { minFromDist = distFrom; closestFrom = node; }
      if (distTo < minToDist) { minToDist = distTo; closestTo = node; }
    });

    // Proximity binding (if endpoints are < 400px from shape centers)
    if (closestFrom && closestTo && closestFrom !== closestTo) {
      if (minFromDist < 400 && minToDist < 400) {
         g.setEdge(closestFrom.id, closestTo.id);
         edgeMappings.push({ line, fromNode: closestFrom, toNode: closestTo });
      }
    }
  });

  dagre.layout(g);

  const START_X = 150;
  let START_Y = 150;

  if (hasSemanticProcessed) {
    let maxY = 100;
    objects.forEach(obj => {
      if (obj.top > maxY) maxY = obj.top;
    });
    START_Y = maxY + 200;
  }

  let minDagreX = Infinity, minDagreY = Infinity;
  g.nodes().forEach(v => {
     const n = g.node(v);
     if (n.x < minDagreX) minDagreX = n.x;
     if (n.y < minDagreY) minDagreY = n.y;
  });

  g.nodes().forEach(v => {
    const n = g.node(v);
    const nodeObj = n.obj;
    if (!nodeObj) return;

    if (nodeObj.angle !== undefined) nodeObj.angle = 0;

    let newLeft = START_X + (n.x - minDagreX);
    let newTop = START_Y + (n.y - minDagreY);

    if (nodeObj.originX !== 'center') newLeft -= n.width / 2;
    if (nodeObj.originY !== 'center') newTop -= n.height / 2;

    nodeObj.left = newLeft;
    nodeObj.top = newTop;
  });

  edgeMappings.forEach(({ line, fromNode, toNode }) => {
     const c1 = getCenter(fromNode);
     const c2 = getCenter(toNode);

     if (line.type === 'line') {
       line.x1 = c1.x; line.y1 = c1.y;
       line.x2 = c2.x; line.y2 = c2.y;
       line.left = Math.min(c1.x, c2.x);
       line.top = Math.min(c1.y, c2.y);
       line.width = Math.abs(c2.x - c1.x);
       line.height = Math.abs(c2.y - c1.y);
     } else if (line.type === 'group' && line.customName === 'arrow') {
       const angle = Math.atan2(c2.y - c1.y, c2.x - c1.x) * 180 / Math.PI;
       const length = getDistance(c1.x, c1.y, c2.x, c2.y);
       
       line.left = c1.x;
       line.top = c1.y;
       line.originX = 'left';
       line.originY = 'center';
       line.angle = angle;
       line.scaleX = length / (line.width || 1);
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
