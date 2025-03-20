"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Calendar, MapPin, Clock, CreditCard, Play, ThumbsUp, CheckCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

import { Button } from "@/components/ui/button"
import { TransactionStepper } from "@/components/transaction-stepper"
import { TicketingStatusCard } from "@/components/ticketing-status-card"
import { ChatInterface } from "@/components/ChatInterface"
import { useChat } from "@/hooks/useChat"

// 거래 및 단계 관련 타입 정의
interface StepDates {
  payment: string;
  ticketing_started: string;
  ticketing_completed: string | null;
  confirmed: string | null;
}

interface Ticket {
  title: string;
  date: string;
  time: string;
  venue: string;
  seat: string;
  image: string;
}

interface User {
  id: string;
  name: string;
  profileImage: string;
}

interface TransactionData {
  id: string;
  type: string;
  status: string;
  currentStep: string;
  stepDates: StepDates;
  ticket: Ticket;
  price: number;
  paymentMethod: string;
  paymentStatus: string;
  ticketingStatus: string;
  ticketingInfo: string;
  seller?: User; // 판매자 정보 (구매자 화면인 경우)
  buyer?: User;  // 구매자 정보 (판매자 화면인 경우)
}

// 임시 데이터 (실제로는 API에서 가져와야 합니다)
const transactionData: TransactionData = {
  id: "1",
  type: "purchase", // 구매자 화면이므로 purchase로 설정
  status: "취켓팅 시작",
  currentStep: "ticketing_started", // 현재 단계
  stepDates: {
    payment: "2024-03-15 14:30",
    ticketing_started: "2024-03-16 09:15",
    ticketing_completed: null,
    confirmed: null,
  },
  ticket: {
    title: "세븐틴 콘서트",
    date: "2024-03-20",
    time: "19:00",
    venue: "잠실종합운동장 주경기장",
    seat: "VIP석 A구역 23열 15번",
    image: "/placeholder.svg",
  },
  price: 165000,
  paymentMethod: "신용카드",
  paymentStatus: "결제 완료",
  ticketingStatus: "취켓팅 진행중",
  ticketingInfo: "취소표 발생 시 알림을 보내드립니다. 취소표 발생 시 빠르게 예매를 진행해 드립니다.",
  seller: {
    id: "1",
    name: "티켓마스터",
    profileImage: "/placeholder.svg?height=50&width=50",
  },
}

export default function TransactionDetail() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [transaction, setTransaction] = useState<TransactionData>(transactionData)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // 현재 로그인한 사용자 ID (구매자)
  const [buyerId, setBuyerId] = useState<string>("2") // 구매자 ID를 "2"로 설정 (판매자는 "1")
  
  // useChat 훅 사용
  const { 
    messages, 
    isLoading: isMessagesLoading, 
    isSocketConnected,
    sendMessage,
    fetchMessages 
  } = useChat({
    transactionId: params?.id as string,
    userId: buyerId,
    userRole: 'buyer',
    otherUserId: transaction.seller?.id
  });

  // 페이지 로드 시 거래 정보 가져오기
  useEffect(() => {
    // 실제 구현에서는 API 호출하여 거래 정보 가져오기
    // const fetchTransactionData = async () => {
    //   try {
    //     const response = await fetch(`/api/transactions/${params.id}`);
    //     if (!response.ok) throw new Error('거래 정보를 가져오는데 실패했습니다');
    //     const data = await response.json();
    //     setTransaction(data);
    //   } catch (error) {
    //     console.error('거래 정보 로딩 오류:', error);
    //     toast({
    //       title: '거래 정보 로딩 실패',
    //       description: '거래 정보를 가져오는데 문제가 발생했습니다. 새로고침을 시도해주세요.',
    //       variant: 'destructive',
    //     });
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };
    
    // 임시로 데이터 로딩 시뮬레이션
    setTimeout(() => {
      // localStorage에서 저장된 역할 확인 (구매자/판매자)
      const role = localStorage.getItem('userRole') || 'buyer';
      if (role === 'seller') {
        setTransaction(prev => ({
          ...prev,
          type: 'sale',
        }));
      }
      
      setIsLoading(false);
    }, 1000);
    
  }, [params?.id, toast]);

  // 채팅창이 열릴 때 메시지 가져오기
  useEffect(() => {
    if (isChatOpen) {
      fetchMessages();
    }
  }, [isChatOpen, fetchMessages]);

  // 거래 단계 정의 - 4단계로 수정
  const transactionSteps = [
    {
      id: "payment",
      label: "결제 완료",
      icon: <CreditCard className="w-5 h-5" />,
      date: transaction.stepDates.payment
        ? new Date(transaction.stepDates.payment).toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : undefined,
    },
    {
      id: "ticketing_started",
      label: "취켓팅 시작",
      icon: <Play className="w-5 h-5" />,
      date: transaction.stepDates.ticketing_started
        ? new Date(transaction.stepDates.ticketing_started).toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : undefined,
    },
    {
      id: "ticketing_completed",
      label: "취켓팅 완료",
      icon: <CheckCircle className="w-5 h-5" />,
      date: transaction.stepDates.ticketing_completed
        ? new Date(transaction.stepDates.ticketing_completed).toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : undefined,
    },
    {
      id: "confirmed",
      label: "구매 확정",
      icon: <ThumbsUp className="w-5 h-5" />,
      date: transaction.stepDates.confirmed
        ? new Date(transaction.stepDates.confirmed).toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : undefined,
    },
  ]

  // 액션 버튼 (확인 버튼) 클릭 핸들러
  const handleAction = async () => {
    if (transaction.currentStep === "ticketing_completed") {
      // 취켓팅 완료 확인 (구매 확정) 로직
      try {
        // 실제로는 API 호출하여 상태 업데이트
        // const response = await fetch(`/api/transactions/${params.id}/confirm`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' }
        // });
        
        // 성공 시 상태 업데이트
        setTransaction({
          ...transaction,
          currentStep: "confirmed",
          status: "구매 확정",
          stepDates: {
            ...transaction.stepDates,
            confirmed: new Date().toISOString(),
          },
        })

        toast({
          title: "구매가 확정되었습니다",
          description: "판매자에게 리뷰를 작성해주세요.",
        })

        // 리뷰 작성 페이지로 이동
        router.push(`/review/${transaction.id}?role=buyer`)
      } catch (error) {
        console.error("구매 확정 오류:", error)
        toast({
          title: "구매 확정 실패",
          description: "오류가 발생했습니다. 다시 시도해주세요.",
          variant: "destructive",
        })
      }
    } else if (transaction.currentStep === "confirmed") {
      // 이미 확정된 경우 리뷰 작성 페이지로 이동
      router.push(`/review/${transaction.id}?role=buyer`)
    }
  }

  const openChat = () => setIsChatOpen(true)
  const closeChat = () => setIsChatOpen(false)

  // 로딩 상태 표시
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">거래 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <Link
            href="/dashboard"
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>대시보드로 돌아가기</span>
          </Link>
          <h1 className="text-3xl font-bold mt-4">거래 상세</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6 transition-all duration-300 hover:shadow-md">
          <div className="p-6 md:p-8">
            <div className="mb-8">
              <div>
                <span className="text-sm text-gray-500 mb-1 block">티켓 정보</span>
                <h2 className="text-2xl font-bold text-gray-900">{transaction.ticket.title}</h2>
              </div>
            </div>

            {/* 거래 진행 상태 스텝퍼 */}
            <div className="mb-10 bg-gray-50 p-6 rounded-xl border border-gray-100">
              <h3 className="text-lg font-semibold mb-6 text-gray-800">거래 진행 상태</h3>
              <TransactionStepper currentStep={transaction.currentStep} steps={transactionSteps} />
            </div>

            <div className="flex flex-col md:flex-row gap-8">
              <div className="md:w-1/3">
                <div className="relative h-60 md:h-full w-full rounded-xl overflow-hidden shadow-sm">
                  <Image
                    src={transaction.ticket.image || "/placeholder.svg"}
                    alt={transaction.ticket.title}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              </div>
              <div className="md:w-2/3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 mr-3 text-blue-500" />
                    <div>
                      <span className="text-xs text-gray-500 block">공연 날짜</span>
                      <span className="font-medium">{transaction.ticket.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <Clock className="h-5 w-5 mr-3 text-blue-500" />
                    <div>
                      <span className="text-xs text-gray-500 block">공연 시간</span>
                      <span className="font-medium">{transaction.ticket.time}</span>
                    </div>
                  </div>
                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <MapPin className="h-5 w-5 mr-3 text-blue-500" />
                    <div>
                      <span className="text-xs text-gray-500 block">공연 장소</span>
                      <span className="font-medium">{transaction.ticket.venue}</span>
                    </div>
                  </div>
                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <CreditCard className="h-5 w-5 mr-3 text-blue-500" />
                    <div>
                      <span className="text-xs text-gray-500 block">결제 금액</span>
                      <span className="font-medium">{transaction.price.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-full mr-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-blue-600"
                      >
                        <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
                        <path d="M15 3v6h6" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs text-blue-600 block">좌석 정보</span>
                      <span className="font-medium text-blue-800">{transaction.ticket.seat}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 border-t pt-8">
              <h3 className="text-xl font-semibold mb-6 text-gray-800">결제 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500 block mb-1">결제 방법</span>
                  <span className="font-medium">{transaction.paymentMethod}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500 block mb-1">결제 상태</span>
                  <span className="font-medium text-green-600">{transaction.paymentStatus}</span>
                </div>
              </div>
            </div>

            <div className="mt-10 border-t pt-8">
              <h3 className="text-xl font-semibold mb-6 text-gray-800">취켓팅 정보</h3>

              <TicketingStatusCard
                status={transaction.currentStep === "ticketing_completed" ? "completed" : "in_progress"}
                message={
                  transaction.currentStep === "ticketing_completed"
                    ? "취켓팅이 완료되었습니다. 판매자가 성공적으로 티켓을 구매했습니다. 아래 버튼을 눌러 구매를 확정해주세요."
                    : transaction.ticketingInfo
                }
                updatedAt={
                  transaction.currentStep === "ticketing_completed"
                    ? (transaction.stepDates.ticketing_completed 
                        ? new Date(transaction.stepDates.ticketing_completed).toLocaleString() 
                        : "완료 시간 정보 없음")
                    : "2024-03-16 09:15"
                }
              />

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500 block mb-1">취켓팅 상태</span>
                  <span className="font-medium text-blue-600">
                    {transaction.currentStep === "ticketing_completed" ? "취켓팅 완료" : transaction.ticketingStatus}
                  </span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500 block mb-1">판매자 정보</span>
                  <span className="font-medium">{transaction.seller?.name}</span>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end gap-4">
              <Button onClick={openChat} variant="outline" className="flex items-center gap-2 border-gray-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                판매자에게 메시지
              </Button>

              {transaction.currentStep === "ticketing_completed" && (
                <Button
                  onClick={handleAction}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md"
                >
                  구매 확정하기
                </Button>
              )}

              {transaction.currentStep === "confirmed" && (
                <Button
                  onClick={handleAction}
                  className="bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md"
                >
                  리뷰 작성하기
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ChatInterface 컴포넌트 사용 */}
      <ChatInterface 
        isOpen={isChatOpen}
        onClose={closeChat}
        messages={messages}
        isLoading={isMessagesLoading}
        onSendMessage={sendMessage}
        otherUserName={transaction.seller?.name || "판매자"}
        otherUserProfileImage={transaction.seller?.profileImage}
        otherUserRole="판매자"
      />
    </div>
  )
}

