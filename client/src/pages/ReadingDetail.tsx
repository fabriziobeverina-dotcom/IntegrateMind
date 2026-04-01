import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Clock, CheckCircle, ExternalLink, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";

interface Reading {
  id: string;
  title: string;
  description: string;
  content?: string;
  link?: string;
  thumbnailUrl?: string;
  author?: string;
  category: string;
  readTime?: string;
  tags: string[];
  isFeatured: boolean;
  isPremium: boolean;
  createdAt: string;
}

export default function ReadingDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [iframeError, setIframeError] = useState(false);

  const { data: reading, isLoading } = useQuery<Reading>({
    queryKey: ["/api/readings", id],
    queryFn: () =>
      fetch(`/api/readings/${id}`, { credentials: "include" }).then(r => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      }),
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/readings/${id}/complete`, { method: "POST", credentials: "include" }).then(r =>
        r.json()
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/readings"] });
      toast({ title: "Reading complete!", description: "Your progress has been saved." });
    },
  });

  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto p-6 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-md" />
        <div className="h-64 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  if (!reading) {
    return (
      <div className="container max-w-3xl mx-auto p-6 text-center py-20">
        <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-semibold mb-2">Reading not found</h2>
        <Button variant="outline" onClick={() => setLocation("/readings")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Library
        </Button>
      </div>
    );
  }

  const isExternal = !!reading.link;

  return (
    <div className="absolute inset-0 flex flex-col bg-background">
      {/* Top bar — always visible */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b bg-background shrink-0 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/readings")}
            data-testid="button-back-readings"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Library
          </Button>
          <span className="text-sm font-medium truncate max-w-xs hidden sm:block">{reading.title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isExternal && (
            <a
              href={reading.link}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-open-external"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Open site
              </Button>
            </a>
          )}
          <Button
            size="sm"
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending || completeMutation.isSuccess}
            data-testid="button-mark-complete"
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
            {completeMutation.isSuccess ? "Complete!" : "Mark complete"}
          </Button>
        </div>
      </div>

      {/* External link — iframe embed */}
      {isExternal && (
        <div className="flex-1 relative">
          {iframeError ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground opacity-50" />
              <div>
                <p className="font-medium mb-1">This site can't be embedded</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Some websites block being shown inside other apps. You can open it directly instead.
                </p>
                <a href={reading.link} target="_blank" rel="noopener noreferrer">
                  <Button data-testid="button-open-direct">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in new tab
                  </Button>
                </a>
              </div>
            </div>
          ) : (
            <iframe
              src={reading.link}
              title={reading.title}
              className="w-full h-full border-0"
              onError={() => setIframeError(true)}
              data-testid="iframe-reading"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          )}
        </div>
      )}

      {/* Full content article */}
      {!isExternal && (
        <div className="flex-1 overflow-y-auto">
          <div className="container max-w-3xl mx-auto p-6 space-y-6">
            {reading.thumbnailUrl && (
              <div className="w-full h-52 rounded-md overflow-hidden bg-muted">
                <img
                  src={reading.thumbnailUrl}
                  alt={reading.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-3">
              <Badge variant="secondary">{reading.category}</Badge>
              <h1 className="text-3xl font-bold leading-tight">{reading.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {reading.author && <span>by {reading.author}</span>}
                {reading.readTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {reading.readTime}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-base leading-relaxed">{reading.description}</p>
            </div>

            <Card>
              <CardContent className="p-6">
                <div
                  className="prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap"
                  data-testid="text-reading-content"
                >
                  {reading.content}
                </div>
              </CardContent>
            </Card>

            {reading.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {reading.tags.map(tag => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
