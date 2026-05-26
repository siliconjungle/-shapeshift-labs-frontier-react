export interface TelemetrySample {
  name: string;
  valueMs: number;
}

export interface TelemetrySummary {
  name: string;
  count: number;
  medianMs: number;
  p95Ms: number;
}

export function summarizeTelemetry(samples: readonly TelemetrySample[]): TelemetrySummary[] {
  const groups = new Map<string, number[]>();
  for (const sample of samples) {
    let values = groups.get(sample.name);
    if (values === undefined) {
      values = [];
      groups.set(sample.name, values);
    }
    values.push(sample.valueMs);
  }
  return Array.from(groups.entries())
    .map(([name, values]) => {
      const sorted = values.slice(-200).sort((left, right) => left - right);
      return {
        name,
        count: values.length,
        medianMs: percentile(sorted, 0.5),
        p95Ms: percentile(sorted, 0.95)
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[index];
}
