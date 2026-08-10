"use client";

import { useEffect, useMemo, useState } from "react";

type Reaction = "idle" | "listen" | "talk" | "smile" | "wave" | "nod" | "think";
type Expression = "neutral" | "listen" | "speak" | "smile" | "wave" | "nod";

const FILES: Record<Expression, string> = {
  neutral: "/avatars/lira/sylora-avatar-neutral.webp",
  listen: "/avatars/lira/sylora-avatar-listen.webp",
  speak: "/avatars/lira/sylora-avatar-speak.webp",
  smile: "/avatars/lira/sylora-avatar-smile.webp",
  wave: "/avatars/lira/sylora-avatar-wave.webp",
  nod: "/avatars/lira/sylora-avatar-nod.webp",
};

const POSE_CHANGE = new Set<Expression>(["wave", "nod"]);

function expressionFor(reaction: Reaction): Expression {
  switch (reaction) {
    case "listen":
      return "listen";
    case "talk":
      return "speak";
    case "smile":
      return "smile";
    case "wave":
      return "wave";
    case "nod":
      return "nod";
    default:
      return "neutral";
  }
}

function plateOpacity(key: Expression, active: Expression, mix: number): number {
  const poseChange = POSE_CHANGE.has(active);
  if (poseChange) {
    if (mix >= 0.35) return key === active ? 1 : 0;
    return key === "neutral" ? 1 : 0;
  }
  if (key === "neutral") return 1;
  if (key === active) return Math.min(mix, 0.48);
  return 0;
}

export function LivingAvatar({
  variant = "stage",
  reaction = "idle",
}: {
  variant?: "stage" | "compact";
  reaction?: Reaction;
}) {
  const active = expressionFor(reaction);
  const [t, setT] = useState(0);

  useEffect(() => {
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame += 1;
      if (frame % 2 === 0) setT(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pose = useMemo(() => {
    const breath = (Math.sin(t * 0.0011) + 1) * 0.5;
    const blinkCycle = 3600;
    const local = t % blinkCycle;
    let blink = 0;
    if (local < 80) blink = local / 80;
    else if (local < 130) blink = 1;
    else if (local < 230) blink = 1 - (local - 130) / 100;

    let mix = 0.1 + breath * 0.05;
    if (reaction === "listen") mix = 0.4;
    if (reaction === "talk") mix = 0.38;
    if (reaction === "smile") mix = 0.42;
    if (reaction === "wave" || reaction === "nod") mix = 0.9;
    if (reaction === "think") mix = 0.2;

    return {
      yaw: Math.sin(t * 0.00055) * 1.6,
      pitch: Math.sin(t * 0.00047) * 0.9,
      breath,
      blink,
      mix,
      gazeX: Math.sin(t * 0.00063) * 0.2,
      gazeY: Math.sin(t * 0.00071) * 0.1,
      lip: reaction === "talk" ? 0.35 + Math.abs(Math.sin(t * 0.018)) * 0.4 : 0,
    };
  }, [t, reaction]);

  const style = {
    ["--yaw" as string]: `${pose.yaw.toFixed(2)}deg`,
    ["--pitch" as string]: `${pose.pitch.toFixed(2)}deg`,
    ["--breath" as string]: pose.breath.toFixed(3),
    ["--blink" as string]: pose.blink.toFixed(3),
    ["--gaze-x" as string]: pose.gazeX.toFixed(3),
    ["--gaze-y" as string]: pose.gazeY.toFixed(3),
    ["--lip" as string]: pose.lip.toFixed(3),
  };

  return (
    <figure className={`sylora-avatar sylora-avatar--${variant}`} style={style} aria-label="Sylora">
      <div className="sylora-avatar__stage">
        <div className="sylora-avatar__rig">
          {(Object.keys(FILES) as Expression[]).map((key) => (
            // Opacity-stacked plates need simultaneous decode; next/image breaks hard-cut poses.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={key}
              className="sylora-avatar__plate"
              src={FILES[key]}
              alt=""
              draggable={false}
              style={{ opacity: plateOpacity(key, active, pose.mix) }}
            />
          ))}
          <span className="sylora-avatar__mouth" />
          <span className="sylora-avatar__lid sylora-avatar__lid--l" />
          <span className="sylora-avatar__lid sylora-avatar__lid--r" />
        </div>
      </div>
      {variant === "stage" && (
        <figcaption className="sylora-avatar__caption">
          <strong>Sylora</strong>
          <span>Я поруч · жива · в зборі</span>
        </figcaption>
      )}
    </figure>
  );
}
