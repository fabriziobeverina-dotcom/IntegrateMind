import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { DailyPrompt } from "@/components/DailyPrompt";
import { WellbeingScale } from "@/components/WellbeingScale";
import { DreamJournal } from "@/components/DreamJournal";
import { CreativeExpression, isCreativeExpressionDay } from "@/components/CreativeExpression";
import { StreakTracker } from "@/components/StreakTracker";
import { ProgressChart } from "@/components/ProgressChart";
import { CommunityPost } from "@/components/CommunityPost";
import { PulseCheckInterstitial } from "@/components/PulseCheckInterstitial";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Compass, MessageCircle, ExternalLink, Sunrise, Check } from "lucide-react";
import { PhaseIndicator } from "@/components/PhaseIndicator";
import KillTheShamanOverlay, { useKillTheShamanEgg } from "@/components/KillTheShamanEgg";
import logoImage from "@assets/pao_logo_1775666029285.jpg";
import evaImage from "@assets/eva_1778865447748.png";
import cateImage from "@assets/cate_1778865447755.png";
import tomiImage from "@assets/tomi_1778865447750.png";
import dominicImage from "@assets/dominic_1778865447755.png";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedMetric, setSelectedMetric] = useState<'mood' | 'sleep' | 'grounding'>('mood');
  const [pulseCheckDismissed, setPulseCheckDismissed] = useState(false);
  const [intentionInput, setIntentionInput] = useState('');
  const { user } = useAuth();
  const { open: eggOpen, close: closeEgg, eggTrigger } = useKillTheShamanEgg();

  // Morning intention
  const { data: intentionData } = useQuery<{ intention: string | null }>({
    queryKey: ['/api/wellbeing/morning-intention'],
  });
  const savedIntention = intentionData?.intention ?? null;

  const setIntentionMutation = useMutation({
    mutationFn: async (intention: string) => {
      const res = await apiRequest('POST', '/api/wellbeing/morning-intention', { intention });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wellbeing/morning-intention'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wellbeing/today'] });
      setIntentionInput('');
    },
  });

  // Pulse check and stabilization status
  const { data: pulseStatus } = useQuery<{
    pulseCheckDue: boolean;
    stabilizationActive: boolean;
    stabilizationPrompt: string | null;
    alertStatus: string;
  }>({
    queryKey: ['/api/wellbeing/pulse-status'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const showPulseCheck = !pulseCheckDismissed && pulseStatus?.pulseCheckDue === true;

  // Fetch real progress data
  const { data: progressData = [], isLoading: progressLoading } = useQuery({
    queryKey: ['/api/progress/aggregated', { days: 7 }],
    queryFn: async () => {
      const response = await fetch('/api/progress/aggregated?days=7');
      if (!response.ok) throw new Error('Failed to fetch progress data');
      return response.json();
    }
  });

  // Fetch real community posts
  const { data: posts = [], isLoading: postsLoading } = useQuery<any[]>({
    queryKey: ['/api/community/posts'],
  });

  // Check if user just started journey
  const { data: promptData } = useQuery({
    queryKey: ['/api/integration-prompts/today'],
  });

  // Fetch real streak data
  const { data: streakData } = useQuery<{ journalStreak: number; practiceStreak: number; totalDays: number }>({
    queryKey: ['/api/streaks'],
  });

  // Fetch site settings for expert button
  const { data: siteSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ['/api/site-settings'],
  });

  function waUrl(num: string, text: string) {
    const n = num.replace(/[^0-9]/g, '');
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
  }
  const evaUrl    = waUrl(siteSettings['whatsapp_number'] ?? '',        "I'm interested in psychological integration support");
  const cateUrl   = waUrl(siteSettings['cate_whatsapp_number'] ?? '',   "I'm interested in breathwork integration with Cate");
  const tomiUrl   = waUrl(siteSettings['tomi_whatsapp_number'] ?? '',   "I'm interested in breathwork integration with Tomi");
  const dominicUrl = waUrl(siteSettings['tarot_whatsapp_number'] ?? '', "I'm interested in tarot & spiritual integration");

  const isJourneyStart = !user?.journeyStartDate;

  return (
    <>
    {/* Weekly pulse check interstitial — shown once per week, dismissible */}
    {showPulseCheck && (
      <PulseCheckInterstitial onComplete={() => setPulseCheckDismissed(true)} />
    )}
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Welcome Section with Logo for Journey Start */}
      {isJourneyStart ? (
        <Card className="p-6 sm:p-8 md:p-12 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border-primary/20">
          <div className="text-center space-y-4 sm:space-y-6">
            <div className="flex justify-center">
              <img 
                src={logoImage} 
                alt="Integration Compass" 
                className="h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 rounded-2xl shadow-xl"
                data-testid="img-journey-logo"
              />
            </div>
            <div className="space-y-2 sm:space-y-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Welcome to Your Journey
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
                Begin your 77-day integration journey with daily prompts, practices, and community support.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <Compass className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Your compass for integration and healing</span>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Paojilhuasca" className="h-9 w-9 object-contain shrink-0 cursor-pointer" {...eggTrigger} />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-words">
              Welcome back, {(user as any)?.firstName || (user as any)?.username || (user as any)?.email?.split('@')[0] || 'there'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
            Continue your integration journey with today's practice and reflection.
          </p>
          <PhaseIndicator />
        </div>
      )}

      {/* Top Row - Streaks and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 w-full min-w-0">
          <StreakTracker 
            journalStreak={streakData?.journalStreak ?? 0}
            practiceStreak={streakData?.practiceStreak ?? 0}
            totalDays={streakData?.totalDays ?? 0}
          />
        </div>
        <Card className="p-4 sm:p-6 flex flex-col justify-center items-center space-y-2 sm:space-y-3 w-full min-w-0">
          <Button 
            size="lg" 
            className="w-full" 
            onClick={() => setLocation('/journal')}
            data-testid="button-quick-journal"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="truncate">Quick Journal Entry</span>
          </Button>
          <Link href="/practices" className="w-full">
            <Button variant="outline" size="lg" className="w-full" data-testid="button-practice-now">
              <span className="truncate">Start Practice</span>
            </Button>
          </Link>
        </Card>
      </div>

      {/* Morning Intention Card */}
      <Card className="p-4 sm:p-5 w-full min-w-0">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-amber-500/10 flex-shrink-0">
            <Sunrise className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base" data-testid="text-morning-intention-title">
              Morning Intention
            </h3>
            {savedIntention ? (
              <div className="mt-2 space-y-2">
                <div className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm italic text-foreground" data-testid="text-saved-intention">
                    "{savedIntention}"
                  </p>
                </div>
                <button
                  className="text-[10px] sm:text-xs text-muted-foreground underline underline-offset-2"
                  onClick={() => setIntentionInput(savedIntention)}
                  data-testid="button-edit-intention"
                >
                  Edit intention
                </button>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                What do you want to focus on today?
              </p>
            )}
          </div>
        </div>

        {(!savedIntention || intentionInput) && (
          <div className="mt-3 space-y-2">
            <Textarea
              placeholder="e.g. Stay present, be kind to myself, finish one creative thing…"
              value={intentionInput}
              onChange={(e) => setIntentionInput(e.target.value)}
              rows={2}
              className="resize-none text-xs sm:text-sm"
              data-testid="input-morning-intention"
            />
            <Button
              size="sm"
              disabled={!intentionInput.trim() || setIntentionMutation.isPending}
              onClick={() => setIntentionMutation.mutate(intentionInput.trim())}
              data-testid="button-save-intention"
            >
              {setIntentionMutation.isPending ? "Saving…" : savedIntention ? "Update intention" : "Set intention"}
            </Button>
          </div>
        )}
      </Card>

      {/* Daily Prompt Section */}
      <div className="space-y-3 sm:space-y-4 w-full min-w-0">
        <h2 className="text-base sm:text-lg md:text-xl font-semibold">Today's Reflection</h2>
        <DailyPrompt stabilizationPrompt={pulseStatus?.stabilizationPrompt ?? null} />

        {/* Stabilization support card — shown for 3 days after alert trigger, no clinical language */}
        {pulseStatus?.stabilizationActive && (
          <div className="rounded-lg p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
            <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed italic">
              "Integration isn't always linear. Some periods are heavier than others — that's not failure, that's the process. If this week has felt harder than you can hold alone, reaching out is a sign of wisdom."
            </p>
            <a
              href="https://wa.me/51916499055"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-amber-800 dark:text-amber-300 underline underline-offset-2"
              data-testid="link-stabilization-connect"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Connect with Paojilhuasca
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>

      {/* Creative Expression - 1st & 15th of each month */}
      {isCreativeExpressionDay() && (
        <div className="space-y-3 sm:space-y-4 w-full min-w-0">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold">Creative Expression</h2>
          <CreativeExpression />
        </div>
      )}

      {/* Dream Journal */}
      <div className="space-y-3 sm:space-y-4 w-full min-w-0">
        <h2 className="text-base sm:text-lg md:text-xl font-semibold">Dream Journal</h2>
        <DreamJournal />
      </div>

      {/* Wellbeing Check-in - afternoon/evening only (12pm+) */}
      {new Date().getHours() >= 12 && (
        <div className="space-y-3 sm:space-y-4 w-full min-w-0">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold">Wellbeing Check-In</h2>
          <WellbeingScale />
        </div>
      )}

      {/* Progress Tracking */}
      <div className="space-y-3 sm:space-y-4 w-full min-w-0">
        <h2 className="text-base sm:text-lg md:text-xl font-semibold">Your Progress</h2>
        <ProgressChart
          data={progressData}
          selectedMetric={selectedMetric}
          onMetricSelect={setSelectedMetric}
          isLoading={progressLoading}
        />
      </div>

      {/* Community Highlights */}
      <div className="space-y-3 sm:space-y-4 w-full min-w-0 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold">Community Highlights</h2>
          <Button variant="outline" size="sm" data-testid="button-view-all-posts" className="w-full sm:w-auto" onClick={() => setLocation('/community')}>
            View All Posts
          </Button>
        </div>
        
        {postsLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading posts...</div>
        ) : posts.length === 0 ? (
          <Card className="p-6 sm:p-8 text-center">
            <p className="text-muted-foreground text-sm sm:text-base">No community posts yet.</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">Be the first to share your journey!</p>
            <Button 
              className="mt-4" 
              onClick={() => setLocation('/community')}
              data-testid="button-create-first-post"
            >
              Create First Post
            </Button>
          </Card>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {posts.slice(0, 2).map((post: any) => (
              <CommunityPost
                key={post.id}
                post={post}
              />
            ))}
          </div>
        )}
      </div>

      {/* One-on-One Services */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">One-on-One Services</h2>
          <p className="text-sm text-muted-foreground mt-1">Personal guidance from our team of specialists</p>
        </div>

        {/* Psychological Integration — Eva */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Psychological Integration</p>
          <Card className="overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-0">
              <div className="flex-shrink-0 flex items-center justify-center p-6 sm:p-8 sm:pr-0">
                <img
                  src={evaImage}
                  alt="Eva"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover"
                  data-testid="img-practitioner-eva"
                />
              </div>
              <div className="flex-1 p-6 flex flex-col justify-center gap-3">
                <h3 className="text-base font-semibold">Eva</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Italian psychologist and counselor with over twenty years in transformational processes, relational support, and personal development. Her work bridges psychology, mindfulness, experiential learning, and psychedelic integration.
                </p>
                {evaUrl && (
                  <div>
                    <a href={evaUrl} target="_blank" rel="noopener noreferrer" data-testid="button-whatsapp-eva">
                      <Button className="gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Connect on WhatsApp
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Breathwork Integration — Cate & Tomi */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Breathwork Integration</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="overflow-hidden">
              <div className="flex flex-col items-center text-center p-6 gap-4">
                <img
                  src={cateImage}
                  alt="Caterina"
                  className="w-24 h-24 rounded-full object-cover"
                  data-testid="img-practitioner-cate"
                />
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">Caterina</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    A compassionate medical doctor integrating emergency medicine with holistic healing approaches. Certified breathwork mentor, Caterina combines Western clinical knowledge with Amazonian traditions, yoga, meditation, and conscious breathing practices to create safe spaces for deep transformation.
                  </p>
                </div>
                {cateUrl && (
                  <a href={cateUrl} target="_blank" rel="noopener noreferrer" data-testid="button-whatsapp-cate">
                    <Button className="gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Connect on WhatsApp
                    </Button>
                  </a>
                )}
              </div>
            </Card>
            <Card className="overflow-hidden">
              <div className="flex flex-col items-center text-center p-6 gap-4">
                <img
                  src={tomiImage}
                  alt="Tomi"
                  className="w-24 h-24 rounded-full object-cover"
                  data-testid="img-practitioner-tomi"
                />
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">Tomi</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    A systems-based breathwork educator focused on optimizing human physiology through functional breathing, CO₂ adaptation training, and somatic regulation. His approach blends modern breathing science with experiential methods for performance and wellbeing.
                  </p>
                </div>
                {tomiUrl && (
                  <a href={tomiUrl} target="_blank" rel="noopener noreferrer" data-testid="button-whatsapp-tomi">
                    <Button className="gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Connect on WhatsApp
                    </Button>
                  </a>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Tarot & Spiritual Integration — Dominic */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tarot & Spiritual Integration</p>
          <Card className="overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-0">
              <div className="flex-shrink-0 flex items-center justify-center p-6 sm:p-8 sm:pr-0">
                <img
                  src={dominicImage}
                  alt="Dominic"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover"
                  data-testid="img-practitioner-dominic"
                />
              </div>
              <div className="flex-1 p-6 flex flex-col justify-center gap-3">
                <h3 className="text-base font-semibold">Dominic</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  An intuitive guide working with tarot, yoga, and spiritual practices to support emotional release and inner clarity. His approach is centered on compassion, presence, and helping individuals reconnect with their own inner healing intelligence.
                </p>
                {dominicUrl && (
                  <div>
                    <a href={dominicUrl} target="_blank" rel="noopener noreferrer" data-testid="button-whatsapp-dominic">
                      <Button className="gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Connect on WhatsApp
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
    <KillTheShamanOverlay open={eggOpen} close={closeEgg} />
    </>
  );
}
