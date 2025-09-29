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
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, BookOpen, Clock } from "lucide-react";
import { Link } from "wouter";

const createReadingSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be less than 500 characters"),
  content: z.string().min(50, "Content must be at least 50 characters"),
  author: z.string().min(1, "Author name is required").max(100, "Author name must be less than 100 characters").optional().or(z.literal("")),
  category: z.enum(["Integration Guide", "Research", "Personal Stories", "Philosophy", "Science"], {
    required_error: "Please select a category",
  }),
  readTime: z.string().optional().or(z.literal("")),
  tags: z.string().optional().or(z.literal("")),
  isFeatured: z.boolean().default(false),
  isPremium: z.boolean().default(false),
});

type CreateReadingForm = z.infer<typeof createReadingSchema>;

export default function CreateReading() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;

  const form = useForm<CreateReadingForm>({
    resolver: zodResolver(createReadingSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      author: "",
      category: "Integration Guide",
      readTime: "",
      tags: "",
      isFeatured: false,
      isPremium: false,
    },
  });

  const createReadingMutation = useMutation({
    mutationFn: async (data: CreateReadingForm) => {
      // Convert tags string to array
      const processedData = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [],
        author: data.author || undefined,
        readTime: data.readTime || undefined,
      };

      const response = await fetch("/api/admin/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(processedData),
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to create reading");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/readings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/readings"] });
      toast({
        title: "Reading Created!",
        description: "Your reading has been successfully created.",
      });
      setLocation("/admin/readings");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create reading",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateReadingForm) => {
    createReadingMutation.mutate(data);
  };

  // Check if user is admin
  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Admin Access Required</h1>
          <p className="text-muted-foreground mb-4">
            You need admin privileges to create new readings. Only admin users can add content to the platform.
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
            Create New Reading
          </CardTitle>
          <CardDescription>
            Add a new educational article, guide, or reading material to the platform library.
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createReadingMutation.isPending}
                  data-testid="button-create-reading"
                >
                  {createReadingMutation.isPending ? "Creating..." : "Create Reading"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}