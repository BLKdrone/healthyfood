'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#292524] flex flex-col antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Desktop Sidebar (visible on lg:flex) */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 w-full lg:pl-72 transition-all">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-full sm:max-w-2xl lg:max-w-5xl pb-28 lg:pb-12">
          {children}
        </div>
      </main>

      {/* Mobile/Tablet Bottom Navigation Bar (visible on < lg) */}
      <BottomNav />
    </div>
  );
}
