import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, Heart, Moon, Anchor } from "lucide-react";

interface ProgressData {
  date: string;
  mood: number;
  sleep: number;
  grounding: number;
}

interface ProgressChartProps {
  data: ProgressData[];
  selectedMetric: 'mood' | 'sleep' | 'grounding';
  onMetricSelect: (metric: 'mood' | 'sleep' | 'grounding') => void;
}

const metricConfig = {
  mood: { 
    label: 'Mood', 
    icon: Heart, 
    color: '#8b5cf6', 
    description: 'Overall emotional wellbeing' 
  },
  sleep: { 
    label: 'Sleep Quality', 
    icon: Moon, 
    color: '#06b6d4', 
    description: 'Rest and recovery quality' 
  },
  grounding: { 
    label: 'Grounding', 
    icon: Anchor, 
    color: '#10b981', 
    description: 'Connection to body and present moment' 
  }
};

export function ProgressChart({ data, selectedMetric, onMetricSelect }: ProgressChartProps) {
  const currentConfig = metricConfig[selectedMetric];
  const IconComponent = currentConfig.icon;
  
  const latestValue = data.length > 0 ? data[data.length - 1][selectedMetric] : 0;
  const previousValue = data.length > 1 ? data[data.length - 2][selectedMetric] : latestValue;
  const trend = latestValue - previousValue;
  
  const formatTooltip = (value: number, name: string) => {
    const config = metricConfig[name as keyof typeof metricConfig];
    return [`${value}/10`, config?.label || name];
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Progress Tracking</h3>
          <p className="text-sm text-muted-foreground">Weekly mood, sleep, and grounding insights</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {Object.entries(metricConfig).map(([key, config]) => {
          const Icon = config.icon;
          const isSelected = selectedMetric === key;
          return (
            <Button
              key={key}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onMetricSelect(key as 'mood' | 'sleep' | 'grounding')}
              className="flex items-center gap-2"
              data-testid={`button-metric-${key}`}
            >
              <Icon className="h-4 w-4" />
              {config.label}
            </Button>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className="h-5 w-5" style={{ color: currentConfig.color }} />
            <div>
              <p className="font-medium">{currentConfig.label}</p>
              <p className="text-xs text-muted-foreground">{currentConfig.description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold" style={{ color: currentConfig.color }} data-testid={`text-current-${selectedMetric}`}>
                {latestValue}
              </span>
              <span className="text-sm text-muted-foreground">/10</span>
            </div>
            {trend !== 0 && (
              <Badge 
                variant={trend > 0 ? "default" : "secondary"}
                className="text-xs"
                data-testid={`badge-trend-${selectedMetric}`}
              >
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}
              </Badge>
            )}
          </div>
        </div>

        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                domain={[0, 10]} 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip 
                formatter={formatTooltip}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey={selectedMetric}
                stroke={currentConfig.color}
                strokeWidth={3}
                dot={{ fill: currentConfig.color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: currentConfig.color, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

