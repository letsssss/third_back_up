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

// 상태 업데이트 함수: PATCH 요청 처리
export async function PATCH(
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
    console.log(`거래 상태 업데이트 API 호출됨 - ID: ${id}`);
    
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
    
    // 요청 바디에서 새 상태 가져오기
    const body = await request.json();
    const { status } = body;
    
    console.log(`요청된 상태 업데이트: ${status}`);
    
    if (!status || !['PENDING', 'PROCESSING', 'COMPLETED', 'CONFIRMED'].includes(status)) {
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "유효하지 않은 상태값입니다." },
        { status: 400 }
      ));
    }
    
    try {
      // 기존 구매 정보 조회
      const existingPurchase = await prisma.purchase.findUnique({
        where: { id: purchaseId },
      });
      
      if (!existingPurchase) {
        return addCorsHeaders(NextResponse.json(
          { success: false, message: "해당 구매 정보를 찾을 수 없습니다." },
          { status: 404 }
        ));
      }
      
      // 권한 확인: 상태에 따른 업데이트 권한 확인
      let isAuthorized = false;
      
      if (status === 'PROCESSING' || status === 'COMPLETED') {
        // 취켓팅 시작과 취켓팅 완료는 판매자만 가능
        isAuthorized = existingPurchase.sellerId === authUser.id;
      } else if (status === 'CONFIRMED') {
        // 구매 확정은 구매자 또는 판매자 모두 가능하도록 수정
        isAuthorized = existingPurchase.buyerId === authUser.id || existingPurchase.sellerId === authUser.id;
      } else {
        // 기타 상태는 판매자나 구매자 모두 가능
        isAuthorized = existingPurchase.sellerId === authUser.id || existingPurchase.buyerId === authUser.id;
      }
      
      if (!isAuthorized) {
        return addCorsHeaders(NextResponse.json(
          { success: false, message: "이 거래 상태를 업데이트할 권한이 없습니다." },
          { status: 403 }
        ));
      }
      
      // 상태 변경 로직: 순서 체크
      if (status === 'PROCESSING' && existingPurchase.status !== 'PENDING') {
        return addCorsHeaders(NextResponse.json(
          { success: false, message: "결제 완료 상태에서만 취켓팅을 시작할 수 있습니다." },
          { status: 400 }
        ));
      }
      
      if (status === 'COMPLETED' && existingPurchase.status !== 'PROCESSING') {
        return addCorsHeaders(NextResponse.json(
          { success: false, message: "취켓팅 시작 상태에서만 취켓팅 완료 처리할 수 있습니다." },
          { status: 400 }
        ));
      }
      
      if (status === 'CONFIRMED' && existingPurchase.status !== 'COMPLETED') {
        return addCorsHeaders(NextResponse.json(
          { success: false, message: "취켓팅 완료 상태에서만 구매 확정할 수 있습니다." },
          { status: 400 }
        ));
      }
      
      // 상태 업데이트
      const updatedPurchase = await prisma.purchase.update({
        where: { id: purchaseId },
        data: { 
          status,
          updatedAt: new Date() 
        },
        include: {
          post: {
            select: {
              id: true,
              title: true,
              eventName: true,
              eventDate: true,
              ticketPrice: true,
            }
          },
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          seller: {
            select: {
              id: true,
              name: true, 
              email: true,
            }
          }
        }
      });
      
      // 알림 생성
      let notificationMessage = "";
      let recipientId = 0;
      
      switch (status) {
        case 'PROCESSING':
          notificationMessage = `${updatedPurchase.post?.title} 티켓의 취켓팅이 시작되었습니다.`;
          recipientId = updatedPurchase.buyerId;
          break;
        case 'COMPLETED':
          notificationMessage = `${updatedPurchase.post?.title} 티켓의 취켓팅이 완료되었습니다. 구매 확정을 진행해주세요.`;
          recipientId = updatedPurchase.buyerId;
          break;
        case 'CONFIRMED':
          notificationMessage = `${updatedPurchase.post?.title} 티켓 구매가 확정되었습니다.`;
          recipientId = updatedPurchase.sellerId;
          break;
      }
      
      if (notificationMessage && recipientId) {
        await prisma.notification.create({
          data: {
            userId: recipientId,
            postId: updatedPurchase.postId,
            message: notificationMessage,
            type: 'PURCHASE_STATUS',
            isRead: false,
          }
        });
      }
      
      // BigInt 값을 문자열로 변환
      const serializedPurchase = convertBigIntToString(updatedPurchase);
      
      // 성공 응답 반환
      return addCorsHeaders(NextResponse.json({
        success: true,
        message: "거래 상태가 성공적으로 업데이트되었습니다.",
        purchase: serializedPurchase
      }, { status: 200 }));
      
    } catch (dbError) {
      console.error("데이터베이스 업데이트 오류:", dbError instanceof Error ? dbError.message : String(dbError));
      console.error("상세 오류:", dbError);
      
      return addCorsHeaders(
        NextResponse.json({ 
          success: false, 
          message: "데이터베이스 업데이트 중 오류가 발생했습니다.",
          error: process.env.NODE_ENV === 'development' ? String(dbError) : undefined
        }, { status: 500 })
      );
    }
  } catch (error) {
    console.error("구매 상태 업데이트 오류:", error instanceof Error ? error.message : String(error));
    console.error("상세 오류 스택:", error);
    
    return addCorsHeaders(
      NextResponse.json({ 
        success: false, 
        message: "구매 상태 업데이트 중 오류가 발생했습니다." 
      }, { status: 500 })
    );
  }
} 