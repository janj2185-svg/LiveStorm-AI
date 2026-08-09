/**
 * Normalised facial landmarks for the SYLORA assistant portrait.
 * Coordinates are fractions of image width/height (0–1), calibrated for
 * `public/assets/assistant/luna-portrait.png`.
 */
export interface FacePoint {
  x: number;
  y: number;
}

export interface FaceLandmarks {
  leftEye: FacePoint;
  rightEye: FacePoint;
  leftBrow: FacePoint;
  rightBrow: FacePoint;
  nose: FacePoint;
  mouth: FacePoint;
  chin: FacePoint;
  leftCheek: FacePoint;
  rightCheek: FacePoint;
}

export const ASSISTANT_PORTRAIT_SRC = '/assets/assistant/luna-portrait.png';

export const LUNA_LANDMARKS: FaceLandmarks = {
  leftEye: { x: 0.385, y: 0.365 },
  rightEye: { x: 0.615, y: 0.365 },
  leftBrow: { x: 0.385, y: 0.31 },
  rightBrow: { x: 0.615, y: 0.31 },
  nose: { x: 0.5, y: 0.48 },
  mouth: { x: 0.5, y: 0.615 },
  chin: { x: 0.5, y: 0.82 },
  leftCheek: { x: 0.28, y: 0.52 },
  rightCheek: { x: 0.72, y: 0.52 },
};

/** Eye blink ellipse radii as fractions of image width. */
export const EYE_BLINK = {
  rx: 0.075,
  ry: 0.028,
};

/** Mouth warp region as fractions of image dimensions. */
export const MOUTH_REGION = {
  width: 0.22,
  height: 0.1,
  top: 0.565,
};
