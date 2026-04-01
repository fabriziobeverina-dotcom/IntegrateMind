import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, BookOpen, Link2, Loader2, ImageIcon, X } from "lucide-react";
import { Link } from "wouter";

const createReadingSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(10, "Description must be at least 10 characters").max(500),
  content: z.string().optional().or(z.literal("")),
  link: z.string().optional().or(z.literal("")),
  thumbnailUrl: z.string().optional().or(z.literal("")),
  author: z.string().max(100).optional().or(z.literal("")),
  category: z.enum(["Integration Guide", "Research", "Personal Stories", "Philosophy", "Science", "Medicines", "Stories"], {
    required_error: "Please select a category",
  }),
  readTime: z.string().optional().or(z.literal("")),
  tags: z.string().optional().or(z.literal("")),
  isFeatured: z.boolean().default(false),
  isPremium: z.boolean().default(false),
  contentType: z.enum(["content", "link"]).default("content"),
}).superRefine((data, ctx) => {
  if (data.contentType === "content") {
    if (!data.content || data.content.length < 50) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Content must be at least 50 characters", path: ["content"] });
    }
  } else {
    if (!data.link || data.link.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please enter an external URL", path: ["link"] });
    }
  }
});

type CreateReadingForm = z.infer<typeof createReadingSchema>;

export default function CreateReading() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;
  const [fetchingOG, setFetchingOG] = useState(false);
  const [ogFetched, setOgFetched] = useState(false);

  const form = useForm<CreateReadingForm>({
    resolver: zodResolver(createReadingSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      link: "",
      thumbnailUrl: "",
      author: "",
      category: "Integration Guide",
      readTime: "",
      tags: "",
      isFeatured: false,
      isPremium: false,
      contentType: "content",
    },
  });

  const contentType = form.watch("contentType");
  const linkValue = form.watch("link");
  const thumbnailUrl = form.watch("thumbnailUrl");

  const fetchOGMetadata = async () => {
    const url = form.getValues("link");
    if (!url || !url.trim()) {
      toast({ title: "Enter a URL first", description: "Please paste a link before fetching its image.", variant: "destructive" });
      return;
    }
    setFetchingOG(true);
    try {
      const res = await fetch(`/api/og-metadata?url=${encodeURIComponent(url)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Could not fetch metadata");
      const data = await res.json();
      if (data.image) {
        form.setValue("thumbnailUrl", data.image);
        setOgFetched(true);
      }
      if (data.title && !form.getValues("title")) form.setValue("title", data.title);
      if (data.description && !form.getValues("description")) form.setValue("description", data.description.slice(0, 498));
      toast({
        title: data.image ? "Image fetched!" : "No image found",
        description: data.image ? "Preview image loaded from the site." : "The site didn't provide a preview image.",
      });
    } catch {
      toast({ title: "Fetch failed", description: "Could not retrieve metadata from that URL.", variant: "destructive" });
    } finally {
      setFetchingOG(false);
    }
  };

  const createReadingMutation = useMutation({
    mutationFn: async (data: CreateReadingForm) => {
      const processedData = {
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(t => t.length > 0) : [],
        author: data.author || undefined,
        readTime: data.readTime || undefined,
        isFeatured: data.isFeatured,
        isPremium: data.isPremium,
        thumbnailUrl: data.thumbnailUrl || undefined,
        ...(data.contentType === "content" ? { content: data.content } : { link: data.link }),
      };
      const response = await fetch("/api/admin/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(processedData),
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create reading");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/readings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/readings"] });
      toast({ title: "Reading Created!", description: "Your reading has been successfully created." });
      setLocation("/admin/readings");
    },
    onError: (error) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to create reading", variant: "destructive" });
    },
  });

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Admin Access Required</h1>
          <p className="text-muted-foreground mb-4">You need admin privileges to create new readings.</p>
          <Link href="/readings"><Button className="w-full">Browse Readings</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => setLocation("/admin/readings")} data-testid="button-back-to-readings">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Manage Readings
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Create New Reading
          </CardTitle>
          <CardDescription>
            Add a new educational article, guide, or external link to the platform library.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createReadingMutation.mutate(data))} className="space-y-6">

              {/* Content Type selector first so the form adapts */}
              <FormField
                control={form.control}
                name="contentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Type</FormLabel>
                    <Select onValueChange={(v) => { field.onChange(v); setOgFetched(false); }} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-content-type">
                          <SelectValue placeholder="Select content type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="content">Full Content (write article)</SelectItem>
                        <SelectItem value="link">External Link</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* External link field with OG fetch */}
              {contentType === "link" && (
                <FormField
                  control={form.control}
                  name="link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>External URL</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="https://example.com/article"
                            data-testid="input-reading-link"
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={fetchOGMetadata}
                          disabled={fetchingOG}
                          data-testid="button-fetch-og"
                        >
                          {fetchingOG ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                          <span className="ml-2 hidden sm:inline">{fetchingOG ? "Fetching…" : "Fetch image"}</span>
                        </Button>
                      </div>
                      <FormDescription>Paste the URL and click "Fetch image" to auto-load a preview image from that site</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* OG / Thumbnail preview & override */}
              {contentType === "link" && (
                <FormField
                  control={form.control}
                  name="thumbnailUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preview Image</FormLabel>
                      {field.value ? (
                        <div className="space-y-2">
                          <div className="relative w-full max-w-sm rounded-md overflow-hidden border aspect-video bg-muted">
                            <img
                              src={field.value}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <button
                              type="button"
                              onClick={() => { form.setValue("thumbnailUrl", ""); setOgFetched(false); }}
                              className="absolute top-1 right-1 bg-background/80 rounded-md p-1"
                              data-testid="button-clear-thumbnail"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <FormControl>
                            <Input placeholder="Image URL (auto-filled from site)" data-testid="input-thumbnail-url" {...field} />
                          </FormControl>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 p-4 border rounded-md text-muted-foreground">
                            <ImageIcon className="w-5 h-5 shrink-0" />
                            <span className="text-sm">No image yet — paste a URL above and click "Fetch image"</span>
                          </div>
                          <FormControl>
                            <Input placeholder="Or paste an image URL directly" data-testid="input-thumbnail-url" {...field} />
                          </FormControl>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reading Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Integration Practices for Healing" data-testid="input-reading-title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Author</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Dr. Sarah Wilson" data-testid="input-reading-author" {...field} />
                      </FormControl>
                      <FormDescription>Optional — leave blank if anonymous</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A brief description of what readers will learn…"
                        rows={3}
                        data-testid="textarea-reading-description"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>This appears in the reading list as a preview</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {contentType === "content" && (
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write the full reading content here…"
                          rows={12}
                          data-testid="textarea-reading-content"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>The complete article or reading material (min 50 characters)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-reading-category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Integration Guide">Integration Guide</SelectItem>
                          <SelectItem value="Research">Research</SelectItem>
                          <SelectItem value="Personal Stories">Personal Stories</SelectItem>
                          <SelectItem value="Philosophy">Philosophy</SelectItem>
                          <SelectItem value="Science">Science</SelectItem>
                          <SelectItem value="Medicines">Medicines</SelectItem>
                          <SelectItem value="Stories">Stories</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="readTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Read Time</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 5 min read" data-testid="input-reading-time" {...field} />
                      </FormControl>
                      <FormDescription>Optional estimated reading time</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input placeholder="healing, integration, research" data-testid="input-reading-tags" {...field} />
                      </FormControl>
                      <FormDescription>Comma-separated tags</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Content Settings</h3>

                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Featured Content</FormLabel>
                        <FormDescription>Highlight this reading in the featured section.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-featured-content" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPremium"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Premium Content</FormLabel>
                        <FormDescription>Restrict this reading to premium subscribers.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-premium-content" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <Button type="button" variant="outline" onClick={() => setLocation("/admin/readings")} data-testid="button-cancel-create">
                  Cancel
                </Button>
                <Button type="submit" disabled={createReadingMutation.isPending} data-testid="button-create-reading">
                  {createReadingMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</>
                  ) : "Create Reading"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
