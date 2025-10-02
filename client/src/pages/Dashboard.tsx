import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { JournalEntry } from "@/components/JournalEntry";
import { DailyPrompt } from "@/components/DailyPrompt";
import { PracticeCard } from "@/components/PracticeCard";
import { StreakTracker } from "@/components/StreakTracker";
import { ProgressChart } from "@/components/ProgressChart";
import { CommunityPost } from "@/components/CommunityPost";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  const practiceFilters = ['all', 'Calming', 'Energizing', 'Grounding', 'Dreamwork'];

  const filteredPractices = activeFilter === 'all' 
    ? practices.slice(0, 3)
    : practices.filter((practice: any) => practice.category === activeFilter).slice(0, 3);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">
          Welcome back, {(user as any)?.firstName || (user as any)?.username || (user as any)?.email?.split('@')[0] || 'there'}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Continue your integration journey with today's practice and reflection.
        </p>
      </div>

      {/* Top Row - Streaks and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StreakTracker 
            journalStreak={12}
            practiceStreak={8}
            totalDays={45}
          />
        </div>
        <Card className="p-6 flex flex-col justify-center items-center space-y-3">
          <Button 
            size="lg" 
            className="w-full" 
            onClick={() => setLocation('/journal')}
            data-testid="button-quick-journal"
          >
            <Plus className="h-4 w-4 mr-2" />
            Quick Journal Entry
          </Button>
          <Button variant="outline" size="lg" className="w-full" data-testid="button-practice-now">
            Start Practice
          </Button>
        </Card>
      </div>

      {/* Daily Prompt Section */}
      <div className="space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold">Today's Reflection</h2>
        <DailyPrompt onRespond={(response) => console.log('Daily reflection:', response)} />
      </div>

      {/* Practices Section */}
      <div className="space-y-4">
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-semibold">Recommended Practices</h2>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
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
          <div className="text-center py-8 text-muted-foreground">Loading practices...</div>
        ) : filteredPractices.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No practices available yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Check back soon for new content from your administrator.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPractices.map((practice: any) => (
              <PracticeCard
                key={practice.id}
                practice={practice}
                onPlay={(id) => console.log('Playing practice:', id)}
                onComplete={(id) => console.log('Completed practice:', id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Progress Tracking */}
      <div className="space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold">Your Progress</h2>
        <ProgressChart
          data={progressData}
          selectedMetric={selectedMetric}
          onMetricSelect={setSelectedMetric}
          isLoading={progressLoading}
        />
      </div>

      {/* Community Highlights */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-semibold">Community Highlights</h2>
          <Button variant="outline" size="sm" data-testid="button-view-all-posts" className="w-full sm:w-auto">
            View All Posts
          </Button>
        </div>
        
        {postsLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading posts...</div>
        ) : posts.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No community posts yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Be the first to share your journey!</p>
            <Button 
              className="mt-4" 
              onClick={() => setLocation('/community')}
              data-testid="button-create-first-post"
            >
              Create First Post
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
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