import { useState } from "react";
import { notifySeedsAwarded, notifyBadgeUnlocked } from "@/components/SeedsAward";
import { ALL_BADGES } from "@/components/BadgeGrid";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Calendar, 
  Lightbulb,
  Heart,
  Smile,
  Meh,
  Frown,
  Edit3,
  Trash2,
  Lock,
  Globe,
  Share2,
  Copy,
  MessageCircle,
  Mail,
  CheckCheck
} from "lucide-react";
import { format, subDays } from "date-fns";

const journalEntrySchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  content: z.string().min(10, "Content must be at least 10 characters").max(5000, "Content must be less than 5000 characters"),
  tags: z.string().optional(),
  mood: z.string().optional(),
  isPrivate: z.boolean().default(false)
});

const promptResponseSchema = z.object({
  response: z.string().min(10, "Response must be at least 10 characters").max(2000, "Response must be less than 2000 characters")
});

type JournalEntryFormData = z.infer<typeof journalEntrySchema>;
type PromptResponseFormData = z.infer<typeof promptResponseSchema>;

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  mood: number | null;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DailyPrompt {
  id: string;
  prompt: string;
  category: string;
}

interface PromptResponse {
  id: string;
  response: string;
  createdAt: string;
}

const moodEmojis = {
  1: { icon: Frown, label: "Very Low", color: "text-red-500" },
  2: { icon: Frown, label: "Low", color: "text-red-400" },
  3: { icon: Frown, label: "Below Average", color: "text-orange-500" },
  4: { icon: Meh, label: "Somewhat Low", color: "text-orange-400" },
  5: { icon: Meh, label: "Neutral", color: "text-gray-500" },
  6: { icon: Smile, label: "Somewhat Good", color: "text-yellow-500" },
  7: { icon: Smile, label: "Good", color: "text-green-400" },
  8: { icon: Smile, label: "Very Good", color: "text-green-500" },
  9: { icon: Smile, label: "Great", color: "text-green-600" },
  10: { icon: Heart, label: "Excellent", color: "text-green-700" }
};

interface ShareSummary {
  userName: string;
  entries: JournalEntry[];
  facilitatorWhatsapp: string | null;
  periodStart: string;
  periodEnd: string;
}

function buildShareText(summary: ShareSummary): string {
  const start = format(new Date(summary.periodStart), 'MMM d');
  const end = format(new Date(summary.periodEnd), 'MMM d, yyyy');
  const lines: string[] = [
    `Integration Journey — Last 7 Days`,
    `Shared by: ${summary.userName}`,
    `Period: ${start} – ${end}`,
    ``,
  ];

  if (summary.entries.length === 0) {
    lines.push('No journal entries in the past 7 days.');
  } else {
    summary.entries.forEach((entry) => {
      const date = format(new Date(entry.createdAt), 'EEE, MMM d');
      const moodStr = entry.mood ? `Mood: ${entry.mood}/10` : '';
      const excerpt = entry.content.length > 300
        ? entry.content.slice(0, 300).trimEnd() + '...'
        : entry.content;
      lines.push(`— ${date}${moodStr ? '  |  ' + moodStr : ''}`);
      lines.push(`"${entry.title}"`);
      lines.push(excerpt);
      if (entry.tags && entry.tags.length > 0) {
        lines.push(`Tags: ${entry.tags.map(t => '#' + t).join(' ')}`);
      }
      lines.push('');
    });
  }

  lines.push('Sent from Integration Compass');
  return lines.join('\n');
}

export default function Journal() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("write");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Share summary query — only runs when dialog is open
  const { data: shareSummary, isLoading: shareLoading } = useQuery<ShareSummary>({
    queryKey: ['/api/journal/share-summary'],
    enabled: showShareDialog,
  });

  const handleCopy = async () => {
    if (!shareSummary) return;
    await navigator.clipboard.writeText(buildShareText(shareSummary));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard", description: "Paste it anywhere to share." });
  };

  const handleWhatsApp = () => {
    if (!shareSummary) return;
    const text = encodeURIComponent(buildShareText(shareSummary));
    const number = shareSummary.facilitatorWhatsapp
      ? shareSummary.facilitatorWhatsapp.replace(/[^0-9]/g, '')
      : '';
    const url = number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleEmail = () => {
    if (!shareSummary) return;
    const subject = encodeURIComponent('My Integration Journey — Last 7 Days');
    const body = encodeURIComponent(buildShareText(shareSummary));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  // Fetch today's prompt
  const { data: todayPrompt } = useQuery({
    queryKey: ['/api/prompts/today'],
    enabled: activeTab === "prompt"
  });

  // Fetch user's response to today's prompt
  const { data: promptResponse } = useQuery({
    queryKey: ['/api/prompts', (todayPrompt as DailyPrompt)?.id, 'response'],
    enabled: !!(todayPrompt as DailyPrompt)?.id
  });

  // Fetch journal entries
  const { data: journalEntries = [], isLoading: entriesLoading } = useQuery<JournalEntry[]>({
    queryKey: ['/api/journal/entries'],
    enabled: activeTab === "entries"
  });

  // Search entries
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['/api/journal/search', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('query', searchQuery);
      }
      const response = await fetch(`/api/journal/search?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to search entries');
      return response.json();
    },
    enabled: !!searchQuery && activeTab === "entries"
  });

  // Journal entry form
  const journalForm = useForm<JournalEntryFormData>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      title: "",
      content: "",
      tags: "",
      mood: "",
      isPrivate: false
    }
  });

  // Prompt response form
  const promptForm = useForm<PromptResponseFormData>({
    resolver: zodResolver(promptResponseSchema),
    defaultValues: {
      response: ""
    }
  });

  // Create journal entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async (data: JournalEntryFormData) => {
      const entryData = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        mood: data.mood ? parseInt(data.mood) : null
      };
      const response = await fetch('/api/journal/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryData)
      });
      if (!response.ok) throw new Error('Failed to create journal entry');
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/journal/entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/status'] });
      journalForm.reset();
      // Show seeds award feedback
      if (data?.gamification?.seedsAwarded > 0) {
        notifySeedsAwarded(data.gamification.seedsAwarded);
        (data.gamification.newBadges ?? []).forEach((b: any) => {
          const def = ALL_BADGES.find(d => d.id === b.id);
          if (def) notifyBadgeUnlocked({ id: def.id, name: def.name, description: def.description });
        });
      }
      toast({
        title: "Journal entry created",
        description: "Your journal entry has been saved successfully."
      });
      setActiveTab("entries");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create journal entry",
        variant: "destructive"
      });
    }
  });

  // Create prompt response mutation
  const createResponseMutation = useMutation({
    mutationFn: async (data: PromptResponseFormData) => {
      const response = await fetch(`/api/prompts/${(todayPrompt as DailyPrompt)!.id}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to save response');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prompts', (todayPrompt as DailyPrompt)?.id, 'response'] });
      promptForm.reset();
      toast({
        title: "Response saved",
        description: "Your response to today's prompt has been saved."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save response",
        variant: "destructive"
      });
    }
  });

  const onSubmitEntry = (data: JournalEntryFormData) => {
    createEntryMutation.mutate(data);
  };

  const onSubmitResponse = (data: PromptResponseFormData) => {
    createResponseMutation.mutate(data);
  };

  const displayedEntries = searchQuery ? searchResults : journalEntries;
  const isSearching = !!searchQuery;
  const showEmptyState = isSearching 
    ? !searchLoading && searchResults.length === 0
    : !entriesLoading && journalEntries.length === 0;
  const showLoadingState = isSearching ? searchLoading : entriesLoading;

  const getMoodDisplay = (mood: number | null) => {
    if (!mood) return null;
    const moodData = moodEmojis[mood as keyof typeof moodEmojis];
    if (!moodData) return null;
    
    const Icon = moodData.icon;
    return (
      <div className="flex items-center gap-1">
        <Icon className={`h-4 w-4 ${moodData.color}`} />
        <span className="text-sm text-muted-foreground">{moodData.label}</span>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Journal</h1>
          <p className="text-muted-foreground">Your personal integration journey</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowShareDialog(true)}
          data-testid="button-share-facilitator"
          className="flex items-center gap-2"
        >
          <Share2 className="h-4 w-4" />
          Share with Facilitator
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="write" data-testid="tab-write">
            <Edit3 className="h-4 w-4 mr-2" />
            Write Entry
          </TabsTrigger>
          <TabsTrigger value="prompt" data-testid="tab-prompt">
            <Lightbulb className="h-4 w-4 mr-2" />
            Daily Prompt
          </TabsTrigger>
          <TabsTrigger value="entries" data-testid="tab-entries">
            <BookOpen className="h-4 w-4 mr-2" />
            My Entries
          </TabsTrigger>
        </TabsList>

        <TabsContent value="write" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                New Journal Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...journalForm}>
                <form onSubmit={journalForm.handleSubmit(onSubmitEntry)} className="space-y-4">
                  <FormField
                    control={journalForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Give your entry a title..." 
                            {...field} 
                            data-testid="input-journal-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={journalForm.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Write about your experiences, insights, challenges, or anything on your mind..."
                            className="min-h-[200px]"
                            {...field}
                            data-testid="textarea-journal-content"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={journalForm.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tags (optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="meditation, insights, challenges..."
                              {...field}
                              data-testid="input-journal-tags"
                            />
                          </FormControl>
                          <p className="text-sm text-muted-foreground">Separate tags with commas</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={journalForm.control}
                      name="mood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mood (optional)</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-journal-mood">
                                <SelectValue placeholder="How are you feeling?" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(moodEmojis).map(([value, { icon: Icon, label, color }]) => (
                                <SelectItem key={value} value={value}>
                                  <div className="flex items-center gap-2">
                                    <Icon className={`h-4 w-4 ${color}`} />
                                    {label}
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
                    control={journalForm.control}
                    name="isPrivate"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base flex items-center gap-2">
                            {field.value ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                            Private Entry
                          </FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Keep this entry completely private
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-journal-private"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={createEntryMutation.isPending}
                    className="w-full"
                    data-testid="button-create-entry"
                  >
                    {createEntryMutation.isPending ? "Saving..." : "Save Entry"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompt" className="space-y-6">
          {todayPrompt ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Today's Reflection Prompt
                </CardTitle>
                <Badge variant="secondary" className="w-fit">
                  {(todayPrompt as DailyPrompt).category}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-lg font-medium">{(todayPrompt as DailyPrompt).prompt}</p>
                </div>

                {promptResponse ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Responded on {format(new Date((promptResponse as PromptResponse).createdAt), 'MMM d, yyyy')}
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="whitespace-pre-wrap">{(promptResponse as PromptResponse).response}</p>
                    </div>
                  </div>
                ) : (
                  <Form {...promptForm}>
                    <form onSubmit={promptForm.handleSubmit(onSubmitResponse)} className="space-y-4">
                      <FormField
                        control={promptForm.control}
                        name="response"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Response</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Take a moment to reflect and share your thoughts..."
                                className="min-h-[150px]"
                                {...field}
                                data-testid="textarea-prompt-response"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        disabled={createResponseMutation.isPending}
                        data-testid="button-submit-response"
                      >
                        {createResponseMutation.isPending ? "Saving..." : "Save Response"}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No prompt available today. Check back later!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="entries" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                My Journal Entries
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search your entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                  data-testid="input-search-entries"
                />
              </div>

              <Separator />

              {showLoadingState ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">
                    {isSearching ? "Searching entries..." : "Loading your entries..."}
                  </p>
                </div>
              ) : showEmptyState ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">
                    {searchQuery ? "No entries match your search." : "No journal entries yet. Start writing your first entry!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(displayedEntries as JournalEntry[]).map((entry: JournalEntry) => (
                    <Card key={entry.id} className="hover-elevate">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {entry.title}
                              {entry.isPrivate && <Lock className="h-4 w-4 text-muted-foreground" />}
                            </CardTitle>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(entry.createdAt), 'MMM d, yyyy')}
                              </div>
                              {entry.mood && getMoodDisplay(entry.mood)}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground line-clamp-3 mb-3">
                          {entry.content}
                        </p>
                        {entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {entry.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
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

      {/* Share with Facilitator Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share with Your Facilitator
            </DialogTitle>
            <DialogDescription>
              A summary of your last 7 days of journal entries will be shared. Only entries marked as public are included.
            </DialogDescription>
          </DialogHeader>

          {shareLoading ? (
            <div className="py-8 text-center text-muted-foreground">Building your summary...</div>
          ) : shareSummary ? (
            <div className="space-y-4">
              {/* Entry count info */}
              <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted rounded-md px-3 py-2">
                <span>
                  {shareSummary.entries.length === 0
                    ? 'No public entries in the last 7 days'
                    : `${shareSummary.entries.length} entr${shareSummary.entries.length === 1 ? 'y' : 'ies'} from ${format(new Date(shareSummary.periodStart), 'MMM d')} – ${format(new Date(shareSummary.periodEnd), 'MMM d')}`}
                </span>
                <Lock className="h-3.5 w-3.5" />
              </div>

              {/* Preview */}
              <ScrollArea className="h-52 rounded-md border bg-muted/30 p-3">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                  {buildShareText(shareSummary)}
                </pre>
              </ScrollArea>

              {/* Share actions */}
              <div className="grid grid-cols-1 gap-2">
                {shareSummary.facilitatorWhatsapp && (
                  <Button
                    onClick={handleWhatsApp}
                    className="w-full"
                    data-testid="button-share-whatsapp"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send via WhatsApp to Facilitator
                  </Button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCopy}
                    data-testid="button-share-copy"
                  >
                    {copied ? (
                      <><CheckCheck className="h-4 w-4 mr-2" />Copied</>
                    ) : (
                      <><Copy className="h-4 w-4 mr-2" />Copy Text</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleEmail}
                    data-testid="button-share-email"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send by Email
                  </Button>
                </div>
              </div>

              {!shareSummary.facilitatorWhatsapp && (
                <p className="text-xs text-muted-foreground text-center">
                  WhatsApp sharing is available once your facilitator's number is configured.
                </p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}