import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import prisma from "@/lib/prisma"; // 싱글톤 인스턴스 사용

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

// GET 요청 처리 함수
export async function GET(
  request: NextRequest,
  { params }: { params: { orderNumber: string } }
) {
  try {
    // 인증된 사용자 가져오기
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "인증되지 않은 사용자입니다." },
        { status: 401 }
      );
    }

    // 주문번호로 구매 정보 조회
    const orderNumber = params.orderNumber;
    console.log(`주문번호로 정보 조회: ${orderNumber}`);
    
    const purchase = await prisma.purchase.findUnique({
      where: { orderNumber },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            category: true,
            eventName: true,
            eventDate: true,
            eventVenue: true,
            ticketPrice: true,
            content: true,
            status: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { success: false, message: "구매 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 권한 확인 (구매자 또는 판매자만 조회 가능)
    if (purchase.sellerId !== user.id && purchase.buyerId !== user.id) {
      return NextResponse.json(
        { success: false, message: "이 구매 정보를 조회할 권한이 없습니다." },
        { status: 403 }
      );
    }

    // BigInt를 문자열로 변환
    const serializedPurchase = JSON.parse(
      JSON.stringify(purchase, (key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return NextResponse.json({
      success: true,
      purchase: serializedPurchase,
    });
  } catch (error) {
    console.error("구매 정보 조회 오류:", error);
    return NextResponse.json(
      { success: false, message: "구매 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orderNumber: string } }
) {
  try {
    // 인증된 사용자 가져오기
    const user = await getAuthenticatedUser(request);
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
    });

    if (!purchase) {
      return NextResponse.json(
        { success: false, message: "구매 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 권한 확인 (관리자 또는 특수 상황에서만 삭제 가능)
    if (!(user as any).role?.includes("ADMIN") && purchase.status !== "PENDING") {
      return NextResponse.json(
        { success: false, message: "이 구매 정보를 삭제할 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 삭제
    await prisma.purchase.delete({
      where: { id: purchase.id },
    });

    return NextResponse.json({
      success: true,
      message: "구매 정보가 성공적으로 삭제되었습니다.",
    });
  } catch (error) {
    console.error("구매 정보 삭제 오류:", error);
    return NextResponse.json(
      { success: false, message: "구매 정보 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 