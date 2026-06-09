import { ArrowLeft, Cpu, Mic, Eye, Brain, Layers, Zap, Code, Calendar } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PHASES = [
  {
    phase: "Phase 1",
    label: "Foundation",
    status: "planning",
    statusColor: "bg-slate-600 text-slate-200",
    eta: "Q3 2026",
    items: [
      "2D avatar system with animated idle / talking states",
      "Browser-source OBS overlay (iframe embed)",
      "Lip-sync via audio amplitude waveform",
      "Blinking + head-bobbing idle animations",
      "Emotion presets: neutral, happy, excited, thinking",
    ],
    tech: ["React Three Fiber", "Three.js", "Framer Motion", "Web Audio API"],
  },
  {
    phase: "Phase 2",
    label: "3D Avatar Engine",
    status: "roadmap",
    statusColor: "bg-purple-700 text-purple-200",
    eta: "Q4 2026",
    items: [
      "3D avatar renderer (glTF / VRM model support)",
      "Real-time lip-sync with phoneme mapping",
      "Emotion-driven facial blend shapes",
      "Hand gestures triggered by stream events",
      "Custom avatar skin / outfit system",
      "Avatar personality reflects AI persona",
    ],
    tech: ["Three.js", "@pixiv/three-vrm", "Web Audio API", "MediaRecorder"],
  },
  {
    phase: "Phase 3",
    label: "Voice Clone",
    status: "roadmap",
    statusColor: "bg-amber-700 text-amber-200",
    eta: "Q1 2027",
    items: [
      "Voice cloning from 30-second sample",
      "Real-time TTS using cloned voice",
      "Multilingual voice synthesis (20 languages)",
      "Emotion-aware voice tone injection",
      "Voice switching during stream",
    ],
    tech: ["ElevenLabs API", "OpenAI TTS", "WebSocket audio streaming"],
  },
  {
    phase: "Phase 4",
    label: "Real-Time AI",
    status: "future",
    statusColor: "bg-pink-700 text-pink-200",
    eta: "Q2 2027",
    items: [
      "Sub-200ms response latency (audio → avatar → reply)",
      "Multi-modal input: chat + gifts + events → single decision loop",
      "Avatar memory: remembers top fans, inside jokes",
      "Cross-stream personality continuity",
      "Streamer-less full autopilot mode",
    ],
    tech: ["GPT-4o Realtime", "WebRTC", "Redis pub/sub", "ONNX Runtime"],
  },
];

const ARCHITECTURE = [
  {
    icon: Brain,
    title: "Decision Engine",
    color: "text-purple-400",
    desc: "GPT-4o processes incoming events (chat, gifts, bosses, quests) and decides the avatar's next action — speech, gesture, or emotion.",
  },
  {
    icon: Mic,
    title: "TTS Pipeline",
    color: "text-blue-400",
    desc: "OpenAI TTS (or cloned voice) synthesises speech. Audio streams via WebSocket to the browser source overlay in real-time.",
  },
  {
    icon: Eye,
    title: "Lip-Sync Layer",
    color: "text-green-400",
    desc: "Web Audio API analyses the TTS waveform in real time. Amplitude drives mouth open/close. Phoneme mapping enables accurate 3D lip-sync.",
  },
  {
    icon: Layers,
    title: "Avatar Renderer",
    color: "text-amber-400",
    desc: "React Three Fiber renders the VRM/glTF avatar inside an OBS browser source. Blend shapes, bones, and shaders handle all expressions.",
  },
  {
    icon: Zap,
    title: "Event Bus",
    color: "text-pink-400",
    desc: "Socket.IO propagates stream events (gifts, chat, boss kills) to both the API decision engine and directly to the avatar overlay.",
  },
  {
    icon: Code,
    title: "OBS Integration",
    color: "text-cyan-400",
    desc: "Avatar is a browser source overlay with configurable green-screen or transparent background. Runs on any streaming software.",
  },
];

const DB_SCHEMA = `-- Avatar configuration per streamer
CREATE TABLE avatar_configs (
  id          SERIAL PRIMARY KEY,
  streamer_id INTEGER REFERENCES streamers(id),
  model_url   TEXT,                    -- glTF/VRM model URL
  voice_id    TEXT,                    -- ElevenLabs or TTS voice ID
  personality TEXT DEFAULT 'friendly', -- ai personality preset
  idle_anim   TEXT DEFAULT 'breathing',
  bg_color    TEXT DEFAULT 'transparent',
  scale       FLOAT DEFAULT 1.0,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- Per-session avatar performance log
CREATE TABLE avatar_events (
  id          SERIAL PRIMARY KEY,
  streamer_id INTEGER REFERENCES streamers(id),
  session_id  INTEGER REFERENCES sessions(id),
  event_type  TEXT,   -- 'speech'|'gesture'|'emotion'|'idle'
  trigger     TEXT,   -- 'gift'|'chat'|'boss_kill'|'quest'|'manual'
  content     TEXT,   -- speech text or emotion name
  latency_ms  INTEGER,
  created_at  TIMESTAMP DEFAULT NOW()
);`;

export function AvatarRoadmap() {
  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-10">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-pink-500/10">
              <Cpu className="h-7 w-7 text-pink-400" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white">3D AI Host</h1>
              <p className="text-muted-foreground text-sm">Architecture & Roadmap</p>
            </div>
            <Badge className="ml-auto bg-pink-700/30 text-pink-300 border border-pink-500/30">
              Studio Feature
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            A real-time 3D avatar that lives inside your TikTok LIVE stream as an OBS browser source. 
            Driven by your AI persona, it speaks, reacts, and engages your audience — fully autonomously.
          </p>
        </div>

        {/* Architecture */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            System Architecture
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ARCHITECTURE.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="bg-card border-white/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${item.color}`} />
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Latency target */}
        <Card className="bg-gradient-to-r from-purple-950/40 to-pink-950/40 border border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-8 justify-around text-center">
              {[
                { label: "Event → Decision", value: "<50ms", color: "text-purple-400" },
                { label: "Decision → TTS", value: "<100ms", color: "text-blue-400" },
                { label: "TTS → Lip-sync", value: "<20ms", color: "text-green-400" },
                { label: "End-to-end target", value: "<200ms", color: "text-pink-400" },
              ].map((m) => (
                <div key={m.label}>
                  <p className={`text-3xl font-black ${m.color}`}>{m.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Roadmap phases */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-400" />
            Development Roadmap
          </h2>
          <div className="space-y-4">
            {PHASES.map((phase) => (
              <Card key={phase.phase} className="bg-card border-white/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="text-xs border-white/20 text-muted-foreground font-mono">
                      {phase.phase}
                    </Badge>
                    <CardTitle className="text-lg">{phase.label}</CardTitle>
                    <Badge className={`text-xs ${phase.statusColor} ml-auto`}>
                      {phase.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{phase.eta}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-1.5">
                    {phase.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">▸</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/30">
                    {phase.tech.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs border-white/10 text-muted-foreground font-mono">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* DB Schema */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Code className="h-5 w-5 text-cyan-400" />
            Database Schema
          </h2>
          <Card className="bg-card border-white/5">
            <CardContent className="pt-6">
              <pre className="text-xs text-muted-foreground font-mono overflow-x-auto whitespace-pre leading-relaxed">
                {DB_SCHEMA}
              </pre>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-8">
          3D AI Host is a Studio-tier feature · Early access in Q4 2026
        </p>
      </div>
    </div>
  );
}
