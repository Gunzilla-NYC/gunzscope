'use client';

export default function MobileAppCard() {
  return (
    <div className="w-full max-w-4xl mx-auto mb-8 p-8 bg-gradient-to-br from-[#64ffff]/10 to-[#96aaff]/10 rounded-xl border border-[#64ffff]/30 shadow-lg">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Content */}
        <div className="flex-1">
          {/* ZillaScope Logo with Sniper Scope */}
          <div className="flex items-center gap-3 mb-4">
            {/* Godzilla in Sniper Scope Logo */}
            <div className="relative w-16 h-16 flex-shrink-0">
              {/* Sniper Scope Crosshair */}
              <svg className="w-16 h-16 absolute inset-0" viewBox="0 0 64 64" fill="none">
                {/* Outer circle */}
                <circle cx="32" cy="32" r="30" stroke="#64ffff" strokeWidth="1.5" opacity="0.6"/>
                {/* Inner circle */}
                <circle cx="32" cy="32" r="20" stroke="#64ffff" strokeWidth="1" opacity="0.4"/>
                {/* Crosshair lines */}
                <line x1="32" y1="2" x2="32" y2="14" stroke="#64ffff" strokeWidth="1.5"/>
                <line x1="32" y1="50" x2="32" y2="62" stroke="#64ffff" strokeWidth="1.5"/>
                <line x1="2" y1="32" x2="14" y2="32" stroke="#64ffff" strokeWidth="1.5"/>
                <line x1="50" y1="32" x2="62" y2="32" stroke="#64ffff" strokeWidth="1.5"/>
                {/* Corner marks */}
                <line x1="10" y1="10" x2="16" y2="16" stroke="#64ffff" strokeWidth="1" opacity="0.5"/>
                <line x1="54" y1="10" x2="48" y2="16" stroke="#64ffff" strokeWidth="1" opacity="0.5"/>
                <line x1="10" y1="54" x2="16" y2="48" stroke="#64ffff" strokeWidth="1" opacity="0.5"/>
                <line x1="54" y1="54" x2="48" y2="48" stroke="#64ffff" strokeWidth="1" opacity="0.5"/>
              </svg>
              {/* Godzilla silhouette in center */}
              <svg className="w-10 h-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" viewBox="0 0 40 40" fill="#64ffff">
                <path d="M20 8c-1 0-1.5.5-2 1l-1 2-2-1c-.5-.3-1-.3-1.5 0l-2 1.5c-.3.3-.5.7-.5 1.2v2l-2 1c-.7.3-1 1-1 1.7v3c0 .8.5 1.5 1.2 1.8l2 .8v2c0 1 .5 1.8 1.3 2.2l3 2c.3.2.7.3 1 .3h4c.4 0 .7-.1 1-.3l3-2c.8-.4 1.3-1.2 1.3-2.2v-2l2-.8c.7-.3 1.2-1 1.2-1.8v-3c0-.7-.3-1.4-1-1.7l-2-1v-2c0-.5-.2-.9-.5-1.2l-2-1.5c-.5-.3-1-.3-1.5 0l-2 1-1-2c-.5-.5-1-1-2-1zm0 3c.3 0 .5.2.5.5s-.2.5-.5.5-.5-.2-.5-.5.2-.5.5-.5zm-4 4c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm8 0c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm-4 2c1.1 0 2 .9 2 2v1h-4v-1c0-1.1.9-2 2-2z"/>
                <path d="M12 26l-2 4c-.3.5-.2 1.2.3 1.6.5.3 1.2.2 1.6-.3l2-4-2-1.3zm16 0l2 4c.3.5.2 1.2-.3 1.6-.5.3-1.2.2-1.6-.3l-2-4 2-1.3z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">
                ZillaScope Mobile
              </h3>
              <p className="text-sm text-[#64ffff]">
                Coming Soon
              </p>
            </div>
          </div>

          <p className="text-gray-300 text-base mb-6">
            Track your GUN tokens and NFTs on the go! The ZillaScope mobile app is coming soon for iOS and Android.
          </p>

          {/* Features */}
          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-3 text-sm text-gray-300">
              <svg className="w-5 h-5 text-[#64ffff] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Real-time portfolio tracking
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-300">
              <svg className="w-5 h-5 text-[#64ffff] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Push notifications for price alerts
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-300">
              <svg className="w-5 h-5 text-[#64ffff] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              NFT gallery with detailed views
            </li>
            <li className="flex items-center gap-3 text-sm text-gray-300">
              <svg className="w-5 h-5 text-[#64ffff] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              WalletConnect integration
            </li>
          </ul>
        </div>

        {/* Right Side - QR Code */}
        <div className="flex flex-col items-center justify-center space-y-4">
          {/* QR Code Placeholder */}
          <div className="bg-white p-4 rounded-lg shadow-xl">
            <svg className="w-48 h-48" viewBox="0 0 200 200" fill="none">
              {/* QR Code Pattern - Stylized placeholder */}
              <rect width="200" height="200" fill="white"/>

              {/* Corner Markers */}
              <g>
                {/* Top-left */}
                <rect x="10" y="10" width="50" height="50" fill="none" stroke="black" strokeWidth="8"/>
                <rect x="22" y="22" width="26" height="26" fill="black"/>
                {/* Top-right */}
                <rect x="140" y="10" width="50" height="50" fill="none" stroke="black" strokeWidth="8"/>
                <rect x="152" y="22" width="26" height="26" fill="black"/>
                {/* Bottom-left */}
                <rect x="10" y="140" width="50" height="50" fill="none" stroke="black" strokeWidth="8"/>
                <rect x="22" y="152" width="26" height="26" fill="black"/>
              </g>

              {/* Data Pattern */}
              <g fill="black">
                <rect x="70" y="15" width="8" height="8"/>
                <rect x="82" y="15" width="8" height="8"/>
                <rect x="106" y="15" width="8" height="8"/>
                <rect x="118" y="15" width="8" height="8"/>

                <rect x="70" y="30" width="8" height="8"/>
                <rect x="94" y="30" width="8" height="8"/>
                <rect x="106" y="30" width="8" height="8"/>
                <rect x="130" y="30" width="8" height="8"/>

                <rect x="15" y="70" width="8" height="8"/>
                <rect x="27" y="70" width="8" height="8"/>
                <rect x="51" y="70" width="8" height="8"/>

                <rect x="70" y="70" width="8" height="8"/>
                <rect x="82" y="70" width="8" height="8"/>
                <rect x="94" y="70" width="8" height="8"/>
                <rect x="106" y="70" width="8" height="8"/>
                <rect x="118" y="70" width="8" height="8"/>
                <rect x="130" y="70" width="8" height="8"/>

                <rect x="145" y="70" width="8" height="8"/>
                <rect x="157" y="70" width="8" height="8"/>
                <rect x="169" y="70" width="8" height="8"/>
                <rect x="181" y="70" width="8" height="8"/>

                <rect x="70" y="85" width="8" height="8"/>
                <rect x="94" y="85" width="8" height="8"/>
                <rect x="118" y="85" width="8" height="8"/>
                <rect x="130" y="85" width="8" height="8"/>

                <rect x="15" y="106" width="8" height="8"/>
                <rect x="39" y="106" width="8" height="8"/>
                <rect x="51" y="106" width="8" height="8"/>

                <rect x="70" y="106" width="8" height="8"/>
                <rect x="82" y="106" width="8" height="8"/>
                <rect x="106" y="106" width="8" height="8"/>
                <rect x="130" y="106" width="8" height="8"/>

                <rect x="145" y="106" width="8" height="8"/>
                <rect x="169" y="106" width="8" height="8"/>
                <rect x="181" y="106" width="8" height="8"/>

                <rect x="70" y="118" width="8" height="8"/>
                <rect x="94" y="118" width="8" height="8"/>
                <rect x="106" y="118" width="8" height="8"/>
                <rect x="118" y="118" width="8" height="8"/>

                <rect x="145" y="118" width="8" height="8"/>
                <rect x="157" y="118" width="8" height="8"/>
                <rect x="181" y="118" width="8" height="8"/>

                <rect x="15" y="118" width="8" height="8"/>
                <rect x="27" y="118" width="8" height="8"/>
                <rect x="51" y="118" width="8" height="8"/>

                <rect x="70" y="145" width="8" height="8"/>
                <rect x="82" y="145" width="8" height="8"/>
                <rect x="94" y="145" width="8" height="8"/>
                <rect x="118" y="145" width="8" height="8"/>
                <rect x="130" y="145" width="8" height="8"/>

                <rect x="145" y="145" width="8" height="8"/>
                <rect x="157" y="145" width="8" height="8"/>
                <rect x="169" y="145" width="8" height="8"/>

                <rect x="70" y="157" width="8" height="8"/>
                <rect x="94" y="157" width="8" height="8"/>
                <rect x="106" y="157" width="8" height="8"/>
                <rect x="130" y="157" width="8" height="8"/>

                <rect x="145" y="157" width="8" height="8"/>
                <rect x="169" y="157" width="8" height="8"/>
                <rect x="181" y="157" width="8" height="8"/>

                <rect x="70" y="169" width="8" height="8"/>
                <rect x="82" y="169" width="8" height="8"/>
                <rect x="106" y="169" width="8" height="8"/>
                <rect x="118" y="169" width="8" height="8"/>
                <rect x="130" y="169" width="8" height="8"/>

                <rect x="145" y="169" width="8" height="8"/>
                <rect x="157" y="169" width="8" height="8"/>
                <rect x="181" y="169" width="8" height="8"/>

                <rect x="70" y="181" width="8" height="8"/>
                <rect x="94" y="181" width="8" height="8"/>
                <rect x="118" y="181" width="8" height="8"/>

                <rect x="145" y="181" width="8" height="8"/>
                <rect x="169" y="181" width="8" height="8"/>
              </g>

              {/* Center Logo - Small ZillaScope icon */}
              <g>
                <circle cx="100" cy="100" r="18" fill="white" stroke="black" strokeWidth="2"/>
                <circle cx="100" cy="100" r="14" fill="none" stroke="#64ffff" strokeWidth="1.5"/>
                <circle cx="100" cy="100" r="9" fill="none" stroke="#64ffff" strokeWidth="1"/>
                <line x1="100" y1="82" x2="100" y2="88" stroke="#64ffff" strokeWidth="1.5"/>
                <line x1="100" y1="112" x2="100" y2="118" stroke="#64ffff" strokeWidth="1.5"/>
                <line x1="82" y1="100" x2="88" y2="100" stroke="#64ffff" strokeWidth="1.5"/>
                <line x1="112" y1="100" x2="118" y2="100" stroke="#64ffff" strokeWidth="1.5"/>
              </g>
            </svg>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-300 mb-3">
              Scan QR Code to download ZillaScope
            </p>
            <button className="w-full px-8 py-3 bg-[#64ffff]/20 text-[#64ffff] rounded-lg border border-[#64ffff]/50 font-semibold text-sm tracking-wide hover:bg-[#64ffff]/30 transition-colors cursor-not-allowed">
              COMING SOON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
