import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { TicketList } from "@/components/ticket-list"

const tickets = [
  {
    id: 1,
    title: "세븐틴 콘서트",
    artist: "세븐틴",
    date: "2024.03.20",
    time: "19:00",
    venue: "잠실종합운동장 주경기장",
    price: "110,000원",
    image: "/placeholder.svg",
    status: "판매중",
  },
  {
    id: 2,
    title: "데이식스 전국투어",
    artist: "데이식스 (DAY6)",
    date: "2024.02.01",
    time: "18:00",
    venue: "올림픽공원 체조경기장",
    price: "99,000원",
    image: "/placeholder.svg",
    status: "판매중",
  },
  {
    id: 3,
    title: "아이브 팬미팅",
    artist: "아이브",
    date: "2024.04.05",
    time: "17:00",
    venue: "KSPO DOME",
    price: "88,000원",
    image: "/placeholder.svg",
    status: "매진임박",
  },
]

export default function CategoryPage({ params }: { params: { name: string } }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>홈으로 돌아가기</span>
          </Link>
          <h1 className="text-3xl font-bold mt-4 capitalize">{params.name}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
          <Button variant="outline" className="rounded-full whitespace-nowrap">
            최신순
          </Button>
          <Button variant="outline" className="rounded-full whitespace-nowrap">
            인기순
          </Button>
          <Button variant="outline" className="rounded-full whitespace-nowrap">
            낮은가격순
          </Button>
          <Button variant="outline" className="rounded-full whitespace-nowrap">
            높은가격순
          </Button>
        </div>

        {params.name.toLowerCase() === "콘서트" ? (
          <TicketList />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <Link href={`/ticket/${ticket.id}`}>
                  <Image
                    src={ticket.image || "/placeholder.svg"}
                    alt={ticket.title}
                    width={400}
                    height={200}
                    className="w-full h-48 object-cover"
                  />
                </Link>
                <div className="p-4">
                  <Link href={`/ticket/${ticket.id}`}>
                    <h3 className="text-lg font-semibold mb-2">{ticket.title}</h3>
                  </Link>
                  <p className="text-gray-600 mb-2">{ticket.artist}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                    <span>
                      {ticket.date} {ticket.time}
                    </span>
                    <span>{ticket.venue}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <span>판매자:</span>
                    <Link
                      href={`/seller/seller${ticket.id}`}
                      className="ml-1 text-blue-600 hover:underline flex items-center"
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
                        <span className="text-xs">4.{(ticket.id % 5) + 3}</span>
                      </div>
                    </Link>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-black">{ticket.price}</span>
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        ticket.status === "매진임박" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

