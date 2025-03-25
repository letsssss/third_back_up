"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Calendar, MapPin, Clock, CreditCard, Play, ThumbsUp, CheckCircle, Star } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import dynamic from 'next/dynamic'

// Confetti를 동적으로 불러오기 (서버 사이드 렌더링 오류 방지)
const ReactConfetti = dynamic(() => import('react-confetti'), { 
  ssr: false,
  loading: () => null
})

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
  orderNumber: string;
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

export default function TransactionDetail() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [transaction, setTransaction] = useState<TransactionData | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<'buyer' | 'seller'>('buyer')
  
  // 데이터 가져오기 오류 관련 상태 추가
  const [fetchError, setFetchError] = useState<{status: number; message: string} | null>(null)
  
  // confetti 관련 상태 추가
  const [showConfetti, setShowConfetti] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const [confettiRunning, setConfettiRunning] = useState(false)
  
  // 브라우저 환경 확인 상태
  const [isBrowser, setIsBrowser] = useState(false)
  
  // 현재 로그인한 사용자 ID
  const [currentUserId, setCurrentUserId] = useState<string>("")
  
  // useChat 훅 사용
  const [chatProps, setChatProps] = useState<any>(null)
  const [chatReady, setChatReady] = useState(false)

  const {
    messages,
    isLoading: isMessagesLoading,
    socketConnected,
    sendMessage,
    fetchMessages,
    error: chatError
  } = useChat(chatReady ? chatProps : null)

  // 채팅 디버깅을 위한 로그 추가
  useEffect(() => {
    console.log('구매자 채팅 상태:', {
      transactionId: params?.orderNumber,
      buyerId: currentUserId,
      socketConnected,
      hasMessages: messages.length > 0,
      otherUserId: currentUserRole === 'buyer' ? transaction?.seller?.id : transaction?.buyer?.id
    });
  }, [params?.orderNumber, currentUserId, socketConnected, messages.length, currentUserRole, transaction?.seller?.id, transaction?.buyer?.id]);

  // 메시지 전송 핸들러에 추가 로깅 추가
  const handleSendMessage = async (content: string): Promise<boolean> => {
    if (!content || !content.trim()) return false;
    
    try {
      console.log('구매자 메시지 전송 시도:', {
        content,
        buyerId: currentUserId,
        sellerId: currentUserRole === 'buyer' ? transaction?.seller?.id : transaction?.buyer?.id,
        transactionId: params?.orderNumber
      });
      
      // 직접 sendMessage 함수 호출
      const result = await sendMessage(content);
      console.log('메시지 전송 결과:', result);
      
      if (!result) {
        toast({
          title: '메시지 전송 실패',
          description: '메시지를 전송하지 못했습니다. 다시 시도해주세요.',
          variant: 'destructive',
        });
        return false;
      }
      
      await fetchMessages(); // 새 메시지 전송 후 다시 불러오기 추가
      return true;
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      toast({
        title: '메시지 전송 오류',
        description: '메시지 전송 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // 페이지 로드 시 거래 정보 가져오기 및 상태 자동 변경
  useEffect(() => {
    const fetchTransactionData = async () => {
      try {
        setIsLoading(true);
        
        // 거래 orderNumber 가져오기 (useParams 사용)
        const orderNumber = params?.orderNumber as string; 
        
        // orderNumber가 없는 경우 오류 처리
        if (!orderNumber) {
          toast({
            title: '주문번호가 없음',
            description: '유효한 주문번호를 찾을 수 없습니다.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
        
        console.log('거래 정보 가져오기 요청 주문번호:', orderNumber);
        
        // 거래 정보 가져오기 (오류 처리 개선)
        console.log(`API 요청 시작: /api/purchase/${orderNumber}`);
        try {
          const response = await fetch(`/api/purchase/${orderNumber}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          console.log('API 응답 상태:', response.status, response.statusText);
          
          // 응답 내용 미리 확인 (텍스트로)
          const responseText = await response.text();
          
          if (responseText.trim().length === 0) {
            throw new Error('API에서 빈 응답을 반환했습니다.');
          }
          
          // 응답 미리보기 로그
          console.log('응답 본문 미리보기:', responseText.substring(0, 150) + '...');
          
          // 응답이 성공적이지 않은 경우
          if (!response.ok) {
            let errorMessage = '거래 정보를 가져오는데 실패했습니다';
            let errorStatus = response.status;
            
            // HTML 응답인지 확인
            if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
              console.error('API가 HTML을 반환했습니다. 서버 오류가 발생했을 수 있습니다.');
              errorMessage = 'API 서버 오류: HTML 응답을 받았습니다.';
            } else {
              try {
                // JSON으로 파싱 시도
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.message || errorMessage;
              } catch (e) {
                console.error('응답을 JSON으로 파싱할 수 없음:', e);
              }
            }
            
            console.error('API 응답 오류:', response.status, errorMessage);
            // 오류 상태 저장
            setFetchError({status: errorStatus, message: errorMessage});
            setIsLoading(false);
            return;
          }
          
          // 응답 데이터 파싱
          let purchaseData;
          try {
            purchaseData = JSON.parse(responseText);
          } catch (e) {
            console.error('JSON 파싱 오류:', e);
            throw new Error('API 응답이 유효한 JSON 형식이 아닙니다.');
          }
          
          console.log('API에서 가져온 구매 데이터:', purchaseData);
          
          // 응답이 성공적이지 않은 경우
          if (!purchaseData.success) {
            throw new Error(purchaseData.message || '거래 정보를 가져오는데 실패했습니다');
          }
          
          if (!purchaseData.purchase) {
            throw new Error('구매 데이터가 없습니다');
          }
          
          // localStorage에서 사용자 ID 가져오기
          // 세션스토리지 또는 로컬스토리지에서 사용자 정보 가져오기
          let userId = ""; // 기본값은 빈 문자열
          
          // 클라이언트 사이드에서만 실행
          if (typeof window !== 'undefined') {
            try {
              // 우선 user 객체에서 시도
              const userStr = localStorage.getItem('user');
              if (userStr) {
                const user = JSON.parse(userStr);
                if (user && user.id) {
                  userId = user.id.toString();
                  console.log('로컬스토리지에서 user 객체로부터 ID 찾음:', userId);
                }
              }
              
              // user 객체에서 ID를 찾지 못한 경우 userId 직접 시도
              if (!userId) {
                const directUserId = localStorage.getItem('userId');
                if (directUserId) {
                  userId = directUserId;
                  console.log('로컬스토리지에서 userId로부터 ID 찾음:', userId);
                }
              }
              
              // 테스트용 ID 할당 (개발 환경에서만)
              if (!userId) {
                userId = "2"; // 임시로 2 설정
                console.log('테스트를 위한 임시 ID 사용:', userId);
              }
            } catch (error) {
              console.error('로컬스토리지에서 사용자 ID 가져오기 실패:', error);
              userId = "2"; // 오류 시 기본값
            }
          }
          
          console.log('최종 사용되는 현재 사용자 ID:', userId);
          setCurrentUserId(userId);
          
          // 구매자인지 판매자인지 결정
          const userRole = userId === purchaseData.purchase?.sellerId?.toString() 
            ? 'seller' 
            : 'buyer';
          setCurrentUserRole(userRole);
          console.log('사용자 역할:', userRole);
          
          // 구매 데이터를 TransactionData 형식으로 변환
          const formattedTransaction: TransactionData = {
            id: purchaseData.purchase?.id?.toString() || "",
            orderNumber: purchaseData.purchase?.orderNumber || "",
            type: "purchase",
            status: getStatusText(purchaseData.purchase?.status || ""),
            currentStep: purchaseData.purchase?.status || "",
            stepDates: {
              payment: purchaseData.purchase?.createdAt || "",
              ticketing_started: purchaseData.purchase?.status === 'PROCESSING' || purchaseData.purchase?.status === 'COMPLETED' || purchaseData.purchase?.status === 'CONFIRMED' 
                ? purchaseData.purchase?.updatedAt || ""
                : null,
              ticketing_completed: purchaseData.purchase?.status === 'COMPLETED' || purchaseData.purchase?.status === 'CONFIRMED' 
                ? purchaseData.purchase?.updatedAt || ""
                : null,
              confirmed: purchaseData.purchase?.status === 'CONFIRMED' 
                ? purchaseData.purchase?.updatedAt || ""
                : null,
            },
            ticket: {
              title: purchaseData.purchase?.ticketTitle || purchaseData.purchase?.post?.title || '티켓 정보 없음',
              date: purchaseData.purchase?.eventDate || purchaseData.purchase?.post?.eventDate || '날짜 정보 없음',
              time: "19:00", // 시간 정보가 없는 경우 기본값
              venue: purchaseData.purchase?.eventVenue || purchaseData.purchase?.post?.eventVenue || "공연장",
              seat: purchaseData.purchase?.selectedSeats || "좌석 정보 없음",
              image: purchaseData.purchase?.imageUrl || "/placeholder.svg", // 이미지 정보가 없을 경우 기본값
            },
            price: Number(purchaseData.purchase?.ticketPrice || purchaseData.purchase?.post?.ticketPrice) || 0,
            paymentMethod: purchaseData.purchase?.paymentMethod || "신용카드", // 결제 방식 정보 없을 경우 기본값
            paymentStatus: "결제 완료",
            ticketingStatus: getTicketingStatusText(purchaseData.purchase?.status || ""),
            ticketingInfo: "취소표 발생 시 알림을 보내드립니다. 취소표 발생 시 빠르게 예매를 진행해 드립니다.",
            seller: {
              id: purchaseData.purchase?.seller?.id?.toString() || "",
              name: purchaseData.purchase?.seller?.name || "판매자",
              profileImage: purchaseData.purchase?.seller?.profileImage || "/placeholder.svg?height=50&width=50",
            },
            buyer: {
              id: purchaseData.purchase?.buyer?.id?.toString() || "",
              name: purchaseData.purchase?.buyer?.name || "구매자",
              profileImage: purchaseData.purchase?.buyer?.profileImage || "/placeholder.svg?height=50&width=50",
            },
          };
          
          console.log('변환된 트랜잭션 데이터:', formattedTransaction);
          setTransaction(formattedTransaction);
          
          // ✅ 구매자와 판매자 ID가 모두 존재할 때만 채팅 준비
          if (purchaseData.purchase.buyer?.id && purchaseData.purchase.seller?.id) {
            setChatProps({
              transactionId: orderNumber,
              userId,
              userRole,
              otherUserId: userRole === 'buyer' 
                ? purchaseData.purchase.seller.id.toString() 
                : purchaseData.purchase.buyer.id.toString()
            });
            setChatReady(true);
          }
          
          // 중요: 로딩 상태 해제
          setIsLoading(false);
        } catch (error) {
          console.error('거래 정보 로딩 오류:', error);
          // 오류 메시지에서 상태 코드 추출 시도
          let errorStatus = 500;
          let errorMessage = '거래 정보를 가져오는데 문제가 발생했습니다.';
          
          if (error instanceof Error) {
            const statusMatch = error.message.match(/API 오류 \((\d+)\)/);
            if (statusMatch && statusMatch[1]) {
              errorStatus = parseInt(statusMatch[1]);
            }
            errorMessage = error.message;
          }
          
          setFetchError({status: errorStatus, message: errorMessage});
          setIsLoading(false);
        }
      } catch (error) {
        console.error('거래 정보 로딩 오류:', error);
        setFetchError({status: 500, message: '거래 정보를 가져오는데 문제가 발생했습니다.'});
        setIsLoading(false);
      }
    };
    
    fetchTransactionData();
  }, [params?.orderNumber, toast]);

  // 액션 버튼 (확인 버튼) 클릭 핸들러
  const handleAction = async () => {
    if (transaction?.currentStep === "COMPLETED" && currentUserRole === 'buyer') {
      // 구매자: 취켓팅 완료 확인 (구매 확정) 로직
      handleStatusChange('CONFIRMED');
    } else if (transaction?.currentStep === "CONFIRMED") {
      // 이미 확정된 경우 리뷰 작성 페이지로 이동
      router.push(`/review/${transaction?.orderNumber}?role=${currentUserRole}`)
    }
  }
  
  // 상태 변경 함수
  const handleStatusChange = async (newStatus: string) => {
    try {
      // 이미 제출 중인 경우 중복 요청 방지
      if (isSubmitting) return;
      
      // 거래 주문번호 가져오기
      const orderNumber = params?.orderNumber as string;
      if (!orderNumber) {
        toast({
          title: "오류",
          description: "주문번호를 찾을 수 없습니다.",
          variant: "destructive",
        });
        return;
      }
      
      setIsSubmitting(true);
      
      // API 요청
      console.log(`상태 변경 API 요청: ${orderNumber}, 새 상태: ${newStatus}`);
      const response = await fetch(`/api/purchase/${orderNumber}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      // 응답 처리
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || '상태 업데이트 중 오류가 발생했습니다.');
      }
      
      console.log('상태 변경 성공:', data);
      
      // 상태 업데이트 성공 알림
      let successMessage = "거래 상태가 변경되었습니다.";
      
      switch (newStatus) {
        case 'PROCESSING':
          successMessage = "취켓팅이 시작되었습니다!";
          break;
        case 'COMPLETED':
          successMessage = "취켓팅이 완료되었습니다!";
          break;
        case 'CONFIRMED':
          successMessage = "구매가 확정되었습니다! 이용해 주셔서 감사합니다.";
          // 구매 확정 시 Confetti 효과 표시
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);
          break;
      }
      
      toast({
        title: "성공",
        description: successMessage,
      });
      
      // 거래 정보 새로고침
      window.location.reload();
      
    } catch (error) {
      console.error('상태 변경 오류:', error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 확인 요청
  const handleConfirmationRequest = async () => {
    try {
      if (isSubmitting) return;
      
      // 거래 주문번호 가져오기
      const orderNumber = params?.orderNumber as string;
      if (!orderNumber) {
        toast({
          title: "오류",
          description: "주문번호를 찾을 수 없습니다.",
          variant: "destructive",
        });
        return;
      }
      
      setIsSubmitting(true);
      
      // API 요청
      const response = await fetch(`/api/purchase/${orderNumber}/confirmation-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || '확인 요청 중 오류가 발생했습니다.');
      }
      
      // 성공 알림
      toast({
        title: "성공",
        description: "판매자에게 확인 요청이 전송되었습니다.",
      });
      
    } catch (error) {
      console.error('확인 요청 오류:', error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 상태 텍스트 변환 함수 (status -> 표시 텍스트)
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'PENDING':
        return '결제 완료';
      case 'PROCESSING': 
        return '취켓팅 진행중';
      case 'COMPLETED':
        return '취켓팅 완료';
      case 'CONFIRMED':
        return '구매 확정';
      case 'CANCELLED':
        return '취소됨';
      default:
        return '알 수 없음';
    }
  };
  
  // 취켓팅 상태 텍스트 변환 함수
  const getTicketingStatusText = (status: string): string => {
    switch (status) {
      case 'PENDING':
        return '대기중';
      case 'PROCESSING': 
        return '진행중';
      case 'COMPLETED':
        return '완료';
      case 'CONFIRMED':
        return '확정';
      case 'CANCELLED':
        return '취소됨';
      default:
        return '알 수 없음';
    }
  };
  
  // 브라우저 창 크기 업데이트
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsBrowser(true);
      
      const updateWindowSize = () => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight
        });
      };
      
      window.addEventListener('resize', updateWindowSize);
      updateWindowSize();
      
      return () => window.removeEventListener('resize', updateWindowSize);
    }
  }, []);
  
  // Confetti 실행 상태 관리
  useEffect(() => {
    if (showConfetti) {
      setConfettiRunning(true);
      const timer = setTimeout(() => {
        setConfettiRunning(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 min-h-screen flex flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">거래 정보를 불러오는 중...</h2>
          <p className="text-muted-foreground">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }
  
  if (fetchError) {
    return (
      <div className="container mx-auto py-6 px-4 min-h-screen flex flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-destructive">오류 발생</h2>
          <p className="text-muted-foreground mb-4">
            {fetchError.status === 404 
              ? '거래 정보를 찾을 수 없습니다.' 
              : `거래 정보를 불러오는데 문제가 발생했습니다. (${fetchError.status})`}
          </p>
          <p className="text-sm text-muted-foreground mb-6">{fetchError.message}</p>
          <Button asChild>
            <Link href="/mypage">
              마이페이지로 돌아가기
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  
  if (!transaction) {
    return (
      <div className="container mx-auto py-6 px-4 min-h-screen flex flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-destructive">거래 정보 없음</h2>
          <p className="text-muted-foreground mb-6">요청하신 거래 정보를 찾을 수 없습니다.</p>
          <Button asChild>
            <Link href="/mypage">
              마이페이지로 돌아가기
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 px-4">
      {/* Confetti 효과 */}
      {isBrowser && confettiRunning && (
        <ReactConfetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.1}
        />
      )}
      
      {/* 헤더 영역 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/mypage" className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">뒤로가기</span>
          </Link>
          <h1 className="text-2xl font-bold">{transaction.ticket.title}</h1>
        </div>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <p className="text-lg font-medium">주문번호: {transaction.orderNumber}</p>
            <p className="text-muted-foreground">
              {currentUserRole === 'buyer' 
                ? `판매자: ${transaction.seller?.name || '판매자 정보 없음'}` 
                : `구매자: ${transaction.buyer?.name || '구매자 정보 없음'}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsChatOpen(!isChatOpen)}
            >
              {isChatOpen ? '채팅 닫기' : '채팅하기'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* 메인 콘텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽 영역: 상품 정보 및 단계 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 티켓 정보 카드 */}
          <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* 티켓 이미지 */}
                <div className="flex-shrink-0 relative w-full md:w-32 h-32 rounded-md overflow-hidden">
                  <Image
                    src={transaction.ticket.image || "/placeholder.svg"}
                    alt={transaction.ticket.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 128px"
                  />
                </div>
                
                {/* 티켓 상세 정보 */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-xl font-bold">{transaction.ticket.title}</h2>
                    <p className="text-muted-foreground">{transaction.status}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{transaction.ticket.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{transaction.ticket.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{transaction.ticket.venue}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span>{transaction.price.toLocaleString()}원</span>
                    </div>
                  </div>
                  
                  {transaction.ticket.seat && (
                    <div>
                      <p className="font-medium">좌석 정보</p>
                      <p>{transaction.ticket.seat}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* 트랜잭션 단계 수정 */}
          <div className="bg-card rounded-lg border shadow-sm p-6">
            <h3 className="text-lg font-medium mb-4">진행 상태</h3>
            <TransactionStepper 
              currentStep={transaction.currentStep || ""}
              steps={[
                {
                  id: "payment",
                  label: "결제 완료",
                  icon: <CheckCircle className="h-5 w-5" />,
                  date: transaction.stepDates?.payment ? new Date(transaction.stepDates.payment).toLocaleDateString() : undefined
                },
                {
                  id: "ticketing",
                  label: "취켓팅 진행중",
                  icon: <Play className="h-5 w-5" />,
                  date: transaction.stepDates?.ticketing_started ? new Date(transaction.stepDates.ticketing_started).toLocaleDateString() : undefined
                },
                {
                  id: "completed",
                  label: "티켓 발권 완료",
                  icon: <ThumbsUp className="h-5 w-5" />,
                  date: transaction.stepDates?.ticketing_completed ? new Date(transaction.stepDates.ticketing_completed).toLocaleDateString() : undefined
                },
                {
                  id: "confirmed",
                  label: "구매 확정",
                  icon: <Star className="h-5 w-5" />,
                  date: transaction.stepDates?.confirmed ? new Date(transaction.stepDates.confirmed).toLocaleDateString() : undefined
                }
              ]} 
            />
          </div>
          
          {/* 액션 버튼 영역 */}
          <div className="flex justify-end gap-4">
            {/* 구매자이고 취켓팅이 완료된 상태인 경우 */}
            {currentUserRole === 'buyer' && transaction.currentStep === "COMPLETED" && (
              <Button onClick={handleAction}>
                구매 확정하기
              </Button>
            )}
            
            {/* 구매 확정된 경우 리뷰 작성 버튼 */}
            {transaction.currentStep === "CONFIRMED" && (
              <Button onClick={handleAction}>
                리뷰 작성하기
              </Button>
            )}
            
            {/* 판매자이고 대기 상태인 경우 취켓팅 시작 버튼 */}
            {currentUserRole === 'seller' && transaction.currentStep === "PENDING" && (
              <Button onClick={() => handleStatusChange('PROCESSING')}>
                취켓팅 시작하기
              </Button>
            )}
            
            {/* 판매자이고 취켓팅 진행중인 경우 완료 버튼 */}
            {currentUserRole === 'seller' && transaction.currentStep === "PROCESSING" && (
              <Button onClick={() => handleStatusChange('COMPLETED')}>
                취켓팅 완료하기
              </Button>
            )}
            
            {/* 구매자이고 취켓팅 진행중인 경우 확인 요청 버튼 */}
            {currentUserRole === 'buyer' && transaction.currentStep === "PROCESSING" && (
              <Button variant="outline" onClick={handleConfirmationRequest}>
                진행 상황 확인 요청
              </Button>
            )}
          </div>
        </div>
        
        {/* 오른쪽 영역: 간단한 상태 정보 카드로 대체 */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg border shadow-sm p-6">
            <h3 className="text-lg font-medium mb-4">
              {currentUserRole === 'buyer' 
                ? `${transaction.seller?.name || '판매자'}와의 거래` 
                : `${transaction.buyer?.name || '구매자'}와의 거래`}
            </h3>
            
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-500">상태</p>
              <p className="font-medium">{transaction.status}</p>
            </div>
            
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-500">취켓팅 정보</p>
              <p>{transaction.ticketingInfo}</p>
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                채팅 버튼을 눌러 대화를 진행하실 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 