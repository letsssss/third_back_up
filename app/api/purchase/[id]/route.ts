import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";

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

// GET 요청 핸들러 - 특정 구매 정보 가져오기
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // params가 Promise가 될 수 있으므로 먼저 ID를 추출
    const id = params?.id;
    console.log(`구매 정보 조회 API 호출됨 - ID: ${id}`);
    
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
      // 구매 정보 조회
      const purchase = await prisma.purchase.findUnique({
        where: { id: purchaseId },
        include: {
          post: {
            select: {
              id: true,
              title: true,
              eventName: true,
              eventDate: true,
              ticketPrice: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
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
      
      if (!purchase) {
        return addCorsHeaders(NextResponse.json(
          { success: false, message: "해당 구매 정보를 찾을 수 없습니다." },
          { status: 404 }
        ));
      }
      
      // 구매자나 판매자만 접근 가능하도록 확인
      if (purchase.buyerId !== authUser.id && purchase.sellerId !== authUser.id) {
        return addCorsHeaders(NextResponse.json(
          { success: false, message: "이 구매 정보에 접근할 권한이 없습니다." },
          { status: 403 }
        ));
      }
      
      // BigInt 값을 문자열로 변환
      const serializedPurchase = convertBigIntToString(purchase);
      
      // 성공 응답 반환
      return addCorsHeaders(NextResponse.json({
        success: true,
        purchase: serializedPurchase
      }, { status: 200 }));
    } catch (dbError) {
      console.error("데이터베이스 조회 오류:", dbError instanceof Error ? dbError.message : String(dbError));
      console.error("상세 오류:", dbError);
      
      return addCorsHeaders(
        NextResponse.json({ 
          success: false, 
          message: "데이터베이스 조회 중 오류가 발생했습니다.",
          error: process.env.NODE_ENV === 'development' ? String(dbError) : undefined
        }, { status: 500 })
      );
    }
  } catch (error) {
    console.error("구매 정보 조회 오류:", error instanceof Error ? error.message : String(error));
    console.error("상세 오류 스택:", error);
    
    return addCorsHeaders(
      NextResponse.json({ 
        success: false, 
        message: "구매 정보 조회 중 오류가 발생했습니다." 
      }, { status: 500 })
    );
  } finally {
    await prisma.$disconnect();
  }
} 