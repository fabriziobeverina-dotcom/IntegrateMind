import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export const AVATAR_PRESETS = [
  { key: "sky",     bg: "bg-sky-500",     text: "text-white" },
  { key: "blue",    bg: "bg-blue-600",    text: "text-white" },
  { key: "violet",  bg: "bg-violet-500",  text: "text-white" },
  { key: "purple",  bg: "bg-purple-600",  text: "text-white" },
  { key: "pink",    bg: "bg-pink-500",    text: "text-white" },
  { key: "rose",    bg: "bg-rose-500",    text: "text-white" },
  { key: "red",     bg: "bg-red-500",     text: "text-white" },
  { key: "orange",  bg: "bg-orange-500",  text: "text-white" },
  { key: "amber",   bg: "bg-amber-500",   text: "text-white" },
  { key: "yellow",  bg: "bg-yellow-400",  text: "text-gray-900" },
  { key: "lime",    bg: "bg-lime-500",    text: "text-white" },
  { key: "green",   bg: "bg-green-600",   text: "text-white" },
  { key: "teal",    bg: "bg-teal-500",    text: "text-white" },
  { key: "cyan",    bg: "bg-cyan-500",    text: "text-white" },
  { key: "slate",   bg: "bg-slate-500",   text: "text-white" },
  { key: "stone",   bg: "bg-stone-500",   text: "text-white" },
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
      {!avatarKey && profileImageUrl ? (
        <AvatarImage src={profileImageUrl} alt={name} />
      ) : null}
      <AvatarFallback
        className={cn(
          "font-semibold select-none",
          preset ? `${preset.bg} ${preset.text}` : "bg-muted text-muted-foreground"
        )}
      >
        {displayInitials}
      </AvatarFallback>
    </Avatar>
  );
}
