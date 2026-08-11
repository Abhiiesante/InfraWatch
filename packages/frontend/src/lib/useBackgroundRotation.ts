import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Manages background image rotation with cross-fade transitions.
 * Returns { current, next, transitioning } to render two stacked images.
 */
export function useBackgroundRotation(
  images: readonly string[],
  intervalMs = 8000,
  fadeDurationMs = 2000
) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = useCallback(() => {
    if (images.length <= 1) return;
    setTransitioning(true);
    setNextIndex((prev) => (prev + 1) % images.length);

    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
      setTransitioning(false);
    }, fadeDurationMs);
  }, [images.length, fadeDurationMs]);

  useEffect(() => {
    if (images.length <= 1) return;
    timerRef.current = setInterval(advance, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [advance, intervalMs, images.length]);

  return {
    currentImage: images[currentIndex] || images[0],
    nextImage: images[nextIndex] || images[0],
    transitioning,
    currentIndex,
  };
}
