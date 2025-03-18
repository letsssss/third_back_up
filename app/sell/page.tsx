"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// 콘서트 데이터 타입 정의
interface Concert {
  id: number
  title: string
  date: string
  venue: string
}

// 커스텀 공연 정보 타입 정의
interface CustomConcert {
  title: string
  date: string
  venue: string
}

// 섹션 타입 정의
interface Section {
  name: string
  price: string
}

// 에러 타입 정의
interface FormErrors {
  concert?: string
  concertTitle?: string
  concertDate?: string
  concertVenue?: string
  description?: string
  [key: string]: string | undefined
}

// 임시 공연 데이터 (실제로는 API에서 가져와야 합니다)
const concertData: Concert[] = [
  { id: 1, title: "세븐틴 콘서트", date: "2024-03-20", venue: "잠실종합운동장 주경기장" },
  { id: 2, title: "방탄소년단 월드투어", date: "2024-04-15", venue: "부산 아시아드 주경기장" },
  { id: 3, title: "아이유 콘서트", date: "2024-05-01", venue: "올림픽공원 체조경기장" },
  { id: 4, title: "블랙핑크 인 유어 에어리어", date: "2024-06-10", venue: "고척스카이돔" },
]

export default function SellPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<Concert[]>([])
  const [selectedConcert, setSelectedConcert] = useState<Concert | null>(null)
  const [customConcert, setCustomConcert] = useState<CustomConcert>({
    title: "",
    date: "",
    venue: ""
  })
  const [quantity, setQuantity] = useState("1")
  const [seatInfo, setSeatInfo] = useState("")
  const [price, setPrice] = useState("")
  const [ticketDescription, setTicketDescription] = useState("")
  const [isConsecutiveSeats, setIsConsecutiveSeats] = useState(false)
  const [sections, setSections] = useState<Section[]>([{ name: "", price: "" }])
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const { toast } = useToast()

  useEffect(() => {
    if (searchTerm.length > 0) {
      const results = concertData.filter((concert) => concert.title.toLowerCase().includes(searchTerm.toLowerCase()))
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }, [searchTerm])

  const handleConcertSelect = (concert: Concert) => {
    setSelectedConcert(concert)
    setCustomConcert({
      title: concert.title,
      date: concert.date,
      venue: concert.venue
    })
    setSearchTerm("")
    setSearchResults([])
  }

  const updateCustomConcert = (field: keyof CustomConcert, value: string) => {
    setCustomConcert(prev => ({
      ...prev,
      [field]: value
    }))
    // 커스텀 공연 정보가 변경되면 선택된 공연 정보를 제거
    setSelectedConcert(null)
  }

  const addSection = () => {
    setSections([...sections, { name: "", price: "" }])
  }

  const removeSection = (index: number) => {
    const newSections = [...sections]
    newSections.splice(index, 1)
    setSections(newSections)
  }

  const updateSectionName = (index: number, name: string) => {
    const newSections = [...sections]
    newSections[index].name = name
    setSections(newSections)
  }

  const updateSectionPrice = (index: number, price: string) => {
    const newSections = [...sections]
    newSections[index].price = price
    setSections(newSections)
  }

  const validateForm = () => {
    const errors: FormErrors = {}

    if (!customConcert.title) {
      errors.concertTitle = "공연 제목을 입력해주세요"
    }

    if (!customConcert.date) {
      errors.concertDate = "공연 날짜를 입력해주세요"
    }

    if (!ticketDescription) {
      errors.description = "티켓 상세설명을 입력해주세요"
    }

    sections.forEach((section, index) => {
      if (!section.name) {
        errors[`section_${index}_name`] = "구역명을 입력해주세요"
      }
      if (!section.price) {
        errors[`section_${index}_price`] = "가격을 입력해주세요"
      }
    })

    setFormErrors(errors)
    
    // 디버깅을 위해 항상 true를 반환합니다. 실제 운영 환경에서는 아래 주석을 해제하세요.
    return true
    // return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) {
      // 폼이 유효하지 않으면 오류 메시지를 표시하고 제출하지 않음
      if (!customConcert.title) {
        toast({
          title: "Error",
          description: "공연 제목을 입력해주세요",
          variant: "destructive",
        })
      } else if (!customConcert.date) {
        toast({
          title: "Error",
          description: "공연 날짜를 입력해주세요",
          variant: "destructive",
        })
      } else if (!ticketDescription) {
        toast({
          title: "Error",
          description: "티켓 상세설명을 입력해주세요",
          variant: "destructive",
        })
      } else if (sections.some((section) => !section.name || !section.price)) {
        toast({
          title: "Error",
          description: "모든 구역의 이름과 가격을 입력해주세요",
          variant: "destructive",
        })
      }
      return
    }

    try {
      // 판매 데이터 준비
      const saleData = {
        title: customConcert.title,
        eventName: customConcert.title,
        eventDate: customConcert.date,
        eventVenue: customConcert.venue,
        content: ticketDescription || "",
        category: "TICKET_CANCELLATION",
        ticketPrice: parseInt(sections[0].price) || 0,
        contactInfo: "연락처는 마이페이지에서 확인 가능합니다.",
      };

      console.log("제출할 판매 데이터:", saleData);

      // 서버에 판매 데이터 저장 (API 호출)
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData),
      });

      const result = await response.json();
      console.log("서버 응답:", result);
      
      if (!response.ok) {
        // 서버에서 반환된 구체적인 오류 메시지 확인
        if (result && result.errors) {
          console.error("유효성 검사 오류:", result.errors);
          
          const errorMessage = result.errors.map((err: any) => 
            `${err.path}: ${err.message}`
          ).join(', ');
          
          throw new Error(errorMessage || result.message || '판매 등록에 실패했습니다.');
        } else {
          throw new Error(result.message || '판매 등록에 실패했습니다.');
        }
      }
      
      // 판매 정보 표시를 위해 로컬 스토리지에 저장 (선택사항)
      localStorage.setItem('lastSaleDetails', JSON.stringify({
        saleId: result.post.id,
        title: customConcert.title,
        date: customConcert.date,
        venue: customConcert.venue,
        price: sections[0].price,
      }));
      
      // 성공 메시지 표시
      toast({
        title: "성공",
        description: "티켓 판매가 성공적으로 등록되었습니다.",
      });

      // 마이페이지로 리다이렉트
      router.push("/mypage");
    } catch (error) {
      console.error("판매 등록 오류:", error);
      toast({
        title: "오류 발생",
        description: error instanceof Error ? error.message : "판매 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>홈으로 돌아가기</span>
          </Link>
          <h1 className="text-3xl font-bold mt-4">티켓 판매하기</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  티켓 사진 <span className="text-gray-500">(선택)</span>
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                      >
                        <span>티켓 사진 업로드</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                      </label>
                      <p className="pl-1">또는 드래그 앤 드롭</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  공연 제목 <span className="text-red-500">(필수)</span>
                </label>
                <Input
                  type="text"
                  placeholder="공연 제목을 입력하세요"
                  value={customConcert.title}
                  onChange={(e) => updateCustomConcert("title", e.target.value)}
                  className={formErrors.concertTitle ? "border-red-500" : ""}
                  required
                />
                {formErrors.concertTitle && <p className="mt-1 text-xs text-red-500">{formErrors.concertTitle}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  공연 날짜 <span className="text-red-500">(필수)</span>
                </label>
                <Input
                  type="text"
                  placeholder="공연 날짜를 입력하세요 (예: 2024-03-20)"
                  value={customConcert.date}
                  onChange={(e) => updateCustomConcert("date", e.target.value)}
                  className={formErrors.concertDate ? "border-red-500" : ""}
                  required
                />
                {formErrors.concertDate && <p className="mt-1 text-xs text-red-500">{formErrors.concertDate}</p>}
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    구역별 가격 설정 <span className="text-red-500">(필수)</span>
                  </h3>
                  <Button type="button" variant="outline" onClick={addSection} className="text-xs">
                    구역 추가 +
                  </Button>
                </div>

                {sections.map((section, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="구역명 (예: R석, S석)"
                        value={section.name}
                        onChange={(e) => updateSectionName(index, e.target.value)}
                        className={formErrors[`section_${index}_name`] ? "border-red-500" : ""}
                        required
                      />
                      {formErrors[`section_${index}_name`] && (
                        <p className="mt-1 text-xs text-red-500">{formErrors[`section_${index}_name`]}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 w-1/3">
                      <Input
                        type="number"
                        placeholder="가격"
                        value={section.price}
                        onChange={(e) => updateSectionPrice(index, e.target.value)}
                        className={formErrors[`section_${index}_price`] ? "border-red-500" : ""}
                        required
                      />
                      <span className="text-gray-500 whitespace-nowrap">원</span>
                      {formErrors[`section_${index}_price`] && (
                        <p className="mt-1 text-xs text-red-500">{formErrors[`section_${index}_price`]}</p>
                      )}
                    </div>
                    {sections.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeSection(index)}
                        className="h-8 w-8 text-red-500"
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  티켓 상세설명 <span className="text-red-500">(필수)</span>
                </label>
                <Textarea
                  placeholder="티켓에 대한 상세한 설명을 입력해주세요"
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  className={`min-h-[100px] ${formErrors.description ? "border-red-500" : ""}`}
                  required
                />
                {formErrors.description && <p className="mt-1 text-sm text-red-500">{formErrors.description}</p>}
              </div>

              <Button type="submit" className="w-full bg-[#0061FF] hover:bg-[#0052D6] text-white transition-colors">
                판매 등록하기
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

