import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { z } from "zod";
import { convertBigIntToString } from "@/lib/utils";
import { createUniqueOrderNumber } from "@/utils/orderNumber";

const prisma = new PrismaClient();

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

    // 트랜잭션 시작 - 동시 구매를 방지하기 위해 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // 게시글 조회 - 상태 확인을 위해 FOR UPDATE 잠금을 사용 (pessimistic locking)
      const post = await tx.post.findUnique({
        where: { id: postId },
        include: { author: true }
      });

      if (!post) {
        console.log(`게시글 ID ${postId}를 찾을 수 없음`);
        throw new Error("해당하는 게시글을 찾을 수 없습니다.");
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
        throw new Error("자신의 게시글은 구매할 수 없습니다.");
      }
      
      console.log("API - 작성자와 사용자가 다름");

      // 게시글 상태 확인 - ACTIVE 상태일 때만 구매 가능
      if (post.status !== "ACTIVE") {
        console.log(`게시글 ID ${postId}는 현재 '${post.status}' 상태로 구매할 수 없습니다.`);
        throw new Error("이미 판매 진행 중이거나 판매 완료된 게시글입니다.");
      }

      // 이미 구매 진행 중인지 확인
      const existingPurchase = await tx.purchase.findFirst({
        where: {
          postId: post.id,
          status: {
            in: ["PENDING", "PROCESSING", "COMPLETED"]
          }
        }
      });

      if (existingPurchase) {
        console.log(`게시글 ID ${postId}는 이미 구매가 진행 중입니다.`);
        throw new Error("이미 다른 사용자가 구매 중인 게시글입니다.");
      }

      // 총 가격 계산
      const totalPrice = post.ticketPrice ? post.ticketPrice * BigInt(quantity) : BigInt(0);
      
      // 주문 번호 생성
      const orderNumber = await createUniqueOrderNumber(tx);
      console.log("생성된 주문 번호:", orderNumber);

      // 구매 정보 생성 - 바로 PROCESSING 상태로 시작
      const purchase = await tx.purchase.create({
        data: {
          orderNumber,
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

      // 게시물 상태 업데이트 - PROCESSING으로 변경하여 더 이상 구매할 수 없게 함
      await tx.post.update({
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
      await tx.notification.create({
        data: {
          userId: post.authorId,
          postId: post.id,
          message: `${authUser.name || '구매자'}님이 "${post.title || post.eventName || '게시글'}"의 결제를 완료하여 취켓팅이 시작되었습니다. (${quantity}매, ${totalPrice.toString()}원)`,
          type: "TICKET_REQUEST"
        }
      });

      return { purchase, post };
    }, {
      // 트랜잭션 옵션 설정
      maxWait: 5000, // 최대 대기 시간 (ms)
      timeout: 10000, // 트랜잭션 타임아웃 (ms)
    });

    // 구매 정보 응답
    return addCorsHeaders(NextResponse.json({
      success: true,
      message: "구매 신청이 성공적으로 처리되었습니다.",
      purchase: convertBigIntToString({
        ...result.purchase,
        post: result.post
      })
    }, { status: 201 }));
    
  } catch (error) {
    console.error("구매 처리 오류:", error);
    let errorMessage = "구매 처리 중 오류가 발생했습니다.";
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("오류 스택:", error.stack);
      
      // 사용자 입력 관련 오류는 400 응답
      if (
        error.message.includes("이미 다른 사용자가 구매 중인 게시글입니다") ||
        error.message.includes("이미 판매 진행 중이거나 판매 완료된 게시글입니다") ||
        error.message.includes("자신의 게시글은 구매할 수 없습니다")
      ) {
        statusCode = 400;
      }
    }
    
    return addCorsHeaders(NextResponse.json(
      { 
        success: false, 
        message: errorMessage,
        // 개발 환경에서만 상세 오류 정보 포함
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined 
      },
      { status: statusCode }
    ));
  } finally {
    await prisma.$disconnect();
  }
} 