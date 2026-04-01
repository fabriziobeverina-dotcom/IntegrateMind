import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Clock, ExternalLink, Search, Star, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";

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

const CATEGORIES = [
  "All",
  "Integration Guide",
  "Research",
  "Personal Stories",
  "Philosophy",
  "Science",
  "Medicines",
  "Stories",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Integration Guide": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Research": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Personal Stories": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "Philosophy": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  "Science": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  "Medicines": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Stories": "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

export default function Readings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const { data: readings = [], isLoading } = useQuery<Reading[]>({
    queryKey: ["/api/readings"],
  });

  const completeReadingMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/readings/${id}/complete`, { method: "POST", credentials: "include" }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/readings"] });
      toast({ title: "Reading marked complete!" });
    },
  });

  const filtered = readings.filter((r) => {
    const matchCat = category === "All" || r.category === category;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      (r.author || "").toLowerCase().includes(q) ||
      r.tags?.some(t => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const featured = filtered.filter(r => r.isFeatured);
  const rest = filtered.filter(r => !r.isFeatured);

  const handleReadingClick = (reading: Reading) => {
    if (reading.link) {
      window.open(reading.link, "_blank", "noopener,noreferrer");
    } else {
      setLocation(`/readings/${reading.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto p-6">
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-40 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          Reading Library
        </h1>
        <p className="text-muted-foreground mt-1">
          Curated articles, guides, and research to support your integration journey
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search readings…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-readings"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48" data-testid="select-category-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {readings.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No readings yet</p>
          <p className="text-sm mt-1">Check back soon — new content is on its way.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm mt-1">Try adjusting your search or category filter.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Featured */}
          {featured.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Featured
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {featured.map(reading => (
                  <ReadingCard
                    key={reading.id}
                    reading={reading}
                    onClick={() => handleReadingClick(reading)}
                    featured
                  />
                ))}
              </div>
            </section>
          )}

          {/* All other readings */}
          {rest.length > 0 && (
            <section>
              {featured.length > 0 && (
                <h2 className="text-lg font-semibold mb-4">All Readings</h2>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {rest.map(reading => (
                  <ReadingCard
                    key={reading.id}
                    reading={reading}
                    onClick={() => handleReadingClick(reading)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ReadingCard({
  reading,
  onClick,
  featured = false,
}: {
  reading: Reading;
  onClick: () => void;
  featured?: boolean;
}) {
  const isExternal = !!reading.link;
  const categoryColor = CATEGORY_COLORS[reading.category] || "bg-muted text-muted-foreground";

  return (
    <Card
      className="hover-elevate cursor-pointer overflow-hidden"
      onClick={onClick}
      data-testid={`card-reading-${reading.id}`}
    >
      {reading.thumbnailUrl && (
        <div className="w-full h-40 overflow-hidden bg-muted">
          <img
            src={reading.thumbnailUrl}
            alt={reading.title}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
          />
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${categoryColor}`}>
            {reading.category}
          </span>
          {isExternal && (
            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          )}
        </div>

        <div>
          <h3 className="font-semibold leading-snug line-clamp-2">{reading.title}</h3>
          {reading.author && (
            <p className="text-xs text-muted-foreground mt-0.5">by {reading.author}</p>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">{reading.description}</p>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 flex-wrap">
            {reading.readTime && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {reading.readTime}
              </span>
            )}
            {reading.tags?.slice(0, 2).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs no-default-active-elevate">
                {tag}
              </Badge>
            ))}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
