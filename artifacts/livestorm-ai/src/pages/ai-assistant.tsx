import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetActiveSession, getGetActiveSessionQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Send,
  Trash2,
  Sparkles,
  Zap,
  Shield,
  Trophy,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Wand2,
  Target,
  Star,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = "/api";

async function apiFetch(path: string, options?: RequestInit) {
  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!resp.ok) throw new Error(`API error ${resp.status}`);
  return resp.json();
}

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type PersonaConfig = {
  id: number;
  personaName: string;
  tone: string;
  announceGifts: boolean;
  announceGiftThreshold: number;
  announceLevelUp: boolean;
  announceBossKill: boolean;
  moderationEnabled: boolean;
};

type Quest = {
  id: number;
  questText: string;
  metric: string;
  target: number;
  current: number;
  xpReward: number;
  completed: boolean;
};

type GeneratedEvent = {
  title: string;
  description: string;
  duration: string;
  mechanic: string;
};

type ModerationLog = {
  id: number;
  viewerName: string;
  comment: string;
  reason: string;
  flaggedAt: string;
};

const TONE_OPTIONS = [
  { value: "hype", label: "🔥 Hype", desc: "Energetic, caps, exclamation marks" },
  { value: "friendly", label: "😊 Friendly", desc: "Warm, welcoming, supportive" },
  { value: "professional", label: "📊 Professional", desc: "Analytical, data-driven" },
  { value: "savage", label: "😈 Savage", desc: "Bold, edgy, witty" },
];

function MetricIcon({ metric }: { metric: string }) {
  const icons: Record<string, React.ReactNode> = {
    gifts: <Star className="h-3 w-3" />,
    comments: <MessageSquare className="h-3 w-3" />,
    likes: <Zap className="h-3 w-3" />,
    followers: <Trophy className="h-3 w-3" />,
    shares: <RefreshCw className="h-3 w-3" />,
  };
  return <>{icons[metric] ?? <Target className="h-3 w-3" />}</>;
}

export function AiAssistant() {
  const queryClient = useQueryClient();
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "quests" | "moderation">("chat");
  const [generatedEvent, setGeneratedEvent] = useState<GeneratedEvent | null>(null);
  const [isGeneratingEvent, setIsGeneratingEvent] = useState(false);
  const [isGeneratingQuests, setIsGeneratingQuests] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: activeSessionRes } = useGetActiveSession({
    query: { queryKey: getGetActiveSessionQueryKey(), refetchInterval: 10000 },
  });
  const activeSessionId = activeSessionRes?.session?.id ?? null;

  const { data: config, isLoading: configLoading } = useQuery<PersonaConfig>({
    queryKey: ["ai-config"],
    queryFn: () => apiFetch("/ai/config"),
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["ai-messages"],
    queryFn: () => apiFetch("/ai/messages"),
  });

  const { data: moderationLogs = [] } = useQuery<ModerationLog[]>({
    queryKey: ["ai-moderation-log"],
    queryFn: () => apiFetch("/ai/moderation-log"),
    refetchInterval: 30000,
  });

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const updateConfig = useMutation({
    mutationFn: (updates: Partial<PersonaConfig>) =>
      apiFetch("/ai/config", { method: "PUT", body: JSON.stringify(updates) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-config"] }),
  });

  const clearMessages = useMutation({
    mutationFn: () => apiFetch("/ai/messages", { method: "DELETE" }),
    onSuccess: () => {
      setLocalMessages([]);
      queryClient.invalidateQueries({ queryKey: ["ai-messages"] });
    },
  });

  const handleSend = useCallback(async () => {
    const msg = inputMessage.trim();
    if (!msg || isSending) return;

    setInputMessage("");
    setIsSending(true);

    const tempId = Date.now();
    const tempUser: Message = {
      id: tempId,
      role: "user",
      content: msg,
      createdAt: new Date().toISOString(),
    };
    const tempAssistant: Message = {
      id: tempId + 1,
      role: "assistant",
      content: "...",
      createdAt: new Date().toISOString(),
    };

    setLocalMessages((prev) => [...prev, tempUser, tempAssistant]);

    try {
      const data = await apiFetch("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: msg }),
      });
      setLocalMessages((prev) =>
        prev.map((m) => (m.id === tempAssistant.id ? { ...m, content: data.reply } : m)),
      );
      queryClient.invalidateQueries({ queryKey: ["ai-messages"] });
    } catch {
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === tempAssistant.id
            ? { ...m, content: "Sorry, I couldn't respond. Please try again." }
            : m,
        ),
      );
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [inputMessage, isSending, queryClient]);

  const handleGenerateEvent = async () => {
    setIsGeneratingEvent(true);
    try {
      const data = await apiFetch("/ai/generate-event", { method: "POST", body: JSON.stringify({}) });
      setGeneratedEvent(data);
    } catch {
      // ignore
    } finally {
      setIsGeneratingEvent(false);
    }
  };

  const handleGenerateQuests = async () => {
    if (!activeSessionId) return;
    setIsGeneratingQuests(true);
    try {
      const data = await apiFetch("/ai/generate-quests", {
        method: "POST",
        body: JSON.stringify({
          sessionId: activeSessionId,
          viewerCount: 50,
          sessionStats: { gifts: 0, comments: 0, likes: 0, followers: 0 },
        }),
      });
      setQuests(data);
    } catch {
      // ignore
    } finally {
      setIsGeneratingQuests(false);
    }
  };

  const personaName = config?.personaName ?? "Storm";

  return (
    <div className="space-y-5 max-w-7xl mx-auto h-[calc(100vh-7rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bot className="h-8 w-8 text-purple-400" />
            AI Co-Host
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Your intelligent stream assistant powered by GPT-4o
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-purple-500/50 text-purple-300 bg-purple-500/10 px-3 py-1.5"
        >
          <div className="h-2 w-2 rounded-full bg-purple-400 mr-2 animate-pulse" />
          {personaName} Active
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
        {/* LEFT: Config panel */}
        <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto pr-1 min-h-0">
          {/* Persona */}
          <Card className="bg-card border-white/5 flex-shrink-0">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                Persona Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-4">
              {configLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">AI Name</Label>
                    <Input
                      key={config?.personaName}
                      defaultValue={config?.personaName}
                      placeholder="Storm"
                      className="bg-background/50 border-white/10 h-8 text-sm"
                      onBlur={(e) => {
                        if (e.target.value.trim() && e.target.value !== config?.personaName) {
                          updateConfig.mutate({ personaName: e.target.value.trim() });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tone</Label>
                    <Select
                      value={config?.tone ?? "hype"}
                      onValueChange={(v) => updateConfig.mutate({ tone: v })}
                    >
                      <SelectTrigger className="bg-background/50 border-white/10 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TONE_OPTIONS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            <span>{t.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">{t.desc}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Live Announcements */}
          <Card className="bg-card border-white/5 flex-shrink-0">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                Live Announcements
              </CardTitle>
              <CardDescription className="text-xs">
                AI hype messages broadcast to your session room
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              {(
                [
                  { key: "announceGifts", label: "Gift alerts", icon: "🎁" },
                  { key: "announceLevelUp", label: "Level ups", icon: "⬆️" },
                  { key: "announceBossKill", label: "Boss kills", icon: "💀" },
                ] as const
              ).map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <span>{item.icon}</span>
                    {item.label}
                  </Label>
                  <Switch
                    checked={(config?.[item.key] as boolean) ?? false}
                    onCheckedChange={(v) => updateConfig.mutate({ [item.key]: v })}
                  />
                </div>
              ))}
              <Separator className="bg-white/5" />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Min gift threshold (coins)
                </Label>
                <Input
                  key={config?.announceGiftThreshold}
                  type="number"
                  defaultValue={config?.announceGiftThreshold ?? 100}
                  className="bg-background/50 border-white/10 h-8 text-sm"
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    if (val > 0 && val !== config?.announceGiftThreshold) {
                      updateConfig.mutate({ announceGiftThreshold: val });
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Moderation toggle */}
          <Card className="bg-card border-white/5 flex-shrink-0">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400" />
                AI Moderation
              </CardTitle>
              <CardDescription className="text-xs">
                Auto-flag harmful comments in real time
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Enable moderation</Label>
                <Switch
                  checked={config?.moderationEnabled ?? false}
                  onCheckedChange={(v) => updateConfig.mutate({ moderationEnabled: v })}
                />
              </div>
              {config?.moderationEnabled && (
                <p className="text-xs text-muted-foreground mt-2 p-2 bg-blue-500/10 rounded-md border border-blue-500/20">
                  ✓ Comments are being scanned for hate speech, harassment, and spam.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Event Generator */}
          <Card className="bg-card border-white/5 flex-shrink-0">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-orange-400" />
                Event Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              <Button
                className="w-full bg-orange-600 hover:bg-orange-700"
                size="sm"
                onClick={handleGenerateEvent}
                disabled={isGeneratingEvent}
              >
                {isGeneratingEvent ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Generate Live Event
              </Button>
              {generatedEvent && (
                <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3 space-y-2">
                  <div className="font-semibold text-orange-300 text-sm">
                    {generatedEvent.title}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {generatedEvent.description}
                  </p>
                  <div className="text-xs text-muted-foreground">⏱️ {generatedEvent.duration}</div>
                  <div className="text-xs bg-background/40 rounded p-2">
                    <span className="text-muted-foreground font-medium">How to run: </span>
                    {generatedEvent.mechanic}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Chat / Quests / Moderation tabs */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          {/* Tab bar */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg mb-4 flex-shrink-0">
            {[
              { key: "chat", label: "Chat Assistant", icon: <Bot className="h-3.5 w-3.5" /> },
              { key: "quests", label: "AI Quests", icon: <Trophy className="h-3.5 w-3.5" /> },
              {
                key: "moderation",
                label: `Moderation${moderationLogs.length > 0 ? ` (${moderationLogs.length})` : ""}`,
                icon: <Shield className="h-3.5 w-3.5" />,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md transition-all",
                  activeTab === tab.key
                    ? "bg-purple-600 text-white shadow"
                    : "text-muted-foreground hover:text-white hover:bg-white/5",
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Chat tab */}
          {activeTab === "chat" && (
            <Card className="bg-card border-white/5 flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                  <span className="text-sm font-medium">{personaName}</span>
                  <span className="text-xs text-muted-foreground">— your stream strategist</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                  onClick={() => clearMessages.mutate()}
                  title="Clear conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Separator className="bg-white/5" />

              <ScrollArea className="flex-1 px-4">
                <div className="py-4 space-y-4">
                  {localMessages.length === 0 && (
                    <div className="text-center py-10">
                      <Bot className="h-10 w-10 text-purple-400/30 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">
                        Hey! I'm {personaName}, your AI co-host.
                      </p>
                      <p className="text-muted-foreground/60 text-xs mt-1">
                        Ask me about stream strategy, event ideas, or how to boost engagement.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center mt-4">
                        {[
                          "How do I get more gifts?",
                          "Give me a hype event idea",
                          "Tips for growing viewers",
                          "What quests should I run?",
                        ].map((prompt) => (
                          <button
                            key={prompt}
                            onClick={() => setInputMessage(prompt)}
                            className="text-xs px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-colors"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {localMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3",
                        msg.role === "user" ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold",
                          msg.role === "user"
                            ? "bg-purple-600"
                            : "bg-gradient-to-br from-purple-500 to-pink-500",
                        )}
                      >
                        {msg.role === "user" ? "U" : "AI"}
                      </div>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                          msg.role === "user"
                            ? "bg-purple-600 text-white rounded-tr-sm"
                            : "bg-white/5 text-foreground rounded-tl-sm",
                        )}
                      >
                        {msg.content === "..." ? (
                          <span className="flex gap-1 items-center h-5">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
                          </span>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <Separator className="bg-white/5" />
              <div className="p-3 flex-shrink-0">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={`Ask ${personaName} anything about your stream...`}
                    className="bg-background/50 border-white/10 flex-1"
                    disabled={isSending}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!inputMessage.trim() || isSending}
                    className="bg-purple-600 hover:bg-purple-700 px-3"
                  >
                    {isSending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Quests tab */}
          {activeTab === "quests" && (
            <Card className="bg-card border-white/5 flex flex-col flex-1 min-h-0">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-400" />
                      AI Quest Generator
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Generate 3 AI-crafted viewer challenges tailored to your session
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleGenerateQuests}
                    disabled={isGeneratingQuests}
                    className="bg-yellow-600 hover:bg-yellow-700"
                    size="sm"
                  >
                    {isGeneratingQuests ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Generate
                  </Button>
                </div>
              </CardHeader>
              <ScrollArea className="flex-1">
                <div className="px-4 pb-4 space-y-3">
                  {quests.length === 0 ? (
                    <div className="text-center py-16">
                      <Trophy className="h-12 w-12 text-yellow-400/20 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">No quests generated yet</p>
                      <p className="text-muted-foreground/60 text-xs mt-1">
                        Click "Generate" to create AI-powered challenges for your viewers
                      </p>
                    </div>
                  ) : (
                    <>
                      {quests.map((quest, idx) => (
                        <div
                          key={quest.id ?? idx}
                          className={cn(
                            "rounded-xl p-4 border transition-all",
                            quest.completed
                              ? "bg-green-500/10 border-green-500/30"
                              : "bg-white/3 border-white/8 hover:border-white/15",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 flex-1">
                              {quest.completed ? (
                                <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                              ) : (
                                <Target className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                              )}
                              <span className="text-sm font-medium">{quest.questText}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-yellow-400 flex-shrink-0">
                              <Zap className="h-3 w-3" />
                              {quest.xpReward} XP
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <MetricIcon metric={quest.metric} />
                                <span className="capitalize">{quest.metric}</span>
                              </div>
                              <span>
                                {quest.current}/{quest.target}
                              </span>
                            </div>
                            <Progress
                              value={Math.min(100, (quest.current / quest.target) * 100)}
                              className="h-1.5 bg-white/10"
                            />
                          </div>
                        </div>
                      ))}
                      <div className="pt-2">
                        <Card className="bg-purple-500/10 border-purple-500/20">
                          <CardContent className="p-3">
                            <p className="text-xs text-purple-300">
                              💡 Share these quest targets in your TikTok LIVE chat to rally
                              viewers. Progress auto-tracks when your session is active.
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </Card>
          )}

          {/* Moderation tab */}
          {activeTab === "moderation" && (
            <Card className="bg-card border-white/5 flex flex-col flex-1 min-h-0">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-400" />
                      Moderation Log
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Comments flagged by AI during live sessions
                      {!config?.moderationEnabled && (
                        <span className="text-yellow-400 ml-2">
                          — enable moderation to start scanning
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      queryClient.invalidateQueries({ queryKey: ["ai-moderation-log"] })
                    }
                    className="text-muted-foreground h-7 w-7 p-0"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <ScrollArea className="flex-1">
                <div className="px-4 pb-4 space-y-2">
                  {moderationLogs.length === 0 ? (
                    <div className="text-center py-16">
                      <Shield className="h-12 w-12 text-blue-400/20 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">No flagged comments</p>
                      <p className="text-muted-foreground/60 text-xs mt-1">
                        {config?.moderationEnabled
                          ? "All comments are clean — great community!"
                          : "Enable AI moderation in the settings panel"}
                      </p>
                    </div>
                  ) : (
                    moderationLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-lg bg-red-500/8 border border-red-500/20 p-3"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                            <span className="text-sm font-medium text-red-300">
                              {log.viewerName}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.flaggedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80 mb-2">"{log.comment}"</p>
                        <Badge
                          variant="outline"
                          className="text-xs border-red-500/30 text-red-400"
                        >
                          {log.reason}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
