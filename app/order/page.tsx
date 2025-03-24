"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Minus, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

// 더미 티켓 데이터 (실제로는 API에서 가져와야 함)
const dummyTickets = {
  1: {
    id: 1,
    title: "세븐틴 'FOLLOW' TO SEOUL",
    artist: "세븐틴",
    date: "2024.03.20",
    time: "19:00",
    venue: "잠실종합운동장 주경기장",
    price: 110000,
    image: "/placeholder.svg",
  },
  // 다른 티켓들...
}

export default function OrderPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const ticketId = searchParams.get("ticketId")
  const [ticketData, setTicketData] = useState(dummyTickets[ticketId as keyof typeof dummyTickets])
  const [quantity, setQuantity] = useState(1)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // 실제 구현에서는 여기서 API를 호출하여 티켓 정보를 가져와야 합니다.
    if (ticketId && dummyTickets[ticketId as keyof typeof dummyTickets]) {
      setTicketData(dummyTickets[ticketId as keyof typeof dummyTickets])
    }
  }, [ticketId])

  const totalPrice = ticketData ? ticketData.price * quantity : 0

  const handleQuantityChange = (change: number) => {
    setQuantity((prev) => Math.max(1, prev + change))
  }

  const handlePayment = async () => {
    if (!ticketData || !isFormValid) return;
    
    setIsLoading(true);
    
    try {
      // API에 전송할 데이터 (BigInt를 문자열로 변환)
      const postData = {
        postId: parseInt(ticketId || "1"),
        quantity: quantity,
        selectedSeats: `${ticketData.artist} 콘서트 좌석`,
        phoneNumber: phone,
        paymentMethod: "BANK_TRANSFER"
      };
      
      // 티켓 구매 API 호출
      const response = await fetch('/api/ticket-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
        credentials: 'include', // 쿠키 포함
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('구매 요청 실패:', result);
        throw new Error(result.message || '티켓 구매에 실패했습니다.');
      }
      
      console.log('구매 성공:', result);
      toast.success('결제가 성공적으로 완료되었습니다!');
      
      // 성공 페이지로 리다이렉트
      router.push("/order/success");
    } catch (error) {
      console.error('결제 처리 오류:', error);
      toast.error(error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  const isFormValid = name && phone && email && agreedToTerms

  if (!ticketData) {
    return <div>티켓 정보를 찾을 수 없습니다.</div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>뒤로 가기</span>
          </Link>
          <h1 className="text-2xl font-bold mt-4">티켓 구매</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <Image
                src={ticketData.image || "/placeholder.svg"}
                alt={ticketData.title}
                width={80}
                height={80}
                className="rounded-md mr-4"
              />
              <div>
                <h2 className="text-xl font-semibold">{ticketData.title}</h2>
                <p className="text-gray-600">{ticketData.artist}</p>
                <p className="text-gray-600">
                  {ticketData.date} {ticketData.time}
                </p>
                <p className="text-gray-600">{ticketData.venue}</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center">
                <Button variant="outline" size="icon" onClick={() => handleQuantityChange(-1)}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="mx-4">{quantity}</span>
                <Button variant="outline" size="icon" onClick={() => handleQuantityChange(1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="font-semibold">
                {ticketData.price.toLocaleString()}원 x {quantity}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">구매자 정보</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="이름을 입력해주세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  전화번호
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="전화번호를 입력해주세요"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="이메일을 입력해주세요"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">결제 정보</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>티켓 금액</span>
                <span>{totalPrice.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span>배송비</span>
                <span>0원</span>
              </div>
              <div className="flex justify-between font-semibold text-lg">
                <span>총 결제 금액</span>
                <span>{totalPrice.toLocaleString()}원</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
            />
            <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
              주문 내용을 확인하였으며, 결제진행에 동의합니다
            </label>
          </div>
        </div>

        <Button
          className="w-full bg-[#FFD600] hover:bg-[#FFE600] text-black"
          disabled={!isFormValid || isLoading}
          onClick={handlePayment}
        >
          {isLoading ? '처리 중...' : `${totalPrice.toLocaleString()}원 결제하기`}
        </Button>
      </main>
    </div>
  )
}

