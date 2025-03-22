import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { z } from "zod";

const prisma = new PrismaClient();

// BigInt를 문자열로 변환하는 함수
function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertBigIntToString(item));
  }
  
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = convertBigIntToString(obj[key]);
    }
    return newObj;
  }
  
  return obj;
}

// CORS 헤더 설정을 위한 함수
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 캐시 방지 헤더
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}

// OPTIONS 메서드 처리
export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

// 구매 요청 스키마
const purchaseSchema = z.object({
  postId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
  selectedSeats: z.string().optional(),
  phoneNumber: z.string().optional(),
  paymentMethod: z.string().optional(),
});

// POST 요청 핸들러 - 티켓 구매 신청
export async function POST(request: NextRequest) {
  try {
    console.log("티켓 구매 API 호출됨");
    
    // 현재 인증된 사용자 정보 가져오기
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      console.log("인증된 사용자를 찾을 수 없음");
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "인증되지 않은 사용자입니다." },
        { status: 401 }
      ));
    }

    console.log("인증된 사용자 정보:", authUser);

    // 요청 본문 파싱
    const body = await request.json();
    
    // 입력 데이터 유효성 검사
    const validationResult = purchaseSchema.safeParse(body);
    
    if (!validationResult.success) {
      return addCorsHeaders(NextResponse.json(
        { 
          success: false, 
          message: "유효하지 않은 입력 데이터입니다.", 
          errors: validationResult.error.errors 
        },
        { status: 400 }
      ));
    }

    const { postId, quantity, selectedSeats, phoneNumber, paymentMethod } = validationResult.data;

    // 게시글 조회
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true }
    });

    if (!post) {
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "해당하는 게시글을 찾을 수 없습니다." },
        { status: 404 }
      ));
    }

    // 자신의 게시글인지 확인 - 문자열로 변환하여 비교
    console.log("API - 게시글 작성자 ID:", post.authorId.toString(), typeof post.authorId);
    console.log("API - 사용자 ID:", authUser.id.toString(), typeof authUser.id);
    
    if (post.authorId.toString() === authUser.id.toString()) {
      console.log("API - 작성자와 사용자가 일치함");
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "자신의 게시글은 구매할 수 없습니다." },
        { status: 400 }
      ));
    }
    console.log("API - 작성자와 사용자가 다름");

    if (post.status !== "ACTIVE") {
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "판매가 종료되었거나 취소된 게시글입니다." },
        { status: 400 }
      ));
    }

    // 총 가격 계산
    const totalPrice = post.ticketPrice ? post.ticketPrice * BigInt(quantity) : BigInt(0);

    // 구매 정보 생성
    const purchase = await prisma.purchase.create({
      data: {
        buyerId: authUser.id,
        sellerId: post.authorId,
        postId: post.id,
        quantity,
        totalPrice,
        status: "PENDING",
        selectedSeats,
        phoneNumber,
        paymentMethod,
      },
      include: {
        post: {
          select: {
            title: true,
            eventName: true,
          }
        }
      }
    });

    // 판매자에게 알림 생성
    console.log('판매자 알림 생성 시도:', {
      userId: post.authorId,
      postId: post.id,
      message: `${authUser.name || '구매자'}님이 "${post.title || post.eventName || '게시글'}"에 대한 취켓팅을 신청했습니다. (${quantity}매, ${totalPrice.toString()}원)`,
      type: "TICKET_REQUEST"
    });
    
    const sellerNotification = await prisma.notification.create({
      data: {
        userId: post.authorId,
        postId: post.id,
        message: `${authUser.name || '구매자'}님이 "${post.title || post.eventName || '게시글'}"에 대한 취켓팅을 신청했습니다. (${quantity}매, ${totalPrice.toString()}원)`,
        type: "TICKET_REQUEST",
      }
    });
    console.log('판매자 알림 생성 완료:', sellerNotification);

    // 구매자에게도 알림 생성
    console.log('구매자 알림 생성 시도:', {
      userId: authUser.id,
      postId: post.id,
      message: `"${post.title || post.eventName || '게시글'}" 티켓 구매 신청이 완료되었습니다. 판매자의 확인을 기다려주세요.`,
      type: "PURCHASE_COMPLETE"
    });
    
    const buyerNotification = await prisma.notification.create({
      data: {
        userId: authUser.id,
        postId: post.id,
        message: `"${post.title || post.eventName || '게시글'}" 티켓 구매 신청이 완료되었습니다. 판매자의 확인을 기다려주세요.`,
        type: "PURCHASE_COMPLETE",
      }
    });
    console.log('구매자 알림 생성 완료:', buyerNotification);

    console.log("구매 신청 및 알림 생성 완료 - 구매 ID:", purchase.id);

    // BigInt 값을 문자열로 변환
    const serializedPurchase = convertBigIntToString(purchase);

    return addCorsHeaders(NextResponse.json(
      { 
        success: true, 
        message: "티켓 구매 신청이 완료되었습니다. 판매자의 확인을 기다려주세요.", 
        purchase: serializedPurchase
      },
      { status: 201 }
    ));
  } catch (error) {
    console.error("티켓 구매 오류:", error);
    return addCorsHeaders(NextResponse.json(
      { success: false, message: "티켓 구매 중 오류가 발생했습니다." },
      { status: 500 }
    ));
  } finally {
    await prisma.$disconnect();
  }
} 