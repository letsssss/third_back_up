import Link from "next/link"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CategorySection } from "@/components/category-section"
import { PopularTickets } from "@/components/popular-tickets"

export default function Page() {
  return (
    <div className="min-h-screen">
      <div className="bg-[#0061FF]">
        {/* Navigation */}
        <header className="w-full">
          <div className="container flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center pl-4">
              <span className="text-xl font-bold text-white">티켓마켓</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/login" className="text-sm text-white hover:opacity-80">
                로그인
              </Link>
              <Link
                href="#"
                className="text-sm px-4 py-2 bg-black text-white rounded-md hover:bg-gray-900 transition-colors"
              >
                티켓 판매
              </Link>
              <Link href="/cart" className="text-sm text-white hover:opacity-80">
                장바구니
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center py-24 px-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-4">
            모든 티켓, 한 곳에서
          </h1>
          <p className="text-lg text-white/90 text-center mb-8">
            콘서트, 뮤지컬, 스포츠 경기 등 다양한 이벤트 티켓을 찾아보세요.
          </p>
          <div className="w-full max-w-2xl flex">
            <Input
              type="search"
              placeholder="이벤트, 아티스트, 팀 검색"
              className="flex-1 h-12 rounded-l-lg rounded-r-none border-0 bg-white text-black placeholder:text-gray-500"
            />
            <Button className="h-12 px-8 rounded-l-none rounded-r-lg bg-[#FFD600] hover:bg-[#FFE600] text-black font-medium">
              <Search className="w-5 h-5 mr-2" />
              검색
            </Button>
          </div>
        </section>
      </div>

      <CategorySection />
      <PopularTickets />
    </div>
  )
}

