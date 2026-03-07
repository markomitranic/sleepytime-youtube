import { useCallback, useEffect, useRef, useState } from "react";

export type SleepTimer = {
  isActive: boolean;
  durationMinutes: number;
  startTime?: number;
  remainingSeconds?: number;
  expired?: boolean;
};

export type SleepTimerActions = {
  setSleepTimer: (durationMinutes: number) => void;
  deactivateSleepTimer: () => void;
  dismissSleepExpiry: () => void;
  prolongSleepTimer: (additionalMinutes: number) => void;
  triggerSleep: () => void;
};

const DEFAULT_TIMER: SleepTimer = { isActive: false, durationMinutes: 30 };

export function useSleepTimer(): {
  sleepTimer: SleepTimer;
  isPaused: boolean;
  sleepTimerActions: SleepTimerActions;
  resetSleepTimer: () => void;
} {
  const [sleepTimer, setSleepTimerState] = useState<SleepTimer>(DEFAULT_TIMER);
  const [isPaused, setIsPaused] = useState(false);
  const triggerSleepRef = useRef<(() => void) | null>(null);

  const setSleepTimer = useCallback((durationMinutes: number) => {
    setSleepTimerState({
      isActive: true,
      durationMinutes,
      startTime: Date.now(),
      remainingSeconds: durationMinutes * 60,
    });
  }, []);

  const deactivateSleepTimer = useCallback(() => {
    setSleepTimerState((prev) => ({
      isActive: false,
      durationMinutes: prev.durationMinutes,
      expired: false,
    }));
  }, []);

  const dismissSleepExpiry = useCallback(() => {
    setSleepTimerState((prev) => ({ ...prev, expired: false, isActive: false }));
  }, []);

  const prolongSleepTimer = useCallback((additionalMinutes: number) => {
    setSleepTimerState({
      isActive: true,
      durationMinutes: additionalMinutes,
      startTime: Date.now(),
      remainingSeconds: additionalMinutes * 60,
      expired: false,
    });
  }, []);

  const triggerSleep = useCallback(() => {
    setIsPaused(true);
    setSleepTimerState((prev) => ({ ...prev, isActive: false, expired: true }));
  }, []);

  triggerSleepRef.current = triggerSleep;

  const resetSleepTimer = useCallback(() => {
    setSleepTimerState(DEFAULT_TIMER);
    setIsPaused(false);
  }, []);

  // Countdown interval
  useEffect(() => {
    if (!sleepTimer.isActive || !sleepTimer.startTime) return;

    const interval = setInterval(() => {
      setSleepTimerState((prev) => {
        if (!prev.isActive || !prev.startTime) return prev;

        const elapsed = Math.floor((Date.now() - prev.startTime) / 1000);
        const totalSeconds = prev.durationMinutes * 60;
        const remainingSeconds = Math.max(0, totalSeconds - elapsed);

        if (remainingSeconds <= 0) {
          setTimeout(() => triggerSleepRef.current?.(), 0);
          return prev;
        }

        return { ...prev, remainingSeconds };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimer.isActive, sleepTimer.startTime]);

  return {
    sleepTimer,
    isPaused,
    sleepTimerActions: {
      setSleepTimer,
      deactivateSleepTimer,
      dismissSleepExpiry,
      prolongSleepTimer,
      triggerSleep,
    },
    resetSleepTimer,
  };
}
