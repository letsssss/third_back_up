"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Calendar, MapPin, Clock, CheckCircle, AlertCircle, Star } from "lucide-react"
import { motion } from "framer-motion"
import confetti from "canvas-confetti"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

// 임시 데이터 타입 정의
interface TicketData {
  id: number
  title: string
  artist: string
  date: string
  time: string
  venue: string
  price: number
  originalPrice: number
  image: string
  status: string
  successRate: string
  remainingTime: string
  description: string
  seatOptions: {
    id: number
    name: string
    price: number
    available: boolean
  }[]
  seller: {
    id: string | number
    username: string
    rating: number
    reviewCount: number
    responseRate: number
    successfulSales: number
    profileImage: string
  }
  // 추가: 게시물 작성자 정보
  authorId?: number
}

export default function TicketCancellationDetail() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [selectedSeats, setSelectedSeats] = useState<number[]>([])
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [accountId, setAccountId] = useState("")
  const [accountPassword, setAccountPassword] = useState("")
  const [name, setName] = useState(user?.name || "")
  const [address, setAddress] = useState("")
  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthor, setIsAuthor] = useState(false)

  // 게시물 데이터 가져오기
  useEffect(() => {
    const fetchPostData = async () => {
      try {
        const postId = params.id
        const response = await fetch(`/api/posts/${postId}`)
        
        if (!response.ok) {
          throw new Error('게시물을 불러오는데 실패했습니다.')
        }
        
        const data = await response.json()
        
        if (data && data.post) {
          // API 응답 데이터를 ticketData 형식에 맞게 변환
          const post = data.post
          
          // authorId를 숫자로 변환하여 비교
          const postAuthorId = typeof post.authorId === 'string' ? parseInt(post.authorId) : post.authorId
          
          // 게시물 작성자와 현재 로그인한 사용자를 비교
          if (user && user.id === postAuthorId) {
            setIsAuthor(true)
          }
          
          // 티켓 데이터 포맷팅
          setTicketData({
            id: typeof post.id === 'string' ? parseInt(post.id) : post.id,
            title: post.title,
            artist: post.eventName || '정보 없음',
            date: post.eventDate || '정보 없음',
            time: post.eventTime || '정보 없음',
            venue: post.venue || '정보 없음',
            price: typeof post.ticketPrice === 'string' ? parseFloat(post.ticketPrice) : (post.ticketPrice || 0),
            originalPrice: typeof post.ticketPrice === 'string' 
              ? parseFloat(post.ticketPrice) * 1.1 
              : (post.ticketPrice && post.ticketPrice * 1.1) || 0,
            image: post.imageUrl || "/placeholder.svg?height=400&width=800",
            status: "취켓팅 가능",
            successRate: "98%",
            remainingTime: "2일 13시간",
            description: post.content || "",
            seatOptions: [
              { 
                id: 1, 
                name: "VIP석", 
                price: typeof post.ticketPrice === 'string' 
                  ? parseFloat(post.ticketPrice) * 1.5 
                  : (post.ticketPrice ? post.ticketPrice * 1.5 : 165000), 
                available: true 
              },
              { 
                id: 2, 
                name: "R석", 
                price: typeof post.ticketPrice === 'string' 
                  ? parseFloat(post.ticketPrice) * 1.3
                  : (post.ticketPrice ? post.ticketPrice * 1.3 : 145000), 
                available: true 
              },
              { 
                id: 3, 
                name: "S석", 
                price: typeof post.ticketPrice === 'string' 
                  ? parseFloat(post.ticketPrice) 
                  : (post.ticketPrice || 110000), 
                available: true 
              },
            ],
            seller: {
              id: post.author?.id || "unknown",
              username: post.author?.name || "알 수 없음",
              rating: 4.8,
              reviewCount: 56,
              responseRate: 98,
              successfulSales: 124,
              profileImage: "/placeholder.svg?height=100&width=100",
            },
            authorId: typeof post.authorId === 'string' ? parseInt(post.authorId) : post.authorId
          })
        }
        
        setLoading(false)
      } catch (err) {
        console.error('게시물 데이터 가져오기 실패:', err)
        setError('게시물을 불러오는데 실패했습니다.')
        setLoading(false)
      }
    }
    
    fetchPostData()
  }, [params.id, user])

  // 로그인 상태가 변경되면 이름 필드 업데이트
  useEffect(() => {
    if (user) {
      setName(user.name)
    }
  }, [user])

  // Trigger confetti effect when success page is shown
  useEffect(() => {
    if (isSuccess) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })
    }
  }, [isSuccess])

  const toggleSeatSelection = (seatId: number) => {
    setSelectedSeats((prev) => (prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error("로그인이 필요한 서비스입니다.")
      router.push("/login")
      return
    }
    
    // 자신의 게시물 구매 방지
    if (isAuthor) {
      toast.error("본인이 작성한 게시물은 신청할 수 없습니다.")
      return
    }

    if (selectedSeats.length === 0) {
      toast.error("좌석을 하나 이상 선택해주세요.")
      return
    }

    if (!phoneNumber) {
      toast.error("연락처를 입력해주세요.")
      return
    }

    setIsSubmitting(true)

    // 실제로는 API 호출을 해야 합니다
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSuccess(true)
    }, 1500)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto mb-4"></div>
          <p>데이터를 불러오는 중입니다...</p>
        </div>
      </div>
    )
  }

  if (error || !ticketData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">오류가 발생했습니다</h1>
          <p className="text-gray-600 mb-4">{error || '게시물을 불러오는데 실패했습니다.'}</p>
          <Link href="/ticket-cancellation">
            <Button className="w-full">목록으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            </motion.div>
            <h1 className="text-2xl font-bold mb-4">취켓팅 신청 완료!</h1>
            <p className="text-gray-600 mb-6">
              취소표 발생 시 {phoneNumber}로 알림을 보내드립니다.
              <br />
              취소표 발생 시 빠르게 예매를 진행해 드립니다.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500 mb-2">신청 정보</p>
              <p className="font-semibold text-gray-800 mb-1">{ticketData.title}</p>
              <p className="text-gray-600 text-sm mb-2">
                {ticketData.date} {ticketData.time}
              </p>
              <p className="text-gray-600 text-sm">
                {selectedSeats
                  .map((seatId) => {
                    const seat = ticketData.seatOptions.find((s) => s.id === seatId)
                    return seat ? `${seat.name} - ${seat.price.toLocaleString()}원` : ""
                  })
                  .join(", ")}
              </p>
            </div>
            <div className="flex flex-col space-y-4">
              <Link href="/mypage">
                <Button className="w-full">마이페이지에서 확인하기</Button>
              </Link>
              <Link href="/ticket-cancellation">
                <Button variant="outline" className="w-full">
                  다른 공연 취켓팅 신청하기
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <Link href="/ticket-cancellation" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>취켓팅 목록으로 돌아가기</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/2">
                <div className="relative h-64 md:h-full">
                  <Image
                    src={ticketData.image || "/placeholder.svg"}
                    alt={ticketData.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-4 right-4">
                    <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent bg-green-500 text-white hover:bg-green-600">
                      성공률 {ticketData.successRate}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 md:w-1/2">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">{ticketData.title}</h1>
                    <p className="text-gray-600 mb-4">{ticketData.artist}</p>
                  </div>
                  <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent bg-black/50 text-white backdrop-blur-sm">
                    남은시간: {ticketData.remainingTime}
                  </div>
                </div>

                <div className="space-y-3 text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{ticketData.date}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{ticketData.time}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{ticketData.venue}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="font-medium text-black text-xl">{ticketData.price.toLocaleString()}원</span>
                  <span className="text-gray-400 text-sm line-through ml-2">
                    {ticketData.originalPrice.toLocaleString()}원
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-4">{ticketData.description}</p>

                {/* 판매자 정보 섹션 추가 */}
                <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold mb-2">판매자 정보</h3>
                  <div className="flex items-center gap-4">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                      <Image
                        src={ticketData.seller.profileImage || "/placeholder.svg"}
                        alt={ticketData.seller.username}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/seller/${ticketData.seller.id}`} className="font-medium hover:text-blue-600">
                          {ticketData.seller.username}
                        </Link>
                        <div className="flex items-center text-yellow-500">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="ml-1 text-sm">{ticketData.seller.rating}</span>
                          <span className="text-gray-500 text-xs ml-1">({ticketData.seller.reviewCount})</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        거래 성사 {ticketData.seller.successfulSales}건 | 응답률 {ticketData.seller.responseRate}%
                      </p>
                    </div>
                    <Link href={`/seller/${ticketData.seller.id}`}>
                      <Button variant="outline" className="text-xs px-2 py-1">
                        프로필 보기
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">취켓팅 신청하기</h2>
              
              {/* 본인 게시물 경고 메시지 */}
              {isAuthor && (
                <div className="bg-red-50 p-4 rounded-lg mb-6">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-red-700 font-medium">자신의 게시물입니다</p>
                      <p className="text-sm text-red-600">
                        본인이 작성한 게시물은 신청할 수 없습니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {!user && (
                <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-yellow-700 font-medium">로그인이 필요합니다</p>
                      <p className="text-sm text-yellow-600">취켓팅 서비스를 이용하시려면 먼저 로그인해주세요.</p>
                      <Link href="/login">
                        <Button className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white">로그인 하러가기</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                  <div>
                    <p className="text-blue-700 font-medium">취켓팅 서비스 안내</p>
                    <p className="text-sm text-blue-600">
                      취소표를 대신 잡아드리는 서비스입니다. 본인 계정으로 들어가서 잡아드립니다!
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">좌석 선택(중복 선택 가능)</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {ticketData.seatOptions.map((seat) => (
                      <button
                        key={seat.id}
                        type="button"
                        className={`border rounded-lg p-4 text-center transition-colors ${
                          selectedSeats.includes(seat.id)
                            ? "border-[#0061FF] bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => toggleSeatSelection(seat.id)}
                        disabled={isAuthor} // 자신의 게시물이면 선택 불가능하게 설정
                      >
                        <p className="font-medium">{seat.name}</p>
                        <p className="text-gray-600">{seat.price.toLocaleString()}원</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 mb-6">
                  <div>
                    <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 mb-2">
                      구매자 아이디
                    </label>
                    <Input
                      id="accountId"
                      type="text"
                      placeholder="예매 사이트 아이디를 입력해주세요"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      required
                      disabled={isAuthor} // 자신의 게시물이면 입력 불가능하게 설정
                    />
                  </div>

                  <div>
                    <label htmlFor="accountPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      구매자 비밀번호
                    </label>
                    <Input
                      id="accountPassword"
                      type="password"
                      placeholder="예매 사이트 비밀번호를 입력해주세요"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      required
                      disabled={isAuthor} // 자신의 게시물이면 입력 불가능하게 설정
                    />
                    <p className="text-sm text-gray-500 mt-1">예매 사이트에서 사용하는 계정 정보를 입력해주세요.</p>
                  </div>

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      구매자 이름
                    </label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="실명을 입력해주세요"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={isAuthor} // 자신의 게시물이면 입력 불가능하게 설정
                    />
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                      주소
                    </label>
                    <Input
                      id="address"
                      type="text"
                      placeholder="배송지 주소를 입력해주세요"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      disabled={isAuthor} // 자신의 게시물이면 입력 불가능하게 설정
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      연락처
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="010-0000-0000"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      disabled={isAuthor} // 자신의 게시물이면 입력 불가능하게 설정
                    />
                    <p className="text-sm text-gray-500 mt-1">취소표 발생 시 알림을 받을 연락처를 입력해주세요.</p>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-[#0061FF] hover:bg-[#0052D6]" 
                  disabled={isSubmitting || isAuthor} // 자신의 게시물이면 버튼 비활성화
                >
                  {isSubmitting ? "처리 중..." : isAuthor ? "본인 게시물은 신청 불가" : "취켓팅 신청하기"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

