import { useEffect, useRef } from "react";

/**
 * USB/hardware barcode scanners behave like a keyboard: fast keystrokes ending
 * with Enter. This captures them globally, even when no input is focused.
 */
export function useUsbScanner(onScan: (code: string) => void, enabled = true) {
  const buffer = useRef("");
  const last = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typingInField =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
        !target.hasAttribute("data-scanner-input");

      const now = Date.now();
      if (now - last.current > 120) buffer.current = "";
      last.current = now;

      if (e.key === "Enter") {
        const code = buffer.current.trim();
        buffer.current = "";
        if (code.length >= 3) {
          if (typingInField) return;
          onScan(code);
        }
        return;
      }
      if (e.key.length === 1) buffer.current += e.key;
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onScan, enabled]);
}