import { NextResponse } from "next/server"

// 임시 주문 데이터베이스
const orders = [
  { id: 1, userId: 1, ticketId: 1, quantity: 2, totalPrice: 220000, status: "pending" },
  { id: 2, userId: 2, ticketId: 2, quantity: 1, totalPrice: 99000, status: "completed" },
]

export async function GET() {
  return NextResponse.json(orders)
}

export async function POST(request: Request) {
  const newOrder = await request.json()
  newOrder.id = orders.length + 1
  orders.push(newOrder)
  return NextResponse.json(newOrder, { status: 201 })
}

export async function PUT(request: Request) {
  const updatedOrder = await request.json()
  const index = orders.findIndex((o) => o.id === updatedOrder.id)
  if (index !== -1) {
    orders[index] = { ...orders[index], ...updatedOrder }
    return NextResponse.json(orders[index])
  }
  return NextResponse.json({ error: "Order not found" }, { status: 404 })
}

export async function DELETE(request: Request) {
  const { id } = await request.json()
  const index = orders.findIndex((o) => o.id === id)
  if (index !== -1) {
    orders.splice(index, 1)
    return NextResponse.json({ message: "Order deleted successfully" })
  }
  return NextResponse.json({ error: "Order not found" }, { status: 404 })
}

