import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Save, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";

interface JournalEntryProps {
  onSave?: (entry: { content: string; tags: string[] }) => void;
  existingEntry?: { content: string; tags: string[]; date: string };
}

export function JournalEntry({ onSave, existingEntry }: JournalEntryProps) {
  const [content, setContent] = useState(existingEntry?.content || "");
  const [tags, setTags] = useState<string[]>(existingEntry?.tags || []);
  const [currentTag, setCurrentTag] = useState("");

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = () => {
    if (content.trim()) {
      onSave?.({ content, tags });
      console.log('Journal entry saved:', { content, tags });
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm" data-testid="text-journal-date">
            {existingEntry?.date || new Date().toLocaleDateString()}
          </span>
        </div>
        <Button onClick={handleSave} size="sm" data-testid="button-save-entry">
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>

      <Textarea
        placeholder="What's on your mind today? Share your thoughts, feelings, and insights..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[200px] resize-none font-serif text-base leading-relaxed"
        data-testid="input-journal-content"
      />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Tags</span>
        </div>
        
        <div className="flex gap-2">
          <Input
            placeholder="Add a tag (e.g., gratitude, anxiety, insight)"
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTag()}
            className="flex-1"
            data-testid="input-tag"
          />
          <Button onClick={addTag} variant="outline" size="sm" data-testid="button-add-tag">
            Add
          </Button>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge 
                key={tag} 
                variant="secondary" 
                className="cursor-pointer hover-elevate" 
                onClick={() => removeTag(tag)}
                data-testid={`tag-${tag}`}
              >
                {tag} ×
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}