import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Moon, Send, Eye, Film, MessageCircle, Heart, MapPin, Sparkles, Link, Lightbulb } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DreamEntry {
  id: string;
  userId: string;
  dreamTitle: string | null;
  dreamImages: string | null;
  dreamPresent: string | null;
  dreamEmotion: string | null;
  dreamBody: string | null;
  dreamSpeak: string | null;
  dreamConnect: string | null;
  dreamInviting: string | null;
  createdAt: Date;
}

const dreamQuestions = [
  {
    key: "dreamTitle" as const,
    question: "Give your dream a title, as if it were a film or a chapter of your life.",
    icon: Film,
    placeholder: 'e.g. "The River That Knew My Name"...',
  },
  {
    key: "dreamImages" as const,
    question: "List at least three images, symbols, or scenes you remember from the dream.",
    icon: Eye,
    placeholder: "e.g. A golden key, a flooded room, an old friend I haven't seen in years...",
  },
  {
    key: "dreamPresent" as const,
    question: "Describe the dream in present tense, as if it is happening now.",
    icon: MessageCircle,
    placeholder: "I am walking through a forest. The trees are tall and the light filters through...",
  },
  {
    key: "dreamEmotion" as const,
    question: "How do you feel emotionally when you remember this dream?",
    icon: Heart,
    placeholder: "e.g. Curious, anxious, peaceful, confused, nostalgic...",
  },
  {
    key: "dreamBody" as const,
    question: "Where do you feel the dream in your body? Notice any physical sensations.",
    icon: MapPin,
    placeholder: "e.g. Tightness in my chest, warmth in my belly, tingling in my hands...",
  },
  {
    key: "dreamSpeak" as const,
    question: "If one element of the dream could speak, what would it say to you?",
    icon: Sparkles,
    placeholder: 'e.g. The river says: "Let go and trust the current"...',
  },
  {
    key: "dreamConnect" as const,
    question: "Does this dream connect to something currently happening in your life?",
    icon: Link,
    placeholder: "e.g. I've been struggling with a big decision at work...",
  },
  {
    key: "dreamInviting" as const,
    question: 'Complete this sentence without overthinking: "This dream is inviting me to..."',
    icon: Lightbulb,
    placeholder: "...slow down, trust the process, face my fears...",
  },
];

type DreamKey = typeof dreamQuestions[number]["key"];

export function DreamJournal() {
  const [answers, setAnswers] = useState<Record<DreamKey, string>>({
    dreamTitle: "",
    dreamImages: "",
    dreamPresent: "",
    dreamEmotion: "",
    dreamBody: "",
    dreamSpeak: "",
    dreamConnect: "",
    dreamInviting: "",
  });
  const { toast } = useToast();

  const { data: todaysEntry, isLoading } = useQuery<DreamEntry | null>({
    queryKey: ['/api/dreams/today'],
    queryFn: async () => {
      const response = await fetch('/api/dreams/today');
      if (!response.ok) return null;
      const data = await response.json();
      return data || null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      return await apiRequest('POST', '/api/dreams', data);
    },
    onSuccess: () => {
      toast({
        title: "Dream journal saved",
        description: "Your dream has been captured. These insights may unfold over time.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dreams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dreams/today'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save dream journal",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const hasContent = Object.values(answers).some(v => v.trim().length > 0);
    if (!hasContent) {
      toast({
        title: "Please write something",
        description: "Answer at least one question before saving.",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(answers);
  };

  if (isLoading) {
    return (
      <Card className="p-3 sm:p-4 md:p-6 w-full overflow-hidden">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (todaysEntry || saveMutation.isSuccess) {
    const entry = todaysEntry;
    return (
      <Card className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 w-full overflow-hidden">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
          <div className="p-1.5 sm:p-2 rounded-lg bg-indigo-500/10 flex-shrink-0">
            <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base md:text-lg truncate" data-testid="text-dream-title">Dream Journal</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Today's dream has been recorded
            </p>
          </div>
        </div>

        {entry && (
          <div className="space-y-2 pt-1">
            {entry.dreamTitle && (
              <div className="bg-muted/50 rounded-lg p-2.5 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Dream title</p>
                <p className="text-xs sm:text-sm font-medium italic" data-testid="text-dream-saved-title">"{entry.dreamTitle}"</p>
              </div>
            )}
            {entry.dreamEmotion && (
              <div className="bg-muted/50 rounded-lg p-2.5 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Emotional feeling</p>
                <p className="text-xs sm:text-sm" data-testid="text-dream-saved-emotion">{entry.dreamEmotion}</p>
              </div>
            )}
            {entry.dreamInviting && (
              <div className="bg-muted/50 rounded-lg p-2.5 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">This dream is inviting me to...</p>
                <p className="text-xs sm:text-sm" data-testid="text-dream-saved-inviting">{entry.dreamInviting}</p>
              </div>
            )}
          </div>
        )}

        <div className="text-center py-1 sm:py-2">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Next dream journal: check back on the next dream day
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 w-full overflow-hidden">
      <div className="flex items-start gap-2 sm:gap-3 min-w-0">
        <div className="p-1.5 sm:p-2 rounded-lg bg-indigo-500/10 flex-shrink-0">
          <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm sm:text-base md:text-lg truncate" data-testid="text-dream-journal-title">Dream Journal</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Capture your dream before it fades — answer quickly, don't overthink
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {dreamQuestions.map((q, index) => {
          const QuestionIcon = q.icon;
          return (
            <div key={q.key} className="space-y-1.5">
              <Label className="flex items-start gap-1.5 text-xs sm:text-sm font-medium leading-snug">
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <QuestionIcon className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="text-muted-foreground">{index + 1}.</span>
                </span>
                <span>{q.question}</span>
              </Label>
              <Textarea
                value={answers[q.key]}
                onChange={(e) => setAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                placeholder={q.placeholder}
                className="resize-none text-xs sm:text-sm min-h-[60px] sm:min-h-[72px]"
                rows={2}
                data-testid={`textarea-${q.key}`}
              />
            </div>
          );
        })}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={saveMutation.isPending}
        className="w-full gap-2"
        data-testid="button-save-dream"
      >
        {saveMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {saveMutation.isPending ? "Saving..." : "Save Dream Journal"}
      </Button>
    </Card>
  );
}

export function isDreamDay(): boolean {
  const today = new Date();
  const dayOfWeek = today.getDay();
  return dayOfWeek === 0 || dayOfWeek === 2 || dayOfWeek === 4;
}
