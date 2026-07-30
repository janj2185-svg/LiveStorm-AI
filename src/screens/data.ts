/**
 * Demo content
 * ---------------------------------------------------------------------------
 * A single, internally consistent slice of the SYLORA world. Every screen
 * draws from here, so the same creator has the same follower count on their
 * profile, in the feed, on the leaderboard and in the admin panel.
 *
 * There is no lorem ipsum anywhere in this file. Placeholder text hides
 * real layout problems: it has even word lengths, no diacritics, no long
 * compound words, and it never overflows. Designing against believable
 * content — including deliberately awkward names and long titles — is the
 * only way to know a layout actually holds.
 */

export interface Creator {
  id: string;
  name: string;
  handle: string;
  avatar?: string;
  bio: string;
  followers: string;
  verified: boolean;
  live: boolean;
  category: string;
  /** Deterministic accent used for their channel art. */
  accent: 'iris' | 'flux' | 'nova' | 'verdant' | 'solar' | 'crimson';
}

export const CREATORS: Creator[] = [
  {
    id: 'c1',
    name: 'Amara Okonkwo',
    handle: '@amara.builds',
    bio: 'Systems designer. I build tools that make other builders faster. Live most weeknights.',
    followers: '482K',
    verified: true,
    live: true,
    category: 'Design & Engineering',
    accent: 'iris',
  },
  {
    id: 'c2',
    name: 'Tobias Lindqvist',
    handle: '@tobiaslind',
    bio: 'Sound design, modular synths, and long-form ambient sets from a cabin in Jämtland.',
    followers: '96.4K',
    verified: true,
    live: false,
    category: 'Music & Audio',
    accent: 'flux',
  },
  {
    id: 'c3',
    name: 'Priya Raghunathan',
    handle: '@priya.teaches',
    bio: 'Ex-quant turned educator. Applied statistics without the gatekeeping.',
    followers: '1.24M',
    verified: true,
    live: true,
    category: 'Education',
    accent: 'verdant',
  },
  {
    id: 'c4',
    name: 'Mateo Fernández-Ruiz',
    handle: '@mateofr',
    bio: 'Street photography, darkroom process, and unreasonably long walks.',
    followers: '213K',
    verified: false,
    live: false,
    category: 'Photography',
    accent: 'solar',
  },
  {
    id: 'c5',
    name: 'Yuki Tanaka',
    handle: '@yukimakes',
    bio: 'Ceramics and slow craft. Every piece is a one-off.',
    followers: '58.1K',
    verified: false,
    live: false,
    category: 'Craft',
    accent: 'nova',
  },
  {
    id: 'c6',
    name: 'Dr. Ngozi Adeyemi',
    handle: '@ngozi.science',
    bio: 'Marine biologist. Field notes from research vessels, mostly at 3am.',
    followers: '724K',
    verified: true,
    live: true,
    category: 'Science',
    accent: 'crimson',
  },
  {
    id: 'c7',
    name: 'Sam Whitfield',
    handle: '@samw',
    bio: 'Indie game dev. Shipping in public, bugs and all.',
    followers: '31.9K',
    verified: false,
    live: false,
    category: 'Gaming',
    accent: 'iris',
  },
  {
    id: 'c8',
    name: 'Léa Bouchard-Tremblay',
    handle: '@leabt',
    bio: 'Culinary science. Why recipes work, not just how.',
    followers: '389K',
    verified: true,
    live: false,
    category: 'Food',
    accent: 'flux',
  },
];

export const ME: Creator = {
  id: 'me',
  name: 'Jordan Reyes',
  handle: '@jordanreyes',
  bio: 'Building SYLORA. Design systems, live tooling, and the occasional ceramics stream.',
  followers: '12.4K',
  verified: true,
  live: false,
  category: 'Design',
  accent: 'iris',
};

export interface Post {
  id: string;
  author: Creator;
  time: string;
  body: string;
  media?: { kind: 'image' | 'video' | 'live'; ratio: '16/9' | '4/5' | '1/1'; duration?: string };
  likes: string;
  comments: string;
  reposts: string;
  space?: string;
  aiGenerated?: boolean;
}

export const POSTS: Post[] = [
  {
    id: 'p1',
    author: CREATORS[0],
    time: '12m',
    body: 'Spent the weekend rebuilding our colour ramps in OKLCH. The wild part: once lightness is perceptually uniform, contrast stops being something you audit and starts being something you can guarantee. Full write-up and the generator script are in the space.',
    media: { kind: 'image', ratio: '16/9' },
    likes: '3.2K',
    comments: '184',
    reposts: '412',
    space: 'Design Systems Guild',
  },
  {
    id: 'p2',
    author: CREATORS[2],
    time: '48m',
    body: 'Reminder that a p-value is not the probability your hypothesis is true. It is the probability of seeing data this extreme *if* the null were true. Those are wildly different statements and the difference has cost people careers.',
    likes: '9.7K',
    comments: '1.1K',
    reposts: '2.4K',
  },
  {
    id: 'p3',
    author: CREATORS[5],
    time: '2h',
    body: 'Sixty metres down off the Kermadec ridge. The thing about deep-sea work is that almost every dive turns up something nobody has described yet — and almost none of it makes the news.',
    media: { kind: 'video', ratio: '16/9', duration: '4:12' },
    likes: '18.3K',
    comments: '742',
    reposts: '5.1K',
  },
  {
    id: 'p4',
    author: CREATORS[4],
    time: '5h',
    body: 'Kiln opened this morning. Six survived, two cracked, one did something with the glaze I have been chasing for three years and cannot reproduce.',
    media: { kind: 'image', ratio: '4/5' },
    likes: '1.8K',
    comments: '96',
    reposts: '124',
  },
  {
    id: 'p5',
    author: CREATORS[1],
    time: '8h',
    body: 'Three-hour ambient set recorded live last night, no edits. The gear list and the patch notes are attached for anyone who wants to rebuild it.',
    media: { kind: 'video', ratio: '16/9', duration: '3:04:18' },
    likes: '4.4K',
    comments: '288',
    reposts: '901',
  },
];

export interface Stream {
  id: string;
  creator: Creator;
  title: string;
  category: string;
  viewers: string;
  duration: string;
  ratio?: string;
}

export const STREAMS: Stream[] = [
  {
    id: 's1',
    creator: CREATORS[0],
    title: 'Rebuilding the token pipeline live — OKLCH, gamut mapping and contrast proofs',
    category: 'Design & Engineering',
    viewers: '14.2K',
    duration: '2:41:08',
  },
  {
    id: 's2',
    creator: CREATORS[2],
    title: 'Office hours: regression diagnostics, and why your residuals are lying to you',
    category: 'Education',
    viewers: '8.9K',
    duration: '54:22',
  },
  {
    id: 's3',
    creator: CREATORS[5],
    title: 'ROV dive 214 — live from the Kermadec trench',
    category: 'Science',
    viewers: '31.7K',
    duration: '1:12:44',
  },
  {
    id: 's4',
    creator: CREATORS[6],
    title: 'Shipping the inventory rewrite before the demo build',
    category: 'Gaming',
    viewers: '1.3K',
    duration: '3:22:19',
  },
  {
    id: 's5',
    creator: CREATORS[7],
    title: 'Maillard reaction deep dive — 12 steaks, one thermometer',
    category: 'Food',
    viewers: '6.1K',
    duration: '41:55',
  },
  {
    id: 's6',
    creator: CREATORS[1],
    title: 'Modular patch from scratch — no presets, no safety net',
    category: 'Music & Audio',
    viewers: '2.8K',
    duration: '1:48:30',
  },
];

export interface ChatMessage {
  id: string;
  author: string;
  body: string;
  tone?: 'normal' | 'gift' | 'system' | 'moderator' | 'subscriber';
  gift?: { name: string; value: string };
}

export const LIVE_CHAT: ChatMessage[] = [
  { id: 'm1', author: 'devon_k', body: 'wait, you generate the whole ramp from one hue value?' },
  { id: 'm2', author: 'sana.p', body: 'this is the third time I have watched this section and it finally clicked', tone: 'subscriber' },
  { id: 'm3', author: 'SYLORA', body: 'Priya Raghunathan just subscribed at Tier 2', tone: 'system' },
  { id: 'm4', author: 'marcus_ade', body: 'Aurora Burst', tone: 'gift', gift: { name: 'Aurora Burst', value: '500' } },
  { id: 'm5', author: 'lin.wei', body: 'does the gamut mapping run at build time or runtime?' },
  { id: 'm6', author: 'ModRachel', body: 'Reminder: questions in the thread, not the main chat', tone: 'moderator' },
  { id: 'm7', author: 'tobiaslind', body: 'the contrast audit output is genuinely the best part of this' },
  { id: 'm8', author: 'kwame.b', body: 'build time — he showed the script about 20 min ago' },
  { id: 'm9', author: 'nadia_h', body: 'Prism Wave', tone: 'gift', gift: { name: 'Prism Wave', value: '1,200' } },
  { id: 'm10', author: 'ellis.j', body: 'following just for the token generator, honestly' },
];

export interface Gift {
  id: string;
  name: string;
  price: number;
  tier: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
}

export const GIFTS: Gift[] = [
  { id: 'g1', name: 'Spark', price: 10, tier: 'common', icon: '✦' },
  { id: 'g2', name: 'Pulse', price: 50, tier: 'common', icon: '◈' },
  { id: 'g3', name: 'Prism Wave', price: 120, tier: 'rare', icon: '◆' },
  { id: 'g4', name: 'Aurora Burst', price: 500, tier: 'epic', icon: '✵' },
  { id: 'g5', name: 'Signal Flare', price: 1200, tier: 'epic', icon: '❋' },
  { id: 'g6', name: 'Supernova', price: 5000, tier: 'legendary', icon: '✷' },
];

export interface Product {
  id: string;
  title: string;
  creator: string;
  price: string;
  kind: 'Preset pack' | 'Template' | 'Course' | 'Brush set' | 'Sample library' | 'Plugin';
  rating: number;
  sales: string;
}

export const PRODUCTS: Product[] = [
  { id: 'pr1', title: 'Aurora Grade — 42 cinematic LUTs', creator: 'Mateo Fernández-Ruiz', price: '€34', kind: 'Preset pack', rating: 4.8, sales: '2.1K' },
  { id: 'pr2', title: 'Stream Deck Overlay Kit', creator: 'Amara Okonkwo', price: '€59', kind: 'Template', rating: 4.9, sales: '840' },
  { id: 'pr3', title: 'Field Recordings: North Atlantic', creator: 'Tobias Lindqvist', price: '€28', kind: 'Sample library', rating: 5.0, sales: '1.3K' },
  { id: 'pr4', title: 'Applied Statistics for Builders', creator: 'Priya Raghunathan', price: '€149', kind: 'Course', rating: 4.9, sales: '6.7K' },
  { id: 'pr5', title: 'Ceramic Texture Brushes', creator: 'Yuki Tanaka', price: '€19', kind: 'Brush set', rating: 4.7, sales: '412' },
  { id: 'pr6', title: 'Latency Monitor for OBS', creator: 'Sam Whitfield', price: 'Free', kind: 'Plugin', rating: 4.6, sales: '18.2K' },
];

export interface Course {
  id: string;
  title: string;
  instructor: string;
  lessons: number;
  hours: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  progress?: number;
  enrolled: string;
}

export const COURSES: Course[] = [
  { id: 'co1', title: 'Design Systems from First Principles', instructor: 'Amara Okonkwo', lessons: 34, hours: '11h 20m', level: 'Intermediate', progress: 62, enrolled: '8.4K' },
  { id: 'co2', title: 'Applied Statistics Without the Gatekeeping', instructor: 'Priya Raghunathan', lessons: 58, hours: '22h 05m', level: 'Beginner', progress: 18, enrolled: '31.2K' },
  { id: 'co3', title: 'Sound Design for Live Broadcast', instructor: 'Tobias Lindqvist', lessons: 21, hours: '7h 44m', level: 'Advanced', enrolled: '2.9K' },
  { id: 'co4', title: 'The Darkroom Method', instructor: 'Mateo Fernández-Ruiz', lessons: 16, hours: '5h 12m', level: 'Beginner', enrolled: '4.1K' },
];

export interface EventItem {
  id: string;
  title: string;
  host: string;
  date: string;
  time: string;
  attendees: string;
  kind: 'Workshop' | 'AMA' | 'Premiere' | 'Meetup' | 'Conference';
  price: string;
}

export const EVENTS: EventItem[] = [
  { id: 'e1', title: 'Token Pipeline Workshop — build it with me', host: 'Amara Okonkwo', date: 'Thu 12 Feb', time: '18:00 CET', attendees: '1,240', kind: 'Workshop', price: '€25' },
  { id: 'e2', title: 'Ask me anything: leaving finance for teaching', host: 'Priya Raghunathan', date: 'Sat 14 Feb', time: '16:00 CET', attendees: '4,830', kind: 'AMA', price: 'Free' },
  { id: 'e3', title: 'Kermadec Expedition — premiere', host: 'Dr. Ngozi Adeyemi', date: 'Mon 16 Feb', time: '20:30 CET', attendees: '12,100', kind: 'Premiere', price: 'Free' },
  { id: 'e4', title: 'SYLORA Creator Summit, Lisbon', host: 'SYLORA', date: '3–5 Mar', time: 'All day', attendees: '2,400', kind: 'Conference', price: '€180' },
];

export interface Community {
  id: string;
  name: string;
  members: string;
  online: string;
  topic: string;
  privacy: 'Public' | 'Private' | 'Invite only';
}

export const COMMUNITIES: Community[] = [
  { id: 'sp1', name: 'Design Systems Guild', members: '24.8K', online: '1,204', topic: 'Tokens, components, governance', privacy: 'Public' },
  { id: 'sp2', name: 'Live Production Crew', members: '9.1K', online: '486', topic: 'Encoders, latency, multi-cam', privacy: 'Public' },
  { id: 'sp3', name: 'Quiet Studio', members: '2.3K', online: '77', topic: 'Focus sessions, no chat during blocks', privacy: 'Private' },
  { id: 'sp4', name: 'Kiln Notes', members: '1.6K', online: '41', topic: 'Glaze chemistry and firing logs', privacy: 'Public' },
  { id: 'sp5', name: 'SYLORA Partners', members: '840', online: '132', topic: 'Programme announcements and payouts', privacy: 'Invite only' },
];

export interface NotificationItem {
  id: string;
  kind: 'follow' | 'gift' | 'comment' | 'live' | 'payout' | 'system' | 'mention';
  actor: string;
  body: string;
  time: string;
  unread: boolean;
}

export const NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', kind: 'gift', actor: 'marcus_ade', body: 'sent an Aurora Burst during your stream', time: '4m', unread: true },
  { id: 'n2', kind: 'live', actor: 'Dr. Ngozi Adeyemi', body: 'went live — ROV dive 214', time: '18m', unread: true },
  { id: 'n3', kind: 'comment', actor: 'Priya Raghunathan', body: 'replied to your post about contrast auditing', time: '1h', unread: true },
  { id: 'n4', kind: 'payout', actor: 'SYLORA', body: 'Your January payout of €4,182.60 is on its way', time: '3h', unread: false },
  { id: 'n5', kind: 'follow', actor: 'Léa Bouchard-Tremblay', body: 'started following you', time: '6h', unread: false },
  { id: 'n6', kind: 'mention', actor: 'Sam Whitfield', body: 'mentioned you in Live Production Crew', time: '9h', unread: false },
  { id: 'n7', kind: 'system', actor: 'SYLORA', body: 'Two-factor authentication was enabled on a new device', time: '1d', unread: false },
];

export interface Conversation {
  id: string;
  person: Creator;
  preview: string;
  time: string;
  unread: number;
  online: boolean;
}

export const CONVERSATIONS: Conversation[] = [
  { id: 'cv1', person: CREATORS[0], preview: 'Sent the updated ramp generator — check the neutral envelope', time: '2m', unread: 2, online: true },
  { id: 'cv2', person: CREATORS[2], preview: 'Can we move the workshop to Thursday? Something came up.', time: '25m', unread: 0, online: true },
  { id: 'cv3', person: CREATORS[4], preview: 'The glaze came out completely differently this time', time: '3h', unread: 1, online: false },
  { id: 'cv4', person: CREATORS[6], preview: 'Build 0.9.4 is up, inventory rewrite included', time: 'Yesterday', unread: 0, online: false },
  { id: 'cv5', person: CREATORS[1], preview: 'Patch notes attached. The reverb tail is the important bit.', time: 'Tue', unread: 0, online: true },
];

export const THREAD: { id: string; from: 'me' | 'them'; body: string; time: string }[] = [
  { id: 't1', from: 'them', body: 'Sent the updated ramp generator over. The neutral envelope change is subtle but it fixes the dead-grey problem you flagged.', time: '09:41' },
  { id: 't2', from: 'me', body: 'Looking now. Did you keep the solid step solved against WCAG or go back to the fixed curve?', time: '09:43' },
  { id: 't3', from: 'them', body: 'Solved. Only three families actually move, and only in light mode. Everything else is untouched.', time: '09:44' },
  { id: 't4', from: 'me', body: 'That is the right call. Fixed curve was never going to work for cyan.', time: '09:46' },
  { id: 't5', from: 'them', body: 'Agreed. Contrast audit is 82 for 82 now, both themes.', time: '09:46' },
];

export interface Transaction {
  id: string;
  label: string;
  detail: string;
  amount: string;
  positive: boolean;
  date: string;
  status: 'Cleared' | 'Pending' | 'Processing';
}

export const TRANSACTIONS: Transaction[] = [
  { id: 'tx1', label: 'Gift revenue', detail: 'Aurora Burst ×3, Prism Wave ×11', amount: '+€342.80', positive: true, date: 'Today', status: 'Cleared' },
  { id: 'tx2', label: 'Subscription renewals', detail: '284 members across 3 tiers', amount: '+€1,918.40', positive: true, date: 'Today', status: 'Cleared' },
  { id: 'tx3', label: 'Marketplace sale', detail: 'Stream Deck Overlay Kit ×6', amount: '+€283.20', positive: true, date: 'Yesterday', status: 'Cleared' },
  { id: 'tx4', label: 'Platform fee', detail: '8% of gross for January', amount: '−€412.06', positive: false, date: 'Yesterday', status: 'Cleared' },
  { id: 'tx5', label: 'Payout to bank', detail: 'SEPA ···· 4417', amount: '−€4,182.60', positive: false, date: '2 Feb', status: 'Processing' },
  { id: 'tx6', label: 'Course enrolments', detail: 'Design Systems from First Principles ×14', amount: '+€1,246.00', positive: true, date: '1 Feb', status: 'Cleared' },
];

export interface Achievement {
  id: string;
  name: string;
  description: string;
  progress: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Prism';
  unlocked: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', name: 'First Light', description: 'Complete your first live broadcast', progress: 100, tier: 'Bronze', unlocked: true },
  { id: 'a2', name: 'Steady Signal', description: 'Stream on the same weekday for 12 weeks', progress: 100, tier: 'Silver', unlocked: true },
  { id: 'a3', name: 'Full Spectrum', description: 'Publish in six different formats', progress: 83, tier: 'Gold', unlocked: false },
  { id: 'a4', name: 'Constellation', description: 'Reach 100,000 followers', progress: 12, tier: 'Prism', unlocked: false },
  { id: 'a5', name: 'Open Door', description: 'Answer 500 questions in your community', progress: 68, tier: 'Silver', unlocked: false },
  { id: 'a6', name: 'Deep Cut', description: 'Publish a video over three hours long', progress: 100, tier: 'Bronze', unlocked: true },
];

export interface Mission {
  id: string;
  title: string;
  reward: string;
  progress: number;
  target: number;
  expires: string;
}

export const MISSIONS: Mission[] = [
  { id: 'ms1', title: 'Go live three times this week', reward: '600 credits', progress: 2, target: 3, expires: '2 days' },
  { id: 'ms2', title: 'Reply to 25 community questions', reward: '250 credits', progress: 18, target: 25, expires: '4 days' },
  { id: 'ms3', title: 'Publish one long-form video', reward: '900 credits', progress: 0, target: 1, expires: '6 days' },
  { id: 'ms4', title: 'Reach 500 concurrent viewers', reward: 'Prism badge', progress: 412, target: 500, expires: '11 days' },
];

export const LEADERBOARD = [
  { rank: 1, name: 'Priya Raghunathan', handle: '@priya.teaches', score: '184,220', change: 0 },
  { rank: 2, name: 'Dr. Ngozi Adeyemi', handle: '@ngozi.science', score: '162,940', change: 2 },
  { rank: 3, name: 'Amara Okonkwo', handle: '@amara.builds', score: '151,806', change: -1 },
  { rank: 4, name: 'Léa Bouchard-Tremblay', handle: '@leabt', score: '128,455', change: 1 },
  { rank: 5, name: 'Mateo Fernández-Ruiz', handle: '@mateofr', score: '99,120', change: -2 },
  { rank: 6, name: 'Tobias Lindqvist', handle: '@tobiaslind', score: '87,644', change: 0 },
  { rank: 7, name: 'Yuki Tanaka', handle: '@yukimakes', score: '61,209', change: 3 },
  { rank: 8, name: 'Sam Whitfield', handle: '@samw', score: '44,918', change: -1 },
];

export interface ModerationCase {
  id: string;
  reporter: string;
  target: string;
  reason: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  age: string;
  aiConfidence: number;
  aiRecommendation: string;
}

export const MODERATION_QUEUE: ModerationCase[] = [
  { id: 'mc1', reporter: '3 reports', target: '@throwaway_8812', reason: 'Coordinated spam in 4 spaces', severity: 'High', age: '6m', aiConfidence: 0.96, aiRecommendation: 'Suspend 30 days' },
  { id: 'mc2', reporter: '1 report', target: '@marcus_ade', reason: 'Harassment in live chat', severity: 'Medium', age: '22m', aiConfidence: 0.71, aiRecommendation: 'Timeout 24 hours' },
  { id: 'mc3', reporter: 'Automated', target: 'Stream: “Late night build”', reason: 'Possible unlicensed music', severity: 'Medium', age: '41m', aiConfidence: 0.63, aiRecommendation: 'Flag for human review' },
  { id: 'mc4', reporter: '11 reports', target: '@fastcash_promo', reason: 'Financial scam links', severity: 'Critical', age: '2m', aiConfidence: 0.99, aiRecommendation: 'Ban and purge content' },
  { id: 'mc5', reporter: '1 report', target: 'Comment by @lin.wei', reason: 'Disputed factual claim', severity: 'Low', age: '1h', aiConfidence: 0.28, aiRecommendation: 'No action' },
];

export const AI_CONVERSATION = [
  {
    id: 'ai1',
    role: 'user' as const,
    body: 'My last four streams averaged 41 minutes of watch time but retention drops hard around minute 12. What is happening?',
  },
  {
    id: 'ai2',
    role: 'assistant' as const,
    body: 'Minute 12 is where you switch from the intro segment to screen share. Across all four streams, the drop starts within 40 seconds of that switch and averages 23% of concurrent viewers.\n\nTwo things correlate with it: your screen share starts at 1080p and takes roughly 9 seconds to sharpen, and there is no verbal signpost before the switch.',
    citations: ['Stream analytics · last 4 broadcasts', 'Encoder logs · 12 Jan – 2 Feb'],
    actions: ['Draft a 20-second transition script', 'Set encoder to pre-warm screen share'],
  },
];

export const ANALYTICS_SERIES = [
  { label: 'Mon', value: 42 },
  { label: 'Tue', value: 58 },
  { label: 'Wed', value: 51 },
  { label: 'Thu', value: 77 },
  { label: 'Fri', value: 94 },
  { label: 'Sat', value: 86 },
  { label: 'Sun', value: 68 },
];

export const STORIES = [
  { id: 'st1', name: 'Your story', own: true, seen: false },
  { id: 'st2', name: 'Amara', own: false, seen: false },
  { id: 'st3', name: 'Ngozi', own: false, seen: false },
  { id: 'st4', name: 'Tobias', own: false, seen: true },
  { id: 'st5', name: 'Yuki', own: false, seen: false },
  { id: 'st6', name: 'Mateo', own: false, seen: true },
  { id: 'st7', name: 'Léa', own: false, seen: true },
];

export const SHORTS = [
  { id: 'sh1', creator: CREATORS[4], caption: 'Three years chasing this glaze. Finally.', likes: '48.2K', comments: '1.2K', music: 'Tobias Lindqvist — Jämtland' },
  { id: 'sh2', creator: CREATORS[7], caption: 'Why resting steak actually matters, in 40 seconds', likes: '212K', comments: '8.4K', music: 'Original audio' },
  { id: 'sh3', creator: CREATORS[5], caption: 'Something nobody has named yet, 60m down', likes: '1.1M', comments: '31K', music: 'Original audio' },
];

export const SEARCH_SUGGESTIONS = [
  'design tokens oklch',
  'live encoder latency settings',
  'priya statistics course',
  'ceramic glaze chemistry',
  'kermadec dive footage',
  'stream overlay templates',
];

export const TRENDING = [
  { tag: 'perceptual colour', posts: '4,281 posts' },
  { tag: 'live production', posts: '12,904 posts' },
  { tag: 'deep sea', posts: '8,117 posts' },
  { tag: 'slow craft', posts: '2,340 posts' },
  { tag: 'applied statistics', posts: '6,552 posts' },
];
