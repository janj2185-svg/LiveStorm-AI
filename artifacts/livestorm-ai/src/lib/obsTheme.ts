export function useOverlayTheme() {
  const params = new URLSearchParams(window.location.search);
  const fontScale = Math.max(0.5, Math.min(2, parseFloat(params.get("fontScale") ?? "1") || 1));
  const animationStyle = (params.get("animation") ?? "smooth") as "smooth" | "snappy" | "none";
  const transitionMs = animationStyle === "none" ? 0 : animationStyle === "snappy" ? 150 : 400;
  return { fontScale, animationStyle, transitionMs };
}
