// ────────────────────────────────────────────────────────────
// Monotone cubic Hermite interpolation (Fritsch-Carlson method)
// Produces smooth curves that never overshoot — same algorithm
// used by visx curveMonotoneX / d3-shape curveMonotoneX.
// ────────────────────────────────────────────────────────────
export function monotoneCubicPath(points: { x: number; y: number }[]): string {
  const n = points.length;
  if (n < 2) return '';
  if (n === 2) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;

  // Slopes between adjacent points
  const dxs: number[] = [];
  const dys: number[] = [];
  const deltas: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    dxs.push(dx);
    dys.push(dy);
    deltas.push(dx === 0 ? 0 : dy / dx);
  }

  // Tangents (monotone Fritsch-Carlson)
  const tangents: number[] = [deltas[0]];
  for (let i = 1; i < n - 1; i++) {
    if (deltas[i - 1] * deltas[i] <= 0) {
      tangents.push(0);
    } else {
      tangents.push((deltas[i - 1] + deltas[i]) / 2);
    }
  }
  tangents.push(deltas[n - 2]);

  // Enforce monotonicity — clamp alpha/beta to the 3-circle
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(deltas[i]) < 1e-12) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const alpha = tangents[i] / deltas[i];
      const beta = tangents[i + 1] / deltas[i];
      const s = alpha * alpha + beta * beta;
      if (s > 9) {
        const t = 3 / Math.sqrt(s);
        tangents[i] = t * alpha * deltas[i];
        tangents[i + 1] = t * beta * deltas[i];
      }
    }
  }

  // Build cubic bezier path
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const seg = dxs[i] / 3;
    const cp1x = points[i].x + seg;
    const cp1y = points[i].y + tangents[i] * seg;
    const cp2x = points[i + 1].x - seg;
    const cp2y = points[i + 1].y - tangents[i + 1] * seg;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${points[i + 1].x.toFixed(1)} ${points[i + 1].y.toFixed(1)}`;
  }
  return d;
}

/** Compute smooth SVG sparkline path using monotone cubic interpolation */
export function computeSparklinePath(
  values: number[],
  w: number,
  h: number,
  globalMin: number,
  globalMax: number,
): { path: string; fillPath: string; points: { x: number; y: number }[] } {
  if (values.length < 2) return { path: '', fillPath: '', points: [] };

  const range = globalMax - globalMin || 1;
  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: h - ((v - globalMin) / range) * h,
  }));

  const path = monotoneCubicPath(points);
  const fillPath = `${path} L ${points[points.length - 1].x.toFixed(1)} ${h} L 0 ${h} Z`;

  return { path, fillPath, points };
}
