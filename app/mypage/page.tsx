"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, User, ShoppingBag, Tag, Trash2, Loader as LoaderIcon } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { WithdrawModal } from "@/components/withdraw-modal"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { FaTrash } from "react-icons/fa"

// 간단한 인라인 Loader 컴포넌트
const Loader = ({ size = 24 }: { size?: number }) => (
  <div className="animate-spin" style={{ width: size, height: size }}>
    <LoaderIcon size={size} />
  </div>
);

// 임시 데이터 (실제로는 API나 데이터베이스에서 가져와야 합니다)
const ongoingPurchases = [
  { id: 1, title: "세븐틴 콘서트", date: "2024-03-20", price: "165,000원", status: "입금 대기중" },
  { id: 2, title: "데이식스 전국투어", date: "2024-02-01", price: "99,000원", status: "배송 준비중" },
]

// 판매 중인 상품 타입 정의
interface Sale {
  id: number;
  title: string;
  date: string;
  price: string;
  status: string;
}

// 알림 타입 정의
interface Notification {
  id: number;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  postId?: number;
}

export default function MyPage() {
  const [activeTab, setActiveTab] = useState("profile")
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [ongoingSales, setOngoingSales] = useState<Sale[]>([])
  const [isLoadingSales, setIsLoadingSales] = useState(false)
  const [ongoingPurchases, setOngoingPurchases] = useState<any[]>([])
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 마운트 확인
  useEffect(() => {
    setMounted(true)
  }, [])

  // 로그인 상태 확인
  useEffect(() => {
    if (mounted && !isLoading && !user) {
      toast.error("로그인이 필요한 페이지입니다")
      router.push("/login?callbackUrl=/mypage")
    }
  }, [user, isLoading, router, mounted])

  // 초기 데이터 로드
  useEffect(() => {
    if (user) {
      // 판매 목록은 탭이 선택될 때 불러옴
      // 알림은 페이지 로드 시 항상 가져옴 (알림 카운트 표시를 위해)
      fetchNotifications();
    }
  }, [user]);

  // user와 activeTab이 변경될 때 데이터 가져오기
  useEffect(() => {
    if (user) {
      if (activeTab === 'sales') {
        fetchOngoingSales();
      } else if (activeTab === 'purchases') {
        fetchOngoingPurchases();
      }
    }
  }, [user, activeTab]);

  // 읽지 않은 알림 카운트
  const unreadNotificationCount = notifications.filter(n => !n.isRead).length;

  // 판매 중인 상품 목록 가져오기
    const fetchOngoingSales = async () => {
      if (!user) return;
      
      setIsLoadingSales(true);
      try {
      // 요청 URL에 userId 파라미터 추가
      console.log("판매 목록 불러오기 시도... 사용자 ID:", user.id);
      const response = await fetch(`/api/posts?userId=${user.id}`);
      
      console.log("API 응답 상태:", response.status, response.statusText);
        
        if (!response.ok) {
        const errorData = await response.text();
        console.error("API 오류 응답:", errorData);
          throw new Error('판매 목록을 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
      console.log("받은 데이터:", data);
      
      if (!data.posts || !Array.isArray(data.posts)) {
        console.error("API 응답에 posts 배열이 없거나 유효하지 않습니다:", data);
        setOngoingSales([]);
        return;
      }
        
        // API 응답을 화면에 표시할 형식으로 변환
        const salesData = data.posts.map((post: any) => ({
          id: post.id,
        title: post.title || post.eventName || "제목 없음",
          date: post.eventDate || new Date(post.createdAt).toLocaleDateString(),
          price: `${post.ticketPrice?.toLocaleString() || '가격 정보 없음'}원`,
          status: post.category === 'TICKET_CANCELLATION' ? "취켓팅 판매중" : "판매중"
        }));
        
      console.log("변환된 판매 데이터:", salesData);
        setOngoingSales(salesData);
      } catch (error) {
        console.error('판매 목록 로딩 오류:', error);
        toast.error('판매 목록을 불러오는데 실패했습니다.');
      // 더미 데이터로 대체
        setOngoingSales([
        { id: 1, title: "아이브 팬미팅 [더미 데이터]", date: "2024-04-05", price: "88,000원", status: "판매중" },
        { id: 2, title: "웃는 남자 [더미 데이터]", date: "2024-01-09", price: "110,000원", status: "구매자 입금 대기중" },
        ]);
      } finally {
        setIsLoadingSales(false);
      }
    };

  // 구매 중인 상품 목록 가져오기
  const fetchOngoingPurchases = async () => {
    if (!user) return;
    
    setIsLoadingPurchases(true);
    try {
      // 구매 목록 API 호출
      console.log("구매 목록 불러오기 시도... 사용자 ID:", user.id);
      const response = await fetch('/api/purchase');
      
      console.log("구매 API 응답 상태:", response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error("구매 API 오류 응답:", errorData);
        throw new Error('구매 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      console.log("받은 구매 데이터:", data);
      
      if (!data.purchases || !Array.isArray(data.purchases)) {
        console.error("API 응답에 purchases 배열이 없거나 유효하지 않습니다:", data);
        setOngoingPurchases([]);
        return;
      }
      
      // API 응답을 화면에 표시할 형식으로 변환
      const purchasesData = data.purchases.map((purchase: any) => ({
        id: purchase.id,
        title: purchase.post?.title || purchase.post?.eventName || "제목 없음",
        date: purchase.post?.eventDate || new Date(purchase.createdAt).toLocaleDateString(),
        price: `${purchase.totalPrice?.toLocaleString() || '가격 정보 없음'}원`,
        status: getStatusText(purchase.status),
        sellerId: purchase.sellerId
      }));
      
      console.log("변환된 구매 데이터:", purchasesData);
      setOngoingPurchases(purchasesData);
    } catch (error) {
      console.error('구매 목록 로딩 오류:', error);
      toast.error('구매 목록을 불러오는데 실패했습니다.');
      // 더미 데이터로 대체
      setOngoingPurchases([
        { id: 1, title: "세븐틴 콘서트 [더미 데이터]", date: "2024-03-20", price: "165,000원", status: "입금 대기중" },
        { id: 2, title: "데이식스 전국투어 [더미 데이터]", date: "2024-02-01", price: "99,000원", status: "배송 준비중" },
      ]);
    } finally {
      setIsLoadingPurchases(false);
    }
  };

  // 상태 텍스트 변환 함수
  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return '입금 대기중';
      case 'PROCESSING': return '처리 중';
      case 'COMPLETED': return '완료됨';
      case 'CANCELLED': return '취소됨';
      default: return '상태 불명';
    }
  };

  // 알림 목록 가져오기
  const fetchNotifications = async () => {
    if (!user) return;
    
    setIsLoadingNotifications(true);
    try {
      const response = await fetch('/api/notifications');
      
      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = '알림 목록을 불러오는데 실패했습니다.';
        
        if (errorData.error) {
          errorMessage = errorData.error;
          
          switch (errorData.code) {
            case 'AUTH_ERROR':
              errorMessage = '인증이 만료되었습니다. 다시 로그인해주세요.';
              break;
            case 'USER_NOT_FOUND':
              errorMessage = '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.';
              break;
            case 'USER_CREATE_ERROR':
              errorMessage = '사용자 정보 생성에 실패했습니다. 잠시 후 다시 시도해주세요.';
              break;
            case 'DB_CONNECTION_ERROR':
              errorMessage = '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.';
              break;
            case 'DB_TIMEOUT_ERROR':
              errorMessage = '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.';
              break;
            case 'DB_SCHEMA_ERROR':
              errorMessage = '서버에서 오류가 발생했습니다. 관리자에게 문의해주세요.';
              break;
            case 'NETWORK_ERROR':
              errorMessage = '네트워크 연결을 확인해주세요.';
              break;
          }
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (!data.notifications || !Array.isArray(data.notifications)) {
        setNotifications([]);
        return;
      }
      
      // 알림 데이터 가공 (날짜 포맷 변경 등)
      const notificationsData = data.notifications.map((notification: any) => ({
        ...notification,
        createdAt: new Date(notification.createdAt).toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      }));
      
      setNotifications(notificationsData);
    } catch (error) {
      console.error('알림 목록 로딩 오류:', error);
      toast.error('알림 목록을 불러오는데 실패했습니다.');
      // 더미 데이터로 대체
      setNotifications([
        { 
          id: 1, 
          message: "홍길동님이 '아이브 콘서트' 공연의 [R석] 좌석에 대한 취켓팅을 신청했습니다.", 
          type: "PURCHASE", 
          isRead: false, 
          createdAt: "2024-03-18 14:25", 
          postId: 1 
        },
        { 
          id: 2, 
          message: "시스템 정기 점검 안내: 3월 20일 새벽 2시부터 5시까지 서비스 이용이 제한됩니다.", 
          type: "SYSTEM", 
          isRead: true, 
          createdAt: "2024-03-15 09:00" 
        }
      ]);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  // 알림 읽음 상태 업데이트
  const markNotificationAsRead = async (notificationId: number) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      });

      if (!response.ok) {
        throw new Error('알림 상태 업데이트에 실패했습니다.');
      }

      // 알림 목록 업데이트
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true } 
            : notification
        )
      );
    } catch (error) {
      console.error('알림 상태 업데이트 오류:', error);
      toast.error('알림 상태를 업데이트하는데 실패했습니다.');
    }
  };

  // 게시물 삭제 함수
  const deletePost = async (postId: number) => {
    try {
      console.log("게시물 삭제 요청:", postId);
      
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });
      
      // 응답이 JSON이 아닌 경우 처리
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("응답이 JSON이 아닙니다:", await response.text());
        throw new Error("서버에서 유효한 응답을 받지 못했습니다.");
      }

      const data = await response.json();
      console.log("삭제 응답:", data);
      
      if (!response.ok) {
        throw new Error(data.message || '게시물 삭제에 실패했습니다.');
      }
      
      // 성공적으로 삭제된 경우 목록에서 제거
      setOngoingSales(prev => prev.filter(sale => sale.id !== postId));
      
      toast.success("게시물이 성공적으로 삭제되었습니다.");
      
      // 목록 새로고침
      fetchOngoingSales();
    } catch (error) {
      console.error('게시물 삭제 오류:', error);
      toast.error(error instanceof Error ? error.message : "게시물 삭제 중 오류가 발생했습니다.");
    }
  };

  // 샘플 판매 글 작성 함수 추가
  const createSamplePost = async () => {
    if (!user) return;
    
    try {
      // 샘플 데이터 생성
      const samplePost = {
        title: "뮤지컬 레미제라블 티켓 양도",
        content: "개인사정으로 인해 티켓을 양도합니다. 가격은 정가에 판매합니다.",
        category: "TICKET_SALE",
        eventName: "뮤지컬 레미제라블",
        eventDate: "2024-05-15",
        eventVenue: "블루스퀘어 신한카드홀",
        ticketPrice: 130000,
        contactInfo: "010-1234-5678"
      };
      
      // API 호출
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(samplePost),
      });
      
      if (!response.ok) {
        throw new Error('샘플 판매글 작성에 실패했습니다');
      }
      
      toast.success('샘플 판매글이 작성되었습니다');
      // 성공 후 목록 새로고침
      fetchOngoingSales();
      
    } catch (error) {
      console.error('샘플 판매글 작성 오류:', error);
      toast.error('샘플 판매글 작성에 실패했습니다');
    }
  };

  // 판매 목록이 없을 때 렌더링할 컴포넌트
  const EmptySalesState = () => (
    <div className="text-center py-8">
      <p className="text-gray-500 mb-4">판매 중인 티켓이 없습니다</p>
      <button
        onClick={createSamplePost}
        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
      >
        샘플 판매글 작성하기
      </button>
    </div>
  );

  // 진행 중인 판매 탭 렌더링 함수
  const renderOngoingSalesTab = () => {
    if (isLoadingSales) {
      return <div className="text-center py-8"><Loader size={30} /></div>;
    }

    if (ongoingSales.length === 0) {
      return <EmptySalesState />;
    }

    return (
      <div className="space-y-4">
        {ongoingSales.map((sale) => (
          <div key={sale.id} className="border rounded-lg p-4 flex justify-between items-center">
            <div>
              <h3 className="font-medium">{sale.title}</h3>
              <p className="text-sm text-gray-500">날짜: {sale.date}</p>
              <p className="text-sm text-gray-500">가격: {sale.price}</p>
              <p className="text-sm font-medium text-primary">{sale.status}</p>
            </div>
            <button
              onClick={() => deletePost(sale.id)}
              className="text-red-500 hover:text-red-700"
              aria-label="삭제"
            >
              <FaTrash />
            </button>
          </div>
        ))}
      </div>
    );
  };

  // 진행 중인 구매 탭 렌더링 함수
  const renderOngoingPurchasesTab = () => {
    if (isLoadingPurchases) {
      return <div className="text-center py-8"><Loader size={30} /></div>;
    }

    if (ongoingPurchases.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">구매 내역이 없습니다</p>
          <button
            onClick={() => router.push('/tickets')}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            티켓 구매하러 가기
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {ongoingPurchases.map((purchase) => (
          <div key={purchase.id} className="border rounded-lg p-4">
            <h3 className="font-medium">{purchase.title}</h3>
            <p className="text-sm text-gray-500">날짜: {purchase.date}</p>
            <p className="text-sm text-gray-500">가격: {purchase.price}</p>
            <p className="text-sm font-medium text-primary">{purchase.status}</p>
            {purchase.sellerId && (
              <Link 
                href={`/seller/${purchase.sellerId}`} 
                className="text-sm text-blue-600 hover:underline mt-2 inline-block"
              >
                판매자 정보 보기
              </Link>
            )}
          </div>
        ))}
      </div>
    );
  };

  // 로딩 중이거나 마운트되지 않은 경우 로딩 표시
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="flex items-center justify-center h-screen">
          <p>로딩 중...</p>
        </div>
      </div>
    )
  }

  // 로그인되지 않은 경우
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="flex items-center justify-center h-screen">
          <p>로그인이 필요합니다. 로그인 페이지로 이동합니다...</p>
        </div>
      </div>
    )
  }

  const handleLogout = async () => {
    await logout();
    toast.success("로그아웃 되었습니다");
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span>홈으로 돌아가기</span>
            </Link>
            <button 
              onClick={handleLogout} 
              className="text-gray-700 hover:text-[#0061FF] transition-colors"
            >
              로그아웃
            </button>
          </div>
          <h1 className="text-3xl font-bold mt-4">마이페이지</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-l-4 border-[#0061FF]">
              <h2 className="text-lg font-medium text-gray-700 mb-1">나의 예치금</h2>
              <p className="text-2xl font-bold text-[#0061FF]">120,000원</p>
              <div className="flex justify-between items-center mt-4">
                <Link
                  href="/mypage/deposit-history"
                  className="text-sm text-gray-500 hover:text-[#0061FF] transition-colors"
                >
                  거래내역 보기
                </Link>
                <Button
                  className="bg-[#FFD600] hover:bg-[#FFE600] text-black px-5 py-2"
                  onClick={() => setIsWithdrawModalOpen(true)}
                >
                  출금하기
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-l-4 border-[#FF2F6E]">
              <h2 className="text-lg font-medium text-gray-700 mb-1">포인트</h2>
              <p className="text-2xl font-bold text-[#FF2F6E]">3,500P</p>
              <div className="flex justify-between items-center mt-4">
                <Link
                  href="/mypage/point-history"
                  className="text-sm text-gray-500 hover:text-[#FF2F6E] transition-colors"
                >
                  적립/사용 내역
                </Link>
                <p className="text-xs text-gray-500">30일 후 소멸 예정: 500P</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-l-4 border-[#FFD600]">
              <h2 className="text-lg font-medium text-gray-700 mb-1">쿠폰</h2>
              <p className="text-2xl font-bold text-[#FFD600]">2장</p>
              <div className="flex justify-between items-center mt-4">
                <Link href="/mypage/coupons" className="text-sm text-gray-500 hover:text-[#FFD600] transition-colors">
                  쿠폰함 보기
                </Link>
                <Button variant="outline" className="text-gray-700 border-gray-300">
                  쿠폰 등록
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="flex border-b">
            <button
              className={`flex-1 py-4 px-6 text-center ${activeTab === "profile" ? "bg-gray-100 font-semibold" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <User className="inline-block mr-2" />
              프로필
            </button>
            <button
              className={`flex-1 py-4 px-6 text-center ${activeTab === "purchases" ? "bg-gray-100 font-semibold" : ""}`}
              onClick={() => setActiveTab("purchases")}
            >
              <ShoppingBag className="inline-block mr-2" />
              구매 내역
            </button>
            <button
              className={`flex-1 py-4 px-6 text-center ${activeTab === "sales" ? "bg-gray-100 font-semibold" : ""}`}
              onClick={() => setActiveTab("sales")}
            >
              <Tag className="inline-block mr-2" />
              판매 내역
            </button>
            <button
              className={`flex-1 py-4 px-6 text-center ${activeTab === "notifications" ? "bg-gray-100 font-semibold" : ""}`}
              onClick={() => setActiveTab("notifications")}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="inline-block mr-2 h-5 w-5" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              알림
              {unreadNotificationCount > 0 && (
                <span className="inline-flex items-center justify-center ml-2 h-5 w-5 text-xs font-semibold text-white bg-red-500 rounded-full">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>
          </div>

          <div className="p-6">
            {/* 이 부분은 현재 로그인한 사용자만 볼 수 있는 개인 정보입니다 */}
            {activeTab === "profile" && (
              <div>
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-blue-700 text-sm">이 정보는 회원님만 볼 수 있는 개인 정보입니다.</p>
                </div>
                <h2 className="text-xl font-semibold mb-4">프로필 정보</h2>
                <p>
                  <strong>이름:</strong> {user.name}
                </p>
                <p>
                  <strong>이메일:</strong> {user.email}
                </p>
                <p>
                  <strong>가입일:</strong> {new Date().toLocaleDateString()}
                </p>
                <Link href="/mypage/edit-profile">
                  <Button className="mt-4 bg-[#FFD600] hover:bg-[#FFE600] text-black px-6 py-2">프로필 수정</Button>
                </Link>
              </div>
            )}

            {activeTab === "purchases" && renderOngoingPurchasesTab()}

            {activeTab === "sales" && (
              <div>
                <h2 className="text-xl font-semibold mb-4">판매중인 상품</h2>
                {renderOngoingSalesTab()}
              </div>
            )}

            {activeTab === "notifications" && (
              <div>
                <h2 className="text-xl font-semibold mb-4">알림 목록</h2>
                {isLoadingNotifications ? (
                  <div className="flex justify-center py-4">
                    <Loader size={24} />
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`border-l-4 ${notification.isRead ? 'border-gray-300' : 'border-blue-500'} p-4 bg-white shadow-sm rounded-lg`}
                        onClick={() => !notification.isRead && markNotificationAsRead(notification.id)}
                      >
                      <div className="flex justify-between items-start">
                          <div className={`${notification.isRead ? 'text-gray-700' : 'text-black font-medium'}`}>
                            {notification.message}
                          </div>
                          <div className="ml-2 flex-shrink-0">
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${notification.type === 'PURCHASE' ? 'bg-blue-100 text-blue-800' : notification.type === 'SYSTEM' ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'}`}>
                              {notification.type === 'PURCHASE' ? '취켓팅 신청' : notification.type === 'SYSTEM' ? '시스템' : '댓글'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 flex justify-between">
                          <span>{notification.createdAt}</span>
                          {notification.postId && (
                            <Link 
                              href={`/ticket-cancellation/${notification.postId}`}
                              className="text-blue-600 hover:underline"
                            >
                              글 보기
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                    </div>
                ) : (
                  <p className="text-gray-500">알림이 없습니다.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <WithdrawModal isOpen={isWithdrawModalOpen} onClose={() => setIsWithdrawModalOpen(false)} balance={120000} />
    </div>
  )
}

