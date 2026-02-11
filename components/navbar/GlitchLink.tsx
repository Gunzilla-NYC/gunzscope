import Link from 'next/link';
import { useGlitchScramble } from './hooks/useGlitchScramble';

interface GlitchLinkProps {
  href: string;
  label: string;
  isActive: boolean;
}

export function GlitchLink({ href, label, isActive }: GlitchLinkProps) {
  const { display, hovered, scramble, reset } = useGlitchScramble({
    label,
    skipChars: [' '],
  });

  const showBrackets = hovered || isActive;

  return (
    <Link
      href={href}
      onMouseEnter={scramble}
      onMouseLeave={reset}
      className={`relative font-mono text-body-sm tracking-wider uppercase transition-colors duration-150 inline-block py-1 ${
        isActive
          ? 'text-[var(--gs-lime)]'
          : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)]'
      }`}
    >
      <span className={`inline-block transition-opacity duration-150 ${showBrackets ? 'opacity-100' : 'opacity-0'}`} style={{ color: 'var(--gs-lime)' }}>[&nbsp;</span>
      {display}
      <span className={`inline-block transition-opacity duration-150 ${showBrackets ? 'opacity-100' : 'opacity-0'}`} style={{ color: 'var(--gs-lime)' }}>&nbsp;]</span>
    </Link>
  );
}
