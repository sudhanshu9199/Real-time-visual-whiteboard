import { processCleanup } from '../services/cleanupService.js';

export const setupWhiteboardHandlers = (io, socket) => {
  socket.on('cleanup_request', async (payload) => {
    console.log(`[Socket] Received cleanup_request from ${socket.id}`);
    try {
      const { canvasState } = payload;
      // Process cleanup
      const cleanedState = await processCleanup(canvasState);
      
      // Emit back to the user who requested it
      socket.emit('cleanup_response', { success: true, canvasState: cleanedState });
      
      // Note: If you want to broadcast to everyone in the room:
      // io.emit('board_updated', { canvasState: cleanedState });
    } catch (error) {
      console.error("[Socket] Cleanup Error:", error);
      socket.emit('cleanup_response', { success: false, error: "Cleanup failed" });
    }
  });
};
