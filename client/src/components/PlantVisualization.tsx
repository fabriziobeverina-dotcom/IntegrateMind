interface PlantVisualizationProps {
  stage: 'seed' | 'sprout' | 'plant' | 'flowering' | 'tree';
  seedsTotal: number;
  seedsToNextStage: { label: string; remaining: number } | null;
  className?: string;
}

function SeedSvg() {
  return (
    <g>
      <ellipse cx="100" cy="235" rx="55" ry="18" fill="hsl(var(--muted))" opacity="0.5" />
      <ellipse cx="100" cy="215" rx="22" ry="28" fill="hsl(25 45% 42%)" />
      <ellipse cx="100" cy="213" rx="18" ry="24" fill="hsl(25 40% 50%)" />
      <line x1="100" y1="195" x2="112" y2="205" stroke="hsl(25 30% 65%)" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

function SproutSvg() {
  return (
    <g>
      <ellipse cx="100" cy="250" rx="60" ry="12" fill="hsl(var(--muted))" opacity="0.4" />
      <line x1="100" y1="248" x2="100" y2="190" stroke="hsl(120 30% 40%)" strokeWidth="3" strokeLinecap="round" />
      <path d="M100 215 Q75 200 72 182 Q88 185 100 205" fill="hsl(120 35% 52%)" opacity="0.9" />
      <path d="M100 210 Q125 195 128 178 Q112 181 100 200" fill="hsl(130 38% 50%)" opacity="0.9" />
    </g>
  );
}

function PlantSvg() {
  return (
    <g>
      <ellipse cx="100" cy="258" rx="62" ry="12" fill="hsl(var(--muted))" opacity="0.4" />
      <line x1="100" y1="256" x2="100" y2="160" stroke="hsl(120 32% 35%)" strokeWidth="4" strokeLinecap="round" />
      <path d="M100 235 Q68 218 64 196 Q84 200 100 225" fill="hsl(130 40% 45%)" />
      <path d="M100 228 Q132 212 136 190 Q116 194 100 218" fill="hsl(125 42% 48%)" />
      <path d="M100 205 Q70 185 66 163 Q87 168 100 195" fill="hsl(128 38% 42%)" />
      <path d="M100 198 Q130 178 134 156 Q113 161 100 188" fill="hsl(132 40% 46%)" />
      <path d="M100 175 Q76 162 74 145 Q91 149 100 168" fill="hsl(126 36% 44%)" />
      <path d="M100 168 Q124 155 126 138 Q109 142 100 161" fill="hsl(130 38% 47%)" />
    </g>
  );
}

function FloweringSvg() {
  return (
    <g>
      <ellipse cx="100" cy="258" rx="62" ry="12" fill="hsl(var(--muted))" opacity="0.4" />
      <line x1="100" y1="256" x2="100" y2="150" stroke="hsl(120 32% 35%)" strokeWidth="4" strokeLinecap="round" />
      <path d="M100 235 Q68 218 64 196 Q84 200 100 225" fill="hsl(130 40% 45%)" />
      <path d="M100 228 Q132 212 136 190 Q116 194 100 218" fill="hsl(125 42% 48%)" />
      <path d="M100 205 Q70 185 66 163 Q87 168 100 195" fill="hsl(128 38% 42%)" />
      <path d="M100 198 Q130 178 134 156 Q113 161 100 188" fill="hsl(132 40% 46%)" />
      <path d="M100 168 Q74 158 72 140 Q90 144 100 162" fill="hsl(126 36% 44%)" />
      <path d="M100 160 Q126 150 128 132 Q110 136 100 153" fill="hsl(130 38% 47%)" />
      {/* Flowers */}
      <g transform="translate(72, 138)">
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx={Math.cos(a*Math.PI/180)*7} cy={Math.sin(a*Math.PI/180)*7} rx="5" ry="4"
            fill="hsl(25 80% 65%)" transform={`rotate(${a})`} />
        ))}
        <circle cx="0" cy="0" r="4" fill="hsl(40 90% 65%)" />
      </g>
      <g transform="translate(128, 130)">
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx={Math.cos(a*Math.PI/180)*6} cy={Math.sin(a*Math.PI/180)*6} rx="4.5" ry="3.5"
            fill="hsl(10 75% 65%)" transform={`rotate(${a})`} />
        ))}
        <circle cx="0" cy="0" r="3.5" fill="hsl(40 85% 60%)" />
      </g>
      <g transform="translate(100, 148)">
        {[0,72,144,216,288].map(a => (
          <ellipse key={a} cx={Math.cos(a*Math.PI/180)*5} cy={Math.sin(a*Math.PI/180)*5} rx="4" ry="3"
            fill="hsl(30 78% 68%)" transform={`rotate(${a})`} />
        ))}
        <circle cx="0" cy="0" r="3" fill="hsl(45 88% 62%)" />
      </g>
    </g>
  );
}

function TreeSvg() {
  return (
    <g>
      <ellipse cx="100" cy="258" rx="68" ry="12" fill="hsl(var(--muted))" opacity="0.4" />
      {/* Trunk */}
      <rect x="91" y="195" width="18" height="65" rx="4" fill="hsl(25 45% 32%)" />
      <rect x="94" y="195" width="6" height="65" rx="3" fill="hsl(25 38% 40%)" />
      {/* Branches */}
      <line x1="100" y1="220" x2="68" y2="198" stroke="hsl(25 42% 34%)" strokeWidth="5" strokeLinecap="round" />
      <line x1="100" y1="210" x2="132" y2="188" stroke="hsl(25 42% 34%)" strokeWidth="5" strokeLinecap="round" />
      <line x1="100" y1="205" x2="100" y2="175" stroke="hsl(25 42% 34%)" strokeWidth="4" strokeLinecap="round" />
      {/* Canopy layers */}
      <ellipse cx="100" cy="155" rx="58" ry="45" fill="hsl(130 38% 38%)" />
      <ellipse cx="68" cy="172" rx="36" ry="28" fill="hsl(128 40% 40%)" />
      <ellipse cx="132" cy="165" rx="34" ry="26" fill="hsl(132 36% 36%)" />
      <ellipse cx="100" cy="140" rx="44" ry="34" fill="hsl(126 42% 42%)" />
      <ellipse cx="100" cy="128" rx="30" ry="22" fill="hsl(130 44% 46%)" />
      {/* Amber light highlights in canopy */}
      <ellipse cx="88" cy="132" rx="10" ry="7" fill="hsl(40 70% 60%)" opacity="0.35" />
      <ellipse cx="114" cy="140" rx="8" ry="6" fill="hsl(35 65% 58%)" opacity="0.3" />
      <ellipse cx="100" cy="118" rx="12" ry="8" fill="hsl(42 72% 62%)" opacity="0.32" />
    </g>
  );
}

const STAGE_NAMES: Record<string, string> = {
  seed: 'Seed',
  sprout: 'Sprout',
  plant: 'Plant',
  flowering: 'Flowering',
  tree: 'Tree',
};

export function PlantVisualization({ stage, seedsTotal, seedsToNextStage, className }: PlantVisualizationProps) {
  const stageName = STAGE_NAMES[stage] ?? stage;

  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ''}`}>
      <svg
        viewBox="0 0 200 270"
        width="160"
        height="220"
        role="img"
        aria-label={`Plant at ${stageName} stage`}
        className="overflow-visible"
      >
        {/* Soil line */}
        <line x1="20" y1="258" x2="180" y2="258" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />

        {stage === 'seed' && <SeedSvg />}
        {stage === 'sprout' && <SproutSvg />}
        {stage === 'plant' && <PlantSvg />}
        {stage === 'flowering' && <FloweringSvg />}
        {stage === 'tree' && <TreeSvg />}
      </svg>

      {/* Stage name */}
      <p className="text-sm text-muted-foreground italic" style={{ fontFamily: '"Crimson Text", Georgia, serif' }}>
        {stageName}
      </p>

      {/* Progress to next stage */}
      {seedsToNextStage ? (
        <div className="w-full max-w-[180px] space-y-1">
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-chart-2 rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, 100 - (seedsToNextStage.remaining / (seedsToNextStage.remaining + seedsTotal)) * 100)}%`
              }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            {seedsToNextStage.remaining} seeds to {seedsToNextStage.label}
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground text-center italic">Fully rooted</p>
      )}
    </div>
  );
}
