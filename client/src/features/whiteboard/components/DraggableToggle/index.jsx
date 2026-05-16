import React, { useState, useRef } from 'react';
import { Wand2, Check } from 'lucide-react';
import style from './DraggableToggle.module.scss';

const DraggableToggle = ({ onTrigger }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const dragStartRef = useRef(0);
  const trackRef = useRef(null);
  
  const TRACK_WIDTH = 160;
  const THUMB_WIDTH = 36;
  const PADDING = 4;
  const MAX_X = TRACK_WIDTH - THUMB_WIDTH - (PADDING * 2);
  
  const handlePointerDown = (e) => {
    if (isSuccess) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = e.clientX - dragX;
  };
  
  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStartRef.current;
    if (newX < 0) setDragX(0);
    else if (newX > MAX_X) setDragX(MAX_X);
    else setDragX(newX);
  };
  
  const handlePointerUp = (e) => {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    
    // Check if dragged to the end (allow 90% threshold)
    if (dragX >= MAX_X * 0.9) {
      setDragX(MAX_X);
      setIsSuccess(true);
      onTrigger();
      
      // Reset after success
      setTimeout(() => {
        setIsSuccess(false);
        setDragX(0);
      }, 2000);
    } else {
      setDragX(0);
    }
  };

  const progress = dragX / MAX_X;

  return (
    <div 
      className={style.track} 
      ref={trackRef}
      style={{ width: TRACK_WIDTH }}
      title="Slide to clean up the whiteboard"
    >
      {/* Background fill that grows as you drag */}
      <div 
        className={style.progressFill} 
        style={{ width: dragX + THUMB_WIDTH + PADDING }}
      />
      
      {/* Label */}
      <span 
        className={style.label}
        style={{ opacity: Math.max(0, 1 - progress * 1.5) }}
      >
        Mess Cleanup
      </span>
      
      {/* Draggable Thumb Wrapper */}
      <div 
        className={style.thumbWrapper}
        style={{ 
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' 
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className={`${style.thumb} ${isDragging ? style.dragging : ''} ${isSuccess ? style.success : ''}`}>
          {isSuccess ? <Check size={16} strokeWidth={3} /> : <Wand2 size={16} strokeWidth={2.5} />}
        </div>
      </div>
    </div>
  );
};

export default DraggableToggle;
