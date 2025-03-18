"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Calendar, MapPin, Clock, CreditCard, Play, ThumbsUp, CheckCircle, Send, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TransactionStepper } from "@/components/transaction-stepper"
import { TicketingStatusCard } from "@/components/ticketing-status-card"

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
  buyer: User;
}

interface Message {
  id: number;
  senderId: string;
  text: string;
  timestamp: string;
}

// 임시 데이터 (실제로는 API에서 가져와야 합니다)
const transactionData: TransactionData = {
  id: "1",
  type: "sale", // 판매자용으로 변경
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
  buyer: {
    // 구매자 정보로 변경
    id: "buyer123",
    name: "콘서트팬",
    profileImage: "/placeholder.svg?height=50&width=50",
  },
}

// 샘플 메시지 데이터
const initialMessages: Message[] = [
  {
    id: 1,
    senderId: "seller123", // 판매자 ID
    text: "안녕하세요! 세븐틴 콘서트 티켓 구매해주셔서 감사합니다. 취켓팅 진행 중이니 조금만 기다려주세요.",
    timestamp: "2024-03-16T10:30:00",
  },
  {
    id: 2,
    senderId: "buyer123", // 구매자 ID
    text: "네, 감사합니다. 혹시 취켓팅 완료 예상 시간이 언제인가요?",
    timestamp: "2024-03-16T10:35:00",
  },
  {
    id: 3,
    senderId: "seller123", // 판매자 ID
    text: "보통 공연 1-2일 전에 완료되지만, 취소표가 빨리 나오면 더 일찍 완료될 수도 있어요. 상황에 따라 다를 수 있으니 메시지로 안내해 드릴게요.",
    timestamp: "2024-03-16T10:40:00",
  },
]

export default function TransactionDetail() {
  const params = useParams()
  const router = useRouter()
  const [transaction, setTransaction] = useState<TransactionData>(transactionData)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isSeller, setIsSeller] = useState(true) // 판매자인지 여부를 상태로 관리
  const [isLoading, setIsLoading] = useState(true)

  // 실제 구현에서는 이 부분에서 API를 호출하여 거래 정보를 가져와야 합니다
  useEffect(() => {
    // API 호출 및 데이터 설정 로직
    console.log("Transaction ID:", params.id)
    
    // 거래 데이터 로딩 시뮬레이션
    const loadData = async () => {
      setIsLoading(true)
      try {
        // 실제 구현에서는 아래와 같은 API 호출 필요
        // const response = await fetch(`/api/transactions/${params.id}`)
        // const data = await response.json()
        
        // 임시 데이터 로딩 (실제로는 API 응답으로 대체)
        setTimeout(() => {
          // 현재 로그인한 사용자가 판매자인지 구매자인지 확인하는 로직 필요
          // API 응답에서 판매자/구매자 여부 확인
          const userRole = localStorage.getItem('userRole') || 'seller' // 기본값은 판매자로 설정
          setIsSeller(userRole === 'seller')
          
          setTransaction(transactionData)
          setIsLoading(false)
        }, 500)
      } catch (error) {
        console.error("Error fetching transaction data:", error)
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [params.id])

  // 채팅창이 열릴 때 스크롤을 맨 아래로 이동
  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom()
    }
  }, [isChatOpen, messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

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

  // 액션 핸들러 - 판매자/구매자 역할에 따라 다르게 동작
  const handleAction = async () => {
    if (isSeller) {
      // 판매자용 액션
      if (transaction.currentStep === "ticketing_started") {
        // 취켓팅 완료 처리 로직
        try {
          // 실제로는 API 호출하여 상태 업데이트
          // const response = await fetch(`/api/transactions/${params.id}`, {
          //   method: 'PUT',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify({
          //     currentStep: 'ticketing_completed',
          //     stepDates: {
          //       ...transaction.stepDates,
          //       ticketing_completed: new Date().toISOString()
          //     }
          //   })
          // });

          // 성공 시 상태 업데이트
          setTransaction({
            ...transaction,
            currentStep: "ticketing_completed",
            status: "취켓팅 완료",
            stepDates: {
              ...transaction.stepDates,
              ticketing_completed: new Date().toISOString(),
            },
          })

          alert("취켓팅 완료 처리되었습니다. 구매자의 구매 확정을 기다립니다.")
        } catch (error) {
          console.error("Error updating transaction:", error)
          alert("처리 중 오류가 발생했습니다. 다시 시도해주세요.")
        }
      } else if (transaction.currentStep === "confirmed") {
        // 거래 완료 후 리뷰 작성 페이지로 이동
        router.push(`/review/${transaction.id}?role=seller`)
      }
    } else {
      // 구매자용 액션
      if (transaction.currentStep === "ticketing_completed") {
        // 구매 확정 처리 로직
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

          alert("구매가 확정되었습니다. 판매자에게 리뷰를 작성해보세요!")
        } catch (error) {
          console.error("Error confirming purchase:", error)
          alert("처리 중 오류가 발생했습니다. 다시 시도해주세요.")
        }
      } else if (transaction.currentStep === "confirmed") {
        // 거래 완료 후 리뷰 작성 페이지로 이동
        router.push(`/review/${transaction.id}?role=buyer`)
      }
    }
  }

  const openChat = () => setIsChatOpen(true)
  const closeChat = () => setIsChatOpen(false)

  const handleSendMessage = () => {
    if (newMessage.trim() === "") return

    const newMsg = {
      id: messages.length + 1,
      senderId: isSeller ? "seller123" : "buyer123", // 현재 사용자가 판매자/구매자인지 확인하여 ID 설정
      text: newMessage,
      timestamp: new Date().toISOString(),
    }

    setMessages([...messages, newMsg])
    setNewMessage("")
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
  }

  // 현재 단계와 역할에 따른 버튼 텍스트 결정
  const getActionButtonText = () => {
    if (isSeller) {
      // 판매자용 버튼 텍스트
      switch (transaction.currentStep) {
        case "ticketing_started":
          return "취켓팅 성공 확정"
        case "ticketing_completed":
          return "구매자 확정 대기 중"
        case "confirmed":
          return "구매자 리뷰 작성"
        default:
          return "다음 단계로"
      }
    } else {
      // 구매자용 버튼 텍스트
      switch (transaction.currentStep) {
        case "ticketing_started":
          return "취켓팅 진행 중"
        case "ticketing_completed":
          return "구매 확정하기"
        case "confirmed":
          return "판매자 리뷰 작성"
        default:
          return "다음 단계로"
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
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
            href={isSeller ? "/mypage" : "/mypage"}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>마이페이지로 돌아가기</span>
          </Link>
          <h1 className="text-3xl font-bold mt-4">{isSeller ? "판매" : "구매"} 거래 상세</h1>
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
                      <span className="text-xs text-gray-500 block">{isSeller ? "판매" : "구매"} 금액</span>
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
                    ? isSeller 
                      ? "취켓팅이 완료되었습니다. 구매자의 구매 확정을 기다리고 있습니다."
                      : "취켓팅이 완료되었습니다. '구매 확정하기' 버튼을 눌러 구매를 확정해주세요."
                    : isSeller
                      ? "취소표 발생 시 즉시 예매를 진행해 드립니다. 취소표를 발견하면 '취켓팅 성공 확정' 버튼을 눌러주세요."
                      : "판매자가 취켓팅을 진행하고 있습니다. 취소표가 발생하면 자동으로 알림을 받게 됩니다."
                }
                updatedAt={
                  transaction.currentStep === "ticketing_completed" && transaction.stepDates.ticketing_completed
                    ? new Date(transaction.stepDates.ticketing_completed).toLocaleString()
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
                  <span className="text-xs text-gray-500 block mb-1">{isSeller ? "구매자" : "판매자"} 정보</span>
                  <span className="font-medium">{isSeller ? transaction.buyer.name : "판매자"}</span>
                </div>
              </div>
            </div>

            {/* 버튼 영역 - 판매자/구매자 역할에 따라 다르게 표시 */}
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
                {isSeller ? "구매자에게 메시지" : "판매자에게 메시지"}
              </Button>

              {/* 판매자: 취켓팅 성공 확정 버튼 (취켓팅 시작 단계일 때만 활성화) */}
              {isSeller && transaction.currentStep === "ticketing_started" && (
                <Button
                  onClick={handleAction}
                  className="bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md"
                >
                  취켓팅 성공 확정
                </Button>
              )}

              {/* 판매자: 구매자 확정 대기 중 (취켓팅 완료 단계일 때) */}
              {isSeller && transaction.currentStep === "ticketing_completed" && (
                <Button
                  disabled
                  className="bg-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-lg shadow-md cursor-not-allowed"
                >
                  구매자 확정 대기 중
                </Button>
              )}

              {/* 구매자: 취켓팅 진행 중 (취켓팅 시작 단계일 때) */}
              {!isSeller && transaction.currentStep === "ticketing_started" && (
                <Button
                  disabled
                  className="bg-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-lg shadow-md cursor-not-allowed"
                >
                  취켓팅 진행 중
                </Button>
              )}

              {/* 구매자: 구매 확정하기 (취켓팅 완료 단계일 때) */}
              {!isSeller && transaction.currentStep === "ticketing_completed" && (
                <Button
                  onClick={handleAction}
                  className="bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md"
                >
                  구매 확정하기
                </Button>
              )}

              {/* 리뷰 작성 (구매 확정 단계일 때 - 판매자/구매자 모두) */}
              {transaction.currentStep === "confirmed" && (
                <Button
                  onClick={handleAction}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md"
                >
                  {isSeller ? "구매자 리뷰 작성" : "판매자 리뷰 작성"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 1:1 채팅 인터페이스 */}
      {isChatOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
            {/* 채팅 헤더 */}
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden">
                  <Image
                    src={isSeller ? transaction.buyer.profileImage : "/placeholder.svg"}
                    alt={isSeller ? transaction.buyer.name : "판매자"}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-medium">{isSeller ? transaction.buyer.name : "판매자"}</h3>
                  <p className="text-xs text-gray-500">{isSeller ? "구매자" : "판매자"}</p>
                </div>
              </div>
              <button
                onClick={closeChat}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 채팅 메시지 영역 */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      (isSeller && message.senderId === "seller123") || (!isSeller && message.senderId === "buyer123")
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        (isSeller && message.senderId === "seller123") || (!isSeller && message.senderId === "buyer123")
                          ? "bg-teal-500 text-white rounded-tr-none"
                          : "bg-gray-200 text-gray-800 rounded-tl-none"
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p
                        className={`text-xs mt-1 ${
                          (isSeller && message.senderId === "seller123") || (!isSeller && message.senderId === "buyer123")
                            ? "text-teal-100"
                            : "text-gray-500"
                        }`}
                      >
                        {formatMessageTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* 메시지 입력 영역 */}
            <div className="p-4 border-t bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-teal-500 text-white p-2 rounded-full hover:bg-teal-600 transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

