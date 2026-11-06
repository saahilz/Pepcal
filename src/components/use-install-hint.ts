"use client";

/**
 * What kind of install does this browser offer? A display choice, like kg/lb
 * — nothing is stored about it.
 *
 *  - Android/Chrome exposes `beforeinstallprompt`; one tap installs.
 *  - iOS Safari never fires it; the Share sheet is the only path.
 *  - A window already running standalone (installed, or "Add to Home Screen"
 *    done, or Chrome app mode) needs no hint at all.
 *
 * shortcut: iOS "add to homescreen" detection uses the `standalone` media
 * query + navigator heuristic, which iPadOS 13+ masquerades as macOS — upgrade
 * to `navigator.storage.getDirectory()`-based checks only if that ever matters.
 */

import { useEffect, useState } from "react";

export type InstallHint = "android" | "ios" | "installed" | "unknown";

interface BrowserBeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallHint(): { hint: InstallHint; promptInstall: (() => void) | null } {
  const [hint, setHint] = useState<InstallHint>("unknown");
  const [deferred, setDeferred] = useState<BrowserBeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    /* Detection deferred a tick, like ThemeProvider's read: the react-hooks
       rule bans synchronous setState in effect bodies. */
    const id = window.setTimeout(() => {
      const mqStandalone = window.matchMedia("(display-mode: standalone)").matches;
      const safariStandalone =
        // iOS Safari in standalone; iPadOS 13+ reports as macOS, hence maxTouch.
        (navigator as unknown as { standalone?: boolean }).standalone === true ||
        (navigator.maxTouchPoints > 1 && /Mac|iPhone|iPad/.test(navigator.platform));
      if (mqStandalone || safariStandalone) setHint("installed");
      else if (/iPhone|iPad|iPod/.test(navigator.userAgent)) setHint("ios");
    }, 0);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BrowserBeforeInstallPromptEvent);
      setHint("android");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  return {
    hint,
    promptInstall: deferred
      ? () => {
          void deferred.prompt();
          void deferred.userChoice.then(() => setDeferred(null));
        }
      : null,
  };
}
