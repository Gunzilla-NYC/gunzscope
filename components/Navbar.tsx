'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Logo from './Logo';
import WalletButton from './WalletButton';

interface NavItem {
  label: string;
  href?: string;
  items?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: 'Tools',
    items: [
      { label: 'Rarity Rankings', href: '/rarity-rankings' },
      { label: 'Top Holders', href: '/top-holders' },
      { label: 'Whale Tracker', href: '/whale-tracker' },
    ],
  },
  {
    label: 'Competition',
    items: [
      { label: 'Top Players', href: '/top-players' },
      { label: 'Tournaments', href: '/tournaments' },
      { label: 'AZ Rankings', href: '/az-rankings' },
    ],
  },
  { label: 'GUNFlip', href: '/gunflip' },
];

interface NavbarProps {
  onWalletConnect?: (address: string) => void;
  onWalletDisconnect?: () => void;
}

export default function Navbar({ onWalletConnect, onWalletDisconnect }: NavbarProps) {
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [previousDropdown, setPreviousDropdown] = useState<number | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileExpandedItem, setMobileExpandedItem] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | HTMLAnchorElement | null)[]>([]);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update indicator position
  const updateIndicator = (index: number) => {
    const element = itemRefs.current[index];
    if (element && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = element.getBoundingClientRect();
      setIndicatorStyle({
        left: itemRect.left - navRect.left,
        width: itemRect.width,
      });
    }
  };

  const handleItemHover = (index: number, hasDropdown: boolean) => {
    updateIndicator(index);
    if (hasDropdown) {
      // If switching between dropdowns, trigger transition animation
      if (activeDropdown !== null && activeDropdown !== index) {
        setPreviousDropdown(activeDropdown);
        setIsTransitioning(true);

        // Clear any existing timeout
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }

        // Reset transition state after animation
        transitionTimeoutRef.current = setTimeout(() => {
          setIsTransitioning(false);
          setPreviousDropdown(null);
        }, 300);
      }
      setActiveDropdown(index);
    }
  };

  const handleItemLeave = () => {
    // Clear transition timeout on leave
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    setActiveDropdown(null);
    setPreviousDropdown(null);
    setIsTransitioning(false);
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-black/90 backdrop-blur-xl shadow-lg shadow-black/20'
            : 'bg-black/50 backdrop-blur-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative">
                <Logo size={36} className="transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-[#64ffff]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <span className="text-xl font-bold gradient-text hidden sm:block">ZILLASCOPE</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:block" ref={navRef}>
              <div className="relative flex items-center bg-[#1a1a1a] rounded-full p-1 border border-white/10">
                {/* Animated pill indicator */}
                <div
                  className="absolute h-[calc(100%-8px)] bg-[#2a2a2a] rounded-full pointer-events-none border border-[#64ffff]/30"
                  style={{
                    left: `${indicatorStyle.left}px`,
                    width: `${indicatorStyle.width}px`,
                    top: '4px',
                    opacity: activeDropdown !== null ? 1 : 0,
                    transform: activeDropdown !== null
                      ? isTransitioning
                        ? 'scale(1.03) scaleY(1.08)'
                        : 'scale(1)'
                      : 'scale(0.9)',
                    transition: isTransitioning
                      ? 'left 500ms cubic-bezier(0.34, 1.8, 0.64, 1), width 500ms cubic-bezier(0.34, 1.8, 0.64, 1), opacity 200ms ease-out, transform 500ms cubic-bezier(0.34, 1.8, 0.64, 1)'
                      : 'left 400ms cubic-bezier(0.34, 1.56, 0.64, 1), width 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease-out, transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                />

                {navItems.map((item, index) => (
                  <div
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => handleItemHover(index, !!item.items)}
                    onMouseLeave={handleItemLeave}
                  >
                    {item.items ? (
                      <button
                        ref={(el) => { itemRefs.current[index] = el; }}
                        className={`relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-1 ${
                          activeDropdown === index
                            ? 'text-[#64ffff]'
                            : 'text-gray-300 hover:text-white'
                        }`}
                      >
                        <span className="relative z-10">{item.label}</span>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          style={{
                            transform: activeDropdown === index ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                          }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    ) : (
                      <Link
                        href={item.href || '/'}
                        ref={(el) => { itemRefs.current[index] = el; }}
                        className="relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 text-gray-300 hover:text-white"
                      >
                        <span className="relative z-10">{item.label}</span>
                      </Link>
                    )}

                    {/* Dropdown Menu */}
                    {item.items && (
                      <div
                        className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 py-2 bg-[#1a1a1a] rounded-xl border border-white/10 shadow-xl shadow-black/50 origin-top ${
                          activeDropdown === index
                            ? 'pointer-events-auto'
                            : 'pointer-events-none'
                        }`}
                        style={{
                          opacity: activeDropdown === index ? 1 : 0,
                          transform: activeDropdown === index
                            ? isTransitioning && previousDropdown !== null
                              ? `scale(1.02) translateY(${previousDropdown < index ? '3px' : '-3px'})`
                              : 'scale(1) translateY(0)'
                            : 'scale(0.95) translateY(-8px)',
                          transition: isTransitioning
                            ? 'opacity 150ms ease-out, transform 450ms cubic-bezier(0.34, 1.8, 0.64, 1)'
                            : 'opacity 200ms ease-out, transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                      >
                        {item.items.map((subItem, subIndex) => (
                          <Link
                            key={subItem.label}
                            href={subItem.href}
                            className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5"
                            onClick={() => setActiveDropdown(null)}
                            style={{
                              opacity: activeDropdown === index ? 1 : 0,
                              transform: activeDropdown === index
                                ? isTransitioning
                                  ? `translateX(${previousDropdown !== null && previousDropdown < index ? '4px' : '-4px'}) translateY(${subIndex * 2}px)`
                                  : 'translateX(0) translateY(0)'
                                : 'translateX(-8px) translateY(0)',
                              transition: activeDropdown === index
                                ? isTransitioning
                                  ? `opacity 200ms ease-out ${40 + subIndex * 50}ms, transform 500ms cubic-bezier(0.34, 1.8, 0.64, 1) ${40 + subIndex * 50}ms, background-color 200ms, color 200ms`
                                  : `opacity 300ms ease-out ${60 + subIndex * 75}ms, transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1) ${60 + subIndex * 75}ms, background-color 200ms, color 200ms`
                                : 'opacity 100ms ease-in, transform 100ms ease-in',
                            }}
                          >
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right side - Wallet Connect Button */}
            <div className="hidden md:flex items-center gap-3">
              <WalletButton
                onWalletConnect={onWalletConnect}
                onWalletDisconnect={onWalletDisconnect}
              />
            </div>

            {/* Mobile - Wallet + Menu button */}
            <div className="flex md:hidden items-center gap-2">
              <WalletButton
                onWalletConnect={onWalletConnect}
                onWalletDisconnect={onWalletDisconnect}
              />
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isMobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 py-4 space-y-1 bg-black/95 backdrop-blur-xl border-t border-white/10">
            {navItems.map((item, index) => (
              <div key={item.label}>
                {item.items ? (
                  <>
                    <button
                      onClick={() => setMobileExpandedItem(mobileExpandedItem === index ? null : index)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                    >
                      <span>{item.label}</span>
                      <svg
                        className={`w-4 h-4 transition-transform duration-300 ${
                          mobileExpandedItem === index ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        mobileExpandedItem === index ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="pl-4 py-2 space-y-1">
                        {item.items.map((subItem) => (
                          <Link
                            key={subItem.label}
                            href={subItem.href}
                            className="block px-4 py-2.5 text-sm text-gray-400 hover:text-[#64ffff] rounded-lg hover:bg-white/5 transition-colors"
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              setMobileExpandedItem(null);
                            }}
                          >
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <Link
                    href={item.href || '/'}
                    className="block px-4 py-3 text-sm font-medium rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Spacer to prevent content from going under fixed navbar */}
      <div className="h-16" />
    </>
  );
}
