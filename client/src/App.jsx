import React from "react";
import Canvas from "./features/whiteboard/components/Canvas";
import Toolbar from "./features/whiteboard/components/Toolbar";
import Sidebar from "./features/whiteboard/components/Sidebar";
import TopNav from "./features/whiteboard/components/TopNav";
import ZoomControls from "./features/whiteboard/components/ZoomControls";
import style from "./App.module.scss";

const App = () => {
  return (
    <div className={style.appContainer}>
      {/* 1. The main drawing canvas (Base Layer) */}
      <Canvas />

      {/* 2. UI Overlays (Floating on top) */}
      <TopNav />
      <Toolbar />
      <Sidebar />
      <ZoomControls />
    </div>
  );
};

export default App;
