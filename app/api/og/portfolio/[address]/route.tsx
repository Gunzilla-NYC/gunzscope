import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Load brand fonts (cached at module level across invocations)
const chakraFontData = fetch(
  new URL('../../_fonts/ChakraPetch-Bold.ttf', import.meta.url),
).then((res) => res.arrayBuffer());

const monoFontData = fetch(
  new URL('../../_fonts/JetBrainsMono-SemiBold.ttf', import.meta.url),
).then((res) => res.arrayBuffer());

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

  const shortAddr = `${address.slice(0, 6)}\u2026${address.slice(-4)}`;
  const hasValues = !!(totalUsd || gunBalance || nftCount);

  const [chakraFont, monoFont] = await Promise.all([chakraFontData, monoFontData]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#0A0A0A',
          padding: '48px 56px',
          fontFamily: 'Chakra Petch',
        }}
      >
        {/* Top: Logo + version */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#A6F700', fontSize: 34, fontWeight: 700, letterSpacing: '0.1em' }}>
              GUNZSCOPE
            </span>
          </div>
          <span
            style={{
              color: 'rgba(255,255,255,0.2)',
              fontSize: 16,
              fontFamily: 'JetBrains Mono',
            }}
          >
            v0.1.6
          </span>
        </div>

        {/* Accent line */}
        <div
          style={{
            width: '100%',
            height: 2,
            background: 'linear-gradient(to right, #A6F700, #6D5BFF, transparent)',
            marginTop: 20,
            marginBottom: 40,
          }}
        />

        {hasValues ? (
          /* ── Rich card with pre-computed values ── */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {/* Portfolio value */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span
                style={{
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase' as const,
                }}
              >
                PORTFOLIO VALUE
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
                <span style={{ color: 'white', fontSize: 72, fontWeight: 700 }}>
                  ${totalUsd}
                </span>
                {pnlPct && (
                  <span
                    style={{
                      color: pnlPct.startsWith('-') ? '#FF4444' : '#00FF88',
                      fontSize: 28,
                      fontWeight: 700,
                      fontFamily: 'JetBrains Mono',
                    }}
                  >
                    {pnlPct.startsWith('-') || pnlPct.startsWith('+') ? '' : '+'}{pnlPct}%
                  </span>
                )}
              </div>
            </div>

            {/* Metrics row */}
            <div style={{ display: 'flex', gap: 20, marginTop: 40 }}>
              {gunBalance && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: '20px 28px',
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      color: '#A6F700',
                      fontSize: 36,
                      fontWeight: 700,
                      fontFamily: 'JetBrains Mono',
                    }}
                  >
                    {gunBalance}
                  </span>
                  <span
                    style={{
                      color: 'rgba(255,255,255,0.25)',
                      fontSize: 13,
                      fontFamily: 'JetBrains Mono',
                      letterSpacing: '0.15em',
                      marginTop: 6,
                    }}
                  >
                    GUN BALANCE
                  </span>
                </div>
              )}
              {nftCount && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: '20px 28px',
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      color: '#6D5BFF',
                      fontSize: 36,
                      fontWeight: 700,
                      fontFamily: 'JetBrains Mono',
                    }}
                  >
                    {nftCount}
                  </span>
                  <span
                    style={{
                      color: 'rgba(255,255,255,0.25)',
                      fontSize: 13,
                      fontFamily: 'JetBrains Mono',
                      letterSpacing: '0.15em',
                      marginTop: 6,
                    }}
                  >
                    NFTS OWNED
                  </span>
                </div>
              )}
            </div>

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
                  fontSize: 18,
                  fontFamily: 'JetBrains Mono',
                }}
              >
                {shortAddr}
              </span>
              <span
                style={{
                  color: 'rgba(255,255,255,0.12)',
                  fontSize: 16,
                  fontFamily: 'JetBrains Mono',
                }}
              >
                gunzscope.xyz
              </span>
            </div>
          </div>
        ) : (
          /* ── Generic card (address only) ── */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              <span style={{ color: 'white', fontSize: 52, fontWeight: 700 }}>
                Portfolio
              </span>
              <span
                style={{
                  color: '#A6F700',
                  fontSize: 30,
                  fontFamily: 'JetBrains Mono',
                }}
              >
                {shortAddr}
              </span>
            </div>

            <div style={{ marginTop: 36 }}>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 22 }}>
                View GUN token balance & NFT holdings
              </span>
            </div>

            {/* Decorative metrics placeholder */}
            <div style={{ display: 'flex', gap: 20, marginTop: 40 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(166,247,0,0.04)',
                  border: '1px solid rgba(166,247,0,0.08)',
                  padding: '10px 20px',
                }}
              >
                <span style={{ color: '#A6F700', fontSize: 16, fontFamily: 'JetBrains Mono' }}>
                  GUN Balance
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(109,91,255,0.04)',
                  border: '1px solid rgba(109,91,255,0.08)',
                  padding: '10px 20px',
                }}
              >
                <span style={{ color: '#6D5BFF', fontSize: 16, fontFamily: 'JetBrains Mono' }}>
                  NFT Holdings
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(0,255,136,0.04)',
                  border: '1px solid rgba(0,255,136,0.08)',
                  padding: '10px 20px',
                }}
              >
                <span style={{ color: '#00FF88', fontSize: 16, fontFamily: 'JetBrains Mono' }}>
                  P&L Tracking
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
                  color: 'rgba(255,255,255,0.12)',
                  fontSize: 16,
                  fontFamily: 'JetBrains Mono',
                }}
              >
                gunzscope.xyz
              </span>
            </div>
          </div>
        )}
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
