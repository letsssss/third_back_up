"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import confetti from "canvas-confetti"
import { CheckCircle, Home, User } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function OrderSuccess() {
  const [orderDetails, setOrderDetails] = useState({
    orderNumber: "",
    ticketName: "",
    quantity: 0,
    totalAmount: 0,
  })

  useEffect(() => {
    // 실제 구현에서는 API에서 주문 정보를 가져와야 합니다.
    // 여기서는 더미 데이터를 사용합니다.
    setOrderDetails({
      orderNumber: "ORD-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
      ticketName: '세븐틴 "FOLLOW" TO SEOUL',
      quantity: 2,
      totalAmount: 220000,
    })

    // 컨페티 효과
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
        </motion.div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">결제 완료!</h1>
        <p className="text-gray-600 mb-6">티켓 구매가 성공적으로 완료되었습니다.</p>
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-500 mb-2">주문 번호</p>
          <p className="font-semibold text-gray-800 mb-4">{orderDetails.orderNumber}</p>
          <p className="text-sm text-gray-500 mb-2">티켓 정보</p>
          <p className="font-semibold text-gray-800 mb-2">{orderDetails.ticketName}</p>
          <p className="text-gray-600">
            {orderDetails.quantity}매 / 총 {orderDetails.totalAmount.toLocaleString()}원
          </p>
        </div>
        <div className="flex flex-col space-y-4">
          <Link href="/mypage" className="w-full">
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
              <User className="w-4 h-4 mr-2" />
              마이페이지에서 확인하기
            </Button>
          </Link>
          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full">
              <Home className="w-4 h-4 mr-2" />
              홈으로 돌아가기
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

