/**
 * Generate a hex-corner clip-path polygon.
 * Clips two opposite corners (top-right, bottom-left) at `size` pixels.
 */
export const clipHex = (size: number): string =>
  `polygon(0 0, calc(100% - ${size}px) 0, 100% ${size}px, 100% 100%, ${size}px 100%, 0 calc(100% - ${size}px))`;
