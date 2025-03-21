"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

export default function ProfileRedirect() {
  const router = useRouter();
  const params = useParams();
  
  useEffect(() => {
    const sellerId = params?.id;
    if (sellerId) {
      router.replace(`/seller/${sellerId}`);
    }
  }, [router, params]);
  
  // 리다이렉트 중에 표시할 로딩 메시지
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">로딩 중...</span>
        </div>
        <p className="mt-4 text-lg">페이지로 이동 중...</p>
      </div>
    </div>
  );
} 