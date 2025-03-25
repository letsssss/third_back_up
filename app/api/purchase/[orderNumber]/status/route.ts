import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import prisma from "@/lib/prisma"; // 싱글톤 인스턴스 사용
import { convertBigIntToString } from "@/lib/utils";

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

// 상태 업데이트 함수: PATCH 요청 처리
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderNumber: string } }
) {
  try {
    // 인증된 사용자 가져오기
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "인증되지 않은 사용자입니다." },
        { status: 401 }
      );
    }

    // 요청 본문에서 상태 가져오기
    const { status } = await request.json();
    if (!status) {
      return NextResponse.json(
        { success: false, message: "상태 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 주문번호로 구매 정보 조회
    const orderNumber = params.orderNumber;
    const purchase = await prisma.purchase.findUnique({
      where: { orderNumber },
      include: {
        post: true,
        seller: true,
        buyer: true,
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { success: false, message: "구매 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 권한 확인 (구매자 또는 판매자만 수정 가능)
    if (purchase.sellerId !== user.id && purchase.buyerId !== user.id) {
      return NextResponse.json(
        { success: false, message: "이 구매 정보를 수정할 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 상태 변경 권한 검증
    if (status === "PROCESSING" && user.id !== purchase.sellerId) {
      return NextResponse.json(
        { success: false, message: "취켓팅 진행 상태로 변경할 권한이 없습니다." },
        { status: 403 }
      );
    }

    if (status === "COMPLETED" && user.id !== purchase.sellerId) {
      return NextResponse.json(
        { success: false, message: "취켓팅 완료 상태로 변경할 권한이 없습니다." },
        { status: 403 }
      );
    }

    if (status === "CONFIRMED" && user.id !== purchase.buyerId) {
      return NextResponse.json(
        { success: false, message: "구매 확정 상태로 변경할 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 상태 변경
    const updatedPurchase = await prisma.purchase.update({
      where: { id: purchase.id },
      data: { status },
    });

    // 알림 생성 (상태에 따라 다른 알림)
    let notificationTitle = "";
    let notificationContent = "";
    let recipientId;

    switch (status) {
      case "PROCESSING":
        notificationTitle = "취켓팅이 시작되었습니다";
        notificationContent = `${purchase.post?.title || '티켓'} 예매가 시작되었습니다.`;
        recipientId = purchase.buyerId;
        break;
      case "COMPLETED":
        notificationTitle = "취켓팅이 완료되었습니다";
        notificationContent = `${purchase.post?.title || '티켓'} 예매가 완료되었습니다. 구매를 확정해주세요.`;
        recipientId = purchase.buyerId;
        break;
      case "CONFIRMED":
        notificationTitle = "구매가 확정되었습니다";
        notificationContent = `${purchase.post?.title || '티켓'} 구매가 확정되었습니다. 감사합니다.`;
        recipientId = purchase.sellerId;
        break;
    }

    // 알림 저장
    if (notificationTitle && recipientId) {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          title: notificationTitle,
          content: notificationContent,
          type: "PURCHASE_STATUS",
          relatedId: purchase.id.toString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "상태가 성공적으로 업데이트되었습니다.",
      purchase: updatedPurchase,
    });
  } catch (error) {
    console.error("상태 업데이트 오류:", error);
    return NextResponse.json(
      { success: false, message: "상태 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 