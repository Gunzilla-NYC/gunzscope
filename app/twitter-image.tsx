import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';
export const alt = 'GUNZscope';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Duplicated from opengraph-image.tsx — Next.js convention files don't support re-exports
export default function TwitterImage() {
  const svgBuffer = readFileSync(join(process.cwd(), 'public', 'gs-icon.svg'));
  const svgBase64 = svgBuffer.toString('base64');
  const svgDataUri = `data:image/svg+xml;base64,${svgBase64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#0A0A0A',
        }}
      >
        <img
          src={svgDataUri}
          width={200}
          height={218}
          alt=""
        />
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: '#F0F0F0',
            letterSpacing: '-0.02em',
            marginTop: 32,
            display: 'flex',
          }}
        >
          <span>GUNZ</span>
          <span style={{ color: '#A6F700' }}>scope</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
