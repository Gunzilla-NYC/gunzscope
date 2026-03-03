import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Attestation Viewer',
  description: 'View a portfolio attestation — wallet holdings verified on Avalanche C-Chain and stored on Autonomys DSN.',
};

export default function AttestationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
