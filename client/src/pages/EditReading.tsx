import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import { Link } from "wouter";

const editReadingSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be less than 500 characters"),
  content: z.string().optional().or(z.literal("")),
  link: z.string().optional().or(z.literal("")),
  author: z.string().min(1, "Author name is required").max(100, "Author name must be less than 100 characters").optional().or(z.literal("")),
  category: z.enum(["Integration Guide", "Research", "Personal Stories", "Philosophy", "Science", "Medicines", "Stories"], {
    required_error: "Please select a category",
  }),
  readTime: z.string().optional().or(z.literal("")),
  tags: z.string().optional().or(z.literal("")),
  isFeatured: z.boolean().default(false),
  isPremium: z.boolean().default(false),
  contentType: z.enum(["content", "link"]).default("content"),
}).refine((data) => {
  if (data.contentType === "content") {
    return data.content && data.content.length >= 50;
  } else {
    return data.link && data.link.length > 0;
  }
}, {
  message: "Either content (min 50 chars) or link must be provided",
  path: ["content"],
});

type EditReadingForm = z.infer<typeof editReadingSchema>;

export default function EditReading() {
  const [, setLocation] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;

  const { data: reading, isLoading } = useQuery({
    queryKey: ['/api/admin/readings', id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/readings?id=${id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch reading");
      const data = await response.json();
      return Array.isArray(data) ? data.find((r: any) => r.id === id) : data;
    },
    enabled: isAdmin && !!id,
  });

  const form = useForm<EditReadingForm>({
    resolver: zodResolver(editReadingSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      link: "",
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

  useEffect(() => {
    if (reading) {
      form.reset({
        title: reading.title || "",
        description: reading.description || "",
        content: reading.content || "",
        link: reading.link || "",
        author: reading.author || "",
        category: reading.category || "Integration Guide",
        readTime: reading.readTime || "",
        tags: reading.tags?.join(", ") || "",
        isFeatured: reading.isFeatured || false,
        isPremium: reading.isPremium || false,
        contentType: reading.link ? "link" : "content",
      });
    }
  }, [reading, form]);

  const updateReadingMutation = useMutation({
    mutationFn: async (data: EditReadingForm) => {
      const processedData = {
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [],
        author: data.author || undefined,
        readTime: data.readTime || undefined,
        isFeatured: data.isFeatured,
        isPremium: data.isPremium,
        ...(data.contentType === "content" ? { content: data.content, link: null } : { link: data.link, content: null }),
      };

      const response = await fetch(`/api/admin/readings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(processedData),
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to update reading");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/readings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/readings"] });
      toast({
        title: "Reading Updated!",
        description: "Your reading has been successfully updated.",
      });
      setLocation("/admin/readings");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update reading",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditReadingForm) => {
    updateReadingMutation.mutate(data);
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Admin Access Required</h1>
          <p className="text-muted-foreground mb-4">
            You need admin privileges to edit readings. Only admin users can modify content on the platform.
          </p>
          <div className="space-y-2">
            <Link href="/readings">
              <Button className="w-full">Browse Readings</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">Return to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading reading...</p>
        </div>
      </div>
    );
  }

  if (!reading) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Reading Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The reading you're trying to edit could not be found.
          </p>
          <Link href="/admin/readings">
            <Button>Return to Manage Readings</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/admin/readings")}
          data-testid="button-back-to-readings"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Manage Readings
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Edit Reading
          </CardTitle>
          <CardDescription>
            Update the reading information and content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reading Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Integration Practices for Healing"
                          data-testid="input-reading-title"
                          {...field} 
                        />
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
                        <Input 
                          placeholder="e.g., Dr. Sarah Wilson"
                          data-testid="input-reading-author"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>Optional - Leave blank if anonymous</FormDescription>
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
                        placeholder="A brief description of what readers will learn from this content..."
                        rows={3}
                        data-testid="textarea-reading-description"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>This will appear in the reading list as a preview</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-content-type">
                          <SelectValue placeholder="Select content type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="content">Full Content</SelectItem>
                        <SelectItem value="link">External Link</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Choose whether to provide full content or link to external material</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {contentType === "content" ? (
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Write the full reading content here. You can include multiple paragraphs, formatting will be preserved..."
                          rows={12}
                          data-testid="textarea-reading-content"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>The complete article or reading material</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>External Link</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/article"
                          data-testid="input-reading-link"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>URL to the external reading material</FormDescription>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                        <Input 
                          placeholder="e.g., 5 min read"
                          data-testid="input-reading-time"
                          {...field} 
                        />
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
                        <Input 
                          placeholder="healing, integration, research"
                          data-testid="input-reading-tags"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>Comma-separated tags for better discovery</FormDescription>
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
                        <FormDescription>
                          Highlight this reading in the featured section for better visibility.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-featured-content"
                        />
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
                        <FormDescription>
                          Mark this reading as premium content requiring subscription access.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-premium-content"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation("/admin/readings")}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateReadingMutation.isPending}
                  data-testid="button-update-reading"
                >
                  {updateReadingMutation.isPending ? "Updating..." : "Update Reading"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
