import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Palette, ArrowRight, X, Eye } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Step = "intro" | "prepare" | "canvas" | "observe" | "reflect" | "saved";

const REFLECTION_QUESTIONS = [
  "What do you see in this image?",
  "What is happening in this drawing?",
  "What emotion does this image carry?",
  "If this image could speak, what would it say?",
  "What part of you does this image represent?",
  "Does this image relate to your initial intention?",
  "Is there something this image is asking you to notice?",
  "Does this image suggest a change or action?",
];

function pickRandomQuestions(count: number): string[] {
  const shuffled = [...REFLECTION_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

interface StrokePoint {
  x: number;
  y: number;
  t: number;
}

export function CreativeExpression() {
  const [step, setStep] = useState<Step>("intro");
  const [intention, setIntention] = useState("");
  const [drawingImageData, setDrawingImageData] = useState<string | null>(null);
  const [strokesData, setStrokesData] = useState<StrokePoint[][]>([]);
  const [reflectionAnswers, setReflectionAnswers] = useState<Record<number, string>>({});
  const reflectionQuestions = useMemo(() => pickRandomQuestions(2), []);
  const { toast } = useToast();

  const { data: expressions } = useQuery<any[]>({
    queryKey: ['/api/creative-expressions'],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { intentionText: string; drawingImage: string; strokeData: StrokePoint[][] }) => {
      return await apiRequest('POST', '/api/creative-expressions', data);
    },
    onSuccess: () => {
      toast({
        title: "Drawing saved",
        description: "Your creative expression has been recorded.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/creative-expressions'] });
      setStep("saved");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save drawing",
        variant: "destructive",
      });
    },
  });

  if (step === "intro") {
    return (
      <Card className="p-4 sm:p-6 space-y-4 w-full overflow-hidden" data-testid="card-creative-intro">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
            <Palette className="h-5 w-5 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base sm:text-lg" data-testid="text-creative-title">Creative Expression</h3>
            <p className="text-sm text-muted-foreground italic mt-1">
              "Give form to what cannot yet be said in words."
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Sometimes the body and the unconscious hold wisdom that words can't reach. Scribble drawing
          is a way to bypass the thinking mind and let your hand express what's inside. There is no
          right or wrong — just movement, feeling, and discovery.
        </p>
        <Button
          onClick={() => setStep("prepare")}
          className="w-full gap-2"
          data-testid="button-start-scribble"
        >
          <Palette className="h-4 w-4" />
          Start Scribble Drawing
        </Button>
      </Card>
    );
  }

  if (step === "prepare") {
    return (
      <Card className="p-4 sm:p-6 space-y-5 w-full overflow-hidden" data-testid="card-creative-prepare">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
            <Palette className="h-5 w-5 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base sm:text-lg">Prepare Your Space</h3>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm">Allow yourself 10–20 minutes of uninterrupted time.</p>
          <p className="text-sm">Set an intention or question you want to explore.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="intention" className="text-sm font-medium">What is your intention?</Label>
          <Input
            id="intention"
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            placeholder="e.g. What am I holding onto that needs release?"
            className="text-sm"
            data-testid="input-intention"
          />
        </div>

        <div className="border-t pt-4 space-y-2">
          <p className="text-sm">Take a deep breath.</p>
          <p className="text-sm">Use your non-dominant hand.</p>
          <p className="text-sm">Close your eyes.</p>
          <p className="text-sm">Keep your finger on the screen continuously while drawing.</p>
        </div>

        <Button
          onClick={() => setStep("canvas")}
          className="w-full gap-2"
          data-testid="button-start-drawing"
        >
          <ArrowRight className="h-4 w-4" />
          Start Drawing
        </Button>
      </Card>
    );
  }

  if (step === "canvas") {
    return (
      <DrawingCanvas
        intention={intention}
        onFinish={(imageData, strokes) => {
          setDrawingImageData(imageData);
          setStrokesData(strokes);
          setStep("observe");
        }}
        onCancel={() => setStep("prepare")}
        isSaving={false}
      />
    );
  }

  if (step === "observe") {
    return (
      <Card className="p-4 sm:p-6 space-y-5 w-full overflow-hidden" data-testid="card-creative-observe">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
            <Eye className="h-5 w-5 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base sm:text-lg" data-testid="text-observe-title">Observe</h3>
          </div>
        </div>

        {drawingImageData && (
          <div className="rounded-lg overflow-hidden border">
            <img
              src={drawingImageData}
              alt="Your scribble drawing"
              className="w-full h-auto"
              data-testid="img-drawing-result"
            />
          </div>
        )}

        <p className="text-sm text-center italic text-muted-foreground" data-testid="text-observe-instruction">
          Now open your eyes and observe the image. Do not analyze. Simply notice what emerges.
        </p>

        <Button
          onClick={() => setStep("reflect")}
          className="w-full gap-2"
          data-testid="button-continue-to-reflect"
        >
          <ArrowRight className="h-4 w-4" />
          Continue
        </Button>
      </Card>
    );
  }

  if (step === "reflect") {
    return (
      <Card className="p-4 sm:p-6 space-y-5 w-full overflow-hidden" data-testid="card-creative-reflect">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
            <Palette className="h-5 w-5 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base sm:text-lg" data-testid="text-reflect-title">Reflection</h3>
          </div>
        </div>

        {drawingImageData && (
          <div className="rounded-lg overflow-hidden border">
            <img
              src={drawingImageData}
              alt="Your scribble drawing"
              className="w-full h-auto max-h-48 object-contain bg-[#faf9f7]"
              data-testid="img-drawing-reflect"
            />
          </div>
        )}

        <div className="space-y-4">
          {reflectionQuestions.map((question, index) => (
            <div key={index} className="space-y-2">
              <Label className="text-sm font-medium" data-testid={`text-reflect-question-${index}`}>
                {question}
              </Label>
              <Textarea
                value={reflectionAnswers[index] || ""}
                onChange={(e) => setReflectionAnswers(prev => ({ ...prev, [index]: e.target.value }))}
                placeholder="Take your time..."
                className="text-sm resize-none"
                rows={3}
                data-testid={`input-reflect-answer-${index}`}
              />
            </div>
          ))}
        </div>

        <Button
          onClick={() => {
            if (drawingImageData) {
              saveMutation.mutate({
                intentionText: intention,
                drawingImage: drawingImageData,
                strokeData: strokesData,
              });
            }
          }}
          disabled={saveMutation.isPending}
          className="w-full gap-2"
          data-testid="button-save-expression"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Palette className="h-4 w-4" />
          )}
          {saveMutation.isPending ? "Saving..." : "Save Expression"}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6 space-y-4 w-full overflow-hidden" data-testid="card-creative-saved">
      <div className="flex items-start gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
          <Palette className="h-5 w-5 text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base sm:text-lg">Creative Expression</h3>
          <p className="text-sm text-muted-foreground">
            Your drawing has been saved. Let the image settle — you may find meaning in it later.
          </p>
        </div>
      </div>
      {intention && (
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-0.5">Your intention</p>
          <p className="text-sm italic">"{intention}"</p>
        </div>
      )}
      {expressions && expressions.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          You have {expressions.length} creative expression{expressions.length !== 1 ? 's' : ''} saved
        </p>
      )}
    </Card>
  );
}

function DrawingCanvas({
  intention,
  onFinish,
  onCancel,
  isSaving,
}: {
  intention: string;
  onFinish: (imageData: string, strokes: StrokePoint[][]) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const strokesRef = useRef<StrokePoint[][]>([]);
  const currentStrokeRef = useRef<StrokePoint[]>([]);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const getCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawing.current = true;
    const point = { x, y, t: Date.now() };
    currentStrokeRef.current = [point];
    lastPointRef.current = { x, y };

    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((x: number, y: number) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const point = { x, y, t: Date.now() };
    currentStrokeRef.current.push(point);

    const last = lastPointRef.current;
    if (last) {
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    lastPointRef.current = { x, y };
  }, []);

  const endDrawing = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (currentStrokeRef.current.length > 0) {
      strokesRef.current.push([...currentStrokeRef.current]);
    }
    currentStrokeRef.current = [];
    lastPointRef.current = null;
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    const prevPosition = document.body.style.position;
    const prevWidth = document.body.style.width;
    const prevHeight = document.body.style.height;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    const preventDefaultTouch = (e: TouchEvent) => {
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventDefaultTouch, { passive: false });

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#faf9f7';
        ctx.fillRect(0, 0, rect.width, rect.height);
      }
    };

    resizeCanvas();

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      const { x, y } = getCanvasPoint(touch.clientX, touch.clientY);
      startDrawing(x, y);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      const { x, y } = getCanvasPoint(touch.clientX, touch.clientY);
      draw(x, y);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      endDrawing();
    };

    const handleMouseDown = (e: MouseEvent) => {
      const { x, y } = getCanvasPoint(e.clientX, e.clientY);
      startDrawing(x, y);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const { x, y } = getCanvasPoint(e.clientX, e.clientY);
      draw(x, y);
    };

    const handleMouseUp = () => {
      endDrawing();
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
      document.body.style.position = prevPosition;
      document.body.style.width = prevWidth;
      document.body.style.height = prevHeight;
      document.removeEventListener('touchmove', preventDefaultTouch);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [getCanvasPoint, startDrawing, draw, endDrawing]);

  const handleFinish = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    endDrawing();
    const imageData = canvas.toDataURL('image/png');
    onFinish(imageData, strokesRef.current);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" data-testid="div-drawing-canvas" style={{ touchAction: 'none' }}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-background flex-shrink-0">
        <Button
          size="icon"
          variant="ghost"
          onClick={onCancel}
          data-testid="button-cancel-drawing"
        >
          <X className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium truncate flex-1 text-center">Scribble Drawing</span>
        <div className="w-9" />
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none' }}
          data-testid="canvas-drawing"
        />
      </div>

      <div className="px-3 py-3 border-t bg-background flex-shrink-0">
        <Button
          onClick={handleFinish}
          disabled={isSaving}
          className="w-full gap-2"
          data-testid="button-finish-drawing"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Palette className="h-4 w-4" />
          )}
          {isSaving ? "Saving..." : "Finish Drawing"}
        </Button>
      </div>
    </div>
  );
}

export function isCreativeExpressionDay(): boolean {
  return true;
}
