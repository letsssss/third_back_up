"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

export default function SellerTransactionRedirect() {
  const params = useParams()
  const router = useRouter()
  const orderNumber = params?.orderNumber as string

  useEffect(() => {
    if (orderNumber) {
      // transaction/[orderNumber] 페이지로 리다이렉트
      router.push(`/transaction/${orderNumber}`)
    }
  }, [orderNumber, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-lg font-semibold">리다이렉트 중...</div>
        <div className="text-muted-foreground">잠시만 기다려주세요. 거래 페이지로 이동합니다.</div>
      </div>
    </div>
  )
} 