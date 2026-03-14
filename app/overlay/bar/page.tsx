export default function BarOverlay() {
  return (
    <>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes glow-border {
          0%, 100% { border-color: rgba(166, 247, 0, 0.22); }
          50% { border-color: rgba(166, 247, 0, 0.45); }
        }
      `}</style>
      <div
        style={{
          width: 2560,
          height: 52,
          position: 'relative',
          background: 'rgba(10, 10, 10, 0.9)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background:
              'linear-gradient(90deg, transparent 5%, rgba(166,247,0,0.5) 20%, rgba(109,91,255,0.35) 50%, rgba(166,247,0,0.5) 80%, transparent 95%)',
          }}
        />

        {/* Bottom hairline */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            background: 'rgba(255,255,255,0.04)',
          }}
        />

        {/* LEFT section */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            paddingLeft: 24,
          }}
        >
          {/* Logo icon */}
          <svg
            viewBox="0 0 296 323"
            fill="#A6F700"
            style={{ width: 26, height: 26, flexShrink: 0 }}
          >
            <path d="M226.337 33.0547C226.805 33.0252 230.319 35.8997 234.146 39.4424C249.229 53.4073 273.944 63.9998 291.443 64H295.985V120H184.985V142H240.985V165.13C240.985 186.22 240.763 189.251 238.462 199.511C233.52 221.548 224.135 240.262 210.985 254.303C204.167 261.583 191.781 272 189.942 272C189.534 271.999 189.644 270.086 190.188 267.75C190.733 265.413 190.951 259 190.671 253.5C190.096 242.194 187.248 232.448 181.807 223.165C176.89 214.776 164.827 203.182 156.47 198.809C148.598 194.69 136.449 191 130.756 191H126.985V212.542L133.082 213.701C141.84 215.365 149.672 219.551 155.985 225.937C172.75 242.896 173.199 270.077 156.996 287.111C154.79 289.429 152.985 291.661 152.985 292.071C152.986 292.482 156.037 296.353 159.767 300.676C166.225 308.162 170.111 314.665 171.548 320.391L172.203 323H88.9854V252H66.9854V284.279L55.7354 283.736C37.3226 282.846 23.3778 277.234 12.0859 266.169C6.85894 261.047 0.0120024 251.038 9.02307e-07 248.5C-0.00232048 247.898 4.47475 247.46 11.2402 247.399C21.0998 247.311 23.6567 246.903 31.9854 244.09C51.6414 237.452 66.7625 224.928 76.7705 207C81.1745 199.11 83.4706 191.476 86.3926 175C93.6386 134.15 104.59 112.227 130.127 87.4492C152.555 65.6882 180.009 49.028 211.755 37.916C219.307 35.273 225.869 33.0847 226.337 33.0547ZM256.97 219C258.529 219 265.785 224.96 268.686 228.622C283.034 246.738 282.023 271.459 266.273 287.665L262.057 292.004L267.639 298.252C270.71 301.688 274.442 306.3 275.933 308.5C278.561 312.378 281.985 320.029 281.985 322.021C281.98 322.644 266.909 323 240.485 323H198.985L198.995 307.75L199.003 292.5L205.245 288.526C213.649 283.174 232.528 264.256 238.71 254.992C244.547 246.245 250.775 234.122 253.99 225.25C255.235 221.813 256.576 219 256.97 219ZM28.0957 146.371C28.7747 145.55 33.9366 146.513 46.9785 149.892C56.8495 152.449 65.3445 154.983 65.8545 155.521C66.3655 156.06 68.213 161.591 69.96 167.812C73.7759 181.401 74.7818 179.047 57.627 196.693L45.3691 209.303L25.708 198.401C14.8958 192.407 6.03562 186.949 6.01563 186.271C5.98763 185.115 26.0786 148.809 28.0957 146.371ZM60.1377 50.0742C60.8087 49.9982 84.9819 91.3583 84.9854 92.5879C84.9854 92.9629 82.0366 98.3478 78.4326 104.554L71.8799 115.839L64.6826 116.479C60.7244 116.831 49.6225 116.98 40.0117 116.81L22.5381 116.5L15.3125 90.5332C11.3408 76.2583 8.20656 64.4637 8.34277 64.3096C8.48377 64.1696 20.049 60.9256 34.043 57.1016C48.0349 53.2779 59.777 50.1157 60.1377 50.0742ZM219.06 74.1211C191.467 73.8171 192.676 73.4132 195.214 82.0859C198.339 92.7619 207.802 99.8824 218.835 99.8574C231.403 99.8292 242.061 90.3211 243.023 78.2793L243.335 74.3896L237.266 74.3223L231.197 74.2549L225.128 74.1885L219.06 74.1211ZM112.312 0C114.135 0 150.163 21.2974 150.698 22.6914C151.372 24.4561 142.194 59.0943 140.638 60.6582C140.003 61.2953 134.115 63.2348 127.553 64.9697L115.619 68.125L101.846 54.3125L88.0732 40.5L99.71 20.25C106.11 9.11489 111.779 0.0029538 112.312 0Z" />
          </svg>

          {/* Wordmark */}
          <span
            style={{
              fontFamily: 'var(--font-display), Chakra Petch, sans-serif',
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: 2,
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            <span style={{ color: '#F0F0F0' }}>GUNZ</span>
            <span style={{ color: '#6D5BFF' }}>scope</span>
          </span>

          {/* Divider */}
          <div
            style={{
              width: 1,
              height: 18,
              background: 'rgba(255,255,255,0.08)',
              marginLeft: 4,
              marginRight: 4,
            }}
          />

          {/* Tagline */}
          <span
            style={{
              fontFamily: 'var(--font-body), Outfit, sans-serif',
              fontSize: 12.5,
              lineHeight: 1,
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.52)', fontWeight: 700 }}>
              NFT Portfolio Intelligence
            </span>
            <span style={{ color: 'rgba(255,255,255,0.32)' }}>
              {' '}
              for Off The Grid
            </span>
          </span>
        </div>

        {/* CENTER section */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {/* Pulsing dot */}
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#A6F700',
              boxShadow: '0 0 6px rgba(166,247,0,0.6)',
              animation: 'pulse-dot 2s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontFamily:
                'var(--font-mono), JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: 'rgba(166,247,0,0.5)',
            }}
          >
            EARLY ACCESS // WAITLIST OPEN
          </span>
        </div>

        {/* RIGHT section */}
        <div
          style={{
            marginLeft: 'auto',
            paddingRight: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          {/* URL */}
          <span
            style={{
              fontFamily:
                'var(--font-mono), JetBrains Mono, monospace',
              fontSize: 12.5,
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            gunzscope.xyz/
            <span style={{ color: '#A6F700', fontWeight: 700 }}>waitlist</span>
          </span>

          {/* CTA badge */}
          <span
            style={{
              fontFamily: 'var(--font-display), Chakra Petch, sans-serif',
              fontWeight: 600,
              fontSize: 10,
              color: '#A6F700',
              background: 'rgba(166,247,0,0.07)',
              border: '1px solid rgba(166,247,0,0.22)',
              padding: '4px 10px',
              letterSpacing: 1,
              clipPath:
                'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))',
              animation: 'glow-border 3s ease-in-out infinite',
            }}
          >
            JOIN FREE ▶
          </span>
        </div>
      </div>
    </>
  );
}
