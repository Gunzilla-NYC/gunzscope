import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useGlitchScramble } from './hooks/useGlitchScramble';
import { useClickOutside } from './hooks/useClickOutside';

interface ProfileDropdownProps {
  isActive: boolean;
  pathname: string;
}

export function ProfileDropdown({ isActive, pathname }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { display, hovered, scramble, reset } = useGlitchScramble({
    label: 'Profile',
    target: 'PROFILE',
  });

  const closeDropdown = useCallback(() => setOpen(false), []);
  useClickOutside(dropdownRef, closeDropdown, open);
  useEffect(() => { setOpen(false); }, [pathname]);

  const items = [
    { href: '/account', label: 'Profile', active: pathname === '/account' },
  ];

  const showBrackets = hovered || isActive || open;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={scramble}
        onMouseLeave={reset}
        className={`relative font-mono text-body-sm tracking-wider uppercase transition-colors duration-150 inline-flex items-center gap-1 py-1 cursor-pointer ${
          isActive
            ? 'text-[var(--gs-lime)]'
            : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)]'
        }`}
      >
        <span className={`inline-block transition-opacity duration-150 ${showBrackets ? 'opacity-100' : 'opacity-0'}`} style={{ color: 'var(--gs-lime)' }}>[&nbsp;</span>
        {display}
        <svg
          className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        <span className={`inline-block transition-opacity duration-150 ${showBrackets ? 'opacity-100' : 'opacity-0'}`} style={{ color: 'var(--gs-lime)' }}>&nbsp;]</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 min-w-[160px] bg-[var(--gs-dark-2)] border border-white/[0.08] shadow-xl shadow-black/40 z-50 overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)]" />
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2.5 font-mono text-data tracking-wider uppercase transition-colors ${
                item.active
                  ? 'text-[var(--gs-lime)] bg-[var(--gs-lime)]/[0.05]'
                  : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:bg-white/[0.03]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
