import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Search, Clock, Star, X, ArrowLeft } from "lucide-react";

interface Practice {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  instructor: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  isFeatured: boolean;
  tags: string[];
}

interface VideoLibraryItem {
  id: string;
  title: string;
  description: string;
  duration?: string;
  category: string;
  instructor?: string;
  youtubeId: string;
  isFeatured: boolean;
  tags: string[];
  source: "practice" | "video";
}

function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function youtubeThumbnail(id: string) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

const CATEGORY_COLORS: Record<string, string> = {
  Calming: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Energizing: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  Grounding: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Dreamwork: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  Somatic: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  Educational: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  Testimonial: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Workshop: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

export default function Videos() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [playing, setPlaying] = useState<VideoLibraryItem | null>(null);

  const { data: practices = [], isLoading: practicesLoading } = useQuery<Practice[]>({
    queryKey: ["/api/practices"],
  });

  // Build unified list from practices with YouTube URLs
  const items: VideoLibraryItem[] = practices
    .filter(p => p.videoUrl && extractYoutubeId(p.videoUrl))
    .map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      duration: p.duration,
      category: p.category,
      instructor: p.instructor,
      youtubeId: extractYoutubeId(p.videoUrl!)!,
      isFeatured: p.isFeatured,
      tags: p.tags || [],
      source: "practice" as const,
    }));

  const categories = ["All", ...Array.from(new Set(items.map(i => i.category)))];

  const filtered = items.filter(item => {
    const matchCat = category === "All" || item.category === category;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      (item.instructor || "").toLowerCase().includes(q) ||
      item.tags.some(t => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const featured = filtered.filter(i => i.isFeatured);
  const rest = filtered.filter(i => !i.isFeatured);

  const isLoading = practicesLoading;

  // Full-screen player overlay
  if (playing) {
    return (
      <div className="absolute inset-0 flex flex-col bg-black">
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-black/90 shrink-0 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-white"
              onClick={() => setPlaying(null)}
              data-testid="button-close-player"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <span className="text-sm font-medium text-white truncate max-w-xs hidden sm:block">
              {playing.title}
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:text-white"
            onClick={() => setPlaying(null)}
            data-testid="button-close-player-x"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col">
          <iframe
            src={`https://www.youtube.com/embed/${playing.youtubeId}?autoplay=1&rel=0`}
            title={playing.title}
            className="w-full flex-1"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            data-testid="iframe-youtube-player"
          />
          <div className="bg-black/90 px-4 py-3 text-white space-y-1">
            <h2 className="font-semibold text-sm">{playing.title}</h2>
            {playing.instructor && (
              <p className="text-xs text-white/60">with {playing.instructor}</p>
            )}
            <p className="text-xs text-white/70 line-clamp-2">{playing.description}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Play className="h-8 w-8 text-primary" />
          Video Library
        </h1>
        <p className="text-muted-foreground mt-1">
          Guided practices and educational videos for your integration journey
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-videos"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48" data-testid="select-video-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Play className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No videos yet</p>
          <p className="text-sm mt-1">Add YouTube links to practices to have them appear here.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm mt-1">Try adjusting your search or category.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {featured.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Featured
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {featured.map(item => (
                  <VideoCard key={item.id} item={item} onPlay={() => setPlaying(item)} />
                ))}
              </div>
            </section>
          )}
          <section>
            {featured.length > 0 && <h2 className="text-lg font-semibold mb-4">All Videos</h2>}
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {rest.map(item => (
                <VideoCard key={item.id} item={item} onPlay={() => setPlaying(item)} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function VideoCard({ item, onPlay }: { item: VideoLibraryItem; onPlay: () => void }) {
  const categoryColor = CATEGORY_COLORS[item.category] || "bg-muted text-muted-foreground";

  return (
    <Card
      className="hover-elevate cursor-pointer overflow-hidden group"
      onClick={onPlay}
      data-testid={`card-video-${item.id}`}
    >
      <div className="relative w-full aspect-video bg-muted overflow-hidden">
        <img
          src={youtubeThumbnail(item.youtubeId)}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={e => {
            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${item.youtubeId}/0.jpg`;
          }}
        />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/90 rounded-full p-3">
            <Play className="h-6 w-6 text-black fill-black" />
          </div>
        </div>
      </div>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${categoryColor}`}>
            {item.category}
          </span>
          {item.duration && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Clock className="h-3 w-3" />
              {item.duration}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-sm leading-snug line-clamp-2">{item.title}</h3>
        {item.instructor && (
          <p className="text-xs text-muted-foreground">with {item.instructor}</p>
        )}
      </CardContent>
    </Card>
  );
}
