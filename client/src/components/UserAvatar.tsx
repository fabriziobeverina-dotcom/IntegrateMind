import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import jaguarImg from "@assets/avatars/jaguar.png";
import anacondaImg from "@assets/avatars/anaconda.png";
import eagleImg from "@assets/avatars/eagle.png";
import kamboFrogImg from "@assets/avatars/kambo-frog.png";
import tapirImg from "@assets/avatars/tapir.png";
import slothImg from "@assets/avatars/sloth.png";
import caimanImg from "@assets/avatars/caiman.png";
import butterflyImg from "@assets/avatars/butterfly.png";
import capybaraImg from "@assets/avatars/capybara.png";
import anteaterImg from "@assets/avatars/anteater.png";
import bobinsanaImg from "@assets/avatars/bobinsana.png";
import toeImg from "@assets/avatars/toe.png";
import shipiboImg from "@assets/avatars/shipibo.png";
import moonImg from "@assets/avatars/moon.png";
import sunImg from "@assets/avatars/sun.png";

export const AVATAR_PRESETS = [
  { key: "jaguar",     label: "Jaguar",          src: jaguarImg },
  { key: "anaconda",   label: "Anaconda",         src: anacondaImg },
  { key: "eagle",      label: "Eagle",            src: eagleImg },
  { key: "kambo-frog", label: "Kambo Frog",       src: kamboFrogImg },
  { key: "tapir",      label: "Tapir",            src: tapirImg },
  { key: "sloth",      label: "Sloth",            src: slothImg },
  { key: "caiman",     label: "Caiman",           src: caimanImg },
  { key: "butterfly",  label: "Butterfly",        src: butterflyImg },
  { key: "capybara",   label: "Capybara",         src: capybaraImg },
  { key: "anteater",   label: "Anteater",         src: anteaterImg },
  { key: "bobinsana",  label: "Bobinsana",        src: bobinsanaImg },
  { key: "toe",        label: "Toé",              src: toeImg },
  { key: "shipibo",    label: "Shipibo",          src: shipiboImg },
  { key: "moon",       label: "Moon",             src: moonImg },
  { key: "sun",        label: "Sun",              src: sunImg },
] as const;

export type AvatarPresetKey = typeof AVATAR_PRESETS[number]["key"];

function getPreset(key?: string | null) {
  return AVATAR_PRESETS.find((p) => p.key === key) ?? null;
}

interface UserAvatarProps {
  avatarKey?: string | null;
  profileImageUrl?: string | null;
  initials?: string;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({
  avatarKey,
  profileImageUrl,
  initials,
  name,
  size = "md",
  className,
}: UserAvatarProps) {
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm";
  const preset = getPreset(avatarKey);

  const displayInitials =
    initials ||
    (name
      ? name
          .split(" ")
          .filter(Boolean)
          .map((w) => w[0].toUpperCase())
          .slice(0, 2)
          .join("")
      : "?");

  return (
    <Avatar className={cn(sizeClass, className)}>
      {preset ? (
        <AvatarImage src={preset.src} alt={preset.label} />
      ) : !avatarKey && profileImageUrl ? (
        <AvatarImage src={profileImageUrl} alt={name} />
      ) : null}
      <AvatarFallback className="font-semibold select-none bg-muted text-muted-foreground">
        {displayInitials}
      </AvatarFallback>
    </Avatar>
  );
}
