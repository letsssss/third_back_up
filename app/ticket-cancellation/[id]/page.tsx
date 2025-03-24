"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calendar, MapPin, Clock, CheckCircle, AlertCircle, Star } from "lucide-react"
import { motion } from "framer-motion"
import confetti from "canvas-confetti"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

// 티켓 시트 타입 정의
interface SeatOption {
  id: string;
  label: string;
  price: number;
  available: boolean;
}

// 티켓 데이터 타입 정의
interface TicketData {
  id: number;
  title: string;
  artist: string;
  date: string;
  time: string;
  venue: string;
  price: number;
  originalPrice: number;
  image: string;
  status: string;
  successRate: number;
  description?: string;
  seller: {
    id?: string;
    name: string;
    rating: number;
    image: string;
  };
  seatOptions: SeatOption[];
}

export default function TicketCancellationDetail() {
  const params = useParams();
  const id = params?.id as string;
  
  const router = useRouter()
  const { user } = useAuth()
  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [accountId, setAccountId] = useState("")
  const [accountPassword, setAccountPassword] = useState("")
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isAuthor, setIsAuthor] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 마운트 상태 관리
  useEffect(() => {
    setMounted(true)
    if (user?.name) {
      setName(user.name)
    }
  }, [user])

  // 게시글 데이터 불러오기
  useEffect(() => {
    async function fetchPostData() {
      if (!id) {
        setLoading(false)
        toast.error("유효하지 않은 게시글 ID입니다.")
        return
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/posts/${id}`);
        
        if (!response.ok) {
          throw new Error('게시글을 불러오는데 실패했습니다');
        }
        
        const data = await response.json();
        console.log("불러온 게시글 데이터:", data);
        
        if (!data || !data.post) {
          throw new Error('데이터 형식이 올바르지 않습니다');
        }
        
        const postData = data.post;
        
        // 날짜 및 가격 정보 파싱
        let eventDate = '', eventTime = '', eventVenue = '', seatOptions = [];
        let eventPrice = postData.price || 0;
        
        try {
          // 게시글 내용에서 정보 파싱 (JSON 구조)
          let contentObj;
          
          if (typeof postData.content === 'string') {
            try {
              contentObj = JSON.parse(postData.content);
              console.log("JSON 파싱 완료:", contentObj);
            } catch (e) {
              console.error('JSON 파싱 실패, 텍스트로 처리합니다:', e);
              // 텍스트 모드 폴백 처리
              const textContent = postData.content;
              contentObj = { description: textContent };
            }
          } else {
            contentObj = postData.content;
          }
          
          // 구조화된 데이터 추출
          eventDate = contentObj.date || '';
          eventTime = contentObj.time || '';
          eventVenue = contentObj.venue || '';
          eventPrice = contentObj.price || eventPrice;
          
          // 중요: 구역 정보 처리
          if (contentObj.sections && Array.isArray(contentObj.sections)) {
            console.log("구역 정보 발견:", contentObj.sections);
            seatOptions = contentObj.sections;
          } else {
            console.log("구역 정보가 없거나 유효하지 않습니다");
            // 텍스트 기반 섹션 추출 시도 (이전 형식 지원)
            const sectionPattern = /([^:]+): (\d+)원/g;
            let match;
            const extractedSections = [];
            
            while ((match = sectionPattern.exec(postData.content)) !== null) {
              extractedSections.push({
                id: extractedSections.length.toString(),
                label: match[1].trim(),
                price: parseInt(match[2].replace(/,/g, '')),
                available: true
              });
            }
            
            if (extractedSections.length > 0) {
              seatOptions = extractedSections;
            }
          }
        } catch (e) {
          console.error('게시글 내용 파싱 오류:', e);
          // 파싱 실패시 원본 데이터 사용
        }
        
        console.log("최종 좌석 정보:", seatOptions);
        
        // 좌석 정보가 없을 경우 기본값 설정
        if (!seatOptions || seatOptions.length === 0) {
          seatOptions = [
            { id: 'A', label: 'A구역', price: eventPrice, available: true },
            { id: 'B', label: 'B구역', price: eventPrice, available: true },
            { id: 'C', label: 'C구역', price: eventPrice, available: true }
          ];
        }
        
        setTicketData({
          id: postData.id,
          title: postData.title || '티켓 제목',
          artist: postData.artist || '아티스트 정보',
          date: eventDate || '날짜 정보 없음',
          time: eventTime || '시간 정보 없음',
          venue: eventVenue || '장소 정보 없음',
          price: eventPrice,
          originalPrice: eventPrice,
          image: postData.image || '/default-ticket.jpg',
          status: 'FOR_SALE',
          successRate: 80,
          seller: {
            id: postData.author?.id?.toString() || '',
            name: postData.author?.name || '판매자 정보 없음',
            rating: 4.5,
            image: postData.author?.image || '',
          },
          seatOptions: seatOptions
        });
        
        // 사용자가 게시글 작성자인지 확인
        console.log("사용자 ID 확인:", user?.id?.toString());
        console.log("게시글 작성자 ID 확인:", postData.author?.id?.toString());
        
        if (user && postData.author) {
          const userId = user.id.toString();
          const authorId = postData.author.id.toString();
          
          console.log("비교 결과:", userId === authorId);
          
          if (userId === authorId) {
            console.log("사용자가 작성자로 확인됨");
            setIsAuthor(true);
          } else {
            setIsAuthor(false);
          }
        }
        
        setError(null);
      } catch (error) {
        console.error('게시글 조회 에러:', error);
        setError(error instanceof Error ? error.message : '게시글을 불러오는데 실패했습니다');
      } finally {
        setLoading(false);
      }
    }
    
    fetchPostData();
  }, [id]);

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

  const toggleSeatSelection = (seatId: string) => {
    setSelectedSeats((prev) => (prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!id) {
      toast.error("유효하지 않은 게시글 ID입니다.")
      return
    }

    if (!user) {
      toast.error("로그인이 필요한 서비스입니다.")
      router.push("/login")
      return
    }

    // 자신의 게시글인지 확인
    if (isAuthor) {
      toast.error("자신의 게시글은 구매할 수 없습니다.")
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

    // 선택한 좌석 정보 구성
    const selectedSeatLabels = selectedSeats
      .map((seatId) => {
        const seat = ticketData?.seatOptions.find((s) => s.id === seatId)
        return seat ? seat.label : ""
      })
      .filter(Boolean)
      .join(", ")

    // 티켓 구매 요청
    const purchaseTicket = async () => {
      try {
        if (!id) {
          throw new Error("게시글 ID가 없습니다")
        }

        // 티켓 구매 API 호출
        const response = await fetch('/api/ticket-purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            postId: parseInt(id),
            quantity: selectedSeats.length,
            selectedSeats: selectedSeatLabels,
            phoneNumber: phoneNumber,
            paymentMethod: '계좌이체'
          }),
          credentials: 'include', // 쿠키 포함 (인증 정보)
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("구매 요청 실패:", errorData);
          throw new Error(errorData.message || '구매 요청 중 오류가 발생했습니다.');
        }

        const data = await response.json();
        console.log("구매 응답:", data);
        
        setIsSuccess(true)
        setTimeout(() => {
          router.push("/mypage?tab=purchases")
        }, 5000)
      } catch (error) {
        console.error('구매 처리 오류:', error);
        toast.error(error instanceof Error ? error.message : '구매 요청 중 오류가 발생했습니다.');
      } finally {
        setIsSubmitting(false);
      }
    };

    purchaseTicket();
  }

  // 로딩 중 표시
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 데이터가 없는 경우
  if (!ticketData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">게시글을 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-4">요청하신 게시글이 존재하지 않거나 삭제되었습니다.</p>
          <Link href="/ticket-cancellation">
            <Button>목록으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    );
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
                    return seat ? `${seat.label} - ${seat.price.toLocaleString()}원` : ""
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
                      성공률 {ticketData.successRate}%
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
                    남은시간: 2일 13시간
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
                        src={ticketData.seller.image || "/placeholder.svg"}
                        alt={ticketData.seller.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/seller/${ticketData.seller.id}`} className="font-medium hover:text-blue-600">
                          {ticketData.seller.name}
                        </Link>
                        <div className="flex items-center text-yellow-500">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="ml-1 text-sm">{ticketData.seller.rating}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        거래 성사 124건 | 응답률 98%
                      </p>
                    </div>
                    <Link href={`/seller/${ticketData.seller.id}`}>
                      <Button variant="outline">
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
              {mounted && !user && (
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
              {mounted && user && isAuthor && (
                <div className="bg-orange-50 p-4 rounded-lg mb-6">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-orange-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-orange-700 font-medium">자신의 게시글은 구매할 수 없습니다</p>
                      <p className="text-sm text-orange-600">본인이 등록한 게시글은 구매 신청이 불가능합니다.</p>
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

              {mounted && user && !isAuthor && (
                <form onSubmit={handleSubmit}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">좌석 선택(중복 선택 가능)</label>
                    <div 
                      className="flex flex-wrap gap-2 mt-4 items-center"
                    >
                      {ticketData.seatOptions.map((seat: SeatOption) => (
                        <button
                          key={seat.id}
                          className={`border rounded-md px-4 py-2 flex flex-col items-center transition-colors ${
                            selectedSeats.includes(seat.id)
                              ? "bg-blue-50 border-blue-500"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => toggleSeatSelection(seat.id)}
                        >
                          <p className="font-medium">{seat.label}</p>
                          <p className="text-gray-600 mt-1">{seat.price.toLocaleString()}원</p>
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
                      />
                      <p className="text-sm text-gray-500 mt-1">취소표 발생 시 알림을 받을 연락처를 입력해주세요.</p>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-[#0061FF] hover:bg-[#0052D6]" disabled={isSubmitting}>
                    {isSubmitting ? "처리 중..." : "취켓팅 신청하기"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <div className="mt-8">
        <Button 
          variant="outline"
          onClick={() => router.push("/ticket-cancellation")}
        >
          목록으로 돌아가기
        </Button>
      </div>
    </div>
  )
}

