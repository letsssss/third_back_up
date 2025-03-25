"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calendar, MapPin, Clock, CheckCircle, AlertCircle, Star } from "lucide-react"
import { motion } from "framer-motion"
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
  const productNumber = params?.productNumber as string;
  
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
      if (!productNumber) {
        setLoading(false)
        toast.error("유효하지 않은 상품번호입니다.")
        return
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/posts?productNumber=${productNumber}`);
        
        if (!response.ok) {
          throw new Error('게시글을 불러오는데 실패했습니다');
        }
        
        const data = await response.json();
        console.log("불러온 게시글 데이터:", data);
        
        if (!data || !data.posts || data.posts.length === 0) {
          throw new Error('데이터 형식이 올바르지 않거나 게시글이 없습니다');
        }
        
        // posts 배열의 첫 번째 항목 사용 (productNumber로 조회했을 때)
        const postData = data.posts[0];
        
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
          
          setIsAuthor(userId === authorId);
          console.log("작성자 여부:", userId === authorId);
        }
        
      } catch (error) {
        console.error('게시글 데이터 가져오기 오류:', error);
        setError('게시글 정보를 가져오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }

    if (mounted) {
      fetchPostData();
    }
  }, [productNumber, mounted, user]);

  // 좌석 선택 처리
  const handleSeatSelection = (seatId: string) => {
    setSelectedSeats(prev => {
      if (prev.includes(seatId)) {
        return prev.filter(id => id !== seatId);
      } else {
        return [...prev, seatId];
      }
    });
  };

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("로그인이 필요합니다.");
      router.push("/login");
      return;
    }
    
    if (selectedSeats.length === 0) {
      toast.error("좌석을 선택해주세요.");
      return;
    }
    
    if (!phoneNumber) {
      toast.error("연락처를 입력해주세요.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // 선택된 좌석 정보 계산
      const selectedSeatsInfo = selectedSeats.map(seatId => {
        const seat = ticketData?.seatOptions.find(s => s.id === seatId);
        return {
          id: seatId,
          label: seat?.label || '',
          price: seat?.price || 0
        };
      });
      
      // 총 가격 계산
      const totalPrice = selectedSeatsInfo.reduce((sum, seat) => sum + seat.price, 0);
      
      // API 호출하여 주문 생성
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          sellerId: ticketData?.seller.id,
          postId: ticketData?.id,
          ticketTitle: ticketData?.title,
          eventDate: ticketData?.date,
          eventVenue: ticketData?.venue,
          ticketPrice: ticketData?.price,
          quantity: selectedSeatsInfo.length,
          totalPrice: totalPrice,
          selectedSeats: selectedSeatsInfo.map(s => s.label).join(', '),
          phoneNumber,
          paymentMethod: '신용카드'
        })
      });
      
      if (!response.ok) {
        throw new Error('주문 생성 중 오류가 발생했습니다.');
      }
      
      const data = await response.json();
      
      // 성공 상태로 변경
      setIsSuccess(true);
      
      // 성공 메시지 표시
      toast.success("취소표 신청이 완료되었습니다!");
      
      // 잠시 후 마이페이지로 이동
      setTimeout(() => {
        router.push('/mypage');
      }, 3000);
      
    } catch (error) {
      console.error('폼 제출 오류:', error);
      toast.error("취소표 신청 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg font-semibold">로딩 중...</div>
          <div className="text-muted-foreground">잠시만 기다려주세요.</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Link href="/ticket-cancellation" className="mb-8 flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          취소표 목록으로 돌아가기
        </Link>
        
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류 발생</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!ticketData) {
    return (
      <div className="container mx-auto py-8">
        <Link href="/ticket-cancellation" className="mb-8 flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          취소표 목록으로 돌아가기
        </Link>
        
        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>정보 없음</AlertTitle>
          <AlertDescription>취소표 정보를 찾을 수 없습니다.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="container mx-auto py-8">
        <div className="mx-auto max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          </motion.div>
          
          <h1 className="mb-2 text-2xl font-bold">신청 완료!</h1>
          <p className="mb-6 text-muted-foreground">취소표 신청이 성공적으로 완료되었습니다.</p>
          
          <p className="mb-6 text-sm text-muted-foreground">
            취소표가 발생하면 바로 알림을 드리고, 빠르게 예매를 진행해 드리겠습니다.
          </p>
          
          <Button
            onClick={() => router.push('/mypage')}
            className="w-full"
          >
            마이페이지로 이동
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Link href="/ticket-cancellation" className="mb-8 flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />
        취소표 목록으로 돌아가기
      </Link>
      
      <div className="grid gap-8 md:grid-cols-2">
        {/* 티켓 정보 */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="mb-4 text-2xl font-bold">{ticketData.title}</h1>
          
          <div className="mb-4 flex items-center text-sm text-muted-foreground">
            <Calendar className="mr-2 h-4 w-4" />
            <span>{ticketData.date} {ticketData.time}</span>
          </div>
          
          <div className="mb-4 flex items-center text-sm text-muted-foreground">
            <MapPin className="mr-2 h-4 w-4" />
            <span>{ticketData.venue}</span>
          </div>
          
          <div className="mb-6 flex items-center text-sm text-muted-foreground">
            <Clock className="mr-2 h-4 w-4" />
            <span>신청 마감: 공연 1일 전</span>
          </div>
          
          <div className="mb-6 flex items-center">
            <div className="mr-2 h-10 w-10 overflow-hidden rounded-full">
              <img src={ticketData.seller.image || '/placeholder-avatar.jpg'} 
                   alt={ticketData.seller.name} 
                   className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="font-medium">{ticketData.seller.name}</div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Star className="mr-1 h-3 w-3 fill-yellow-500 text-yellow-500" />
                <span>{ticketData.seller.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>
          
          <div className="mb-4 flex items-center justify-between rounded-md bg-muted p-3">
            <span className="font-medium">취소표 발생 성공률</span>
            <span className="font-semibold text-green-600">{ticketData.successRate}%</span>
          </div>
          
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>취소표 알림 서비스</AlertTitle>
            <AlertDescription>
              취소표가 발생하면 알림을 드리고, 빠르게 예매를 진행해 드립니다.
            </AlertDescription>
          </Alert>
        </div>
        
        {/* 신청 폼 */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold">취소표 신청</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium">좌석 선택</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ticketData.seatOptions.map((seat) => (
                  <div
                    key={seat.id}
                    onClick={() => handleSeatSelection(seat.id)}
                    className={`flex cursor-pointer flex-col rounded-md border p-3 transition-colors ${
                      selectedSeats.includes(seat.id) 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="font-medium">{seat.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {seat.price.toLocaleString()}원
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="phoneNumber" className="mb-2 block text-sm font-medium">
                연락처
              </label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="010-0000-0000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                취소표 발생 시 알림을 받을 연락처를 입력해주세요.
              </p>
            </div>
            
            <Separator className="my-6" />
            
            <div className="mb-6 space-y-4">
              <div className="flex justify-between text-sm">
                <span>선택 좌석</span>
                <span>
                  {selectedSeats.map(id => {
                    const seat = ticketData.seatOptions.find(s => s.id === id);
                    return seat?.label;
                  }).join(', ') || '없음'}
                </span>
              </div>
              
              <div className="flex justify-between font-semibold">
                <span>총 가격</span>
                <span>
                  {selectedSeats.reduce((sum, id) => {
                    const seat = ticketData.seatOptions.find(s => s.id === id);
                    return sum + (seat?.price || 0);
                  }, 0).toLocaleString()}원
                </span>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || selectedSeats.length === 0 || !phoneNumber}
            >
              {isSubmitting ? '처리 중...' : '취소표 신청하기'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
} 