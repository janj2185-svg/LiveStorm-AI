import { motion } from "framer-motion";
import { Link } from "wouter";
import { Sparkles, User2, Wand2, Settings, ChevronRight, Palette, Cpu } from "lucide-react";
import { useGetMyProfile } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const STUDIO_SECTIONS = [
  {
    label: "Create AI Avatar",
    desc: "Build a custom AI presenter with your own appearance",
    href: "/ai-assistant",
    icon: Sparkles,
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-400",
    border: "border-violet-500/20",
    badge: "AI Core",
    badgeColor: "text-violet-300 bg-violet-500/15 border-violet-500/30",
  },
  {
    label: "Avatar Settings",
    desc: "Scale, position, lighting, and expression controls",
    href: "/ai-assistant",
    icon: Settings,
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
    border: "border-blue-500/20",
    badge: "Customize",
    badgeColor: "text-blue-300 bg-blue-500/15 border-blue-500/30",
  },
  {
    label: "Voice & TTS",
    desc: "Configure your avatar's voice, speed and emotion",
    href: "/ai-assistant",
    icon: Wand2,
    iconBg: "bg-pink-500/15",
    iconColor: "text-pink-400",
    border: "border-pink-500/20",
    badge: "Voice",
    badgeColor: "text-pink-300 bg-pink-500/15 border-pink-500/30",
  },
  {
    label: "Persona Builder",
    desc: "Craft your AI's personality, tone, and style",
    href: "/ai-assistant",
    icon: User2,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    border: "border-amber-500/20",
    badge: "Personality",
    badgeColor: "text-amber-300 bg-amber-500/15 border-amber-500/30",
  },
  {
    label: "Appearance & Theme",
    desc: "Colors, backgrounds and visual presentation",
    href: "/ai-assistant",
    icon: Palette,
    iconBg: "bg-cyan-500/15",
    iconColor: "text-cyan-400",
    border: "border-cyan-500/20",
    badge: "Style",
    badgeColor: "text-cyan-300 bg-cyan-500/15 border-cyan-500/30",
  },
  {
    label: "Animation Presets",
    desc: "Expressions, idle animations and reaction poses",
    href: "/ai-assistant",
    icon: Cpu,
    iconBg: "bg-green-500/15",
    iconColor: "text-green-400",
    border: "border-green-500/20",
    badge: "Motion",
    badgeColor: "text-green-300 bg-green-500/15 border-green-500/30",
  },
];

export function AvatarStudio() {
  const { data: profile } = useGetMyProfile();

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-violet-500/20 overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(6,182,212,0.05) 100%)" }}
      >
        <div className="p-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
              <Sparkles className="h-8 w-8 text-violet-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400/80">Avatar Studio</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 font-semibold">AI Powered</span>
              </div>
              <h1 className="text-xl font-black text-white">Your AI Presenter</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {profile?.tiktokUsername
                  ? `@${profile.tiktokUsername} · Design your virtual co-host`
                  : "Design your virtual AI co-host"}
              </p>
            </div>
          </div>
          <Link href="/ai-assistant">
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-bold text-sm cursor-pointer transition-all shadow-lg shadow-violet-500/25">
              <Sparkles className="h-4 w-4" />
              Open AI Co-Host
            </div>
          </Link>
        </div>
      </motion.div>

      {/* Studio Sections */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-[0.12em] mb-3">Studio Tools</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {STUDIO_SECTIONS.map((section, i) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Link href={section.href}>
                  <div className={cn(
                    "group flex items-start gap-4 p-4 rounded-2xl border cursor-pointer",
                    "bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200",
                    "hover:border-white/[0.12]",
                    section.border,
                  )}>
                    <div className={cn("p-2.5 rounded-xl flex-shrink-0 border", section.iconBg, section.border)}>
                      <Icon className={cn("h-5 w-5", section.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-white text-sm">{section.label}</p>
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-bold flex-shrink-0", section.badgeColor)}>
                          {section.badge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground/60 leading-snug">{section.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 flex-shrink-0 mt-0.5 transition-colors" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Coming Soon */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Coming Soon</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {["Ready Player Me Integration", "Custom GLB/VRM Upload", "AI Face Capture"].map((item) => (
            <div key={item} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="h-2 w-2 rounded-full bg-violet-500/40 flex-shrink-0" />
              <span className="text-xs text-muted-foreground/50">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
