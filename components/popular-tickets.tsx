import Link from "next/link"
import { Button } from "@/components/ui/button"

const popularTickets = [
  {
    id: 1,
    rank: 1,
    artist: "세븐틴",
    date: "25.03.20 ~ 25.03.21",
    venue: "잠실종합운동장 주경기장",
  },
  {
    id: 2,
    rank: 2,
    artist: "데이식스 (DAY6)",
    date: "25.02.01 ~ 25.03.30",
    venue: "전국투어",
  },
  {
    id: 3,
    rank: 3,
    artist: "아이브",
    date: "25.04.05 ~ 25.04.06",
    venue: "KSPO DOME",
  },
  {
    id: 4,
    rank: 4,
    artist: "웃는 남자",
    date: "25.01.09 ~ 25.03.09",
    venue: "예술의전당 오페라극장",
  },
]

export function PopularTickets() {
  return (
    <section className="bg-white py-16">
      <div className="container mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">
            오늘의 <span className="text-[#FF2F6E]">인기</span> 티켓
          </h2>
        </div>
        <div className="flex gap-2 mb-8">
          <Button variant="outline" className="rounded-full px-6 bg-white border-gray-200 text-black hover:bg-gray-50">
            1~10위
          </Button>
          <Button variant="ghost" className="rounded-full px-6 text-gray-500 hover:text-gray-700 hover:bg-gray-50">
            11~20위
          </Button>
        </div>
        <div className="divide-y">
          {popularTickets.map((ticket) => (
            <Link href={`/ticket/${ticket.id}`} key={ticket.id}>
              <div className="flex items-center py-6 hover:bg-gray-50 transition-colors cursor-pointer">
                <span className="text-[#FF2F6E] font-bold text-xl w-16">{ticket.rank}</span>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">{ticket.artist}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{ticket.date}</span>
                    <span>•</span>
                    <span>{ticket.venue}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>판매자:</span>
                    <Link
                      href={`/seller/seller${ticket.id}`}
                      className="text-blue-600 hover:underline flex items-center"
                    >
                      티켓마스터{ticket.id}
                      <div className="flex items-center ml-2 text-yellow-500">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <span className="text-xs">4.{ticket.rank}</span>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

