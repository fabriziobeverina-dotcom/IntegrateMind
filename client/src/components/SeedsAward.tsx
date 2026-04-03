import { useEffect, useState, useRef } from "react";
import { Leaf, Star, Flower2, TreePine, Sprout, Award } from "lucide-react";

interface FloatingSeed {
  id: number;
  amount: number;
  x: number;
  y: number;
}

let _notifyFn: ((amount: number, x?: number, y?: number) => void) | null = null;

export function notifySeedsAwarded(amount: number, x?: number, y?: number) {
  if (_notifyFn && amount > 0) _notifyFn(amount, x, y);
}

export function SeedsAwardOverlay() {
  const [items, setItems] = useState<FloatingSeed[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    _notifyFn = (amount: number, x?: number, y?: number) => {
      const id = ++idRef.current;
      const cx = x ?? (window.innerWidth / 2 + (Math.random() - 0.5) * 80);
      const cy = y ?? (window.innerHeight * 0.55 + (Math.random() - 0.5) * 40);
      setItems(prev => [...prev, { id, amount, x: cx, y: cy }]);
      setTimeout(() => {
        setItems(prev => prev.filter(i => i.id !== id));
      }, 2600);
    };
    return () => { _notifyFn = null; };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50" aria-hidden="true">
      {items.map(item => (
        <div
          key={item.id}
          className="absolute seeds-float-up select-none"
          style={{ left: item.x, top: item.y }}
        >
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold shadow-md"
            style={{
              background: 'hsl(130 45% 96%)',
              color: 'hsl(130 50% 30%)',
              border: '1px solid hsl(130 40% 78%)',
            }}
          >
            <Leaf className="w-3.5 h-3.5" />
            <span>+{item.amount} seeds</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Badge unlock full-screen overlay
export interface BadgeUnlockPayload {
  id: string;
  name: string;
  description: string;
}

let _badgeFn: ((badge: BadgeUnlockPayload) => void) | null = null;

export function notifyBadgeUnlocked(badge: BadgeUnlockPayload) {
  if (_badgeFn) _badgeFn(badge);
}

const BADGE_ICONS: Record<string, any> = {
  first_root: Sprout,
  body_awakened: Leaf,
  full_spectrum: Star,
  deep_diver: Award,
  the_long_walk: TreePine,
  full_circle: Flower2,
  witness: Star,
  tender: Flower2,
};

export function BadgeUnlockOverlay() {
  const [current, setCurrent] = useState<BadgeUnlockPayload | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    _badgeFn = (badge) => {
      setCurrent(badge);
      setVisible(true);
      setTimeout(() => setVisible(false), 4500);
    };
    return () => { _badgeFn = null; };
  }, []);

  if (!current) return null;

  const Icon = BADGE_ICONS[current.id] ?? Star;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={() => setVisible(false)}
      role="dialog"
      aria-label="Badge unlocked"
    >
      <div className="flex flex-col items-center gap-4 text-center p-8 max-w-xs">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-chart-2 opacity-20 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-chart-2/15 flex items-center justify-center">
            <Icon className="w-10 h-10 text-chart-2" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Badge Unlocked</p>
          <h2 className="text-2xl font-semibold" style={{ fontFamily: '"Crimson Text", Georgia, serif' }}>{current.name}</h2>
          <p className="text-sm text-muted-foreground">{current.description}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Tap anywhere to continue</p>
      </div>
    </div>
  );
}
