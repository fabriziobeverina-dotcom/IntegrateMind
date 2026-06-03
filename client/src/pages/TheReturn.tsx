import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Lock, X } from "lucide-react";

function getJourneyDay(journeyStartDate: string | Date | null | undefined): number | null {
  if (!journeyStartDate) return null;
  const start = new Date(journeyStartDate);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

function nextGameDay(currentDay: number): number {
  const next = Math.ceil(currentDay / 7) * 7;
  return next === currentDay ? currentDay + 7 : next;
}

export default function TheReturn() {
  const { user } = useAuth();
  const [playing, setPlaying] = useState(false);

  const journeyDay = getJourneyDay((user as any)?.journeyStartDate);
  const isAvailable = journeyDay !== null && journeyDay >= 7 && journeyDay % 7 === 0;
  const daysUntil = journeyDay !== null && !isAvailable
    ? (journeyDay < 7 ? 7 - journeyDay : nextGameDay(journeyDay) - journeyDay)
    : null;

  // Prevent body scroll while playing
  useEffect(() => {
    if (playing) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [playing]);

  if (playing) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col">
        <button
          onClick={() => setPlaying(false)}
          className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-black/80 border border-white/20 text-white/70 hover:text-white text-xs font-bold tracking-widest uppercase rounded"
          data-testid="button-exit-game"
        >
          <X className="w-3.5 h-3.5" />
          Exit
        </button>
        <iframe
          src="/the-return.html"
          title="The Return"
          className="flex-1 w-full border-0"
          allow="autoplay"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* CRT scanline overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-10"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
        }}
      />

      {/* Dark background */}
      <div className="fixed inset-0 bg-[#020204]" />

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, #ffb703 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-20 flex flex-col items-center text-center px-6 py-16 max-w-xl w-full mx-auto gap-8">

        {/* Decorative row */}
        <div className="flex items-center gap-3 text-[#475569] text-xs tracking-[0.3em] uppercase font-bold select-none">
          <span>◆</span><span>Integration Compass</span><span>◆</span>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="text-[#475569] text-xs tracking-[0.2em] uppercase font-bold">
            Weekly Portal
          </div>
          <h1
            className="text-5xl sm:text-7xl font-black tracking-widest uppercase select-none"
            style={{
              color: "#ffb703",
              textShadow: "0 0 40px rgba(255,183,3,0.5), 4px 4px 0 #000, 8px 8px 0 rgba(0,0,0,0.4)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            THE
          </h1>
          <h1
            className="text-5xl sm:text-7xl font-black tracking-widest uppercase select-none"
            style={{
              color: "#ffb703",
              textShadow: "0 0 40px rgba(255,183,3,0.5), 4px 4px 0 #000, 8px 8px 0 rgba(0,0,0,0.4)",
            }}
          >
            RETURN
          </h1>
        </div>

        {/* Separator */}
        <div className="flex items-center gap-3 w-full max-w-xs">
          <div className="flex-1 h-px bg-[#475569]" />
          <span className="text-[#475569] text-xs tracking-[0.2em]">◈</span>
          <div className="flex-1 h-px bg-[#475569]" />
        </div>

        {/* Description */}
        <p className="text-white/60 text-sm leading-relaxed max-w-sm">
          A text-based journey through the integration landscape. Each week a new portal opens — step through your shadow, meet your guide, and choose the path forward.
        </p>

        {/* State: no journey */}
        {journeyDay === null && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 border border-[#475569] px-4 py-2 rounded text-[#475569] text-xs tracking-widest uppercase font-bold">
              <Lock className="w-3.5 h-3.5" />
              Begin your journey to unlock
            </div>
          </div>
        )}

        {/* State: too early */}
        {journeyDay !== null && !isAvailable && (
          <div className="flex flex-col items-center gap-5">
            <div
              className="border px-6 py-4 rounded space-y-1"
              style={{ borderColor: "#475569", background: "rgba(255,183,3,0.04)" }}
            >
              <div className="text-[#475569] text-xs tracking-[0.2em] uppercase font-bold">
                Portal opens in
              </div>
              <div
                className="text-4xl font-black tracking-widest tabular-nums"
                style={{ color: "#ffb703", textShadow: "0 0 20px rgba(255,183,3,0.4)" }}
              >
                {daysUntil} {daysUntil === 1 ? "DAY" : "DAYS"}
              </div>
              <div className="text-[#475569] text-xs tracking-[0.15em] uppercase">
                Journey day {journeyDay} · Next unlock: day {nextGameDay(journeyDay ?? 0)}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[#475569] text-xs tracking-widest uppercase font-bold">
              <Lock className="w-3 h-3" />
              Locked
            </div>
          </div>
        )}

        {/* State: available */}
        {isAvailable && (
          <div className="flex flex-col items-center gap-5">
            <div
              className="px-4 py-1.5 rounded text-xs tracking-[0.2em] uppercase font-bold"
              style={{
                background: "rgba(0,245,212,0.1)",
                border: "1px solid #00f5d4",
                color: "#00f5d4",
              }}
            >
              Portal open · Day {journeyDay}
            </div>

            <button
              onClick={() => setPlaying(true)}
              data-testid="button-enter-game"
              className="group relative px-12 py-5 font-black text-xl tracking-[0.2em] uppercase transition-all duration-150"
              style={{
                background: "#ffb703",
                border: "2px solid #fff",
                color: "#000",
                boxShadow: "6px 6px 0 #000",
                borderRadius: "6px",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = "translate(-2px,-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "8px 8px 0 #000";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "";
                (e.currentTarget as HTMLElement).style.boxShadow = "6px 6px 0 #000";
              }}
              onMouseDown={e => {
                (e.currentTarget as HTMLElement).style.transform = "translate(2px,2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "2px 2px 0 #000";
              }}
              onMouseUp={e => {
                (e.currentTarget as HTMLElement).style.transform = "translate(-2px,-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "8px 8px 0 #000";
              }}
            >
              ▶ ENTER
            </button>

            <p className="text-white/30 text-xs tracking-widest uppercase">
              Portal closes at midnight
            </p>
          </div>
        )}

        {/* Bottom sigil */}
        <div className="text-[#1e293b] text-2xl tracking-[0.5em] select-none mt-4">
          ✦ ✦ ✦
        </div>
      </div>
    </div>
  );
}
