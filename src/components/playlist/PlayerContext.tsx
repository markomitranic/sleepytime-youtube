"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

type PlayerState = {
  isInactive: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playerInstance: any;
};

type PlayerActions = {
  resetInactivity: () => void;
  togglePlayPause: () => void;
  updateProgress: (time: number, duration: number, videoId?: string) => void;
  setPlayerInstance: (instance: any) => void;
  setIsPlaying: (playing: boolean) => void;
  getSavedProgress: (videoId: string) => number | null;
  clearSavedProgress: (videoId: string) => void;
};

const PROGRESS_STORAGE_KEY = 'sleepytime-video-progress';

const PlayerContext = createContext<(PlayerState & PlayerActions) | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [isInactive, setIsInactive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerInstance, setPlayerInstance] = useState<any>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();
  const isPlayerPage = pathname === "/player";

  const resetInactivity = useCallback(() => {
    if (!isPlayerPage) return; // Only reset if on player page
    setIsInactive(false);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      setIsInactive(true);
    }, 10000); // 10 seconds
  }, [isPlayerPage]);

  const togglePlayPause = useCallback(() => {
    if (!playerInstance) return;
    
    try {
      if (isPlaying) {
        playerInstance.pauseVideo();
        setIsPlaying(false);
      } else {
        playerInstance.playVideo();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  }, [playerInstance, isPlaying]);

  const updateProgress = useCallback((time: number, duration: number, videoId?: string) => {
    setCurrentTime(time);
    setDuration(duration);
    
    // Persist progress to localStorage if we have a videoId
    if (videoId && typeof window !== 'undefined' && duration > 0) {
      try {
        const progress = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}');
        progress[videoId] = {
          currentTime: time,
          duration,
          timestamp: Date.now(),
        };
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
      } catch (error) {
        console.warn('Failed to save video progress:', error);
      }
    }
  }, []);

  const getSavedProgress = useCallback((videoId: string): number | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const progress = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}');
      const saved = progress[videoId];
      
      if (!saved || !saved.currentTime || !saved.duration) return null;
      
      // Don't restore if the saved position is within the last 10 seconds (likely finished)
      if (saved.duration - saved.currentTime < 10) return null;
      
      // Don't restore if saved more than 7 days ago
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      if (saved.timestamp && saved.timestamp < sevenDaysAgo) return null;
      
      return saved.currentTime;
    } catch (error) {
      console.warn('Failed to retrieve saved progress:', error);
      return null;
    }
  }, []);

  const clearSavedProgress = useCallback((videoId: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      const progress = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}');
      delete progress[videoId];
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.warn('Failed to clear saved progress:', error);
    }
  }, []);

  const setPlayerInstanceCallback = useCallback((instance: any) => {
    setPlayerInstance(instance);
  }, []);

  const setIsPlayingCallback = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  // Inactivity timer - only active on player page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isPlayerPage) {
      // Reset inactive state when not on player page
      setIsInactive(false);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      return;
    }

    // Reset timer on any user interaction
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, resetInactivity);
    });

    // Start the timer initially
    resetInactivity();

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetInactivity);
      });
    };
  }, [isPlayerPage]);

  return (
    <PlayerContext.Provider value={{ 
      isInactive, 
      resetInactivity, 
      isPlaying, 
      currentTime, 
      duration, 
      playerInstance, 
      togglePlayPause, 
      updateProgress, 
      setPlayerInstance: setPlayerInstanceCallback, 
      setIsPlaying: setIsPlayingCallback,
      getSavedProgress,
      clearSavedProgress
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
