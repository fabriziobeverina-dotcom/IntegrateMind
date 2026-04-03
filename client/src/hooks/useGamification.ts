import { useQuery } from "@tanstack/react-query";

export interface GamificationStatus {
  seedsTotal: number;
  plantStage: 'seed' | 'sprout' | 'plant' | 'flowering' | 'tree';
  badgesUnlocked: string[];
  seedsHistory: Array<{ action: string; seeds: number; timestamp: string; dedupKey?: string }>;
  hasEarnedFirstSeeds: boolean;
  seedsToNextStage: { label: string; remaining: number } | null;
}

const STAGE_THRESHOLDS = [
  { min: 0, max: 101, stage: 'seed', next: { label: 'Sprout', threshold: 101 } },
  { min: 101, max: 301, stage: 'sprout', next: { label: 'Plant', threshold: 301 } },
  { min: 301, max: 701, stage: 'plant', next: { label: 'Flowering', threshold: 701 } },
  { min: 701, max: 1501, stage: 'flowering', next: { label: 'Tree', threshold: 1501 } },
  { min: 1501, max: Infinity, stage: 'tree', next: null },
];

export function useGamification() {
  const query = useQuery<GamificationStatus>({
    queryKey: ['/api/gamification/status'],
    staleTime: 30_000,
    retry: 1,
  });

  return query;
}

export function computeSeedsToNextStage(total: number): { label: string; remaining: number } | null {
  const tier = STAGE_THRESHOLDS.find(t => total >= t.min && total < t.max);
  if (!tier || !tier.next) return null;
  return { label: tier.next.label, remaining: tier.next.threshold - total };
}
