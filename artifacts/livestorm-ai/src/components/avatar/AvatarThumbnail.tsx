// Avatar thumbnail — shows a 2D render for RPM avatars, or an icon placeholder.
// No WebGL required.

import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarThumbnailProps {
  avatarKey: string;
  accentColor: string;
  avatarUrl?: string | null;
  renderer?: string;
  size?: number;
  selected?: boolean;
}

function isRpmGlbUrl(url: string): boolean {
  return (
    url.startsWith("https://models.readyplayer.me") ||
    url.startsWith("https://api.readyplayer.me")
  );
}

function rpmThumbnailUrl(glbUrl: string): string {
  const base = glbUrl.split("?")[0].replace(/\.glb$/, "");
  return `${base}.png?scene=fullbody-portrait-v1-transparent&blendShapes[mouthSmile]=0.2&background=transparent&w=400&h=600`;
}

function rendererIcon(renderer?: string): string {
  switch (renderer) {
    case "rpm":     return "R";
    case "avaturn": return "A";
    case "vrm":     return "V";
    default:        return "?";
  }
}

export function AvatarThumbnail({
  avatarKey: _avatarKey,
  accentColor,
  avatarUrl,
  renderer,
  size = 60,
  selected = false,
}: AvatarThumbnailProps) {
  const height = Math.round(size * 1.35);

  const rpmThumb =
    avatarUrl && isRpmGlbUrl(avatarUrl) ? rpmThumbnailUrl(avatarUrl) : null;

  return (
    <div
      style={{ width: size, height }}
      className="relative flex items-center justify-center"
    >
      {selected && (
        <div
          className="absolute inset-0 rounded-xl blur-lg opacity-35"
          style={{ background: accentColor }}
        />
      )}

      <div
        className={cn(
          "relative overflow-hidden rounded-xl flex items-center justify-center",
          selected && "ring-2 ring-offset-1 ring-offset-black/40",
        )}
        style={{ width: size, height, ringColor: accentColor }}
      >
        {rpmThumb ? (
          <img
            src={rpmThumb}
            alt="avatar"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const next = e.currentTarget.nextElementSibling as HTMLElement;
              if (next) next.style.display = "flex";
            }}
          />
        ) : null}

        {/* Fallback / no-avatar placeholder */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl",
            rpmThumb ? "hidden" : "flex",
          )}
          style={{
            background: `linear-gradient(160deg, ${accentColor}22 0%, ${accentColor}08 100%)`,
            border: `1px solid ${accentColor}30`,
          }}
        >
          {avatarUrl && !rpmThumb ? (
            <span
              className="text-[10px] font-bold font-mono"
              style={{ color: `${accentColor}cc` }}
            >
              {rendererIcon(renderer)}
            </span>
          ) : (
            <User
              className="opacity-20"
              style={{ width: size * 0.38, height: size * 0.38, color: accentColor }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
