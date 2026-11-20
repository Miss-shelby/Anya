import React from 'react';
import { Wifi, BatteryFull, Signal } from 'lucide-react';

interface MobileFrameProps {
  children: React.ReactNode;
}

/**
 * Displays ANYA inside a realistic smartphone frame on desktop viewports,
 * while expanding naturally to fill the full screen on actual mobile devices.
 */
export function MobileFrame({ children }: MobileFrameProps) {
  return (
    <div className="min-h-dvh w-full bg-anya-canvas md:flex md:items-center md:justify-center md:p-6">
      <a
        href="#anya-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-anya-primary focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to main content
      </a>

      {/* Smartphone bezel on md+ screens; full native viewport on mobile */}
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-anya-bg anya-screen-bg md:h-[844px] md:max-h-[92dvh] md:w-[392px] md:rounded-[48px] md:border-[10px] md:border-[#1E1A2E] md:shadow-phone">
        {/* Desktop-only simulated smartphone status bar + Dynamic Island */}
        <div
          aria-hidden="true"
          className="hidden select-none items-center justify-between px-7 pb-1 pt-3 text-xs font-bold text-anya-ink md:flex"
        >
          <span>9:41</span>
          <div className="h-[26px] w-[104px] rounded-full bg-[#12101C]" />
          <div className="flex items-center gap-1.5">
            <Signal className="h-3.5 w-3.5" strokeWidth={2.4} />
            <Wifi className="h-3.5 w-3.5" strokeWidth={2.4} />
            <BatteryFull className="h-4 w-4" strokeWidth={2.2} />
          </div>
        </div>

        {/* Main app viewport */}
        <div
          id="anya-main-content"
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {children}
        </div>

        {/* Desktop-only home indicator bar */}
        <div
          aria-hidden="true"
          className="hidden justify-center bg-transparent pb-2 pt-1 md:flex"
        >
          <div className="h-1 w-32 rounded-full bg-anya-ink/20" />
        </div>
      </div>
    </div>
  );
}
