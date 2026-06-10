import { useState } from "react";
import { useAuth } from "@clerk/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Wand2, Lightbulb, Type, FileText, Hash, ScrollText,
  Copy, Check, Loader2, Sparkles, RefreshCw,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ContentType = "ideas" | "titles" | "descriptions" | "hashtags" | "script";

const CONTENT_TYPES: { id: ContentType; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
  { id: "ideas", icon: Lightbulb, labelKey: "ai_content_tab_ideas" },
  { id: "titles", icon: Type, labelKey: "ai_content_tab_titles" },
  { id: "descriptions", icon: FileText, labelKey: "ai_content_tab_descriptions" },
  { id: "hashtags", icon: Hash, labelKey: "ai_content_tab_hashtags" },
  { id: "script", icon: ScrollText, labelKey: "ai_content_tab_scripts" },
];

const STYLE_OPTIONS = [
  { value: "entertaining", label: "🎭 Entertaining" },
  { value: "educational", label: "📚 Educational" },
  { value: "trending", label: "🔥 Trending / Viral" },
  { value: "promotional", label: "📣 Promotional" },
  { value: "storytelling", label: "📖 Storytelling" },
  { value: "motivational", label: "💪 Motivational" },
];

const AUDIENCE_OPTIONS = [
  { value: "gen-z (13-25)", label: "🎮 Gen Z (13–25)" },
  { value: "millennials (25-40)", label: "💼 Millennials (25–40)" },
  { value: "gamers", label: "🕹️ Gamers" },
  { value: "fitness enthusiasts", label: "🏋️ Fitness Lovers" },
  { value: "foodies", label: "🍜 Foodies" },
  { value: "beauty & fashion fans", label: "💄 Beauty & Fashion" },
  { value: "tech enthusiasts", label: "💻 Tech Enthusiasts" },
  { value: "general audience", label: "🌍 General Audience" },
];

const OUTPUT_LANGUAGES = [
  { value: "en", label: "🇬🇧 English" },
  { value: "uk", label: "🇺🇦 Ukrainian" },
  { value: "pl", label: "🇵🇱 Polish" },
  { value: "de", label: "🇩🇪 German" },
];

function CopyButton({ text }: { text: string }) {
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
      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10"
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

export function AiContent() {
  const { getToken } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [contentType, setContentType] = useState<ContentType>("ideas");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("");
  const [audience, setAudience] = useState("");
  const [outputLang, setOutputLang] = useState("en");
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<{ items?: string[]; script?: string } | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: t("error"), description: "Please enter a topic.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setResults(null);

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

  const hasResults = results && (results.script || (results.items && results.items.length > 0));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
              <Wand2 className="h-6 w-6 text-primary" />
            </div>
            {t("ai_content_title")}
          </h2>
          <p className="text-muted-foreground mt-2">{t("ai_content_desc")}</p>
        </div>
        <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 hidden sm:flex gap-1.5 items-center">
          <Sparkles className="h-3 w-3" />
          AI Powered
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Content Type Selector */}
          <Card className="bg-card border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Content Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {CONTENT_TYPES.map(({ id, icon: Icon, labelKey }) => (
                <button
                  key={id}
                  onClick={() => { setContentType(id); setResults(null); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                    contentType === id
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent",
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {t(labelKey as any)}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className="bg-card border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                  className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                  className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
            </CardContent>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-3">
          <Card className="bg-card border-white/5 h-full min-h-[500px]">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  {CONTENT_TYPES.find((c) => c.id === contentType) && (() => {
                    const ct = CONTENT_TYPES.find((c) => c.id === contentType)!;
                    const Icon = ct.icon;
                    return (
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        {t(ct.labelKey as any)}
                      </span>
                    );
                  })()}
                </CardTitle>
                {hasResults && (
                  <CardDescription className="mt-0.5">
                    {contentType === "script" ? "1 script generated" : `${results?.items?.length ?? 0} results`}
                  </CardDescription>
                )}
              </div>
              {hasResults && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setResults(null)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Clear
                  </button>
                  <button
                    onClick={handleCopyAll}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
                  >
                    {copiedAll ? (
                      <><Check className="h-3 w-3 text-green-400" /><span className="text-green-400">Copied!</span></>
                    ) : (
                      <><Copy className="h-3 w-3" />Copy All</>
                    )}
                  </button>
                </div>
              )}
            </CardHeader>

            <CardContent>
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
                  <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
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
                  <div className="p-4 rounded-lg bg-background/50 border border-border/50">
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
                      className="group flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
