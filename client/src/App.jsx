import React from "react";
import Canvas from "./features/whiteboard/components/Canvas";
import Toolbar from "./features/whiteboard/components/Toolbar";
import Sidebar from "./features/whiteboard/components/Sidebar";
import TopNav from "./features/whiteboard/components/TopNav";
import ZoomControls from "./features/whiteboard/components/ZoomControls";

const App = () => {
  return;
  <div className="relative w-screen h-screen overflow-hidden bg-[#0f0f14] text-gray-200">
    {/* 1. The main drawing canvas (Base Layer) */}
    <Canvas />

    {/* 2. UI Overlays (Floating on top) */}
    <TopNav />
    <Toolbar />
    <Sidebar />
    <ZoomControls />
  </div>;
};

export default App;
