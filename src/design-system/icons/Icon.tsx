/**
 * SYLORA icon system
 * ---------------------------------------------------------------------------
 * CONSTRUCTION GRID
 *   canvas        24 x 24
 *   live area     20 x 20  (2px keyline on every side)
 *   stroke        1.6px at 24px, scaling linearly with size
 *   terminals     round cap, round join
 *   corner radius 2px on squares, 3px on containers
 *   key angles    0, 30, 45, 60, 90 only
 *
 * WHY STROKE AND NOT FILL
 * Stroked icons hold their weight next to 15px Inter body text. Filled icons
 * at the same size read roughly 40% heavier and pull the eye away from
 * content. Fill is reserved for *selected* navigation, where the weight change
 * is the state change — which is why the tab bar swaps stroke for fill instead
 * of only changing colour. Colour alone would fail for colour-blind users.
 *
 * WHY 1.6 AND NOT 1.5 OR 2
 * At 1.5 the icons look frail beside Inter at weight 400; at 2 they compete
 * with headings. 1.6 sits on the same optical weight as body text, which is
 * what makes an icon-and-label pair read as one object.
 *
 * OPTICAL SIZING
 * `strokeWidth` is derived from the rendered size so a 32px icon does not look
 * thinner than a 16px one. Constant stroke width across sizes is the single
 * most common flaw in icon systems.
 */

import type { SVGProps } from 'react';

export type IconName = keyof typeof ICON_PATHS;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  /**
   * Accessible name. Omit for decorative icons that sit beside a text label —
   * announcing both would make a screen reader say everything twice.
   */
  title?: string;
  /** Selected navigation state: adds a translucent fill under the stroke. */
  filled?: boolean;
}

const BASE_SIZE = 24;
const BASE_STROKE = 1.6;

export function Icon({ name, size = 20, title, filled = false, ...rest }: IconProps) {
  const path = ICON_PATHS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${BASE_SIZE} ${BASE_SIZE}`}
      fill="none"
      stroke="currentColor"
      // Keep the optical weight constant as the icon scales.
      strokeWidth={(BASE_STROKE * BASE_SIZE) / size}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={filled ? 'sy-icon sy-icon--filled' : 'sy-icon'}
      {...rest}
    >
      {path}
    </svg>
  );
}

/**
 * Path registry.
 *
 * Grouped by the product surface that needs them so gaps are obvious when a
 * new screen is designed.
 */
/* eslint-disable react/jsx-key */
export const ICON_PATHS = {
  /* ---- Primary navigation ---- */
  home: (
    <>
      <path d="M4 10.2 12 3.6l8 6.6" />
      <path d="M5.8 9v10.4h12.4V9" />
      <path d="M9.6 19.4v-5.6h4.8v5.6" />
    </>
  ),
  feed: (
    <>
      <rect x="3.6" y="4" width="16.8" height="6" rx="2" />
      <rect x="3.6" y="13" width="7.6" height="7" rx="2" />
      <rect x="12.8" y="13" width="7.6" height="7" rx="2" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.4" />
      <path d="m15.6 15.6 4 4" />
    </>
  ),
  discover: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="m15.4 8.6-2 4.8-4.8 2 2-4.8z" />
    </>
  ),
  live: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M7.4 7.4a6.5 6.5 0 0 0 0 9.2M16.6 16.6a6.5 6.5 0 0 0 0-9.2" />
      <path d="M4.6 4.6a10.4 10.4 0 0 0 0 14.8M19.4 19.4a10.4 10.4 0 0 0 0-14.8" />
    </>
  ),
  studio: (
    <>
      <rect x="3.4" y="5.4" width="12.4" height="13.2" rx="2.4" />
      <path d="m16.4 10.4 4.2-2.6v8.4l-4.2-2.6z" />
    </>
  ),
  chat: (
    <>
      <path d="M20.4 11.6c0 3.9-3.8 7-8.4 7a9.8 9.8 0 0 1-2.5-.3l-4.9 1.6 1.4-3.9a6.6 6.6 0 0 1-2-4.4c0-3.9 3.8-7 8-7s8.4 3.1 8.4 7Z" />
    </>
  ),
  messages: (
    <>
      <path d="M3.6 6.6A2.4 2.4 0 0 1 6 4.2h12a2.4 2.4 0 0 1 2.4 2.4v8.4a2.4 2.4 0 0 1-2.4 2.4H9l-4.2 3v-3h-.2a1 1 0 0 1-1-1z" />
      <path d="m6.8 8.4 5.2 3.4 5.2-3.4" />
    </>
  ),
  notifications: (
    <>
      <path d="M6.6 10.4a5.4 5.4 0 0 1 10.8 0v3.4l1.6 2.8H5l1.6-2.8z" />
      <path d="M10 19.2a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8.4" r="3.8" />
      <path d="M5 19.6a7.2 7.2 0 0 1 14 0" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="2.8" />
      <path d="M12 3.4v2.2M12 18.4v2.2M20.6 12h-2.2M5.6 12H3.4M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6M18.1 18.1l-1.6-1.6M7.5 7.5 5.9 5.9" />
    </>
  ),

  /* ---- Community and social ---- */
  community: (
    <>
      <circle cx="9" cy="9.2" r="3.2" />
      <path d="M3.6 19a5.6 5.6 0 0 1 10.8 0" />
      <path d="M15.8 6.4a3.2 3.2 0 0 1 0 6" />
      <path d="M17 14.2a5.6 5.6 0 0 1 3.4 4.8" />
    </>
  ),
  friends: (
    <>
      <circle cx="8.6" cy="8.6" r="3.4" />
      <path d="M3 19a5.8 5.8 0 0 1 11.2 0" />
      <path d="M17.4 8.4v4.8M19.8 10.8H15" />
    </>
  ),
  follow: (
    <>
      <circle cx="10" cy="8.6" r="3.4" />
      <path d="M4.4 19a5.8 5.8 0 0 1 11.2 0" />
      <path d="m16.8 11.6 1.8 1.8 3.2-3.4" />
    </>
  ),
  heart: <path d="M12 19.6 5.2 13a4.1 4.1 0 0 1 0-5.9 4.4 4.4 0 0 1 6.1 0l.7.7.7-.7a4.4 4.4 0 0 1 6.1 0 4.1 4.1 0 0 1 0 5.9z" />,
  comment: (
    <path d="M20.4 11.8c0 3.7-3.8 6.8-8.4 6.8a9.9 9.9 0 0 1-2.6-.3l-4.8 1.6 1.5-4a6.4 6.4 0 0 1-2-4.1C4.1 8.1 7.7 5 12 5s8.4 3.1 8.4 6.8Z" />
  ),
  share: (
    <>
      <circle cx="17.4" cy="6" r="2.6" />
      <circle cx="6.6" cy="12" r="2.6" />
      <circle cx="17.4" cy="18" r="2.6" />
      <path d="m9 10.7 6-3.4M9 13.3l6 3.4" />
    </>
  ),
  bookmark: <path d="M6.4 4.6h11.2v15.2L12 15.6l-5.6 4.2z" />,
  repost: (
    <>
      <path d="M5 9.4V8a2.4 2.4 0 0 1 2.4-2.4H17" />
      <path d="m14.4 3 2.8 2.6-2.8 2.6" />
      <path d="M19 14.6V16a2.4 2.4 0 0 1-2.4 2.4H7" />
      <path d="m9.6 21-2.8-2.6L9.6 15.8" />
    </>
  ),
  flag: (
    <>
      <path d="M5.6 20.4V4.2" />
      <path d="M5.6 5h11l-2 3.6 2 3.6h-11" />
    </>
  ),

  /* ---- Media ---- */
  play: <path d="M8.4 5.6 18 12l-9.6 6.4z" />,
  pause: <path d="M9.4 5.6v12.8M14.6 5.6v12.8" />,
  stop: <rect x="6.6" y="6.6" width="10.8" height="10.8" rx="2" />,
  skipForward: (
    <>
      <path d="M6 6 14 12l-8 6z" />
      <path d="M17.6 5.8v12.4" />
    </>
  ),
  skipBack: (
    <>
      <path d="M18 6 10 12l8 6z" />
      <path d="M6.4 5.8v12.4" />
    </>
  ),
  volume: (
    <>
      <path d="M4.4 9.6h3.2L12 6v12l-4.4-3.6H4.4z" />
      <path d="M15.6 9.4a3.6 3.6 0 0 1 0 5.2M18.2 6.8a7.2 7.2 0 0 1 0 10.4" />
    </>
  ),
  volumeOff: (
    <>
      <path d="M4.4 9.6h3.2L12 6v12l-4.4-3.6H4.4z" />
      <path d="m16 10 4 4M20 10l-4 4" />
    </>
  ),
  mic: (
    <>
      <rect x="9.2" y="3.4" width="5.6" height="10.4" rx="2.8" />
      <path d="M5.8 11.4a6.2 6.2 0 0 0 12.4 0" />
      <path d="M12 17.6v3" />
    </>
  ),
  micOff: (
    <>
      <path d="M14.8 6.2a2.8 2.8 0 0 0-5.6 0v4M9.2 12.4a2.8 2.8 0 0 0 4.4 2.3" />
      <path d="M5.8 11.4a6.2 6.2 0 0 0 9.6 5.2M18.2 11.4a6.2 6.2 0 0 1-.5 2.4" />
      <path d="M12 17.6v3M4 4l16 16" />
    </>
  ),
  camera: (
    <>
      <path d="M3.6 8.6A2 2 0 0 1 5.6 6.6h2.2l1.4-2.2h5.6l1.4 2.2h2.2a2 2 0 0 1 2 2v8.8a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="12.6" r="3.4" />
    </>
  ),
  cameraOff: (
    <>
      <path d="M8.4 6.6 9.2 4.4h5.6l1.4 2.2h2.2a2 2 0 0 1 2 2v8.8" />
      <path d="M18 20.4H5.6a2 2 0 0 1-2-2V8.6a2 2 0 0 1 2-2" />
      <path d="M9.6 10.2a3.4 3.4 0 0 0 4.7 4.8" />
      <path d="m4 4 16 16" />
    </>
  ),
  screenShare: (
    <>
      <rect x="3.2" y="4.6" width="17.6" height="11.6" rx="2" />
      <path d="M8.6 20h6.8" />
      <path d="M12 8v5M9.6 10.4 12 8l2.4 2.4" />
    </>
  ),
  video: (
    <>
      <rect x="3.2" y="6.2" width="12.6" height="11.6" rx="2.4" />
      <path d="m16.4 11 4.4-2.8v7.6L16.4 13z" />
    </>
  ),
  image: (
    <>
      <rect x="3.6" y="4.6" width="16.8" height="14.8" rx="2.4" />
      <circle cx="9" cy="9.6" r="1.6" />
      <path d="m4.4 17 4.6-4.4 3.4 3.2 3-2.8 4 3.8" />
    </>
  ),
  fullscreen: <path d="M4.4 9V4.6H9M15 4.6h4.6V9M19.6 15v4.6H15M9 19.6H4.4V15" />,
  captions: (
    <>
      <rect x="3.2" y="5.2" width="17.6" height="13.6" rx="2.4" />
      <path d="M10 10.6a2.4 2.4 0 1 0 0 2.8M17 10.6a2.4 2.4 0 1 0 0 2.8" />
    </>
  ),

  /* ---- Creation ---- */
  plus: <path d="M12 5.4v13.2M5.4 12h13.2" />,
  minus: <path d="M5.4 12h13.2" />,
  edit: (
    <>
      <path d="M16.4 4.6 19.4 7.6 9.6 17.4l-4 1 1-4z" />
      <path d="m14.4 6.6 3 3" />
    </>
  ),
  trash: (
    <>
      <path d="M4.8 6.6h14.4" />
      <path d="M9.2 6.6V4.8h5.6v1.8" />
      <path d="M6.6 6.6 7.4 19a1.4 1.4 0 0 0 1.4 1.3h6.4A1.4 1.4 0 0 0 16.6 19l.8-12.4" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15.4V4.6M8.4 8.2 12 4.6l3.6 3.6" />
      <path d="M4.6 15v3a2.4 2.4 0 0 0 2.4 2.4h10a2.4 2.4 0 0 0 2.4-2.4v-3" />
    </>
  ),
  download: (
    <>
      <path d="M12 4.6v10.8M8.4 11.8 12 15.4l3.6-3.6" />
      <path d="M4.6 15v3a2.4 2.4 0 0 0 2.4 2.4h10a2.4 2.4 0 0 0 2.4-2.4v-3" />
    </>
  ),
  attach: (
    <path d="M18.4 11.4 12 17.8a4 4 0 0 1-5.6-5.6l6.8-6.8a2.7 2.7 0 0 1 3.8 3.8l-6.8 6.8a1.3 1.3 0 0 1-1.9-1.9l6.2-6.2" />
  ),
  send: (
    <>
      <path d="m20.4 3.6-8 16.8-2.4-7.2-7.2-2.4z" />
      <path d="M20.4 3.6 10 13.2" />
    </>
  ),
  emoji: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M8.8 14a4 4 0 0 0 6.4 0" />
      <path d="M9.4 9.6h.01M14.6 9.6h.01" />
    </>
  ),
  sliders: (
    <>
      <path d="M4.6 8h5.2M14.2 8h5.2M4.6 16h9.6M18.2 16h1.2" />
      <circle cx="12" cy="8" r="2.2" />
      <circle cx="16.4" cy="16" r="2.2" />
    </>
  ),
  filter: <path d="M3.8 5.6h16.4l-6.4 7.4v6l-3.6 1.8v-7.8z" />,
  grid: (
    <>
      <rect x="4" y="4" width="6.6" height="6.6" rx="1.6" />
      <rect x="13.4" y="4" width="6.6" height="6.6" rx="1.6" />
      <rect x="4" y="13.4" width="6.6" height="6.6" rx="1.6" />
      <rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1.6" />
    </>
  ),
  list: <path d="M8.4 6.4h11.2M8.4 12h11.2M8.4 17.6h11.2M4.4 6.4h.01M4.4 12h.01M4.4 17.6h.01" />,
  layers: (
    <>
      <path d="m12 3.6 8.4 4.4L12 12.4 3.6 8z" />
      <path d="m3.6 12.4 8.4 4.4 8.4-4.4M3.6 16.4l8.4 4.4 8.4-4.4" />
    </>
  ),

  /* ---- AI ---- */
  sparkles: (
    <>
      <path d="M12 4.2 13.6 9 18.4 10.6 13.6 12.2 12 17 10.4 12.2 5.6 10.6 10.4 9z" />
      <path d="M18 15.6 18.7 17.5 20.6 18.2 18.7 18.9 18 20.8 17.3 18.9 15.4 18.2 17.3 17.5z" />
    </>
  ),
  aiAssistant: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.4v2.4M12 18.2v2.4M20.6 12h-2.4M5.8 12H3.4" />
    </>
  ),
  wand: (
    <>
      <path d="m4.6 19.4 10-10" />
      <path d="m14.6 5.4 4 4-4.4 4.4-4-4z" />
      <path d="M18.4 15.6v3M19.9 17.1h-3M6.4 4.6v2.8M7.8 6h-2.8" />
    </>
  ),
  brain: (
    <>
      <path d="M12 5.4a3 3 0 0 0-5.8 1 3 3 0 0 0-1.4 5 3 3 0 0 0 1.8 5.2A2.8 2.8 0 0 0 12 18z" />
      <path d="M12 5.4a3 3 0 0 1 5.8 1 3 3 0 0 1 1.4 5 3 3 0 0 1-1.8 5.2A2.8 2.8 0 0 1 12 18z" />
      <path d="M12 5.4V18" />
    </>
  ),
  translate: (
    <>
      <path d="M3.6 6.4h8.8M8 4.4v2M9.8 6.4a9 9 0 0 1-6.2 8" />
      <path d="M5.6 10.6a8 8 0 0 0 5.6 4.2" />
      <path d="m12.6 19.6 3.8-9 3.8 9M14 16.8h4.8" />
    </>
  ),

  /* ---- Commerce and money ---- */
  wallet: (
    <>
      <path d="M3.8 8.4A2.4 2.4 0 0 1 6.2 6h11.6a2.4 2.4 0 0 1 2.4 2.4v8.4a2.4 2.4 0 0 1-2.4 2.4H6.2a2.4 2.4 0 0 1-2.4-2.4z" />
      <path d="M3.8 10.4h4a2.2 2.2 0 0 1 0 4.4h-4" />
    </>
  ),
  marketplace: (
    <>
      <path d="M4.4 8.6h15.2l-1.2 10.4a1.4 1.4 0 0 1-1.4 1.2H7a1.4 1.4 0 0 1-1.4-1.2z" />
      <path d="M8.8 8.6V6.8a3.2 3.2 0 0 1 6.4 0v1.8" />
    </>
  ),
  gift: (
    <>
      <rect x="3.8" y="9.2" width="16.4" height="4" rx="1.2" />
      <path d="M5.4 13.2v6a1.4 1.4 0 0 0 1.4 1.4h10.4a1.4 1.4 0 0 0 1.4-1.4v-6" />
      <path d="M12 9.2v11.4" />
      <path d="M12 9.2H8.4a2.4 2.4 0 1 1 2.4-2.4zM12 9.2h3.6a2.4 2.4 0 1 0-2.4-2.4z" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.4v9.2M14.4 9.4a2.8 2.8 0 0 0-2.4-1.2c-1.5 0-2.6.9-2.6 2.1 0 2.9 5.4 1.6 5.4 4.4 0 1.2-1.2 2.1-2.8 2.1a3 3 0 0 1-2.6-1.3" />
    </>
  ),
  creditCard: (
    <>
      <rect x="3.2" y="5.8" width="17.6" height="12.4" rx="2.4" />
      <path d="M3.2 10h17.6M7 14.6h3" />
    </>
  ),
  premium: (
    <>
      <path d="m4 8.4 4 3.2 4-6.6 4 6.6 4-3.2-1.6 9.4H5.6z" />
      <path d="M6.6 20.2h10.8" />
    </>
  ),
  inventory: (
    <>
      <path d="m12 3.6 8 4v8.8l-8 4-8-4V7.6z" />
      <path d="m4 7.6 8 4 8-4M12 11.6v8.8" />
    </>
  ),
  tag: (
    <>
      <path d="M11.4 3.8H20v8.6l-8.8 8.8-8.6-8.6z" />
      <circle cx="16.2" cy="7.8" r="1.4" />
    </>
  ),

  /* ---- Learning and events ---- */
  courses: (
    <>
      <path d="M3.6 6.4a1.6 1.6 0 0 1 1.6-1.6H10a2.4 2.4 0 0 1 2 1.2 2.4 2.4 0 0 1 2-1.2h4.8a1.6 1.6 0 0 1 1.6 1.6v11a1.6 1.6 0 0 1-1.6 1.6H14a2.4 2.4 0 0 0-2 1.2 2.4 2.4 0 0 0-2-1.2H5.2a1.6 1.6 0 0 1-1.6-1.6z" />
      <path d="M12 6v13.2" />
    </>
  ),
  events: (
    <>
      <rect x="3.6" y="5.6" width="16.8" height="14.8" rx="2.4" />
      <path d="M3.6 10.2h16.8M8.4 3.4v4M15.6 3.4v4" />
    </>
  ),
  certificate: (
    <>
      <circle cx="12" cy="9.6" r="5.4" />
      <path d="m8.6 14.2-1 6.4 4.4-2.2 4.4 2.2-1-6.4" />
    </>
  ),

  /* ---- Gamification ---- */
  trophy: (
    <>
      <path d="M7.4 4.6h9.2v5a4.6 4.6 0 0 1-9.2 0z" />
      <path d="M7.4 6.4H4.8v1.4a3 3 0 0 0 2.6 3M16.6 6.4h2.6v1.4a3 3 0 0 1-2.6 3" />
      <path d="M12 14.2v3.4M8.6 20.2h6.8l-.8-2.6H9.4z" />
    </>
  ),
  achievement: (
    <>
      <path d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8z" />
    </>
  ),
  mission: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </>
  ),
  leaderboard: (
    <>
      <path d="M4.4 20.2V13h4.4v7.2M9.8 20.2V6.4h4.4v13.8M15.2 20.2v-9.6h4.4v9.6" />
    </>
  ),
  streak: <path d="M12 3.6c3.2 3.4 5.6 6 5.6 9.2a5.6 5.6 0 1 1-11.2 0c0-1.4.5-2.6 1.4-3.9.6 1.2 1.4 1.9 2.3 1.9 1.3 0 1.9-1.1 1.9-3.1z" />,

  /* ---- Analytics ---- */
  analytics: (
    <>
      <path d="M4.4 19.6h15.2" />
      <path d="M6.8 19.6v-6.2M11 19.6V8.2M15.2 19.6v-8.4M19.4 19.6V4.6" />
    </>
  ),
  trendUp: (
    <>
      <path d="m4.4 15.6 4.8-4.8 3.2 3.2 6.8-6.8" />
      <path d="M15.2 7.2h4v4" />
    </>
  ),
  trendDown: (
    <>
      <path d="m4.4 8.4 4.8 4.8 3.2-3.2 6.8 6.8" />
      <path d="M15.2 16.8h4v-4" />
    </>
  ),
  pulse: <path d="M3.6 12h3.6l2.4-6 4 12 2.4-6h4.4" />,
  pieChart: (
    <>
      <path d="M12 3.6a8.4 8.4 0 1 0 8.4 8.4H12z" />
      <path d="M15.2 3.9A8.4 8.4 0 0 1 20.1 8.8L15.2 10z" />
    </>
  ),
  eye: (
    <>
      <path d="M2.6 12S6 6.2 12 6.2 21.4 12 21.4 12 18 17.8 12 17.8 2.6 12 2.6 12" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7v5.2l3.4 2" />
    </>
  ),

  /* ---- Admin and moderation ---- */
  admin: (
    <>
      <path d="M12 3.4 19.4 6v6c0 4-3.1 7.4-7.4 8.6C7.7 19.4 4.6 16 4.6 12V6z" />
      <path d="m9.2 12 2 2 3.6-3.8" />
    </>
  ),
  moderation: (
    <>
      <path d="M3.6 14.4 8 10l6 6-4.4 4.4z" />
      <path d="m10.6 7.4 6 6M13.4 4.6l6 6M12 6l6 6" />
      <path d="M4.4 20.4h5" />
    </>
  ),
  business: (
    <>
      <rect x="3.4" y="7.6" width="17.2" height="12" rx="2.2" />
      <path d="M8.6 7.6V6a1.8 1.8 0 0 1 1.8-1.8h3.2A1.8 1.8 0 0 1 15.4 6v1.6" />
      <path d="M3.4 12.4h17.2" />
    </>
  ),
  verified: (
    <>
      <path d="m12 3.4 2.3 1.8 2.9-.2 1 2.8 2.4 1.6-1 2.8 1 2.8-2.4 1.6-1 2.8-2.9-.2L12 20.6l-2.3-1.8-2.9.2-1-2.8L3.4 14.6l1-2.8-1-2.8 2.4-1.6 1-2.8 2.9.2z" />
      <path d="m9.4 12 1.9 1.9 3.5-3.7" />
    </>
  ),
  lock: (
    <>
      <rect x="4.8" y="10.4" width="14.4" height="9.8" rx="2.2" />
      <path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="8" r="4" />
      <path d="m10.9 10.9 8.7 8.7M17 17l2-2M14.4 14.4l1.6-1.6" />
    </>
  ),

  /* ---- Utility ---- */
  check: <path d="m5.4 12.6 4.4 4.4 8.8-9.6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevronRight: <path d="m9.6 5.6 6.4 6.4-6.4 6.4" />,
  chevronLeft: <path d="M14.4 5.6 8 12l6.4 6.4" />,
  chevronDown: <path d="m5.6 9.6 6.4 6.4 6.4-6.4" />,
  chevronUp: <path d="m5.6 14.4 6.4-6.4 6.4 6.4" />,
  arrowRight: (
    <>
      <path d="M4.6 12h14.8" />
      <path d="m13.6 6.2 5.8 5.8-5.8 5.8" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M19.4 12H4.6" />
      <path d="M10.4 6.2 4.6 12l5.8 5.8" />
    </>
  ),
  arrowUp: (
    <>
      <path d="M12 19.4V4.6" />
      <path d="m6.2 10.4 5.8-5.8 5.8 5.8" />
    </>
  ),
  more: (
    <>
      <circle cx="5.4" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="18.6" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  moreVertical: (
    <>
      <circle cx="12" cy="5.4" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.6" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 11.4v5M12 7.8h.01" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4.2 21 19.4H3z" />
      <path d="M12 10v3.8M12 16.6h.01" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.8v5M12 16.2h.01" />
    </>
  ),
  success: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="m8.4 12.2 2.4 2.4 4.8-5.2" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M9.8 9.6a2.3 2.3 0 0 1 4.4.8c0 1.5-2.2 2-2.2 3.4M12 16.6h.01" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.4 11a7.4 7.4 0 0 0-13-3.6" />
      <path d="M4.6 13a7.4 7.4 0 0 0 13 3.6" />
      <path d="M4.6 4.6v4h4M19.4 19.4v-4h-4" />
    </>
  ),
  external: (
    <>
      <path d="M13.4 4.6h6v6M19.4 4.6 11 13" />
      <path d="M18 14.2v4.2a2 2 0 0 1-2 2H5.8a2 2 0 0 1-2-2V8.2a2 2 0 0 1 2-2H10" />
    </>
  ),
  link: (
    <>
      <path d="M10.2 13.8a3.6 3.6 0 0 0 5.4.4l2.6-2.6a3.6 3.6 0 0 0-5.1-5.1l-1.5 1.5" />
      <path d="M13.8 10.2a3.6 3.6 0 0 0-5.4-.4l-2.6 2.6a3.6 3.6 0 0 0 5.1 5.1l1.5-1.5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M3.6 12h16.8" />
      <path d="M12 3.6a13 13 0 0 1 0 16.8 13 13 0 0 1 0-16.8" />
    </>
  ),
  moon: <path d="M20 13.6A8.4 8.4 0 1 1 10.4 4a6.6 6.6 0 0 0 9.6 9.6" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.8v2.2M12 19v2.2M21.2 12H19M5 12H2.8M18.5 5.5 17 7M7 17l-1.5 1.5M18.5 18.5 17 17M7 7 5.5 5.5" />
    </>
  ),
  logout: (
    <>
      <path d="M9.6 4.6H6a2 2 0 0 0-2 2v10.8a2 2 0 0 0 2 2h3.6" />
      <path d="M15 8.4 18.6 12 15 15.6M18.6 12H9" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  pin: (
    <>
      <path d="M12 20.4v-6" />
      <path d="M8 4.6h8l-1.2 4.4 2.4 3.2H6.8l2.4-3.2z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.6" y="5.6" width="16.8" height="14.8" rx="2.4" />
      <path d="M3.6 10.2h16.8M8.4 3.4v4M15.6 3.4v4M8 14h2M14 14h2M8 17.4h2" />
    </>
  ),
  mobile: (
    <>
      <rect x="6.6" y="2.8" width="10.8" height="18.4" rx="2.6" />
      <path d="M10.8 18.4h2.4" />
    </>
  ),
  desktop: (
    <>
      <rect x="2.8" y="4.6" width="18.4" height="12" rx="2.2" />
      <path d="M8.6 20.2h6.8M12 16.6v3.6" />
    </>
  ),
  tablet: (
    <>
      <rect x="4.6" y="3" width="14.8" height="18" rx="2.4" />
      <path d="M11 17.8h2" />
    </>
  ),
} as const;
/* eslint-enable react/jsx-key */

export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];
