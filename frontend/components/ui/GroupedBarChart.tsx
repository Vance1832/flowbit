type Series = {
  name: string;
  color: string; // a CSS color or var() string
  values: number[];
};

type GroupedBarChartProps = {
  categories: string[];
  series: Series[];
  formatValue?: (value: number) => string;
  height?: number;
};

const VIEW_WIDTH = 720;
const PAD_LEFT = 10;
const PAD_RIGHT = 10;
const PAD_TOP = 12;
const PAD_BOTTOM = 30;

/**
 * Lightweight, dependency-free grouped bar chart. Colors are passed in (CSS vars
 * supported), so it adapts to light/dark themes. Hovering a bar shows its value
 * via a native SVG <title> tooltip.
 */
export function GroupedBarChart({
  categories,
  series,
  formatValue = (value) => String(value),
  height = 240,
}: GroupedBarChartProps) {
  const plotWidth = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;
  const baselineY = PAD_TOP + plotHeight;

  const max = Math.max(
    1,
    ...series.flatMap((entry) => entry.values),
  );

  const groupWidth = plotWidth / Math.max(1, categories.length);
  const innerGap = groupWidth * 0.18;
  const barCount = Math.max(1, series.length);
  const barWidth = (groupWidth - innerGap) / barCount;
  const labelStep = Math.ceil(categories.length / 8);

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
      className="w-full"
      role="img"
      preserveAspectRatio="none"
    >
      {/* baseline */}
      <line
        x1={PAD_LEFT}
        y1={baselineY}
        x2={VIEW_WIDTH - PAD_RIGHT}
        y2={baselineY}
        stroke="var(--color-border)"
        strokeWidth="1"
      />
      {categories.map((category, categoryIndex) => {
        const groupX = PAD_LEFT + categoryIndex * groupWidth + innerGap / 2;
        return (
          <g key={category + categoryIndex}>
            {series.map((entry, seriesIndex) => {
              const value = entry.values[categoryIndex] ?? 0;
              const barHeight = max > 0 ? (value / max) * plotHeight : 0;
              const x = groupX + seriesIndex * barWidth;
              const y = baselineY - barHeight;
              return (
                <rect
                  key={entry.name}
                  x={x + 1}
                  y={y}
                  width={Math.max(0, barWidth - 2)}
                  height={barHeight}
                  rx="2"
                  fill={entry.color}
                >
                  <title>{`${category} · ${entry.name}: ${formatValue(value)}`}</title>
                </rect>
              );
            })}
            {categoryIndex % labelStep === 0 ? (
              <text
                x={groupX + (groupWidth - innerGap) / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize="11"
                fill="var(--color-muted-foreground)"
              >
                {category}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
