'use client';

import { Suspense } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useFeatureRequests, type FeatureRequest } from '@/lib/hooks/useFeatureRequests';
import WalletRequiredGate from '@/components/WalletRequiredGate';
import { isAdminWallet } from '@/lib/auth/dynamicAuth';
import { SectionHeader } from './components/SectionHeader';
import { RequestCard } from './components/RequestCard';
import { SubmitForm } from './components/SubmitForm';

// =============================================================================
// Request Sections (Active + Completed + Declined)
// =============================================================================

function RequestSections({
  requests,
  canVote,
  canSubmit,
  isAdmin,
  onVote,
  onUpdateStatus,
  onDelete,
  onSubmit,
  isSubmitting,
}: {
  requests: FeatureRequest[];
  canVote: boolean;
  canSubmit: boolean;
  isAdmin: boolean;
  onVote: (id: string, value: 1 | -1) => void;
  onUpdateStatus: (id: string, status: string, adminNote?: string, showAttribution?: boolean) => void;
  onDelete: (id: string) => void;
  onSubmit: (title: string, description: string, type?: 'feature' | 'bug', screenshotUrl?: string | null) => Promise<boolean>;
  isSubmitting: boolean;
}) {
  const openRequests = requests.filter((r) => r.status === 'open');
  const inFlightRequests = requests.filter((r) => r.status === 'planned');
  const declinedRequests = requests.filter((r) => r.status === 'declined');
  const completedRequests = requests.filter((r) => r.status === 'completed');

  const cardProps = { canVote, isAdmin, onVote, onUpdateStatus, onDelete };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Requested — open items */}
      <div>
        <SectionHeader label="Requested" count={openRequests.length} color="bg-[var(--gs-lime)]" />
        {canSubmit && (
          <div className="mb-3">
            <SubmitForm
              onSubmit={onSubmit}
              isSubmitting={isSubmitting}
              existingRequests={requests}
              onVote={onVote}
              canVote={canVote}
            />
          </div>
        )}
        {openRequests.length > 0 ? (
          <div className="space-y-3">
            {openRequests.map((request) => (
              <RequestCard key={request.id} request={request} {...cardProps} />
            ))}
          </div>
        ) : (
          <div className="border border-white/[0.04] py-6 text-center clip-corner-sm">
            <p className="font-mono text-caption text-[var(--gs-gray-2)]">No open requests</p>
          </div>
        )}
      </div>

      {/* In Flight — planned items */}
      <div>
        <SectionHeader label="In Flight" count={inFlightRequests.length} color="bg-[var(--gs-purple)]" />
        {inFlightRequests.length > 0 ? (
          <div className="space-y-3">
            {inFlightRequests.map((request) => (
              <RequestCard key={request.id} request={request} {...cardProps} />
            ))}
          </div>
        ) : (
          <div className="border border-white/[0.04] py-6 text-center clip-corner-sm">
            <p className="font-mono text-caption text-[var(--gs-gray-2)]">None yet</p>
          </div>
        )}
      </div>

      {/* Declined */}
      <div>
        <SectionHeader label="Declined" count={declinedRequests.length} color="bg-[var(--gs-loss)]" />
        {declinedRequests.length > 0 ? (
          <div className="space-y-3">
            {declinedRequests.map((request) => (
              <RequestCard key={request.id} request={request} {...cardProps} />
            ))}
          </div>
        ) : (
          <div className="border border-white/[0.04] py-6 text-center clip-corner-sm">
            <p className="font-mono text-caption text-[var(--gs-gray-2)]">None yet</p>
          </div>
        )}
      </div>

      {/* Completed */}
      <div>
        <SectionHeader label="Completed" count={completedRequests.length} color="bg-[var(--gs-profit)]" />
        {completedRequests.length > 0 ? (
          <div className="space-y-3">
            {completedRequests.map((request) => (
              <RequestCard key={request.id} request={request} {...cardProps} />
            ))}
          </div>
        ) : (
          <div className="border border-white/[0.04] py-6 text-center clip-corner-sm">
            <p className="font-mono text-caption text-[var(--gs-gray-2)]">None yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================

function FeatureRequestsContent() {
  const { user, primaryWallet, setShowAuthFlow } = useDynamicContext();
  const isAuthenticated = !!user;
  const {
    requests,
    eligibility,
    isLoading,
    isSubmitting,
    error,
    submitRequest,
    vote,
    updateRequestStatus,
    deleteRequest,
  } = useFeatureRequests();

  const isAdmin = isAdminWallet(primaryWallet?.address);
  const canParticipate = isAuthenticated && (eligibility?.eligible === true || isAdmin);

  return (
    <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)] flex flex-col">
      <Navbar />

      <WalletRequiredGate feature="Feature Requests">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wide mb-2">
            Feedback &amp; Bug Reports
          </h1>
          <p className="font-body text-sm text-[var(--gs-gray-4)] leading-relaxed">
            Report bugs, suggest features, and vote on what gets built next. Requires 20+ OTG NFTs to participate.
          </p>
        </div>

        {/* Eligibility Gate */}
        {!isAuthenticated && (
          <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-5 mb-6">
            <div className="h-px bg-gradient-to-r from-[var(--gs-purple)]/30 to-transparent -mt-5 mb-4 -mx-5" />
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center border border-[var(--gs-purple)]/30 text-[var(--gs-purple)]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-body text-sm text-[var(--gs-white)] font-medium mb-0.5">
                  Create an account to participate
                </p>
                <p className="font-mono text-caption text-[var(--gs-gray-3)]">
                  You need a connected wallet with 20+ OTG NFTs to submit and vote.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthFlow(true)}
                className="font-display font-semibold text-xs tracking-wider uppercase px-4 py-2 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[#B8FF33] transition-all clip-corner shrink-0 cursor-pointer"
              >
                Create Account
              </button>
            </div>
          </div>
        )}

        {isAuthenticated && eligibility && !eligibility.eligible && (
          <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] p-5 mb-6">
            <div className="h-px bg-gradient-to-r from-[var(--gs-purple)]/30 to-transparent -mt-5 mb-4 -mx-5" />
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center border border-[var(--gs-purple)]/30 text-[var(--gs-purple)]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <p className="font-body text-sm text-[var(--gs-white)] font-medium mb-0.5">
                  You need 20+ OTG NFTs to participate
                </p>
                <p className="font-mono text-caption text-[var(--gs-gray-3)]">
                  You currently have {eligibility.nftCount} NFT{eligibility.nftCount !== 1 ? 's' : ''}. Load your portfolio to update your count.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-[var(--gs-loss)]/10 border border-[var(--gs-loss)]/20 px-4 py-3 mb-6">
            <p className="font-mono text-xs text-[var(--gs-loss)]">{error}</p>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-6 h-6 border-2 border-[var(--gs-lime)]/30 border-t-[var(--gs-lime)] rounded-full animate-spin" />
            <p className="font-mono text-xs text-[var(--gs-gray-3)]">Loading requests&hellip;</p>
          </div>
        ) : (
          <RequestSections
            requests={requests}
            canVote={canParticipate}
            canSubmit={canParticipate}
            isAdmin={isAdmin}
            onVote={vote}
            onUpdateStatus={updateRequestStatus}
            onDelete={deleteRequest}
            onSubmit={submitRequest}
            isSubmitting={isSubmitting}
          />
        )}
      </main>
      </WalletRequiredGate>

      <Footer />
    </div>
  );
}

export default function FeatureRequestsPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--gs-black)]" />}>
      <FeatureRequestsContent />
    </Suspense>
  );
}
