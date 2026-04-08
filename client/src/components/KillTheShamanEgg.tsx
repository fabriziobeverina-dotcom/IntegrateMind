import { useState, useRef, useCallback } from "react";

const GAME_URL = "https://killtheshaman.replit.app/";
const TAPS_NEEDED = 7;
const TAP_WINDOW_MS = 3000;

export function useKillTheShamanEgg() {
  const [open, setOpen] = useState(false);
  const taps = useRef<number[]>([]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    taps.current = [...taps.current, now].filter((t) => now - t < TAP_WINDOW_MS);
    if (taps.current.length >= TAPS_NEEDED) {
      taps.current = [];
      setOpen(true);
    }
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const eggTrigger = { onClick: handleTap, style: { userSelect: "none" as const } };

  return { open, close, eggTrigger };
}

export default function KillTheShamanOverlay({ open, close }: { open: boolean; close: () => void }) {
  if (!open) return null;

  return (
    <div
      onClick={close}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.88)",
        display: "flex", alignItems: "center", justifyContent: "center",
        touchAction: "none",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", maxWidth: "100vw" }}
      >
        <button
          onClick={close}
          style={{
            position: "absolute", top: -20, right: -8, zIndex: 1,
            background: "#ff4444", color: "#fff", border: "2px solid #fff",
            borderRadius: "50%", width: 40, height: 40,
            cursor: "pointer", fontWeight: "bold", fontSize: 18,
            touchAction: "manipulation",
          }}
        >✕</button>
        <iframe
          src={GAME_URL}
          width={Math.min(375, window.innerWidth)}
          height={Math.min(667, window.innerHeight - 40)}
          style={{ border: "none", borderRadius: 8, display: "block" }}
          title="Kill the Shaman"
          allow="autoplay"
        />
        <p style={{
          textAlign: "center", color: "rgba(255,255,255,0.4)",
          fontSize: 11, marginTop: 8,
        }}>
          tap outside to close
        </p>
      </div>
    </div>
  );
}
