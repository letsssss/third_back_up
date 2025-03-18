"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Star, ThumbsUp, Calendar, MapPin, Clock } from "lucide-react"
import { useParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

// 임시 판매자 데이터
const sellerData = {
  id: "seller123",
  username: "티켓마스터",
  joinDate: "2022-05-15",
  profileImage: "/placeholder.svg?height=200&width=200",
  rating: 4.8,
  reviewCount: 56,
  responseRate: 98,
  responseTime: "평균 30분 이내",
  successfulSales: 124,
  verificationBadges: ["본인인증", "계좌인증", "휴대폰인증"],
  description: "안녕하세요! 항상 정확하고 빠른 거래를 약속드립니다. 궁금한 점이 있으시면 언제든지 문의해주세요.",
  // 추가된 성공확률 정보
  proxyTicketingSuccessRate: 98.5,
  cancellationTicketingSuccessRate: 97.2,
  totalProxyTicketings: 87,
  totalCancellationTicketings: 63,
}

// 임시 리뷰 데이터
const reviewsData = [
  {
    id: 1,
    reviewer: "콘서트러버",
    rating: 5,
    date: "2024-02-15",
    content: "정말 빠른 응답과 친절한 대응 감사합니다. 티켓도 약속한 시간에 정확히 전달해주셨어요!",
    ticketInfo: "세븐틴 콘서트 - VIP석",
    helpful: 12,
  },
  {
    id: 2,
    reviewer: "음악팬",
    rating: 5,
    date: "2024-01-20",
    content: "두 번째 거래인데 역시 믿을 수 있는 판매자입니다. 다음에도 또 거래하고 싶어요.",
    ticketInfo: "아이유 콘서트 - R석",
    helpful: 8,
  },
  {
    id: 3,
    reviewer: "공연매니아",
    rating: 4,
    date: "2023-12-05",
    content: "전반적으로 만족스러운 거래였습니다. 티켓 상태도 좋았고 설명대로였어요.",
    ticketInfo: "뮤지컬 라이온킹 - S석",
    helpful: 5,
  },
]

// 임시 판매 중인 티켓 데이터
const activeListingsData = [
  {
    id: 1,
    title: "세븐틴 'FOLLOW' TO SEOUL",
    date: "2024.03.20",
    time: "19:00",
    venue: "잠실종합운동장 주경기장",
    price: 110000,
    image: "/placeholder.svg?height=150&width=300",
  },
  {
    id: 2,
    title: "아이유 콘서트",
    date: "2024.05.01",
    time: "18:00",
    venue: "올림픽공원 체조경기장",
    price: 99000,
    image: "/placeholder.svg?height=150&width=300",
  },
]

export default function SellerProfile() {
  const params = useParams()
  const [activeTab, setActiveTab] = useState("reviews")
  const [seller, setSeller] = useState(sellerData)
  const [reviews, setReviews] = useState(reviewsData)
  const [activeListings, setActiveListings] = useState(activeListingsData)

  // 실제 구현에서는 여기서 판매자 ID를 기반으로 데이터를 가져옵니다
  useEffect(() => {
    // API 호출 예시:
    // const fetchSellerData = async () => {
    //   const response = await fetch(`/api/sellers/${params.id}`);
    //   const data = await response.json();
    //   setSeller(data);
    // };
    // fetchSellerData();
    console.log("판매자 ID:", params.id)
  }, [params.id])

  const handleHelpfulClick = (reviewId: number) => {
    setReviews(reviews.map((review) => (review.id === reviewId ? { ...review, helpful: review.helpful + 1 } : review)))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>홈으로 돌아가기</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 판매자 프로필 카드 */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
            <div className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                  <Image
                    src={seller.profileImage || "/placeholder.svg"}
                    alt={seller.username}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold">{seller.username}</h1>
                    <div className="flex items-center text-yellow-500">
                      <Star className="h-5 w-5 fill-current" />
                      <span className="ml-1 font-medium">{seller.rating}</span>
                      <span className="text-gray-500 text-sm ml-1">({seller.reviewCount})</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {seller.verificationBadges.map((badge) => (
                      <Badge key={badge} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        ✓ {badge}
                      </Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">가입일</p>
                      <p className="font-medium">{new Date(seller.joinDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">응답률</p>
                      <p className="font-medium">{seller.responseRate}%</p>
                    </div>
                    <div>
                      <p className="text-gray-500">거래 성사</p>
                      <p className="font-medium">{seller.successfulSales}건</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl">
                <h2 className="text-lg font-medium mb-4">티켓팅 성공 확률</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-blue-800">대리티켓팅</h3>
                      <span className="text-xl font-bold text-blue-600">{seller.proxyTicketingSuccessRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${seller.proxyTicketingSuccessRate}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">총 {seller.totalProxyTicketings}건 진행</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-green-800">취켓팅</h3>
                      <span className="text-xl font-bold text-green-600">
                        {seller.cancellationTicketingSuccessRate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-green-600 h-2.5 rounded-full"
                        style={{ width: `${seller.cancellationTicketingSuccessRate}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">총 {seller.totalCancellationTicketings}건 진행</p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div>
                <h2 className="text-lg font-medium mb-2">판매자 소개</h2>
                <p className="text-gray-700">{seller.description}</p>
              </div>
            </div>
          </div>

          {/* 탭 섹션 */}
          <Tabs
            defaultValue="reviews"
            onValueChange={setActiveTab}
            className="bg-white rounded-xl shadow-md overflow-hidden"
          >
            <TabsList className="w-full justify-start p-0 bg-transparent border-b rounded-none h-auto">
              <TabsTrigger
                value="reviews"
                className={`px-6 py-4 rounded-none border-b-2 ${
                  activeTab === "reviews" ? "border-blue-600 text-blue-600" : "border-transparent"
                }`}
              >
                리뷰 ({reviews.length})
              </TabsTrigger>
              <TabsTrigger
                value="listings"
                className={`px-6 py-4 rounded-none border-b-2 ${
                  activeTab === "listings" ? "border-blue-600 text-blue-600" : "border-transparent"
                }`}
              >
                판매 중인 티켓 ({activeListings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reviews" className="p-6">
              {reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b pb-6 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{review.reviewer}</span>
                            <div className="flex text-yellow-500">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${i < review.rating ? "fill-current" : "text-gray-300"}`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-gray-500">{review.ticketInfo}</p>
                        </div>
                        <span className="text-sm text-gray-500">{new Date(review.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-700 mb-3">{review.content}</p>
                      <button
                        className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                        onClick={() => handleHelpfulClick(review.id)}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        도움이 됐어요 ({review.helpful})
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">아직 리뷰가 없습니다.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="listings" className="p-6">
              {activeListings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeListings.map((ticket) => (
                    <Link href={`/ticket/${ticket.id}`} key={ticket.id}>
                      <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        <div className="relative h-40">
                          <Image
                            src={ticket.image || "/placeholder.svg"}
                            alt={ticket.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium mb-2">{ticket.title}</h3>
                          <div className="space-y-1 text-sm text-gray-500 mb-2">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span>{ticket.date}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>{ticket.time}</span>
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span>{ticket.venue}</span>
                            </div>
                          </div>
                          <p className="font-medium text-blue-600">{ticket.price.toLocaleString()}원</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">현재 판매 중인 티켓이 없습니다.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

