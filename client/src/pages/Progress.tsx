import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProgressChart } from "@/components/ProgressChart";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  Calendar, 
  Heart,
  Moon,
  Anchor,
  CheckCircle,
  Clock
} from "lucide-react";
import { format } from "date-fns";

const progressEntrySchema = z.object({
  mood: z.string().optional(),
  sleep: z.string().optional(),
  grounding: z.string().optional(),
  notes: z.string().optional()
});

type ProgressEntryFormData = z.infer<typeof progressEntrySchema>;

interface ProgressEntry {
  id: string;
  date: string;
  mood: number | null;
  sleep: number | null;
  grounding: number | null;
  notes: string | null;
  createdAt: string;
}

const moodLabels = {
  1: "Very Low", 2: "Low", 3: "Below Average", 4: "Somewhat Low", 5: "Neutral",
  6: "Somewhat Good", 7: "Good", 8: "Very Good", 9: "Great", 10: "Excellent"
};

const sleepLabels = {
  1: "Terrible", 2: "Very Poor", 3: "Poor", 4: "Below Average", 5: "Average",
  6: "Decent", 7: "Good", 8: "Very Good", 9: "Great", 10: "Perfect"
};

const groundingLabels = {
  1: "Disconnected", 2: "Very Ungrounded", 3: "Ungrounded", 4: "Somewhat Ungrounded", 5: "Neutral",
  6: "Somewhat Grounded", 7: "Grounded", 8: "Well Grounded", 9: "Very Grounded", 10: "Deeply Grounded"
};

export default function Progress() {
  const [selectedMetric, setSelectedMetric] = useState<'mood' | 'sleep' | 'grounding'>('mood');
  const { toast } = useToast();

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Fetch aggregated progress data for chart
  const { data: progressData = [], isLoading: chartLoading } = useQuery({
    queryKey: ['/api/progress/aggregated', { days: 7 }],
    queryFn: async () => {
      const response = await fetch('/api/progress/aggregated?days=7');
      if (!response.ok) throw new Error('Failed to fetch progress data');
      return response.json();
    }
  });

  // Fetch detailed progress entries
  const { data: progressEntries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['/api/progress/entries'],
    queryFn: async () => {
      const response = await fetch('/api/progress/entries');
      if (!response.ok) throw new Error('Failed to fetch progress entries');
      return response.json();
    }
  });

  // Check if today's entry exists
  const todayEntry = progressEntries.find((entry: ProgressEntry) => 
    entry.date.split('T')[0] === today
  );

  // Progress entry form
  const form = useForm<ProgressEntryFormData>({
    resolver: zodResolver(progressEntrySchema),
    defaultValues: {
      mood: todayEntry?.mood?.toString() || "",
      sleep: todayEntry?.sleep?.toString() || "",
      grounding: todayEntry?.grounding?.toString() || "",
      notes: todayEntry?.notes || ""
    }
  });

  // Create/update progress entry mutation
  const progressMutation = useMutation({
    mutationFn: async (data: ProgressEntryFormData) => {
      const entryData = {
        date: today,
        mood: data.mood ? parseInt(data.mood) : null,
        sleep: data.sleep ? parseInt(data.sleep) : null,
        grounding: data.grounding ? parseInt(data.grounding) : null,
        notes: data.notes?.trim() || null
      };

      if (todayEntry) {
        // Update existing entry
        const response = await fetch(`/api/progress/entries/${todayEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entryData)
        });
        if (!response.ok) throw new Error('Failed to update progress entry');
        return response.json();
      } else {
        // Create new entry
        const response = await fetch('/api/progress/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entryData)
        });
        if (!response.ok) throw new Error('Failed to create progress entry');
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress/entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/progress/aggregated'] });
      toast({
        title: "Progress saved",
        description: "Your daily progress has been recorded successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save progress",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: ProgressEntryFormData) => {
    progressMutation.mutate(data);
  };

  const getMetricLabel = (metric: 'mood' | 'sleep' | 'grounding', value: number) => {
    switch (metric) {
      case 'mood': return moodLabels[value as keyof typeof moodLabels];
      case 'sleep': return sleepLabels[value as keyof typeof sleepLabels];
      case 'grounding': return groundingLabels[value as keyof typeof groundingLabels];
      default: return value.toString();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Progress Tracking</h1>
        <p className="text-muted-foreground">Track your daily mood, sleep quality, and grounding levels</p>
      </div>

      <Tabs defaultValue="track" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="track" data-testid="tab-track">
            <CheckCircle className="h-4 w-4 mr-2" />
            Track Today
          </TabsTrigger>
          <TabsTrigger value="chart" data-testid="tab-chart">
            <TrendingUp className="h-4 w-4 mr-2" />
            Progress Chart
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <Clock className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="track" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Progress - {format(new Date(), 'MMMM d, yyyy')}
              </CardTitle>
              {todayEntry && (
                <Badge variant="secondary" className="w-fit">
                  Already recorded - updating
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="mood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Heart className="h-4 w-4 text-purple-500" />
                            Mood (1-10)
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-mood">
                                <SelectValue placeholder="How are you feeling?" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(moodLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{value}</span>
                                    <span className="text-muted-foreground">- {label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sleep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Moon className="h-4 w-4 text-blue-500" />
                            Sleep Quality (1-10)
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-sleep">
                                <SelectValue placeholder="How did you sleep?" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(sleepLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{value}</span>
                                    <span className="text-muted-foreground">- {label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="grounding"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Anchor className="h-4 w-4 text-green-500" />
                            Grounding (1-10)
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-grounding">
                                <SelectValue placeholder="How grounded do you feel?" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(groundingLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{value}</span>
                                    <span className="text-muted-foreground">- {label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add any additional notes about your day, what influenced your mood, sleep, or grounding..."
                            className="min-h-[100px]"
                            {...field}
                            data-testid="textarea-progress-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={progressMutation.isPending}
                    className="w-full"
                    data-testid="button-save-progress"
                  >
                    {progressMutation.isPending 
                      ? "Saving..." 
                      : todayEntry 
                        ? "Update Today's Progress" 
                        : "Save Today's Progress"
                    }
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart" className="space-y-6">
          <ProgressChart
            data={progressData}
            selectedMetric={selectedMetric}
            onMetricSelect={setSelectedMetric}
            isLoading={chartLoading}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progress History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {entriesLoading ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">Loading progress history...</p>
                </div>
              ) : progressEntries.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No progress entries yet. Start tracking your daily progress!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {progressEntries.map((entry: ProgressEntry) => (
                    <Card key={entry.id} className="hover-elevate">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(new Date(entry.date), 'MMMM d, yyyy')}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {format(new Date(entry.createdAt), 'h:mm a')}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mb-3">
                          {entry.mood && (
                            <div className="flex items-center gap-2">
                              <Heart className="h-4 w-4 text-purple-500" />
                              <span className="text-sm">
                                Mood: <span className="font-medium">{entry.mood}/10</span>
                                <span className="text-muted-foreground ml-1">
                                  ({getMetricLabel('mood', entry.mood)})
                                </span>
                              </span>
                            </div>
                          )}
                          
                          {entry.sleep && (
                            <div className="flex items-center gap-2">
                              <Moon className="h-4 w-4 text-blue-500" />
                              <span className="text-sm">
                                Sleep: <span className="font-medium">{entry.sleep}/10</span>
                                <span className="text-muted-foreground ml-1">
                                  ({getMetricLabel('sleep', entry.sleep)})
                                </span>
                              </span>
                            </div>
                          )}
                          
                          {entry.grounding && (
                            <div className="flex items-center gap-2">
                              <Anchor className="h-4 w-4 text-green-500" />
                              <span className="text-sm">
                                Grounding: <span className="font-medium">{entry.grounding}/10</span>
                                <span className="text-muted-foreground ml-1">
                                  ({getMetricLabel('grounding', entry.grounding)})
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {entry.notes && (
                          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                            {entry.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}