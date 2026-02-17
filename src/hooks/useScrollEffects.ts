import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook that tracks scroll progress of a container or viewport.
 * Returns a value between 0 and 1 representing scroll percentage.
 */
export function useScrollProgress(containerRef?: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);

  const handleScroll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      if (containerRef?.current) {
        const el = containerRef.current;
        const scrollTop = el.scrollTop;
        const scrollHeight = el.scrollHeight - el.clientHeight;
        setProgress(scrollHeight > 0 ? Math.min(scrollTop / scrollHeight, 1) : 0);
      } else {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(scrollHeight > 0 ? Math.min(scrollTop / scrollHeight, 1) : 0);
      }
    });
  }, [containerRef]);

  useEffect(() => {
    const target = containerRef?.current || window;
    target.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initial

    return () => {
      target.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll, containerRef]);

  return progress;
}

/**
 * Hook to get smooth interpolated scroll progress (lerped)
 */
export function useSmoothScroll(containerRef?: React.RefObject<HTMLElement | null>, smoothness = 0.1) {
  const rawProgress = useScrollProgress(containerRef);
  const [smoothProgress, setSmoothProgress] = useState(0);
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    targetRef.current = rawProgress;
  }, [rawProgress]);

  useEffect(() => {
    const animate = () => {
      currentRef.current += (targetRef.current - currentRef.current) * smoothness;
      setSmoothProgress(currentRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [smoothness]);

  return smoothProgress;
}

/**
 * Hook to detect if an element is in the viewport
 */
export function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/**
 * Real-time clock hook
 */
export function useRealTimeClock(intervalMs = 1000) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return time;
}

/**
 * Live productivity score hook — computes score from tasks/sessions
 */
export function useProductivityScore(tasks: any[] | undefined, sessions: any[] | undefined) {
  const [score, setScore] = useState(0);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');

  useEffect(() => {
    if (!tasks) return;
    const total = tasks.length || 1;
    const completed = tasks.filter((t: any) => t.status === 'completed').length;
    const inProgress = tasks.filter((t: any) => t.status === 'in_progress').length;
    const focusMinutes = sessions?.reduce((sum: number, s: any) => sum + (s.duration || 0), 0) || 0;

    // Score formula: completion weight + activity weight + focus weight
    const completionScore = (completed / total) * 40;
    const activityScore = Math.min((inProgress / Math.max(total - completed, 1)) * 30, 30);
    const focusScore = Math.min((focusMinutes / 3600) * 30, 30); // max 30 for 1hr focus
    const newScore = Math.round(completionScore + activityScore + focusScore);

    setTrend(newScore > score ? 'up' : newScore < score ? 'down' : 'stable');
    setScore(newScore);
  }, [tasks, sessions]);

  return { score, trend };
}
