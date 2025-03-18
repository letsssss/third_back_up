"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export default function WriteReview() {
  const params = useParams()
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [review, setReview] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 임시 거래 데이터
  const transactionData = {
    id: params.transactionId,
    seller: "티켓마스터",
    sellerId: "seller123",
    ticketTitle: "세븐틴 'FOLLOW' TO SEOUL",
    ticketDate: "2024.03.20",
    ticketSeat: "VIP석 A구역",
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      alert("별점을 선택해주세요.")
      return
    }

    if (review.trim() === "") {
      alert("리뷰 내용을 입력해주세요.")
      return
    }

    setIsSubmitting(true)

    // 실제 구현에서는 API 호출
    try {
      // const response = await fetch("/api/reviews", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     transactionId: params.transactionId,
      //     sellerId: transactionData.sellerId,
      //     rating,
      //     content: review,
      //   }),
      // });

      // if (!response.ok) throw new Error("리뷰 등록에 실패했습니다.");

      // 성공 시 마이페이지로 이동
      setTimeout(() => {
        alert("리뷰가 성공적으로 등록되었습니다.")
        router.push("/mypage")
      }, 1000)
    } catch (error) {
      alert("리뷰 등록 중 오류가 발생했습니다. 다시 시도해주세요.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <Link href="/mypage" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>마이페이지로 돌아가기</span>
          </Link>
          <h1 className="text-2xl font-bold mt-4">판매자 리뷰 작성</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-2">거래 정보</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="mb-1">
                    <span className="font-medium">판매자:</span> {transactionData.seller}
                  </p>
                  <p className="mb-1">
                    <span className="font-medium">티켓:</span> {transactionData.ticketTitle}
                  </p>
                  <p>
                    <span className="font-medium">좌석:</span> {transactionData.ticketSeat}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">별점</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="text-2xl focus:outline-none"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            (hoverRating || rating) >= star ? "text-yellow-500 fill-current" : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label htmlFor="review" className="block text-sm font-medium text-gray-700 mb-2">
                    리뷰 내용
                  </label>
                  <Textarea
                    id="review"
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="판매자와의 거래 경험을 자세히 알려주세요."
                    className="min-h-[150px]"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#0061FF] hover:bg-[#0052D6] text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "제출 중..." : "리뷰 등록하기"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

