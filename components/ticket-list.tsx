import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"

const seventeenConcertTickets = [
  {
    id: 1,
    seat: "VIP석 A구역 1열 5번",
    price: 165000,
    status: "판매중",
    seller: "CARAT_1",
  },
  {
    id: 2,
    seat: "VIP석 B구역 2열 10번",
    price: 165000,
    status: "판매중",
    seller: "SVT_LOVE",
  },
  {
    id: 3,
    seat: "R석 C구역 5열 15번",
    price: 145000,
    status: "예약중",
    seller: "WOOZI_FAN",
  },
  {
    id: 4,
    seat: "R석 D구역 7열 20번",
    price: 145000,
    status: "판매중",
    seller: "HOSHI_TIGER",
  },
  {
    id: 5,
    seat: "S석 E구역 10열 5번",
    price: 110000,
    status: "판매완료",
    seller: "MINGYU_TALL",
  },
  {
    id: 6,
    seat: "S석 F구역 12열 25번",
    price: 110000,
    status: "판매중",
    seller: "DINO_MAKNAE",
  },
  {
    id: 7,
    seat: "VIP석 A구역 3열 8번",
    price: 165000,
    status: "판매중",
    seller: "JEONGHAN_ANGEL",
  },
  {
    id: 8,
    seat: "R석 C구역 6열 12번",
    price: 145000,
    status: "예약중",
    seller: "SEUNGKWAN_BOO",
  },
  {
    id: 9,
    seat: "S석 E구역 15열 30번",
    price: 110000,
    status: "판매중",
    seller: "VERNON_CHWE",
  },
  {
    id: 10,
    seat: "VIP석 B구역 1열 1번",
    price: 165000,
    status: "판매중",
    seller: "SCOUPS_LEADER",
  },
]

export const TicketList: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {seventeenConcertTickets.map((ticket) => (
        <div key={ticket.id} className="border p-4 rounded-lg shadow hover:shadow-md transition-shadow">
          <h3 className="font-bold text-lg mb-2">좌석: {ticket.seat}</h3>
          <p className="text-gray-600 mb-1">가격: {ticket.price.toLocaleString()}원</p>
          <p className="text-gray-600 mb-1">
            상태:
            <span
              className={`ml-1 ${
                ticket.status === "판매중"
                  ? "text-green-500"
                  : ticket.status === "예약중"
                    ? "text-yellow-500"
                    : "text-red-500"
              }`}
            >
              {ticket.status}
            </span>
          </p>
          <div className="flex items-center mb-3">
            <p className="text-gray-600">판매자: </p>
            <Link href={`/seller/${ticket.seller}`} className="ml-1 text-blue-600 hover:underline flex items-center">
              {ticket.seller}
              <div className="flex items-center ml-2 text-yellow-500">
                <Star className="h-3 w-3 fill-current" />
                <span className="text-xs ml-0.5">4.8</span>
              </div>
            </Link>
          </div>
          <Link href={`/ticket/${ticket.id}`}>
            <Button className="w-full">자세히 보기</Button>
          </Link>
        </div>
      ))}
    </div>
  )
}

