import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

// 구매 확정 요청 알림 전송
export async function POST(
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

    // 주문번호로 구매 정보 조회
    const orderNumber = params.orderNumber;
    const purchase = await prisma.purchase.findUnique({
      where: { orderNumber },
      include: {
        post: true,
        seller: true,
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { success: false, message: "구매 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 권한 확인 (구매자만 요청 가능)
    if (purchase.buyerId !== user.id) {
      return NextResponse.json(
        { success: false, message: "확인 요청을 보낼 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 상태 확인 (취켓팅 진행 중인 경우에만 요청 가능)
    if (purchase.status !== "PROCESSING") {
      return NextResponse.json(
        { success: false, message: "취켓팅 진행 중인 상태에서만 확인 요청을 보낼 수 있습니다." },
        { status: 400 }
      );
    }

    // 마지막 요청 시간 확인 (스팸 방지)
    const lastRequest = await prisma.notification.findFirst({
      where: {
        userId: purchase.sellerId,
        type: "CONFIRMATION_REQUEST",
        relatedId: purchase.id.toString(),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 5분 내에 이미 요청한 경우 제한
    if (lastRequest && new Date().getTime() - lastRequest.createdAt.getTime() < 5 * 60 * 1000) {
      return NextResponse.json(
        { success: false, message: "너무 자주 요청하고 있습니다. 5분 후에 다시 시도해주세요." },
        { status: 429 }
      );
    }

    // 알림 생성
    await prisma.notification.create({
      data: {
        userId: purchase.sellerId,
        title: "진행 상황 확인 요청",
        content: `구매자가 ${purchase.post?.title || '티켓'} 예매의 진행 상황을 확인하고 싶어합니다.`,
        type: "CONFIRMATION_REQUEST",
        relatedId: purchase.id.toString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "확인 요청이 판매자에게 성공적으로 전송되었습니다.",
    });
  } catch (error) {
    console.error("확인 요청 오류:", error);
    return NextResponse.json(
      { success: false, message: "확인 요청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 