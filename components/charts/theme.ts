// Shared chart theme — brand colors, fonts, and constants for all visx charts
export const chartTheme = {
  colors: {
    lime: '#A6F700',
    purple: '#6D5BFF',
    profit: '#00FF88',
    loss: '#FF4444',
    grid: 'rgba(255,255,255,0.04)',
    gridStrong: 'rgba(255,255,255,0.06)',
    axis: 'rgba(255,255,255,0.12)',
    text: 'rgba(255,255,255,0.35)',
    axisLabel: 'rgba(255,255,255,0.5)',
    axisLabelHover: 'rgba(255,255,255,0.7)',
    textHover: 'rgba(255,255,255,0.6)',
    surface: '#161616',
    surfaceHover: '#1C1C1C',
    zoneProfit: 'rgba(0,255,136,0.025)',
    zoneLoss: 'rgba(255,68,68,0.025)',
  },
  fonts: {
    mono: '"JetBrains Mono", monospace',
  },
} as const;
