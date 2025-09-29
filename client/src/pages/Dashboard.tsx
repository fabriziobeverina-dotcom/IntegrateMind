import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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

  // Fetch real progress data
  const { data: progressData = [], isLoading: progressLoading } = useQuery({
    queryKey: ['/api/progress/aggregated', { days: 7 }],
    queryFn: async () => {
      const response = await fetch('/api/progress/aggregated?days=7');
      if (!response.ok) throw new Error('Failed to fetch progress data');
      return response.json();
    }
  });

  const mockPractices = [
    {
      id: '1',
      title: 'Morning Grounding Meditation',
      description: 'A gentle 15-minute practice to connect with your body and breath, perfect for starting your day with intention.',
      duration: '15 min',
      category: 'Grounding' as const,
      instructor: 'Sarah Chen',
      completed: false
    },
    {
      id: '2',
      title: 'Breathwork for Anxiety',
      description: 'Powerful breathing techniques to calm the nervous system and release stored tension.',
      duration: '20 min',
      category: 'Calming' as const,
      instructor: 'Marcus Thompson',
      completed: true
    },
    {
      id: '3',
      title: 'Dream Integration Ceremony',
      description: 'A guided journey to explore and integrate messages from your dreams and visions.',
      duration: '45 min',
      category: 'Dreamwork' as const,
      instructor: 'Luna Martinez',
      completed: false
    }
  ];

  const mockPosts = [
    {
      id: '1',
      author: {
        name: 'Maya Rodriguez',
        initials: 'MR',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face'
      },
      content: 'Had a powerful breakthrough during my meditation practice today. The anxiety I\'ve been carrying finally felt like it was releasing from my chest. Anyone else experiencing shifts in how they hold emotions in their body?',
      tags: ['breakthrough', 'meditation', 'anxiety', 'bodywork'],
      likes: 12,
      comments: 5,
      timeAgo: '2h ago',
      isLiked: false
    },
    {
      id: '2',
      author: {
        name: 'David Kim',
        initials: 'DK',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face'
      },
      content: 'Three weeks post-ceremony and I\'m still integrating so much. The plant medicine showed me patterns I didn\'t even know I had. Grateful for this community and all the wisdom being shared here.',
      tags: ['integration', 'ceremony', 'patterns', 'gratitude'],
      likes: 18,
      comments: 8,
      timeAgo: '4h ago',
      isLiked: true
    }
  ];

  const practiceFilters = ['all', 'Calming', 'Energizing', 'Grounding', 'Dreamwork'];

  const filteredPractices = activeFilter === 'all' 
    ? mockPractices 
    : mockPractices.filter(practice => practice.category === activeFilter);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Welcome back, John</h1>
        <p className="text-muted-foreground">
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
        <h2 className="text-xl font-semibold">Today's Reflection</h2>
        <DailyPrompt onRespond={(response) => console.log('Daily reflection:', response)} />
      </div>

      {/* Practices Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recommended Practices</h2>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              {practiceFilters.map((filter) => (
                <Button
                  key={filter}
                  variant={activeFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(filter)}
                  data-testid={`filter-${filter}`}
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPractices.map((practice) => (
            <PracticeCard
              key={practice.id}
              practice={practice}
              onPlay={(id) => console.log('Playing practice:', id)}
              onComplete={(id) => console.log('Completed practice:', id)}
            />
          ))}
        </div>
      </div>

      {/* Progress Tracking */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Progress</h2>
        <ProgressChart
          data={progressData}
          selectedMetric={selectedMetric}
          onMetricSelect={setSelectedMetric}
          isLoading={progressLoading}
        />
      </div>

      {/* Community Highlights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Community Highlights</h2>
          <Button variant="outline" data-testid="button-view-all-posts">
            View All Posts
          </Button>
        </div>
        
        <div className="space-y-4">
          {mockPosts.map((post) => (
            <CommunityPost
              key={post.id}
              post={post}
              onLike={(id) => console.log('Liked post:', id)}
              onComment={(id, comment) => console.log('Comment on', id, ':', comment)}
              onShare={(id) => console.log('Shared post:', id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}