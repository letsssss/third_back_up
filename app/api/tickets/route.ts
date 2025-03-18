import { NextResponse } from "next/server"

// 임시 데이터베이스 역할을 하는 배열
const tickets = [
  { id: 1, title: "세븐틴 콘서트", artist: "세븐틴", date: "2024-03-20", price: 110000, quantity: 100 },
  { id: 2, title: "데이식스 전국투어", artist: "데이식스", date: "2024-02-01", price: 99000, quantity: 150 },
]

export async function GET() {
  return NextResponse.json(tickets)
}

export async function POST(request: Request) {
  const newTicket = await request.json()
  newTicket.id = tickets.length + 1
  tickets.push(newTicket)
  return NextResponse.json(newTicket, { status: 201 })
}

export async function PUT(request: Request) {
  const updatedTicket = await request.json()
  const index = tickets.findIndex((t) => t.id === updatedTicket.id)
  if (index !== -1) {
    tickets[index] = { ...tickets[index], ...updatedTicket }
    return NextResponse.json(tickets[index])
  }
  return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
}

export async function DELETE(request: Request) {
  const { id } = await request.json()
  const index = tickets.findIndex((t) => t.id === id)
  if (index !== -1) {
    tickets.splice(index, 1)
    return NextResponse.json({ message: "Ticket deleted successfully" })
  }
  return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
}

