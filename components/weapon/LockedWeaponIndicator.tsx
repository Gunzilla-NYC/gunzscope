'use client';

export default function LockedWeaponIndicator() {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
        <svg
          className="w-4 h-4 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <div>
        <div className="text-sm font-medium text-red-400">Classified Weapon</div>
        <p className="text-data text-gray-500 mt-0.5">
          This weapon has a unique skin and cannot be modified
        </p>
      </div>
    </div>
  );
}
