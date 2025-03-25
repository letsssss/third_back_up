import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { createUniqueOrderNumber } from "@/utils/orderNumber"

// Prisma 클라이언트 인스턴스 생성
const prisma = new PrismaClient()

// 임시 주문 데이터베이스
const orders = [
  { id: 1, userId: 1, ticketId: 1, quantity: 2, totalPrice: 220000, status: "pending" },
  { id: 2, userId: 2, ticketId: 2, quantity: 1, totalPrice: 99000, status: "completed" },
]

export async function GET() {
  return NextResponse.json(orders)
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // 주문 번호 생성
    const orderNumber = await createUniqueOrderNumber(prisma)
    
    // Prisma를 사용하여 데이터베이스에 주문 생성
    const newOrder = await prisma.purchase.create({
      data: {
        orderNumber,
        buyerId: data.userId,
        sellerId: data.sellerId,
        postId: data.postId,
        quantity: data.quantity || 1,
        totalPrice: BigInt(data.totalPrice),
        status: data.status || "PENDING",
        paymentMethod: data.paymentMethod,
        selectedSeats: data.selectedSeats,
        phoneNumber: data.phoneNumber,
        ticketTitle: data.ticketTitle,
        eventDate: data.eventDate,
        eventVenue: data.eventVenue,
        ticketPrice: data.ticketPrice ? BigInt(data.ticketPrice) : null,
        imageUrl: data.imageUrl,
      },
    })
    
    // 임시 데이터베이스 업데이트 (API 예제 호환성 유지)
    const tempOrder = { ...data, id: orders.length + 1 }
    orders.push(tempOrder)
    
    return NextResponse.json({
      success: true,
      message: "주문이 성공적으로 생성되었습니다",
      order: {
        id: newOrder.id,
        orderNumber: newOrder.orderNumber,
        status: newOrder.status,
        // BigInt를 문자열로 변환
        totalPrice: newOrder.totalPrice.toString(),
        ticketPrice: newOrder.ticketPrice ? newOrder.ticketPrice.toString() : null,
      }
    }, { status: 201 })
  } catch (error) {
    console.error("주문 생성 오류:", error)
    return NextResponse.json({ 
      success: false, 
      message: "주문 생성 중 오류가 발생했습니다",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
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

