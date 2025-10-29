import { useState, useCallback } from 'react';
import { RenderStats } from '@/types';

interface UseRenderStatsReturn {
  stats: RenderStats | null;
  updateStats: (newStats: RenderStats) => void;
  resetStats: () => void;
  averageStats: RenderStats | null;
}

export const useRenderStats = (): UseRenderStatsReturn => {
  const [stats, setStats] = useState<RenderStats | null>(null);
  const [statsHistory, setStatsHistory] = useState<RenderStats[]>([]);

  const updateStats = useCallback((newStats: RenderStats) => {
    setStats(newStats);
    setStatsHistory(prev => {
      const updated = [...prev, newStats];
      // Keep only last 60 samples for rolling average
      return updated.slice(-60);
    });
  }, []);

  const resetStats = useCallback(() => {
    setStats(null);
    setStatsHistory([]);
  }, []);

  const averageStats = statsHistory.length > 0 ? {
    fps: statsHistory.reduce((sum, s) => sum + s.fps, 0) / statsHistory.length,
    renderTime: statsHistory.reduce((sum, s) => sum + s.renderTime, 0) / statsHistory.length,
    iterations: statsHistory[statsHistory.length - 1]?.iterations || 0,
    pixelsProcessed: statsHistory[statsHistory.length - 1]?.pixelsProcessed || 0,
  } : null;

  return {
    stats,
    updateStats,
    resetStats,
    averageStats,
  };
};