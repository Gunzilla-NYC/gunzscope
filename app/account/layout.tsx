import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account | GUNZscope',
  description: 'Manage your GUNZscope profile, tracked wallets, and notification settings.',
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
