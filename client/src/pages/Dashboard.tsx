import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { DailyPrompt } from "@/components/DailyPrompt";
import { WellbeingScale } from "@/components/WellbeingScale";
import { DreamJournal, isDreamDay } from "@/components/DreamJournal";
import { CreativeExpression, isCreativeExpressionDay } from "@/components/CreativeExpression";
import { PracticeCard } from "@/components/PracticeCard";
import { StreakTracker } from "@/components/StreakTracker";
import { ProgressChart } from "@/components/ProgressChart";
import { CommunityPost } from "@/components/CommunityPost";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Filter, Compass } from "lucide-react";
import logoImage from "@assets/ChatGPT Image Nov 10, 2025, 05_44_07 PM_1762767858454.png";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedMetric, setSelectedMetric] = useState<'mood' | 'sleep' | 'grounding'>('mood');
  const [activeFilter, setActiveFilter] = useState('all');
  const { user } = useAuth();

  // Fetch real progress data
  const { data: progressData = [], isLoading: progressLoading } = useQuery({
    queryKey: ['/api/progress/aggregated', { days: 7 }],
    queryFn: async () => {
      const response = await fetch('/api/progress/aggregated?days=7');
      if (!response.ok) throw new Error('Failed to fetch progress data');
      return response.json();
    }
  });

  // Fetch real practices from admin
  const { data: practices = [], isLoading: practicesLoading } = useQuery<any[]>({
    queryKey: ['/api/practices'],
  });

  // Fetch real community posts
  const { data: posts = [], isLoading: postsLoading } = useQuery<any[]>({
    queryKey: ['/api/posts'],
  });

  // Check if user just started journey
  const { data: promptData } = useQuery({
    queryKey: ['/api/integration-prompts/today'],
  });

  // Fetch real streak data
  const { data: streakData } = useQuery<{ journalStreak: number; practiceStreak: number; totalDays: number }>({
    queryKey: ['/api/streaks'],
  });

  const isJourneyStart = !user?.journeyStartDate;

  const practiceFilters = ['all', 'Calming', 'Energizing', 'Grounding', 'Dreamwork'];

  const filteredPractices = activeFilter === 'all' 
    ? practices.slice(0, 3)
    : practices.filter((practice: any) => practice.category === activeFilter).slice(0, 3);

  return (
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
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-words">
            Welcome back, {(user as any)?.firstName || (user as any)?.username || (user as any)?.email?.split('@')[0] || 'there'}
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
            Continue your integration journey with today's practice and reflection.
          </p>
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
          <Button variant="outline" size="lg" className="w-full" data-testid="button-practice-now" onClick={() => setLocation('/practices')}>
            <span className="truncate">Start Practice</span>
          </Button>
        </Card>
      </div>

      {/* Dream Journal - Tue/Thu/Sun */}
      {isDreamDay() && (
        <div className="space-y-3 sm:space-y-4 w-full min-w-0">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold">Dream Journal</h2>
          <DreamJournal />
        </div>
      )}

      {/* Creative Expression - 1st & 15th of each month */}
      {isCreativeExpressionDay() && (
        <div className="space-y-3 sm:space-y-4 w-full min-w-0">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold">Creative Expression</h2>
          <CreativeExpression />
        </div>
      )}

      {/* Wellbeing Check-in - afternoon/evening only (12pm+) */}
      {new Date().getHours() >= 12 && (
        <div className="space-y-3 sm:space-y-4 w-full min-w-0">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold">Wellbeing Check-In</h2>
          <WellbeingScale />
        </div>
      )}

      {/* Daily Prompt Section */}
      <div className="space-y-3 sm:space-y-4 w-full min-w-0">
        <h2 className="text-base sm:text-lg md:text-xl font-semibold">Today's Reflection</h2>
        <DailyPrompt />
      </div>

      {/* Practices Section */}
      <div className="space-y-3 sm:space-y-4 w-full min-w-0">
        <div className="space-y-2 sm:space-y-3">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold">Recommended Practices</h2>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex gap-2 flex-nowrap">
              {practiceFilters.map((filter) => (
                <Button
                  key={filter}
                  variant={activeFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(filter)}
                  data-testid={`filter-${filter}`}
                  className="whitespace-nowrap flex-shrink-0"
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        {practicesLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading practices...</div>
        ) : filteredPractices.length === 0 ? (
          <Card className="p-6 sm:p-8 text-center">
            <p className="text-muted-foreground text-sm sm:text-base">No practices available yet.</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">Check back soon for new content from your administrator.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredPractices.map((practice: any) => (
              <PracticeCard
                key={practice.id}
                practice={practice}
                onPlay={(id) => setLocation(`/practices?play=${id}`)}
                onComplete={(id) => setLocation(`/practices?play=${id}`)}
              />
            ))}
          </div>
        )}
      </div>

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
          <Button variant="outline" size="sm" data-testid="button-view-all-posts" className="w-full sm:w-auto">
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
                onLike={(id) => console.log('Liked post:', id)}
                onComment={(id, comment) => console.log('Comment on', id, ':', comment)}
                onShare={(id) => console.log('Shared post:', id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
