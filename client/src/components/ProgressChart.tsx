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
  isLoading?: boolean;
}

const metricConfig = {
  mood: { 
    label: 'Mood', 
    icon: Heart, 
    color: '#8b5cf6', 
    description: 'Emotional wellbeing' 
  },
  sleep: { 
    label: 'Sleep', 
    icon: Moon, 
    color: '#06b6d4', 
    description: 'Rest quality' 
  },
  grounding: { 
    label: 'Grounding', 
    icon: Anchor, 
    color: '#10b981', 
    description: 'Present moment connection' 
  }
};

export function ProgressChart({ data, selectedMetric, onMetricSelect, isLoading = false }: ProgressChartProps) {
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
    <Card className="p-4 sm:p-6 space-y-3 sm:space-y-4 w-full min-w-0">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-base sm:text-lg">Progress Tracking</h3>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Weekly insights</p>
        </div>
      </div>

      <div className="flex gap-1.5 sm:gap-2 flex-wrap overflow-x-auto pb-1">
        {Object.entries(metricConfig).map(([key, config]) => {
          const Icon = config.icon;
          const isSelected = selectedMetric === key;
          return (
            <Button
              key={key}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onMetricSelect(key as 'mood' | 'sleep' | 'grounding')}
              className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 text-xs sm:text-sm"
              data-testid={`button-metric-${key}`}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{config.label}</span>
              <span className="sm:hidden">{config.label}</span>
            </Button>
          );
        })}
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" style={{ color: currentConfig.color }} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm sm:text-base">{currentConfig.label}</p>
              <p className="text-xs text-muted-foreground hidden sm:block">{currentConfig.description}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="text-xl sm:text-2xl font-bold" style={{ color: currentConfig.color }} data-testid={`text-current-${selectedMetric}`}>
                {latestValue}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground">/10</span>
            </div>
            {trend !== 0 && (
              <Badge 
                variant={trend > 0 ? "default" : "secondary"}
                className="text-[10px] sm:text-xs mt-1"
                data-testid={`badge-trend-${selectedMetric}`}
              >
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}
              </Badge>
            )}
          </div>
        </div>

        <div className="h-[180px] sm:h-[200px] w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-xs sm:text-sm text-muted-foreground">Loading...</p>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-full px-4">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground text-sm">No progress data available</p>
                <p className="text-xs text-muted-foreground">Start tracking in journal entries</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  domain={[0, 10]} 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tick={{ fontSize: 10 }}
                  width={30}
                />
                <Tooltip 
                  formatter={formatTooltip}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey={selectedMetric}
                  stroke={currentConfig.color}
                  strokeWidth={2}
                  dot={{ fill: currentConfig.color, strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: currentConfig.color, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Card>
  );
}
