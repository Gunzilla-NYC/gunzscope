import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const VERSION = 'v0.2.3';

// Load brand fonts (cached at module level across invocations)
const chakraFontData = fetch(
  new URL('../../_fonts/ChakraPetch-Bold.ttf', import.meta.url),
).then((res) => res.arrayBuffer());

const monoFontData = fetch(
  new URL('../../_fonts/JetBrainsMono-SemiBold.ttf', import.meta.url),
).then((res) => res.arrayBuffer());

// Subtle dot-grid background pattern (SVG data URI)
const DOT_GRID_SVG = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="1" cy="1" r="0.6" fill="rgba(255,255,255,0.04)"/></svg>`,
)}`;

// ── Corner bracket component ──────────────────────────────────────────
function CornerBracket({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const size = 28;
  const thickness = 2;
  const color = '#A6F700';

  const isTop = position === 'tl' || position === 'tr';
  const isLeft = position === 'tl' || position === 'bl';

  return (
    <div
      style={{
        position: 'absolute',
        top: isTop ? 24 : undefined,
        bottom: !isTop ? 24 : undefined,
        left: isLeft ? 28 : undefined,
        right: !isLeft ? 28 : undefined,
        width: size,
        height: size,
        display: 'flex',
      }}
    >
      {/* Horizontal bar */}
      <div
        style={{
          position: 'absolute',
          top: isTop ? 0 : undefined,
          bottom: !isTop ? 0 : undefined,
          left: isLeft ? 0 : undefined,
          right: !isLeft ? 0 : undefined,
          width: size,
          height: thickness,
          background: color,
        }}
      />
      {/* Vertical bar */}
      <div
        style={{
          position: 'absolute',
          top: isTop ? 0 : undefined,
          bottom: !isTop ? 0 : undefined,
          left: isLeft ? 0 : undefined,
          right: !isLeft ? 0 : undefined,
          width: thickness,
          height: size,
          background: color,
        }}
      />
    </div>
  );
}

// ── Metric card component ─────────────────────────────────────────────
function MetricCard({
  value,
  label,
  accentColor,
}: {
  value: string;
  label: string;
  accentColor: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        background: 'rgba(255,255,255,0.025)',
        borderLeft: `3px solid ${accentColor}`,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '22px 24px',
      }}
    >
      <span
        style={{
          color: accentColor,
          fontSize: 32,
          fontWeight: 700,
          fontFamily: 'JetBrains Mono',
        }}
      >
        {value}
      </span>
      <span
        style={{
          color: 'rgba(255,255,255,0.3)',
          fontSize: 11,
          fontFamily: 'JetBrains Mono',
          letterSpacing: '0.2em',
          marginTop: 8,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  const { searchParams } = request.nextUrl;

  // Pre-computed values (from Share button)
  const totalUsd = searchParams.get('v');
  const gunBalance = searchParams.get('g');
  const nftCount = searchParams.get('n');
  const pnlPct = searchParams.get('pnl');
  const gunSpent = searchParams.get('gs');

  const shortAddr = `${address.slice(0, 6)}\u2026${address.slice(-4)}`;
  const hasValues = !!(totalUsd || gunBalance || nftCount);

  const pnlIsNegative = pnlPct?.startsWith('-');
  const pnlColor = pnlIsNegative ? '#FF4444' : '#00FF88';
  const pnlArrow = pnlIsNegative ? '\u25BC' : '\u25B2';
  const pnlSign = pnlIsNegative || pnlPct?.startsWith('+') ? '' : '+';

  const [chakraFont, monoFont] = await Promise.all([chakraFontData, monoFontData]);

  // Collect metric cards to render
  const metrics: { value: string; label: string; accentColor: string }[] = [];
  if (gunBalance) metrics.push({ value: gunBalance, label: 'GUN BALANCE', accentColor: '#A6F700' });
  if (nftCount) metrics.push({ value: nftCount, label: 'NFTS OWNED', accentColor: '#6D5BFF' });
  if (gunSpent) metrics.push({ value: gunSpent, label: 'GUN INVESTED', accentColor: '#00FF88' });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#0A0A0A',
          backgroundImage: `url("${DOT_GRID_SVG}")`,
          backgroundSize: '32px 32px',
          fontFamily: 'Chakra Petch',
          position: 'relative',
        }}
      >
        {/* Corner brackets */}
        <CornerBracket position="tl" />
        <CornerBracket position="tr" />
        <CornerBracket position="bl" />
        <CornerBracket position="br" />

        {/* Inner content area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '56px 68px',
          }}
        >
          {/* Header row: Logo + label + version */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <span
                style={{
                  color: '#A6F700',
                  fontSize: 30,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                }}
              >
                GUNZSCOPE
              </span>
              <div
                style={{
                  width: 1,
                  height: 20,
                  background: 'rgba(255,255,255,0.12)',
                }}
              />
              <span
                style={{
                  color: 'rgba(255,255,255,0.25)',
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono',
                  letterSpacing: '0.25em',
                }}
              >
                PORTFOLIO INTEL
              </span>
            </div>
            <span
              style={{
                color: 'rgba(255,255,255,0.15)',
                fontSize: 13,
                fontFamily: 'JetBrains Mono',
              }}
            >
              {VERSION}
            </span>
          </div>

          {/* Accent gradient line */}
          <div
            style={{
              width: '100%',
              height: 2,
              background: 'linear-gradient(to right, #A6F700, #6D5BFF 50%, transparent)',
              marginTop: 20,
              marginBottom: 36,
            }}
          />

          {hasValues ? (
            /* ── Rich card with pre-computed values ── */
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Portfolio value + P&L */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span
                    style={{
                      color: 'rgba(255,255,255,0.3)',
                      fontSize: 12,
                      fontFamily: 'JetBrains Mono',
                      letterSpacing: '0.25em',
                    }}
                  >
                    ESTIMATED VALUE
                  </span>
                  <span
                    style={{
                      color: 'white',
                      fontSize: 64,
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    ${totalUsd}
                  </span>
                </div>

                {/* P&L badge */}
                {pnlPct && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: pnlIsNegative ? 'rgba(255,68,68,0.1)' : 'rgba(0,255,136,0.1)',
                      border: `1px solid ${pnlIsNegative ? 'rgba(255,68,68,0.2)' : 'rgba(0,255,136,0.2)'}`,
                      padding: '10px 20px',
                      marginTop: 8,
                    }}
                  >
                    <span
                      style={{
                        color: pnlColor,
                        fontSize: 14,
                        fontFamily: 'JetBrains Mono',
                      }}
                    >
                      {pnlArrow}
                    </span>
                    <span
                      style={{
                        color: pnlColor,
                        fontSize: 24,
                        fontWeight: 700,
                        fontFamily: 'JetBrains Mono',
                      }}
                    >
                      {pnlSign}{pnlPct}%
                    </span>
                    <span
                      style={{
                        color: 'rgba(255,255,255,0.25)',
                        fontSize: 11,
                        fontFamily: 'JetBrains Mono',
                        letterSpacing: '0.15em',
                      }}
                    >
                      NFT P&L
                    </span>
                  </div>
                )}
              </div>

              {/* Metrics row */}
              {metrics.length > 0 && (
                <div style={{ display: 'flex', gap: 16, marginTop: 40 }}>
                  {metrics.map((m) => (
                    <MetricCard key={m.label} value={m.value} label={m.label} accentColor={m.accentColor} />
                  ))}
                </div>
              )}

              {/* Bottom: address + site */}
              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    color: 'rgba(255,255,255,0.2)',
                    fontSize: 16,
                    fontFamily: 'JetBrains Mono',
                  }}
                >
                  {shortAddr}
                </span>
                <span
                  style={{
                    color: 'rgba(255,255,255,0.1)',
                    fontSize: 14,
                    fontFamily: 'JetBrains Mono',
                    letterSpacing: '0.05em',
                  }}
                >
                  gunzscope.xyz
                </span>
              </div>
            </div>
          ) : (
            /* ── Generic card (address only) ── */
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                <span style={{ color: 'white', fontSize: 48, fontWeight: 700 }}>
                  Portfolio
                </span>
                <span
                  style={{
                    color: '#A6F700',
                    fontSize: 28,
                    fontFamily: 'JetBrains Mono',
                  }}
                >
                  {shortAddr}
                </span>
              </div>

              <div style={{ marginTop: 32 }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 20 }}>
                  View GUN token balance &amp; NFT holdings on GUNZscope
                </span>
              </div>

              {/* Decorative metric pills */}
              <div style={{ display: 'flex', gap: 16, marginTop: 36 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(166,247,0,0.04)',
                    borderLeft: '2px solid rgba(166,247,0,0.3)',
                    borderTop: '1px solid rgba(166,247,0,0.08)',
                    borderRight: '1px solid rgba(166,247,0,0.08)',
                    borderBottom: '1px solid rgba(166,247,0,0.08)',
                    padding: '10px 20px',
                  }}
                >
                  <span style={{ color: '#A6F700', fontSize: 14, fontFamily: 'JetBrains Mono' }}>
                    GUN Balance
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(109,91,255,0.04)',
                    borderLeft: '2px solid rgba(109,91,255,0.3)',
                    borderTop: '1px solid rgba(109,91,255,0.08)',
                    borderRight: '1px solid rgba(109,91,255,0.08)',
                    borderBottom: '1px solid rgba(109,91,255,0.08)',
                    padding: '10px 20px',
                  }}
                >
                  <span style={{ color: '#6D5BFF', fontSize: 14, fontFamily: 'JetBrains Mono' }}>
                    NFT Holdings
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(0,255,136,0.04)',
                    borderLeft: '2px solid rgba(0,255,136,0.3)',
                    borderTop: '1px solid rgba(0,255,136,0.08)',
                    borderRight: '1px solid rgba(0,255,136,0.08)',
                    borderBottom: '1px solid rgba(0,255,136,0.08)',
                    padding: '10px 20px',
                  }}
                >
                  <span style={{ color: '#00FF88', fontSize: 14, fontFamily: 'JetBrains Mono' }}>
                    P&amp;L Tracking
                  </span>
                </div>
              </div>

              {/* Bottom */}
              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    color: 'rgba(255,255,255,0.1)',
                    fontSize: 14,
                    fontFamily: 'JetBrains Mono',
                    letterSpacing: '0.05em',
                  }}
                >
                  gunzscope.xyz
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Chakra Petch', data: chakraFont, weight: 700 as const, style: 'normal' as const },
        { name: 'JetBrains Mono', data: monoFont, weight: 600 as const, style: 'normal' as const },
      ],
    },
  );
}
