'use client';

import { usePalette } from '@/lib/contexts/PaletteContext';

interface PaletteToggleProps {
  className?: string;
}

export function PaletteToggle({ className = '' }: PaletteToggleProps) {
  const { palette, togglePalette, isV2 } = usePalette();

  return (
    <button
      onClick={togglePalette}
      className={`
        fixed bottom-4 right-4 z-50
        flex items-center gap-2 px-3 py-2
        bg-gs-dark-3 border border-white/10
        rounded-lg shadow-lg
        text-xs font-mono uppercase tracking-wider
        transition-all duration-200
        hover:border-gs-lime/30 hover:bg-gs-dark-4
        ${className}
      `}
      title={`Palette ${palette.toUpperCase()} (Ctrl+Shift+P to toggle)`}
    >
      {/* Color indicator dots */}
      <div className="flex gap-1">
        <span
          className="w-2 h-2 rounded-full transition-colors"
          style={{ backgroundColor: isV2 ? '#FF5555' : '#FF4444' }}
          title={`Loss: ${isV2 ? '#FF5555' : '#FF4444'}`}
        />
        <span
          className="w-2 h-2 rounded-full transition-colors"
          style={{ backgroundColor: isV2 ? '#999999' : '#888888' }}
          title={`Gray-3: ${isV2 ? '#999999' : '#888888'}`}
        />
        {isV2 && (
          <>
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: '#BFFF33' }}
              title="Lime Bright: #BFFF33"
            />
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: '#5AC8FA' }}
              title="Info: #5AC8FA"
            />
          </>
        )}
      </div>

      {/* Label */}
      <span className="text-gs-gray-4">
        {palette.toUpperCase()}
      </span>

      {/* Toggle indicator */}
      <div className="relative w-8 h-4 bg-gs-dark-1 rounded-full">
        <div
          className={`
            absolute top-0.5 w-3 h-3 rounded-full
            transition-all duration-200
            ${isV2
              ? 'left-4 bg-gs-lime'
              : 'left-0.5 bg-gs-gray-3'
            }
          `}
        />
      </div>
    </button>
  );
}

export default PaletteToggle;
