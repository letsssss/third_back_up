import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import prisma from "@/lib/prisma"; // 싱글톤 인스턴스 사용

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

// 구매 확정 요청 API: POST 요청 처리
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 파라미터 검증
    if (!params || !params.id) {
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "유효하지 않은 요청: ID가 제공되지 않았습니다." },
        { status: 400 }
      ));
    }
    
    // 파라미터에서 ID 추출
    const id = params.id;
    console.log(`구매 확정 요청 API 호출됨 - ID: ${id}`);
    
    // 현재 인증된 사용자 정보 가져오기
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      console.log("인증된 사용자를 찾을 수 없음");
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "인증되지 않은 사용자입니다." },
        { status: 401 }
      ));
    }
    
    console.log("인증된 사용자 ID:", authUser.id);
    
    // ID가 숫자인지 확인
    const purchaseId = parseInt(id);
    if (isNaN(purchaseId)) {
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "유효하지 않은 구매 ID입니다." },
        { status: 400 }
      ));
    }
    
    try {
      // 기존 구매 정보 조회
      const existingPurchase = await prisma.purchase.findUnique({
        where: { id: purchaseId },
        include: {
          post: {
            select: {
              id: true,
              title: true,
              eventName: true,
            }
          },
          buyer: {
            select: {
              id: true,
              name: true,
            }
          },
          seller: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      });
      
      if (!existingPurchase) {
        return addCorsHeaders(NextResponse.json(
          { success: false, message: "해당 구매 정보를 찾을 수 없습니다." },
          { status: 404 }
        ));
      }
      
      // 권한 확인: 판매자만 요청 가능
      if (existingPurchase.sellerId !== authUser.id) {
        return addCorsHeaders(NextResponse.json(
          { success: false, message: "구매 확정 요청은 판매자만 할 수 있습니다." },
          { status: 403 }
        ));
      }
      
      // 상태 확인: 취켓팅 완료 상태일 때만 요청 가능
      if (existingPurchase.status !== 'COMPLETED') {
        return addCorsHeaders(NextResponse.json(
          { success: false, message: "취켓팅 완료 상태에서만 구매 확정을 요청할 수 있습니다." },
          { status: 400 }
        ));
      }
      
      // 구매자에게 알림 생성
      const postTitle = existingPurchase.post?.title || existingPurchase.post?.eventName || "티켓";
      const sellerName = existingPurchase.seller?.name || "판매자";
      
      const notificationMessage = `${sellerName}님이 "${postTitle}" 구매에 대한 구매 확정을 요청했습니다.`;
      
      await prisma.notification.create({
        data: {
          userId: existingPurchase.buyerId,
          postId: existingPurchase.postId,
          message: notificationMessage,
          type: 'CONFIRMATION_REQUEST',
          isRead: false,
        }
      });
      
      console.log(`구매자 ID ${existingPurchase.buyerId}에게 구매 확정 요청 알림 전송 완료`);
      
      // 성공 응답 반환
      return addCorsHeaders(NextResponse.json({
        success: true,
        message: "구매자에게 구매 확정 요청 알림이 성공적으로 전송되었습니다.",
      }, { status: 200 }));
      
    } catch (dbError) {
      console.error("데이터베이스 조회/알림 생성 오류:", dbError instanceof Error ? dbError.message : String(dbError));
      console.error("상세 오류:", dbError);
      
      return addCorsHeaders(
        NextResponse.json({ 
          success: false, 
          message: "데이터베이스 처리 중 오류가 발생했습니다.",
          error: process.env.NODE_ENV === 'development' ? String(dbError) : undefined
        }, { status: 500 })
      );
    }
  } catch (error) {
    console.error("구매 확정 요청 오류:", error instanceof Error ? error.message : String(error));
    console.error("상세 오류 스택:", error);
    
    return addCorsHeaders(
      NextResponse.json({ 
        success: false, 
        message: "구매 확정 요청 처리 중 오류가 발생했습니다.",
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined
      }, { status: 500 })
    );
  }
} 