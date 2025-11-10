import { useState } from 'react';

/**
 * Custom hook for drag and drop functionality
 * Handles dragged index state for file reordering
 */
export function useDragAndDrop() {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Note: Actual reordering logic would need to be added to Zustand store
    // For now, just tracking the dragged index
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return {
    draggedIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
