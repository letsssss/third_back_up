'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Link from 'next/link';

// 클라이언트 사이드에서만 렌더링되는 헤더
const DynamicHeader = dynamic(
  () => import('./header').then((mod) => mod.Header),
  {
    ssr: false,
    loading: () => (
      <header className="w-full bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div>
              <Link href="/" className="text-xl font-bold text-[#0061FF]">
                티켓마켓
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-gray-700">
                로딩 중...
              </div>
            </div>
          </div>
        </div>
      </header>
    )
  }
);

export function LayoutWithHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Suspense fallback={
        <header className="w-full bg-white border-b">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              <div>
                <Link href="/" className="text-xl font-bold text-[#0061FF]">
                  티켓마켓
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-gray-700">
                  로딩 중...
                </div>
              </div>
            </div>
          </div>
        </header>
      }>
        <DynamicHeader />
      </Suspense>
      {children}
    </div>
  );
} 