export default function BreakcardOverlay() {
  return (
    <>
      <style>{`
        @keyframes card-enter {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(12px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes cta-pulse {
          0%, 100% { box-shadow: 0 0 0 rgba(166,247,0,0); }
          50% { box-shadow: 0 0 16px rgba(166,247,0,0.25); }
        }
      `}</style>
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        {/* Card */}
        <div
          style={{
            width: 1200,
            position: 'relative',
            background: 'rgba(10, 10, 10, 0.95)',
            backdropFilter: 'blur(24px)',
            clipPath:
              'polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px))',
            animation: 'card-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
          }}
        >
          {/* Top accent line */}
          <div
            style={{
              height: 2,
              background: 'linear-gradient(90deg, #A6F700, #6D5BFF, #A6F700)',
            }}
          />

          {/* Corner accent — top-left */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              width: 24,
              height: 24,
              borderLeft: '1.5px solid rgba(166,247,0,0.3)',
              borderTop: '1.5px solid rgba(166,247,0,0.3)',
              pointerEvents: 'none',
            }}
          />

          {/* Corner accent — bottom-right */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              width: 24,
              height: 24,
              borderRight: '1.5px solid rgba(109,91,255,0.3)',
              borderBottom: '1.5px solid rgba(109,91,255,0.3)',
              pointerEvents: 'none',
            }}
          />

          {/* HEADER */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '32px 44px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              animation: 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both 0.1s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg
                viewBox="0 0 296 323"
                fill="#A6F700"
                style={{ width: 30, height: 30 }}
              >
                <path d="M226.337 33.0547C226.805 33.0252 230.319 35.8997 234.146 39.4424C249.229 53.4073 273.944 63.9998 291.443 64H295.985V120H184.985V142H240.985V165.13C240.985 186.22 240.763 189.251 238.462 199.511C233.52 221.548 224.135 240.262 210.985 254.303C204.167 261.583 191.781 272 189.942 272C189.534 271.999 189.644 270.086 190.188 267.75C190.733 265.413 190.951 259 190.671 253.5C190.096 242.194 187.248 232.448 181.807 223.165C176.89 214.776 164.827 203.182 156.47 198.809C148.598 194.69 136.449 191 130.756 191H126.985V212.542L133.082 213.701C141.84 215.365 149.672 219.551 155.985 225.937C172.75 242.896 173.199 270.077 156.996 287.111C154.79 289.429 152.985 291.661 152.985 292.071C152.986 292.482 156.037 296.353 159.767 300.676C166.225 308.162 170.111 314.665 171.548 320.391L172.203 323H88.9854V252H66.9854V284.279L55.7354 283.736C37.3226 282.846 23.3778 277.234 12.0859 266.169C6.85894 261.047 0.0120024 251.038 9.02307e-07 248.5C-0.00232048 247.898 4.47475 247.46 11.2402 247.399C21.0998 247.311 23.6567 246.903 31.9854 244.09C51.6414 237.452 66.7625 224.928 76.7705 207C81.1745 199.11 83.4706 191.476 86.3926 175C93.6386 134.15 104.59 112.227 130.127 87.4492C152.555 65.6882 180.009 49.028 211.755 37.916C219.307 35.273 225.869 33.0847 226.337 33.0547ZM256.97 219C258.529 219 265.785 224.96 268.686 228.622C283.034 246.738 282.023 271.459 266.273 287.665L262.057 292.004L267.639 298.252C270.71 301.688 274.442 306.3 275.933 308.5C278.561 312.378 281.985 320.029 281.985 322.021C281.98 322.644 266.909 323 240.485 323H198.985L198.995 307.75L199.003 292.5L205.245 288.526C213.649 283.174 232.528 264.256 238.71 254.992C244.547 246.245 250.775 234.122 253.99 225.25C255.235 221.813 256.576 219 256.97 219ZM28.0957 146.371C28.7747 145.55 33.9366 146.513 46.9785 149.892C56.8495 152.449 65.3445 154.983 65.8545 155.521C66.3655 156.06 68.213 161.591 69.96 167.812C73.7759 181.401 74.7818 179.047 57.627 196.693L45.3691 209.303L25.708 198.401C14.8958 192.407 6.03562 186.949 6.01563 186.271C5.98763 185.115 26.0786 148.809 28.0957 146.371ZM60.1377 50.0742C60.8087 49.9982 84.9819 91.3583 84.9854 92.5879C84.9854 92.9629 82.0366 98.3478 78.4326 104.554L71.8799 115.839L64.6826 116.479C60.7244 116.831 49.6225 116.98 40.0117 116.81L22.5381 116.5L15.3125 90.5332C11.3408 76.2583 8.20656 64.4637 8.34277 64.3096C8.48377 64.1696 20.049 60.9256 34.043 57.1016C48.0349 53.2779 59.777 50.1157 60.1377 50.0742ZM219.06 74.1211C191.467 73.8171 192.676 73.4132 195.214 82.0859C198.339 92.7619 207.802 99.8824 218.835 99.8574C231.403 99.8292 242.061 90.3211 243.023 78.2793L243.335 74.3896L237.266 74.3223L231.197 74.2549L225.128 74.1885L219.06 74.1211ZM112.312 0C114.135 0 150.163 21.2974 150.698 22.6914C151.372 24.4561 142.194 59.0943 140.638 60.6582C140.003 61.2953 134.115 63.2348 127.553 64.9697L115.619 68.125L101.846 54.3125L88.0732 40.5L99.71 20.25C106.11 9.11489 111.779 0.0029538 112.312 0Z" />
              </svg>
              <span
                style={{
                  fontFamily: 'var(--font-display), Chakra Petch, sans-serif',
                  fontWeight: 700,
                  fontSize: 24,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  lineHeight: 1,
                }}
              >
                <span style={{ color: '#F0F0F0' }}>GUNZ</span>
                <span style={{ color: '#6D5BFF' }}>scope</span>
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
                fontSize: 10,
                color: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '3px 8px',
                letterSpacing: 1,
              }}
            >
              v0.8.1 // Early Access
            </span>
          </div>

          {/* BODY */}
          <div
            style={{
              padding: '32px 44px',
              animation: 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both 0.2s',
            }}
          >
            {/* Headline */}
            <h1
              style={{
                fontFamily: 'var(--font-display), Chakra Petch, sans-serif',
                fontWeight: 700,
                fontSize: 48,
                textTransform: 'uppercase',
                lineHeight: 1.2,
                margin: 0,
                color: '#F0F0F0',
              }}
            >
              Track Your <span style={{ color: '#A6F700' }}>Arsenal.</span>
              <br />
              Know Your Edge.
            </h1>

            {/* Subline */}
            <p
              style={{
                fontFamily: 'var(--font-body), Outfit, sans-serif',
                fontWeight: 300,
                fontSize: 18,
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.4)',
                margin: '14px 0 0',
                maxWidth: 640,
              }}
            >
              Real&#8209;time P&amp;L, cost basis tracking, and{' '}
              <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                cross&#8209;chain NFT intelligence
              </span>{' '}
              for your Off The Grid portfolio. GunzChain + Solana in one view.
            </p>
          </div>

          {/* MOCK DASHBOARD STRIP */}
          <div
            style={{
              margin: '0 44px 28px',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 6,
              overflow: 'hidden',
              animation: 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both 0.35s',
            }}
          >
            {/* Browser chrome bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#FF5F57',
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#FEBC2E',
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#28C840',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.25)',
                  marginLeft: 8,
                }}
              >
                gunzscope.xyz/portfolio
              </span>
            </div>

            {/* Dashboard content */}
            <div
              style={{
                display: 'flex',
                padding: '25px 25px',
                gap: 20,
              }}
            >
              {/* Left side — stats */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                    color: 'rgba(255,255,255,0.25)',
                    marginBottom: 6,
                  }}
                >
                  Estimated Market Value
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      fontFamily:
                        'var(--font-display), Chakra Petch, sans-serif',
                      fontWeight: 700,
                      fontSize: 38,
                      color: '#F0F0F0',
                    }}
                  >
                    $268.47
                  </span>
                  <span
                    style={{
                      fontFamily:
                        'var(--font-mono), JetBrains Mono, monospace',
                      fontSize: 11,
                      color: '#00FF88',
                      background: 'rgba(0,255,136,0.08)',
                      padding: '2px 6px',
                      borderRadius: 3,
                    }}
                  >
                    +14.5%
                  </span>
                </div>

                {/* 3-column stat grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 12,
                  }}
                >
                  <StatCell label="GUN Balance" value="6,424" color="#A6F700" />
                  <StatCell
                    label="NFT Holdings"
                    value="20"
                    color="#6D5BFF"
                  />
                  <StatCell
                    label="Unrealized P&L"
                    value="+$294"
                    color="#00FF88"
                  />
                </div>
              </div>

              {/* Right side — mini NFT cards */}
              <div
                style={{
                  width: 180,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <MiniNFTCard
                  initial="K"
                  name="Kestrel Legacy"
                  rarity="Legendary"
                  rarityColor="#FF8C00"
                  price="$18.20"
                  pnl="+9.2%"
                  pnlColor="#00FF88"
                />
                <MiniNFTCard
                  initial="V"
                  name="Vulture Solana"
                  rarity="Epic"
                  rarityColor="#B44AFF"
                  price="$6.40"
                  pnl="+100%"
                  pnlColor="#00FF88"
                />
                <MiniNFTCard
                  initial="R"
                  name="Reflex Sight"
                  rarity="Rare"
                  rarityColor="#4A7AFF"
                  price="$2.10"
                  pnl="-5.2%"
                  pnlColor="#FF5555"
                />
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '24px 44px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              animation: 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both 0.45s',
            }}
          >
            {/* Footer left */}
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
                  fontSize: 24,
                  color: 'rgba(255,255,255,0.6)',
                  marginBottom: 6,
                }}
              >
                gunzscope.xyz/
                <span style={{ color: '#A6F700', fontWeight: 700 }}>
                  waitlist
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body), Outfit, sans-serif',
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.35)',
                }}
              >
                Refer{' '}
                <span style={{ color: '#6D5BFF', fontWeight: 700 }}>
                  3 friends
                </span>{' '}
                to skip the line &amp; get instant access
              </div>
            </div>

            {/* Footer right */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.2)',
                }}
              >
                type{' '}
                <span style={{ color: '#A6F700', fontWeight: 600 }}>
                  !gunzscope
                </span>{' '}
                in chat
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display), Chakra Petch, sans-serif',
                  fontWeight: 700,
                  fontSize: 16,
                  color: '#0A0A0A',
                  background: '#A6F700',
                  padding: '8px 20px',
                  clipPath:
                    'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  animation: 'cta-pulse 2.5s ease-in-out infinite',
                }}
              >
                JOIN WAITLIST
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          color: 'rgba(255,255,255,0.2)',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display), Chakra Petch, sans-serif',
          fontWeight: 700,
          fontSize: 18,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MiniNFTCard({
  initial,
  name,
  rarity,
  rarityColor,
  price,
  pnl,
  pnlColor,
}: {
  initial: string;
  name: string;
  rarity: string;
  rarityColor: string;
  price: string;
  pnl: string;
  pnlColor: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Placeholder initial */}
      <div
        style={{
          width: 28,
          height: 28,
          background: 'rgba(255,255,255,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display), Chakra Petch, sans-serif',
          fontWeight: 700,
          fontSize: 12,
          color: 'rgba(255,255,255,0.3)',
          flexShrink: 0,
        }}
      >
        {initial}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-display), Chakra Petch, sans-serif',
            fontSize: 11,
            color: '#F0F0F0',
            fontWeight: 600,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
            fontSize: 9,
            color: rarityColor,
            textTransform: 'uppercase',
            letterSpacing: 1,
            lineHeight: 1.4,
          }}
        >
          {rarity}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
            fontSize: 9,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          {price}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
            fontSize: 9,
            color: pnlColor,
            fontWeight: 600,
          }}
        >
          {pnl}
        </div>
      </div>
    </div>
  );
}
