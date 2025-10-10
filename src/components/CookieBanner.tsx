"use client";

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasAcceptedCookies = localStorage.getItem("cookieConsent");
    if (!hasAcceptedCookies) {
      setIsVisible(true);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem("cookieConsent", "true");
    setIsVisible(false);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-xs rounded-lg border border-zinc-700 bg-zinc-900/95 p-4 shadow-lg backdrop-blur-sm">
      <p className="mb-3 text-sm text-zinc-300">
        We only use cookies for your login with YouTube. No tracking, no analytics.
      </p>
      <Button
        onClick={handleAccept}
        size="sm"
        className="w-full"
      >
        Okay
      </Button>
    </div>
  );
}

