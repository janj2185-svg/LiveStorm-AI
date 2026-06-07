import { useState, useRef } from "react";
import {
  useSpinWheel,
  useRunLuckyDraw,
  useRunPvpBattle,
  useStartQuiz,
  useStartTreasureHunt,
  useGetMyStreamer,
  useGetActiveSession,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Gift, Users, Swords, Brain, Map as MapIcon, RotateCcw } from "lucide-react";

const WHEEL_PRIZES = [
  { label: "50 XP", color: "#7c3aed" },
  { label: "10 Coins", color: "#0ea5e9" },
  { label: "100 XP", color: "#16a34a" },
  { label: "Try Again", color: "#475569" },
  { label: "50 Coins", color: "#d97706" },
  { label: "200 XP", color: "#db2777" },
  { label: "100 Coins", color: "#dc2626" },
  { label: "500 XP+50C", color: "#f59e0b" },
];

function SpinWheelSvg({ spinning, winner }: { spinning: boolean; winner?: string }) {
  const segments = WHEEL_PRIZES.length;
  const angleStep = 360 / segments;
  const radius = 110;
  const cx = 130;
  const cy = 130;

  const paths = WHEEL_PRIZES.map((prize, i) => {
    const startAngle = (i * angleStep - 90) * (Math.PI / 180);
    const endAngle = ((i + 1) * angleStep - 90) * (Math.PI / 180);
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const midAngle = ((i + 0.5) * angleStep - 90) * (Math.PI / 180);
    const tx = cx + (radius * 0.65) * Math.cos(midAngle);
    const ty = cy + (radius * 0.65) * Math.sin(midAngle);
    return { path: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`, tx, ty, prize };
  });

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width="260"
        height="260"
        className={spinning ? "animate-spin duration-[2000ms]" : ""}
        style={{ transition: spinning ? "none" : "transform 0.5s ease-out" }}
      >
        {paths.map(({ path, tx, ty, prize }, i) => (
          <g key={i}>
            <path d={path} fill={prize.color} stroke="#1e293b" strokeWidth="2" />
            <text
              x={tx}
              y={ty}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="9"
              fontWeight="bold"
            >
              {prize.label}
            </text>
          </g>
        ))}
        <circle cx={cx} cy={cy} r="16" fill="#1e293b" stroke="#7c3aed" strokeWidth="3" />
      </svg>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[16px] border-l-transparent border-r-transparent border-t-primary z-10" />
    </div>
  );
}

export function MiniGames() {
  const { toast } = useToast();
  const { data: streamer } = useGetMyStreamer();
  const { data: activeSessionData } = useGetActiveSession();
  const sessionId = activeSessionData?.session?.id;
  const streamerId = streamer?.id;

  const spinMutation = useSpinWheel();
  const drawMutation = useRunLuckyDraw();
  const pvpMutation = useRunPvpBattle();
  const quizMutation = useStartQuiz();
  const huntMutation = useStartTreasureHunt();

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
        toast({
          title: `🎰 You won: ${result.prize}!`,
          description: result.xp > 0 ? `+${result.xp} XP awarded` : result.coins > 0 ? `+${result.coins} coins awarded` : "Better luck next time!",
        });
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Mini-Games</h2>
        <p className="text-muted-foreground">Interactive games to engage your viewers during live streams.</p>
      </div>

      <Tabs defaultValue="spin">
        <TabsList className="grid w-full grid-cols-5 bg-card border border-border">
          <TabsTrigger value="spin" className="text-xs sm:text-sm"><RotateCcw className="w-3 h-3 mr-1" />Spin</TabsTrigger>
          <TabsTrigger value="draw" className="text-xs sm:text-sm"><Gift className="w-3 h-3 mr-1" />Draw</TabsTrigger>
          <TabsTrigger value="pvp" className="text-xs sm:text-sm"><Swords className="w-3 h-3 mr-1" />PvP</TabsTrigger>
          <TabsTrigger value="quiz" className="text-xs sm:text-sm"><Brain className="w-3 h-3 mr-1" />Quiz</TabsTrigger>
          <TabsTrigger value="hunt" className="text-xs sm:text-sm"><MapIcon className="w-3 h-3 mr-1" />Hunt</TabsTrigger>
        </TabsList>

        {/* Spin Wheel */}
        <TabsContent value="spin">
          <Card className="bg-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-primary" />
                Spin Wheel
              </CardTitle>
              <CardDescription>Spin to win XP and coins prizes.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-center gap-8">
              <SpinWheelSvg spinning={spinning} winner={spinResult?.prize} />
              <div className="flex flex-col items-center gap-4 flex-1">
                {spinResult && !spinning && (
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 text-center w-full">
                    <p className="text-2xl font-black text-white">{spinResult.prize}!</p>
                    {spinResult.xp > 0 && <p className="text-primary text-sm">+{spinResult.xp} XP</p>}
                    {spinResult.coins > 0 && <p className="text-yellow-400 text-sm">+{spinResult.coins} Coins</p>}
                  </div>
                )}
                <Button
                  size="lg"
                  className="w-full max-w-xs bg-primary hover:bg-primary/90"
                  onClick={handleSpin}
                  disabled={spinning}
                >
                  {spinning ? "Spinning..." : "🎰 Spin the Wheel!"}
                </Button>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Win XP, coins, or the jackpot! Results are announced to the stream in real time.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lucky Draw */}
        <TabsContent value="draw">
          <Card className="bg-card border-yellow-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-400" />
                Lucky Draw
              </CardTitle>
              <CardDescription>Pick a random winner from all active viewers in your stream.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-md mx-auto">
              {drawResult && (
                <div className="p-6 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center">
                  <p className="text-muted-foreground text-sm">🎉 Winner!</p>
                  <p className="text-3xl font-black text-white mt-1">{drawResult}</p>
                </div>
              )}
              <Button
                size="lg"
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
                onClick={handleLuckyDraw}
                disabled={drawMutation.isPending || !streamerId}
              >
                {drawMutation.isPending ? "Picking winner..." : "🎁 Draw a Winner!"}
              </Button>
              {!streamerId && (
                <p className="text-xs text-muted-foreground text-center">Set up your streamer profile first.</p>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Winners are picked randomly from viewers who interacted during the current session.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PvP Battle */}
        <TabsContent value="pvp">
          <Card className="bg-card border-red-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-red-400" />
                PvP Battle
              </CardTitle>
              <CardDescription>Make two viewers compete in a stat-based duel.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md mx-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Player 1</Label>
                  <Input value={pvpPlayer1} onChange={e => setPvpPlayer1(e.target.value)} placeholder="@username" className="bg-background" />
                </div>
                <div className="space-y-1">
                  <Label>Player 2</Label>
                  <Input value={pvpPlayer2} onChange={e => setPvpPlayer2(e.target.value)} placeholder="@username" className="bg-background" />
                </div>
              </div>

              {pvpResult && (
                <div className="p-4 rounded-xl bg-background border border-border space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className={`p-3 rounded-lg border ${pvpResult.winner === pvpPlayer1 ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30 opacity-60"}`}>
                      <p className="text-sm font-bold text-white">{pvpPlayer1 || "Player 1"}</p>
                      <p className="text-2xl font-black text-white">{pvpResult.player1Score}</p>
                      {pvpResult.winner === pvpPlayer1 && <Badge className="bg-green-500 text-xs mt-1">WINNER</Badge>}
                    </div>
                    <div className={`p-3 rounded-lg border ${pvpResult.winner === pvpPlayer2 ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30 opacity-60"}`}>
                      <p className="text-sm font-bold text-white">{pvpPlayer2 || "Player 2"}</p>
                      <p className="text-2xl font-black text-white">{pvpResult.player2Score}</p>
                      {pvpResult.winner === pvpPlayer2 && <Badge className="bg-green-500 text-xs mt-1">WINNER</Badge>}
                    </div>
                  </div>
                </div>
              )}

              <Button
                size="lg"
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={handlePvp}
                disabled={pvpMutation.isPending}
              >
                {pvpMutation.isPending ? "Fighting..." : "⚔️ Start PvP Battle!"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Scores are based on XP earned in your stream, plus a luck factor.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quiz Mode */}
        <TabsContent value="quiz">
          <Card className="bg-card border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-400" />
                Quiz Mode
              </CardTitle>
              <CardDescription>Post a question — first viewer to type the correct answer wins!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md mx-auto">
              <div className="space-y-1">
                <Label>Question</Label>
                <Input value={quizQuestion} onChange={e => setQuizQuestion(e.target.value)} placeholder="What is the capital of France?" className="bg-background" />
              </div>
              <div className="space-y-1">
                <Label>Correct Answer</Label>
                <Input value={quizAnswer} onChange={e => setQuizAnswer(e.target.value)} placeholder="Paris" className="bg-background" />
              </div>
              <Button
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleQuizStart}
                disabled={quizMutation.isPending}
              >
                {quizMutation.isPending ? "Starting..." : "🧠 Post Quiz Question!"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                The question is broadcast to your stream. The automation engine will detect the first correct comment.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Treasure Hunt */}
        <TabsContent value="hunt">
          <Card className="bg-card border-emerald-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-emerald-400" />
                Treasure Hunt
              </CardTitle>
              <CardDescription>Hide a keyword — first viewer to type it in chat wins the prize!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md mx-auto">
              <div className="space-y-1">
                <Label>Secret Keyword</Label>
                <Input value={huntKeyword} onChange={e => setHuntKeyword(e.target.value)} placeholder="e.g. DRAGON123" className="bg-background" />
                <p className="text-xs text-muted-foreground">Only you can see this — give hints to your viewers!</p>
              </div>
              <div className="space-y-1">
                <Label>Prize (optional)</Label>
                <Input value={huntPrize} onChange={e => setHuntPrize(e.target.value)} placeholder="e.g. 1000 coins, shoutout..." className="bg-background" />
              </div>
              <Button
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={handleHuntStart}
                disabled={huntMutation.isPending}
              >
                {huntMutation.isPending ? "Starting..." : "🗺️ Start Treasure Hunt!"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                A hint message is sent to your stream. First to type the keyword in chat wins. Use automations to auto-respond!
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
