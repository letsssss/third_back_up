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

export default function MyPage() {
  const [activeTab, setActiveTab] = useState("profile")
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [ongoingSales, setOngoingSales] = useState<Sale[]>([])
  const [isLoadingSales, setIsLoadingSales] = useState(false)
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

  // user와 activeTab이 변경될 때 판매 목록 가져오기
  useEffect(() => {
    if (user) {
      fetchOngoingSales();
    }
  }, [user, activeTab]);

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
      const salesData = data.posts.map((post: any) => {
        // 티켓 가격 처리 (문자열이거나 숫자 모두 처리)
        let formattedPrice = '가격 정보 없음';
        if (post.ticketPrice !== null && post.ticketPrice !== undefined) {
          try {
            // 문자열이든 숫자든 처리 가능하도록
            const priceValue = typeof post.ticketPrice === 'string' 
              ? Number(post.ticketPrice) 
              : post.ticketPrice;
              
            // NaN 체크와 매우 큰 숫자 값에 대한 처리
            if (!isNaN(priceValue)) {
              if (priceValue > Number.MAX_SAFE_INTEGER) {
                // 매우 큰 숫자의 경우 문자열로 유지하되 천 단위 구분 적용
                const priceStr = String(post.ticketPrice);
                formattedPrice = priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + '원';
              } else {
                formattedPrice = `${priceValue.toLocaleString()}원`;
              }
            }
          } catch (e) {
            console.error("가격 처리 중 오류:", e);
            formattedPrice = String(post.ticketPrice) + '원';
          }
        }
        
        return {
          id: post.id,
          title: post.title || post.eventName || "제목 없음",
          date: post.eventDate || new Date(post.createdAt).toLocaleDateString(),
          price: formattedPrice,
          status: post.category === 'TICKET_CANCELLATION' ? "취켓팅 판매중" : "판매중"
        };
      });
      
      console.log("변환된 판매 데이터:", salesData);
      setOngoingSales(salesData);
    } catch (error) {
      console.error('판매 목록 로딩 오류:', error);
      toast.error('판매 목록을 불러오는데 실패했습니다.');
      // 더미 데이터 대신 빈 배열 반환
      setOngoingSales([]);
    } finally {
      setIsLoadingSales(false);
    }
  };

  // 게시물 삭제 함수
  const deletePost = async (postId: number) => {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('게시물 삭제에 실패했습니다.');
      }
      
      // 삭제 성공 시 목록에서 제거
      setOngoingSales(prev => prev.filter(sale => sale.id !== postId));
      toast.success('게시물이 삭제되었습니다.');
    } catch (error) {
      console.error('게시물 삭제 오류:', error);
      toast.error('게시물 삭제에 실패했습니다.');
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
              className={`flex-1 py-4 px-6 text-center ${activeTab === "ongoing-purchases" ? "bg-gray-100 font-semibold" : ""}`}
              onClick={() => setActiveTab("ongoing-purchases")}
            >
              <ShoppingBag className="inline-block mr-2" />
              구매중인 상품
            </button>
            <button
              className={`flex-1 py-4 px-6 text-center ${activeTab === "ongoing-sales" ? "bg-gray-100 font-semibold" : ""}`}
              onClick={() => setActiveTab("ongoing-sales")}
            >
              <Tag className="inline-block mr-2" />
              판매중인 상품
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

            {activeTab === "ongoing-purchases" && (
              <div>
                <h2 className="text-xl font-semibold mb-4">구매중인 상품</h2>
                {ongoingPurchases.length > 0 ? (
                  ongoingPurchases.map((item) => (
                    <div key={item.id} className="border-b py-4 last:border-b-0">
                      <h3 className="font-medium">{item.title}</h3>
                      <p className="text-sm text-gray-600">{item.date}</p>
                      <p className="text-sm font-semibold">{item.price}</p>
                      <p className="text-sm text-blue-600">{item.status}</p>
                      <Link href={`/transaction/${item.id}`}>
                        <Button className="mt-2 text-sm" variant="outline">
                          거래 상세
                        </Button>
                      </Link>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">구매중인 상품이 없습니다.</p>
                )}
              </div>
            )}

            {activeTab === "ongoing-sales" && (
              <div>
                <h2 className="text-xl font-semibold mb-4">판매중인 상품</h2>
                {renderOngoingSalesTab()}
              </div>
            )}
          </div>
        </div>
      </main>
      <WithdrawModal isOpen={isWithdrawModalOpen} onClose={() => setIsWithdrawModalOpen(false)} balance={120000} />
    </div>
  )
}

