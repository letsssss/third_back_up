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
  { params }: { params: { id: string } }
) {
  try {
    console.log("거래 상세 정보 조회 API 호출됨");
    
    // URL 파라미터에서 ID 추출 및 검증
    if (!params || !params.id) {
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "유효하지 않은 요청: ID가 제공되지 않았습니다." },
        { status: 400 }
      ));
    }
    
    const id = params.id;
    console.log(`요청된 거래 ID: ${id}`);
    
    // 인증된 사용자 확인
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
      console.log("유효하지 않은 구매 ID 형식:", id);
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
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profileImage: true,
                }
              }
            }
          },
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true,
            }
          },
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true,
            }
          }
        }
      });
      
      if (!purchase) {
        console.log(`구매 정보를 찾을 수 없음: ID ${purchaseId}`);
        return addCorsHeaders(NextResponse.json(
          { success: false, message: "해당 구매 정보를 찾을 수 없습니다." },
          { status: 404 }
        ));
      }
      
      // 접근 권한 확인: 구매자나 판매자만 볼 수 있음
      if (purchase.buyerId !== authUser.id && purchase.sellerId !== authUser.id) {
        console.log(`접근 권한 없음: 사용자 ${authUser.id}는 구매 ID ${purchaseId}에 접근할 수 없음`);
        return addCorsHeaders(NextResponse.json(
          { success: false, message: "이 거래 정보를 볼 권한이 없습니다." },
          { status: 403 }
        ));
      }
      
      // 응답 데이터를 가공하여 post 필드가 없더라도 필요한 정보가 포함되도록 함
      const enhancedResponse = (purchase: any) => {
        const serializedPurchase = convertBigIntToString(purchase);
        
        // post 필드가 없는 경우 Purchase 모델의 필드로 보완
        if (!serializedPurchase.post) {
          // ticketTitle 등의 필드가 Purchase에 저장되어 있으면 이를 사용하여 post 객체 생성
          if (serializedPurchase.ticketTitle || serializedPurchase.eventDate || serializedPurchase.eventVenue || serializedPurchase.ticketPrice) {
            serializedPurchase.post = {
              title: serializedPurchase.ticketTitle || '제목 없음',
              eventDate: serializedPurchase.eventDate || null,
              eventVenue: serializedPurchase.eventVenue || null,
              ticketPrice: serializedPurchase.ticketPrice || null,
              author: serializedPurchase.seller || null
            };
            
            console.log('Purchase 필드로부터 post 정보 생성:', serializedPurchase.post);
          }
        }
        
        return serializedPurchase;
      };

      // BigInt 값을 문자열로 변환
      const serializedPurchase = enhancedResponse(purchase);
      
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
  }
} 