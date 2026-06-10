import { useState } from "react";
import {
  useSpinWheel,
  useRunLuckyDraw,
  useRunPvpBattle,
  useStartQuiz,
  useStartTreasureHunt,
  useGetMyStreamer,
  useGetActiveSession,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Gift, Users, Swords, Brain, Map as MapIcon, RotateCcw, Trophy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero, GradientText } from "@/components/ui/premium";

const WHEEL_PRIZES = [
  { label: "50 XP",     color: "#7c3aed" },
  { label: "10 Coins",  color: "#0ea5e9" },
  { label: "100 XP",    color: "#16a34a" },
  { label: "Try Again", color: "#475569" },
  { label: "50 Coins",  color: "#d97706" },
  { label: "200 XP",    color: "#db2777" },
  { label: "100 Coins", color: "#dc2626" },
  { label: "500 XP+50C",color: "#f59e0b" },
];

function SpinWheelSvg({ spinning, winner }: { spinning: boolean; winner?: string }) {
  const segments = WHEEL_PRIZES.length;
  const angleStep = 360 / segments;
  const radius = 145;
  const cx = 165;
  const cy = 165;

  const paths = WHEEL_PRIZES.map((prize, i) => {
    const startAngle = (i * angleStep - 90) * (Math.PI / 180);
    const endAngle   = ((i + 1) * angleStep - 90) * (Math.PI / 180);
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const midAngle = ((i + 0.5) * angleStep - 90) * (Math.PI / 180);
    const tx = cx + (radius * 0.67) * Math.cos(midAngle);
    const ty = cy + (radius * 0.67) * Math.sin(midAngle);
    return { path: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`, tx, ty, prize };
  });

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: 340,
          height: 340,
          background: "radial-gradient(circle, rgba(124,58,237,0.15), transparent 70%)",
          filter: "blur(8px)",
        }}
      />
      <svg
        width="330"
        height="330"
        style={{
          animation: spinning ? "spin 600ms linear infinite" : "none",
          filter: "drop-shadow(0 0 20px rgba(124,58,237,0.3))",
        }}
      >
        {paths.map(({ path, tx, ty, prize }, i) => (
          <g key={i}>
            <path d={path} fill={prize.color} stroke="rgba(0,0,0,0.4)" strokeWidth="2" />
            <text
              x={tx}
              y={ty}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="10"
              fontWeight="bold"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
            >
              {prize.label}
            </text>
          </g>
        ))}
        {/* Decorative outer ring */}
        <circle cx={cx} cy={cy} r={radius + 2} fill="none" stroke="rgba(124,58,237,0.4)" strokeWidth="3" />
        {/* Center hub */}
        <circle cx={cx} cy={cy} r="22" fill="#0c1430" stroke="#7c3aed" strokeWidth="3" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="14">🎰</text>
      </svg>
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 z-10">
        <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-violet-500 drop-shadow-lg" />
      </div>
    </div>
  );
}

export function MiniGames() {
  const { toast } = useToast();
  const { data: streamer } = useGetMyStreamer();
  const { data: activeSessionData } = useGetActiveSession();
  const sessionId = activeSessionData?.session?.id;
  const streamerId = streamer?.id;

  const spinMutation  = useSpinWheel();
  const drawMutation  = useRunLuckyDraw();
  const pvpMutation   = useRunPvpBattle();
  const quizMutation  = useStartQuiz();
  const huntMutation  = useStartTreasureHunt();

  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<{ prize: string; xp: number; coins: number } | null>(null);
  const [drawResult, setDrawResult] = useState<string | null>(null);
  const [pvpPlayer1, setPvpPlayer1] = useState("");
  const [pvpPlayer2, setPvpPlayer2] = useState("");
  const [pvpResult, setPvpResult] = useState<{ winner: string; loser: string; player1Score: number; player2Score: number } | null>(null);
  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizAnswer, setQuizAnswer] = useState("");
  const [huntKeyword, setHuntKeyword] = useState("");
  const [huntPrize, setHuntPrize] = useState("");

  async function handleSpin() {
    setSpinning(true);
    setSpinResult(null);
    setTimeout(async () => {
      try {
        const result = await spinMutation.mutateAsync({ data: { sessionId } });
        setSpinResult(result);
        setSpinning(false);
        toast({ title: `🎰 You won: ${result.prize}!`, description: result.xp > 0 ? `+${result.xp} XP awarded` : result.coins > 0 ? `+${result.coins} coins awarded` : "Better luck next time!" });
      } catch {
        setSpinning(false);
        toast({ title: "Spin failed", variant: "destructive" });
      }
    }, 2000);
  }

  async function handleLuckyDraw() {
    if (!streamerId) return;
    try {
      const result = await drawMutation.mutateAsync({ data: { streamerId, sessionId } });
      setDrawResult(result.winner ?? "No eligible viewers");
      toast({ title: `🎉 Winner: ${result.winner ?? "nobody yet"}!`, description: result.winner ? "Lucky viewer wins the draw!" : result.message });
    } catch {
      toast({ title: "Draw failed", variant: "destructive" });
    }
  }

  async function handlePvp() {
    if (!pvpPlayer1.trim() || !pvpPlayer2.trim()) {
      toast({ title: "Enter both player names", variant: "destructive" });
      return;
    }
    try {
      const result = await pvpMutation.mutateAsync({ data: { player1: pvpPlayer1.trim(), player2: pvpPlayer2.trim(), streamerId, sessionId } });
      setPvpResult(result);
      toast({ title: `⚔️ ${result.winner} wins!`, description: `Score: ${result.player1Score} vs ${result.player2Score}` });
    } catch {
      toast({ title: "PvP failed", variant: "destructive" });
    }
  }

  async function handleQuizStart() {
    if (!quizQuestion.trim() || !quizAnswer.trim()) {
      toast({ title: "Enter question and answer", variant: "destructive" });
      return;
    }
    try {
      await quizMutation.mutateAsync({ data: { question: quizQuestion.trim(), answer: quizAnswer.trim(), sessionId } });
      toast({ title: "Quiz started!", description: `Question posted to your stream: "${quizQuestion}"` });
    } catch {
      toast({ title: "Quiz failed", variant: "destructive" });
    }
  }

  async function handleHuntStart() {
    if (!huntKeyword.trim()) {
      toast({ title: "Enter a keyword", variant: "destructive" });
      return;
    }
    try {
      await huntMutation.mutateAsync({ data: { keyword: huntKeyword.trim(), prize: huntPrize.trim(), sessionId } });
      toast({ title: "Treasure Hunt started!", description: `First viewer to type "${huntKeyword}" wins ${huntPrize || "a prize"}!` });
    } catch {
      toast({ title: "Hunt failed", variant: "destructive" });
    }
  }

  const GAMES = [
    { value: "spin",  icon: <RotateCcw className="w-4 h-4" />, label: "Spin Wheel", emoji: "🎰", color: "text-violet-400" },
    { value: "draw",  icon: <Gift className="w-4 h-4" />,       label: "Lucky Draw", emoji: "🎁", color: "text-yellow-400" },
    { value: "pvp",   icon: <Swords className="w-4 h-4" />,     label: "PvP Battle", emoji: "⚔️", color: "text-red-400"    },
    { value: "quiz",  icon: <Brain className="w-4 h-4" />,       label: "Quiz Mode",  emoji: "🧠", color: "text-blue-400"   },
    { value: "hunt",  icon: <MapIcon className="w-4 h-4" />,     label: "Treasure",   emoji: "🗺️", color: "text-green-400"  },
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Hero */}
      <PageHero
        gradientFrom="rgba(124,58,237,0.18)"
        gradientTo="rgba(234,179,8,0.08)"
        icon={
          <div className="p-3 rounded-2xl bg-violet-500/15 border border-violet-500/20 shadow-lg shadow-violet-500/10">
            <Sparkles className="h-8 w-8 text-violet-400" />
          </div>
        }
        title={
          <span>
            Mini-<GradientText from="from-violet-400" to="to-yellow-400">Games</GradientText>
          </span>
        }
        subtitle="Interactive games that keep your viewers hooked — spin wheels, battles, quizzes and more."
      />

      <Tabs defaultValue="spin">
        <TabsList className="bg-white/[0.03] border border-white/[0.08] p-1 h-auto gap-1 w-full grid grid-cols-5">
          {GAMES.map((g) => (
            <TabsTrigger
              key={g.value}
              value={g.value}
              className="flex flex-col items-center gap-1 py-2.5 data-[state=active]:bg-white/[0.08] data-[state=active]:text-white rounded-lg"
            >
              <span className="text-lg">{g.emoji}</span>
              <span className="text-[10px] font-semibold hidden sm:block">{g.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Spin Wheel */}
        <TabsContent value="spin" className="mt-5">
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-b from-violet-500/[0.06] to-transparent overflow-hidden">
            <div className="px-6 py-5 border-b border-violet-500/15">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-violet-400" />
                Spin the Wheel
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">Spin to win XP and coin prizes — announced live to your stream.</p>
            </div>
            <div className="p-6 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">

              {/* Wheel */}
              <div className="shrink-0">
                <SpinWheelSvg spinning={spinning} winner={spinResult?.prize} />
              </div>

              {/* Controls */}
              <div className="flex flex-col items-center gap-5 flex-1 w-full max-w-sm">
                <AnimatePresence mode="wait">
                  {spinResult && !spinning ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="w-full p-5 rounded-2xl bg-violet-500/10 border border-violet-500/25 text-center shadow-lg shadow-violet-500/10"
                    >
                      <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-1">You won!</p>
                      <p className="text-3xl font-black text-white mb-2">{spinResult.prize}</p>
                      <div className="flex justify-center gap-3">
                        {spinResult.xp > 0 && (
                          <div className="bg-violet-500/15 rounded-xl px-4 py-2">
                            <p className="text-xl font-black text-violet-400">+{spinResult.xp}</p>
                            <p className="text-xs text-muted-foreground">XP</p>
                          </div>
                        )}
                        {spinResult.coins > 0 && (
                          <div className="bg-yellow-500/15 rounded-xl px-4 py-2">
                            <p className="text-xl font-black text-yellow-400">+{spinResult.coins}</p>
                            <p className="text-xs text-muted-foreground">Coins</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="prompt"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-full p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center"
                    >
                      <p className="text-4xl mb-2">🎰</p>
                      <p className="text-sm text-muted-foreground">Spin to win XP, coins, or the jackpot!</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  size="lg"
                  className="w-full h-14 text-base font-black bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 shadow-xl shadow-violet-500/30 transition-all hover:scale-[1.02]"
                  onClick={handleSpin}
                  disabled={spinning}
                >
                  {spinning ? (
                    <span className="flex items-center gap-2">
                      <RotateCcw className="w-5 h-5 animate-spin" />
                      Spinning…
                    </span>
                  ) : "🎰 Spin the Wheel!"}
                </Button>

                <div className="w-full grid grid-cols-4 gap-2">
                  {WHEEL_PRIZES.map((p) => (
                    <div key={p.label} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                      <span className="text-[9px] text-muted-foreground truncate">{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Lucky Draw */}
        <TabsContent value="draw" className="mt-5">
          <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-b from-yellow-500/[0.05] to-transparent overflow-hidden">
            <div className="px-6 py-5 border-b border-yellow-500/15">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-400" />
                Lucky Draw
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">Pick a random winner from all active viewers in your stream.</p>
            </div>
            <div className="p-8 flex flex-col items-center gap-6 max-w-sm mx-auto">
              <AnimatePresence mode="wait">
                {drawResult ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full p-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/25 text-center shadow-lg shadow-yellow-500/10"
                  >
                    <p className="text-xs font-semibold text-yellow-400 uppercase tracking-widest mb-1">🎉 Winner!</p>
                    <p className="text-4xl font-black text-white mt-2">{drawResult}</p>
                    <p className="text-xs text-muted-foreground mt-3">Announced live to your stream</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    className="w-full p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center"
                  >
                    <p className="text-5xl mb-3">🎁</p>
                    <p className="text-sm text-muted-foreground">Draw a random winner from your viewers</p>
                  </motion.div>
                )}
              </AnimatePresence>
              <Button
                size="lg"
                className="w-full h-14 text-base font-black bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black shadow-xl shadow-yellow-500/25 transition-all hover:scale-[1.02]"
                onClick={handleLuckyDraw}
                disabled={drawMutation.isPending || !streamerId}
              >
                {drawMutation.isPending ? "Picking winner…" : "🎁 Draw a Winner!"}
              </Button>
              {!streamerId && <p className="text-xs text-muted-foreground">Set up your streamer profile first.</p>}
              <p className="text-xs text-muted-foreground text-center">Winners are picked from viewers who interacted during this session.</p>
            </div>
          </div>
        </TabsContent>

        {/* PvP Battle */}
        <TabsContent value="pvp" className="mt-5">
          <div className="rounded-2xl border border-red-500/20 bg-gradient-to-b from-red-500/[0.05] to-transparent overflow-hidden">
            <div className="px-6 py-5 border-b border-red-500/15">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Swords className="w-5 h-5 text-red-400" />
                PvP Battle
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">Make two viewers compete in a stat-based duel.</p>
            </div>
            <div className="p-8 max-w-lg mx-auto space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Player 1</Label>
                  <Input value={pvpPlayer1} onChange={e => setPvpPlayer1(e.target.value)} placeholder="@username" className="bg-white/[0.04] border-white/10 focus:border-red-500/40 h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Player 2</Label>
                  <Input value={pvpPlayer2} onChange={e => setPvpPlayer2(e.target.value)} placeholder="@username" className="bg-white/[0.04] border-white/10 focus:border-red-500/40 h-11" />
                </div>
              </div>

              <AnimatePresence>
                {pvpResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
                  >
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center mb-3">Battle Result</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: pvpPlayer1 || "Player 1", score: pvpResult.player1Score, isWinner: pvpResult.winner === pvpPlayer1 },
                        { name: pvpPlayer2 || "Player 2", score: pvpResult.player2Score, isWinner: pvpResult.winner === pvpPlayer2 },
                      ].map((p) => (
                        <div
                          key={p.name}
                          className={cn(
                            "p-4 rounded-xl border text-center transition-all",
                            p.isWinner
                              ? "border-green-500/30 bg-green-500/10 shadow-lg shadow-green-500/10"
                              : "border-red-500/20 bg-red-500/5 opacity-60",
                          )}
                        >
                          <p className="text-sm font-bold text-white truncate">{p.name}</p>
                          <p className="text-4xl font-black text-white mt-1">{p.score}</p>
                          {p.isWinner && (
                            <div className="flex items-center justify-center gap-1 mt-2">
                              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                              <span className="text-xs font-bold text-yellow-400">WINNER</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                size="lg"
                className="w-full h-12 font-black bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.01]"
                onClick={handlePvp}
                disabled={pvpMutation.isPending}
              >
                {pvpMutation.isPending ? "Fighting…" : "⚔️ Start PvP Battle!"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">Scores based on XP earned in your stream, plus a luck factor.</p>
            </div>
          </div>
        </TabsContent>

        {/* Quiz Mode */}
        <TabsContent value="quiz" className="mt-5">
          <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-b from-blue-500/[0.05] to-transparent overflow-hidden">
            <div className="px-6 py-5 border-b border-blue-500/15">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-400" />
                Quiz Mode
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">Post a question — first viewer to type the correct answer wins!</p>
            </div>
            <div className="p-8 max-w-lg mx-auto space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Question</Label>
                <Input
                  value={quizQuestion}
                  onChange={e => setQuizQuestion(e.target.value)}
                  placeholder="What is the capital of France?"
                  className="bg-white/[0.04] border-white/10 focus:border-blue-500/40 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Correct Answer</Label>
                <Input
                  value={quizAnswer}
                  onChange={e => setQuizAnswer(e.target.value)}
                  placeholder="Paris"
                  className="bg-white/[0.04] border-white/10 focus:border-blue-500/40 h-11"
                />
              </div>
              <Button
                size="lg"
                className="w-full h-12 font-black bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01]"
                onClick={handleQuizStart}
                disabled={quizMutation.isPending}
              >
                {quizMutation.isPending ? "Starting…" : "🧠 Post Quiz Question!"}
              </Button>
              <div className="p-4 rounded-xl bg-blue-500/[0.07] border border-blue-500/15">
                <p className="text-xs text-blue-300 font-semibold mb-1">How it works</p>
                <p className="text-xs text-muted-foreground">The question is broadcast to your stream. The automation engine detects the first correct comment and announces the winner.</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Treasure Hunt */}
        <TabsContent value="hunt" className="mt-5">
          <div className="rounded-2xl border border-green-500/20 bg-gradient-to-b from-green-500/[0.05] to-transparent overflow-hidden">
            <div className="px-6 py-5 border-b border-green-500/15">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-green-400" />
                Treasure Hunt
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">Hide a keyword — first viewer to type it in chat wins the prize!</p>
            </div>
            <div className="p-8 max-w-lg mx-auto space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Secret Keyword</Label>
                <Input
                  value={huntKeyword}
                  onChange={e => setHuntKeyword(e.target.value)}
                  placeholder="e.g. DRAGON123"
                  className="bg-white/[0.04] border-white/10 focus:border-green-500/40 h-11"
                />
                <p className="text-xs text-muted-foreground">Only you can see this — give hints during your stream!</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Prize (optional)</Label>
                <Input
                  value={huntPrize}
                  onChange={e => setHuntPrize(e.target.value)}
                  placeholder="e.g. 1000 coins, shoutout…"
                  className="bg-white/[0.04] border-white/10 focus:border-green-500/40 h-11"
                />
              </div>
              <Button
                size="lg"
                className="w-full h-12 font-black bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/20 transition-all hover:scale-[1.01]"
                onClick={handleHuntStart}
                disabled={huntMutation.isPending}
              >
                {huntMutation.isPending ? "Starting…" : "🗺️ Start Treasure Hunt!"}
              </Button>
              <div className="p-4 rounded-xl bg-green-500/[0.07] border border-green-500/15">
                <p className="text-xs text-green-300 font-semibold mb-1">How it works</p>
                <p className="text-xs text-muted-foreground">A hint message is sent to your stream. First viewer to type the exact keyword in chat wins. Use automations to auto-respond to the winner!</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
