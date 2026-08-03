#version 460 core
#include <flutter/runtime_effect.glsl>

uniform vec2 uSize;
uniform float uTime;
uniform float uProgress;
uniform vec2 uCamera;

out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.05;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = FlutterFragCoord().xy / uSize;
  vec2 centered = (uv - 0.5) * vec2(uSize.x / uSize.y, 1.0);
  centered += uCamera * 0.08;

  float t = uTime * 0.08;
  float progress = clamp(uProgress, 0.0, 1.0);

  // Warm pearl base — never dark / neon.
  vec3 base = mix(vec3(0.992, 0.980, 0.965), vec3(0.965, 0.935, 0.890), uv.y);
  vec3 mist = mix(vec3(0.96, 0.91, 0.84), vec3(0.93, 0.87, 0.78), progress);

  float n = fbm(centered * 2.2 + vec2(t * 0.35, -t * 0.22));
  float n2 = fbm(centered * 4.5 - vec2(t * 0.18, t * 0.31));

  // Soft volumetric light orbs that breathe and drift with progress.
  vec2 c1 = vec2(-0.15 + sin(t) * 0.05, -0.05 + progress * 0.12);
  vec2 c2 = vec2(0.28 + cos(t * 0.7) * 0.04, 0.18 - progress * 0.08);
  vec2 c3 = vec2(0.0, 0.02 + sin(t * 0.5) * 0.03);

  float d1 = length(centered - c1);
  float d2 = length(centered - c2);
  float d3 = length(centered - c3);

  float glow1 = exp(-d1 * (2.4 - progress * 0.6)) * (0.55 + 0.15 * sin(uTime * 0.9));
  float glow2 = exp(-d2 * 2.8) * (0.35 + 0.1 * cos(uTime * 0.7));
  float glow3 = exp(-d3 * (1.6 + progress)) * (0.25 + progress * 0.35);

  vec3 amber = vec3(0.96, 0.84, 0.62);
  vec3 rose = vec3(0.90, 0.72, 0.62);
  vec3 champagne = vec3(0.93, 0.86, 0.74);

  vec3 color = mix(base, mist, 0.35 + n * 0.25);
  color += amber * glow1 * 0.55;
  color += rose * glow2 * 0.35;
  color += champagne * glow3 * 0.45;
  color += vec3(0.04, 0.02, 0.01) * (n2 - 0.5);

  // Collapse: light concentrates toward center.
  float collapse = smoothstep(0.82, 1.0, progress);
  float toCenter = exp(-length(centered) * (1.2 + collapse * 4.0));
  color = mix(color, mix(amber, champagne, 0.4) * 1.05, collapse * toCenter * 0.65);
  color = mix(color, base * 1.02, collapse * (1.0 - toCenter) * 0.5);

  // Fine film grain / soft noise.
  float grain = (hash(FlutterFragCoord().xy + uTime * 12.0) - 0.5) * 0.03;
  color += grain;

  fragColor = vec4(color, 1.0);
}
