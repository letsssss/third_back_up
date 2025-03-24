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
    let body;
    try {
      body = await request.json();
      console.log("요청 본문:", body);
    } catch (error) {
      console.error("요청 본문 파싱 오류:", error);
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "잘못된 요청 형식입니다." },
        { status: 400 }
      ));
    }
    
    // 입력 데이터 유효성 검사
    const validationResult = purchaseSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error("입력 데이터 유효성 검사 실패:", validationResult.error.errors);
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
    console.log("유효성 검사 통과 후 데이터:", { postId, quantity, selectedSeats, phoneNumber, paymentMethod });

    // 게시글 조회
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true }
    });

    if (!post) {
      console.log(`게시글 ID ${postId}를 찾을 수 없음`);
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "해당하는 게시글을 찾을 수 없습니다." },
        { status: 404 }
      ));
    }

    // 자신의 게시글인지 확인
    console.log("API - 게시글 작성자 ID:", post.authorId.toString(), typeof post.authorId);
    console.log("API - 사용자 ID:", authUser.id.toString(), typeof authUser.id);
    
    // 숫자로 변환하여 비교
    const postAuthorId = Number(post.authorId);
    const currentUserId = Number(authUser.id);
    
    console.log("API - 숫자 변환 후 비교:", { postAuthorId, currentUserId });
    
    if (postAuthorId === currentUserId) {
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

    // 구매 정보 생성 - 바로 PROCESSING 상태로 시작
    const purchase = await prisma.purchase.create({
      data: {
        buyerId: authUser.id,
        sellerId: post.authorId,
        postId: post.id,
        quantity,
        totalPrice,
        status: "PROCESSING", // PENDING 대신 바로 PROCESSING으로 시작
        selectedSeats,
        phoneNumber,
        paymentMethod,
        // Post 정보도 함께 저장
        ticketTitle: post.title,
        eventDate: post.eventDate,
        eventVenue: post.eventVenue,
        ticketPrice: post.ticketPrice,
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

    // 게시물 상태 업데이트
    await prisma.post.update({
      where: { id: postId },
      data: { status: "PROCESSING" }
    });
    
    console.log(`게시글 ID ${postId}의 상태가 'PROCESSING'으로 업데이트되었습니다.`);

    // 판매자에게 알림 생성
    console.log('판매자 알림 생성 시도:', {
      userId: post.authorId,
      postId: post.id,
      message: `${authUser.name || '구매자'}님이 "${post.title || post.eventName || '게시글'}"의 결제를 완료하여 취켓팅이 시작되었습니다. (${quantity}매, ${totalPrice.toString()}원)`,
      type: "TICKET_REQUEST"
    });

    // 알림 생성
    await prisma.notification.create({
      data: {
        userId: post.authorId,
        postId: post.id,
        message: `${authUser.name || '구매자'}님이 "${post.title || post.eventName || '게시글'}"의 결제를 완료하여 취켓팅이 시작되었습니다. (${quantity}매, ${totalPrice.toString()}원)`,
        type: "TICKET_REQUEST"
      }
    });

    // 구매 정보 응답
    return addCorsHeaders(NextResponse.json({
      success: true,
      message: "구매 신청이 성공적으로 처리되었습니다.",
      purchase: {
        ...convertBigIntToString(purchase),
        post: post
      }
    }, { status: 201 }));
    
  } catch (error) {
    console.error("구매 처리 오류:", error);
    let errorMessage = "구매 처리 중 오류가 발생했습니다.";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("오류 스택:", error.stack);
    }
    
    return addCorsHeaders(NextResponse.json(
      { 
        success: false, 
        message: errorMessage,
        // 개발 환경에서만 상세 오류 정보 포함
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined 
      },
      { status: 500 }
    ));
  } finally {
    await prisma.$disconnect();
  }
} 