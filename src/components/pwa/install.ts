"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
let started = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

/**
 * Chrome and Edge fire `beforeinstallprompt` once, early — often before React
 * has mounted. Catching it at module level keeps the install button honest.
 */
export function watchInstallPrompt() {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export type InstallPlatform = "prompt" | "ios" | "other";

export interface InstallState {
  /** The browser offered us its own install prompt. */
  canPrompt: boolean;
  /** Already running as an installed app. */
  installed: boolean;
  platform: InstallPlatform;
  install: () => Promise<boolean>;
}

export function useInstall(): InstallState {
  const prompt = useSyncExternalStore(
    subscribe,
    () => deferred,
    () => null,
  );
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    watchInstallPrompt();

    const media = window.matchMedia("(display-mode: standalone)");
    const update = () =>
      setInstalled(media.matches || (window.navigator as { standalone?: boolean }).standalone === true);
    update();
    media.addEventListener("change", update);

    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document));

    window.addEventListener("appinstalled", update);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("appinstalled", update);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      deferred = null;
      emit();
      return true;
    }
    return false;
  }, []);

  return {
    canPrompt: prompt !== null,
    installed,
    platform: prompt ? "prompt" : isIOS ? "ios" : "other",
    install,
  };
}
