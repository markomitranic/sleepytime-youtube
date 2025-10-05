"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type PlayerState = {
  isInactive: boolean;
};

type PlayerActions = {
  resetInactivity: () => void;
};

const PlayerContext = createContext<(PlayerState & PlayerActions) | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [isInactive, setIsInactive] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();
  const isPlayerPage = pathname === "/player";

  const resetInactivity = () => {
    if (!isPlayerPage) return; // Only reset if on player page
    setIsInactive(false);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      setIsInactive(true);
    }, 10000); // 10 seconds
  };

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
    <PlayerContext.Provider value={{ isInactive, resetInactivity }}>
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
