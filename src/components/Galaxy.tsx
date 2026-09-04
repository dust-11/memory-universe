import { useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { loadAnchors, loadAnchorMemories } from '../data/loadAnchors';
import { AnchorPlanet } from './AnchorPlanet';
import { MemoryCloud } from './MemoryCloud';
import type { Anchor } from '../types';

export function Galaxy() {
  const {
    anchors, selectedAnchor, anchorMemories,
    setAnchors, selectAnchor, setAnchorMemories, setLoadingLevel,
  } = useStore();

  useEffect(() => {
    setLoadingLevel(1);
    loadAnchors()
      .then((data) => { setAnchors(data); setLoadingLevel(0); })
      .catch(console.error);
  }, []);

  // 用 useCallback + 从 store 读最新 selectedAnchor，避免闭包旧值 bug
  const handleAnchorClick = useCallback(async (anchor: Anchor) => {
    // 从 store 最新状态读，不用闭包里的旧值
    const current = useStore.getState().selectedAnchor;

    if (current?.id === anchor.id) {
      selectAnchor(null);
      setAnchorMemories([]);
      return;
    }
    selectAnchor(anchor);
    setAnchorMemories([]);
    setLoadingLevel(2);
    try {
      const memories = await loadAnchorMemories(anchor.id);
      setAnchorMemories(memories);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLevel(0);
    }
  }, [selectAnchor, setAnchorMemories, setLoadingLevel]);

  return (
    <>
      {anchors.map((anchor) => (
        <AnchorPlanet
          key={anchor.id}
          anchor={anchor}
          onClick={handleAnchorClick}
          selected={selectedAnchor?.id === anchor.id}
        />
      ))}

      {selectedAnchor && anchorMemories.length > 0 && (
        <MemoryCloud
          memories={anchorMemories}
          anchorColor={selectedAnchor.color}
          anchorPosition={selectedAnchor.position}
        />
      )}
    </>
  );
}
