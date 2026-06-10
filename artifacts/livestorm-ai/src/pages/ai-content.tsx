import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Wand2, Lightbulb, Type, FileText, Hash, ScrollText,
  Copy, Check, Loader2, Sparkles, RefreshCw, Bookmark,
  BookmarkCheck, Trash2, History, ChevronDown, ChevronUp,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { PageHero, GradientText } from "@/components/ui/premium";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ContentType = "ideas" | "titles" | "descriptions" | "hashtags" | "script";

interface SavedItem {
  id: number;
  streamerId: number;
  contentType: string;
  prompt: string;
  content: string;
  createdAt: string;
}

interface HistoryPage {
  items: SavedItem[];
  limit: number;
  offset: number;
  hasMore: boolean;
}

const CONTENT_TYPES: { id: ContentType; icon: React.ComponentType<{ className?: string }>; labelKey: string; color: string }[] = [
  { id: "ideas",        icon: Lightbulb,  labelKey: "ai_content_tab_ideas",        color: "text-amber-400" },
  { id: "titles",       icon: Type,       labelKey: "ai_content_tab_titles",       color: "text-cyan-400" },
  { id: "descriptions", icon: FileText,   labelKey: "ai_content_tab_descriptions", color: "text-green-400" },
  { id: "hashtags",     icon: Hash,       labelKey: "ai_content_tab_hashtags",     color: "text-pink-400" },
  { id: "script",       icon: ScrollText, labelKey: "ai_content_tab_scripts",      color: "text-violet-400" },
];

const STYLE_OPTIONS = [
  { value: "entertaining",  label: "🎭 Entertaining" },
  { value: "educational",   label: "📚 Educational" },
  { value: "trending",      label: "🔥 Trending / Viral" },
  { value: "promotional",   label: "📣 Promotional" },
  { value: "storytelling",  label: "📖 Storytelling" },
  { value: "motivational",  label: "💪 Motivational" },
];

const AUDIENCE_OPTIONS = [
  { value: "gen-z (13-25)",           label: "🎮 Gen Z (13–25)" },
  { value: "millennials (25-40)",      label: "💼 Millennials (25–40)" },
  { value: "gamers",                   label: "🕹️ Gamers" },
  { value: "fitness enthusiasts",      label: "🏋️ Fitness Lovers" },
  { value: "foodies",                  label: "🍜 Foodies" },
  { value: "beauty & fashion fans",    label: "💄 Beauty & Fashion" },
  { value: "tech enthusiasts",         label: "💻 Tech Enthusiasts" },
  { value: "general audience",         label: "🌍 General Audience" },
];

const OUTPUT_LANGUAGES = [
  { value: "en", label: "🇬🇧 English" },
  { value: "uk", label: "🇺🇦 Ukrainian" },
  { value: "pl", label: "🇵🇱 Polish" },
  { value: "de", label: "🇩🇪 German" },
];

const PAGE_SIZE = 20;

// ── Inline copy button ────────────────────────────────────────────────────────
function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10",
        className,
      )}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-green-400" />
          <span className="text-green-400">{t("ai_content_copied")}</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {t("ai_content_copy")}
        </>
      )}
    </button>
  );
}

// ── Saved-item card ───────────────────────────────────────────────────────────
function HistoryCard({
  item,
  onDelete,
}: {
  item: SavedItem;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { getToken } = useAuth();
  const { toast } = useToast();

  const isScript = item.contentType === "script";
  let contentItems: string[] = [];
  let copyText = "";

  try {
    if (isScript) {
      copyText = item.content;
      contentItems = [item.content];
    } else {
      const parsed = JSON.parse(item.content);
      contentItems = Array.isArray(parsed) ? parsed : [item.content];
      copyText = contentItems.join("\n\n");
    }
  } catch {
    contentItems = [item.content];
    copyText = item.content;
  }

  const ctInfo = CONTENT_TYPES.find((c) => c.id === item.contentType);
  const Icon = ctInfo?.icon ?? Wand2;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BASE}/api/ai/content/history/${item.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Delete failed");
      onDelete(item.id);
    } catch {
      toast({ title: "Delete failed", description: "Could not remove this item.", variant: "destructive" });
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] overflow-hidden hover:border-white/12 transition-colors">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className={cn("mt-0.5 flex-shrink-0", ctInfo?.color ?? "text-primary")}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground/50">
              {format(new Date(item.createdAt), "MMM d, yyyy · HH:mm")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{item.prompt}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <CopyButton text={copyText} />
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-muted-foreground hover:text-red-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3 border-t border-white/5">
          {isScript ? (
            <pre className="mt-2 text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">
              {contentItems[0]}
            </pre>
          ) : (
            <div className="mt-2 space-y-1.5">
              {contentItems.map((text, i) => (
                <div key={i} className="flex items-start gap-2 group">
                  <span className="text-[10px] font-bold text-muted-foreground/40 w-4 flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="flex-1 text-xs text-foreground/80 leading-relaxed">{text}</p>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <CopyButton text={text} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Grouped history section ───────────────────────────────────────────────────
function HistoryGroup({
  type,
  items,
  onDelete,
}: {
  type: ContentType;
  items: SavedItem[];
  onDelete: (id: number) => void;
}) {
  const ctInfo = CONTENT_TYPES.find((c) => c.id === type)!;
  const Icon = ctInfo.icon;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 px-1 pt-1">
        <Icon className={cn("h-3.5 w-3.5", ctInfo.color)} />
        <span className={cn("text-xs font-bold uppercase tracking-wider", ctInfo.color)}>
          {type}
        </span>
        <span className="text-[10px] text-muted-foreground/40 ml-auto">{items.length}</span>
      </div>
      {items.map((item) => (
        <HistoryCard key={item.id} item={item} onDelete={onDelete} />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function AiContent() {
  const { getToken } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  // Generator state
  const [contentType, setContentType] = useState<ContentType>("ideas");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("");
  const [audience, setAudience] = useState("");
  const [outputLang, setOutputLang] = useState("en");
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<{ items?: string[]; script?: string } | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Right panel tab
  const [rightTab, setRightTab] = useState<"output" | "history">("output");

  // History state
  const [history, setHistory] = useState<SavedItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);

  const fetchHistory = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) setHistoryLoading(true);
    else setHistoryLoadingMore(true);
    try {
      const token = await getToken();
      const url = `${BASE}/api/ai/content/history?limit=${PAGE_SIZE}&offset=${offset}`;
      const res = await fetch(url, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: HistoryPage = await res.json();
      setHistory((prev) => append ? [...prev, ...data.items] : data.items);
      setHistoryOffset(offset + data.items.length);
      setHistoryHasMore(data.hasMore);
    } catch {
      toast({ title: "Failed to load history", variant: "destructive" });
    } finally {
      setHistoryLoading(false);
      setHistoryLoadingMore(false);
    }
  }, [getToken, toast]);

  // Load history on page mount
  useEffect(() => {
    fetchHistory(0, false);
  }, [fetchHistory]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: t("error"), description: "Please enter a topic.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setResults(null);
    setSaved(false);
    try {
      const token = await getToken();
      const resp = await fetch(`${BASE}/api/ai/content`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: contentType,
          topic: topic.trim(),
          style: style || undefined,
          audience: audience || undefined,
          language: outputLang,
        }),
      });
      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      const data = await resp.json();
      setResults(data);
    } catch {
      toast({ title: t("error"), description: t("ai_content_error"), variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyAll = () => {
    const text = results?.script ?? results?.items?.join("\n\n") ?? "";
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
      });
    }
  };

  const handleSave = async () => {
    if (!results) return;
    const isScript = contentType === "script";
    const content = isScript
      ? (results.script ?? "")
      : JSON.stringify(results.items ?? []);
    if (!content || content === "[]") return;

    const promptParts = [topic.trim()];
    if (style) promptParts.push(`style: ${style}`);
    if (audience) promptParts.push(`audience: ${audience}`);
    const prompt = promptParts.join(" · ");

    setIsSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BASE}/api/ai/content/save`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ contentType, prompt, content }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const savedItem: SavedItem = await res.json();
      setSaved(true);
      setHistory((prev) => [savedItem, ...prev]);
      toast({ title: "Saved!", description: "Added to your content history." });
    } catch {
      toast({ title: "Save failed", description: "Could not save this generation.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const hasResults = results && (results.script || (results.items && results.items.length > 0));

  // Group history by content type in canonical order
  const groupedHistory = CONTENT_TYPES
    .map((ct) => ({
      type: ct.id,
      items: history.filter((h) => h.contentType === ct.id),
    }))
    .filter((g) => g.items.length > 0);

  const handleDeleteItem = (id: number) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <PageHero
        gradientFrom="rgba(124,58,237,0.14)"
        gradientTo="rgba(245,158,11,0.06)"
        icon={
          <div className="p-3 rounded-2xl bg-primary/15 border border-primary/20 shadow-lg shadow-primary/10">
            <Wand2 className="h-8 w-8 text-primary" />
          </div>
        }
        title={
          <GradientText from="from-violet-400" to="to-amber-400">{t("ai_content_title")}</GradientText>
        }
        subtitle={t("ai_content_desc")}
        right={
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 gap-1.5 items-center flex">
            <Sparkles className="h-3 w-3" />
            AI Powered
          </Badge>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ── Left: Controls ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Content Type Selector */}
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/8 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Content Type</p>
            </div>
            <div className="p-3 space-y-1">
              {CONTENT_TYPES.map(({ id, icon: Icon, labelKey, color }) => (
                <button
                  key={id}
                  onClick={() => { setContentType(id); setResults(null); setSaved(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                    contentType === id
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent",
                  )}
                >
                  <Icon className={cn("h-4 w-4 flex-shrink-0", contentType === id ? "" : color)} />
                  {t(labelKey as any)}
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/8 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Settings</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">{t("ai_content_topic")} <span className="text-red-400">*</span></Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={t("ai_content_topic_placeholder")}
                  className="bg-background border-border"
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">{t("ai_content_style")}</Label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">{t("ai_content_style_placeholder")}</option>
                  {STYLE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">{t("ai_content_audience")}</Label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">{t("ai_content_audience_placeholder")}</option>
                  {AUDIENCE_OPTIONS.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">{t("ai_content_language")}</Label>
                <select
                  value={outputLang}
                  onChange={(e) => setOutputLang(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {OUTPUT_LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !topic.trim()}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("generating")}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t("ai_content_generate")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Right: Output + History tabs ───────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/8 overflow-hidden h-full min-h-[500px] flex flex-col">
            {/* Tab bar */}
            <div className="flex items-center border-b border-white/5 flex-shrink-0">
              <button
                onClick={() => setRightTab("output")}
                className={cn(
                  "flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2",
                  rightTab === "output"
                    ? "text-white border-primary"
                    : "text-muted-foreground hover:text-white border-transparent",
                )}
              >
                <Wand2 className="h-3.5 w-3.5" />
                Output
              </button>
              <button
                onClick={() => setRightTab("history")}
                className={cn(
                  "flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2",
                  rightTab === "history"
                    ? "text-white border-primary"
                    : "text-muted-foreground hover:text-white border-transparent",
                )}
              >
                <History className="h-3.5 w-3.5" />
                History
                {history.length > 0 && (
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full tabular-nums">
                    {history.length}{historyHasMore ? "+" : ""}
                  </span>
                )}
              </button>
              {/* Right side of tab bar */}
              {rightTab === "output" && hasResults && (
                <div className="ml-auto flex items-center gap-1.5 pr-4">
                  <button
                    onClick={() => { setResults(null); setSaved(false); }}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Clear
                  </button>
                  <button
                    onClick={handleCopyAll}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {copiedAll ? (
                      <><Check className="h-3 w-3 text-green-400" /><span className="text-green-400">Copied!</span></>
                    ) : (
                      <><Copy className="h-3 w-3" />Copy All</>
                    )}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || saved}
                    className={cn(
                      "text-xs flex items-center gap-1 px-2 py-1 rounded-lg transition-colors font-medium",
                      saved
                        ? "text-green-400 bg-green-500/10 cursor-default"
                        : "text-primary hover:text-white bg-primary/10 hover:bg-primary/20",
                    )}
                  >
                    {isSaving ? (
                      <><Loader2 className="h-3 w-3 animate-spin" />Saving…</>
                    ) : saved ? (
                      <><BookmarkCheck className="h-3 w-3" />Saved</>
                    ) : (
                      <><Bookmark className="h-3 w-3" />Save</>
                    )}
                  </button>
                </div>
              )}
              {rightTab === "history" && (
                <button
                  onClick={() => fetchHistory(0, false)}
                  disabled={historyLoading}
                  className="ml-auto mr-4 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <RefreshCw className={cn("h-3 w-3", historyLoading && "animate-spin")} />
                  Refresh
                </button>
              )}
            </div>

            {/* ── Output tab ─────────────────────────────────────────────── */}
            {rightTab === "output" && (
              <div className="flex-1 p-5 overflow-y-auto">
                {isGenerating && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                      <Sparkles className="h-5 w-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">{t("generating")}</p>
                      <p className="text-xs text-muted-foreground mt-1">AI is crafting your content...</p>
                    </div>
                  </div>
                )}

                {!isGenerating && !hasResults && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                      <Wand2 className="h-8 w-8 text-primary/60" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t("ai_content_empty")}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Enter a topic and click Generate</p>
                    </div>
                  </div>
                )}

                {!isGenerating && hasResults && contentType === "script" && results?.script && (
                  <div className="relative">
                    <div className="p-4 rounded-xl bg-background/50 border border-border/50">
                      <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed">
                        {results.script}
                      </pre>
                    </div>
                    <div className="absolute top-3 right-3">
                      <CopyButton text={results.script} />
                    </div>
                  </div>
                )}

                {!isGenerating && hasResults && contentType !== "script" && results?.items && (
                  <div className="space-y-2">
                    {results.items.map((item, i) => (
                      <div
                        key={i}
                        className="group flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-white/5 hover:border-primary/30 hover:bg-primary/5 transition-all"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                          <span className="text-xs font-bold text-primary">{i + 1}</span>
                        </div>
                        <p className="flex-1 text-sm text-foreground/90 leading-relaxed">{item}</p>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <CopyButton text={item} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── History tab ────────────────────────────────────────────── */}
            {rightTab === "history" && (
              <ScrollArea className="flex-1" style={{ minHeight: 0 }}>
                <div className="p-4 space-y-5">
                  {historyLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
                      <p className="text-xs text-muted-foreground/60">Loading history…</p>
                    </div>
                  ) : groupedHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/8">
                        <History className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground/60">No saved content yet</p>
                        <p className="text-xs text-muted-foreground/40 mt-1">Generate content and click Save to keep it here</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {groupedHistory.map(({ type, items }) => (
                        <HistoryGroup
                          key={type}
                          type={type}
                          items={items}
                          onDelete={handleDeleteItem}
                        />
                      ))}
                      {historyHasMore && (
                        <div className="pt-2 flex justify-center">
                          <button
                            onClick={() => fetchHistory(historyOffset, true)}
                            disabled={historyLoadingMore}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
                          >
                            {historyLoadingMore
                              ? <><Loader2 className="h-3 w-3 animate-spin" />Loading…</>
                              : "Load more"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
