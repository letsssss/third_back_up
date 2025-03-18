import { NextResponse } from "next/server"

let popularTickets = [
  { id: 1, rank: 1, artist: "세븐틴", date: "25.03.20 ~ 25.03.21", venue: "잠실종합운동장 주경기장", traffic: 1000 },
  { id: 2, rank: 2, artist: "데이식스 (DAY6)", date: "25.02.01 ~ 25.03.30", venue: "전국투어", traffic: 800 },
  { id: 3, rank: 3, artist: "아이브", date: "25.04.05 ~ 25.04.06", venue: "KSPO DOME", traffic: 750 },
  { id: 4, rank: 4, artist: "웃는 남자", date: "25.01.09 ~ 25.03.09", venue: "예술의전당 오페라극장", traffic: 500 },
]

export async function GET() {
  // 트래픽을 랜덤하게 업데이트 (실제로는 실제 트래픽 데이터를 사용해야 합니다)
  popularTickets = popularTickets.map((ticket) => ({
    ...ticket,
    traffic: ticket.traffic + Math.floor(Math.random() * 100),
  }))

  // 트래픽에 따라 정렬하고 랭크 재할당
  popularTickets
    .sort((a, b) => b.traffic - a.traffic)
    .forEach((ticket, index) => {
      ticket.rank = index + 1
    })

  return NextResponse.json(popularTickets)
}

