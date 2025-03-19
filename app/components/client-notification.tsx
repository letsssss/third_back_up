'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// 클라이언트 사이드에서만 렌더링되는 알림 컴포넌트
const DynamicNotification = dynamic(
  () => import('./notification-dropdown').then((mod) => mod.NotificationDropdown),
  { 
    ssr: false,
    loading: () => (
      <div className="relative">
        <button className="flex items-center text-gray-700 hover:text-[#0061FF] transition-colors">
          <span className="relative">알림</span>
        </button>
      </div>
    )
  }
);

export function ClientNotification() {
  return (
    <Suspense fallback={
      <div className="relative">
        <button className="flex items-center text-gray-700 hover:text-[#0061FF] transition-colors">
          <span className="relative">알림</span>
        </button>
      </div>
    }>
      <DynamicNotification />
    </Suspense>
  );
} 