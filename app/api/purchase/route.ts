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

// GET 요청 핸들러 - 구매 목록 가져오기
export async function GET(request: NextRequest) {
  try {
    console.log("구매 목록 API 호출됨");
    
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
    
    // 쿼리 파라미터 처리
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    console.log("API 요청 파라미터:", { page, limit, userId: authUser.id });
    
    // 페이지네이션 계산
    const skip = (page - 1) * limit;
    
    try {
      // 개발 환경에서 DB 연결 테스트
      if (process.env.NODE_ENV === 'development') {
        try {
          await prisma.$queryRaw`SELECT 1`;
          console.log("데이터베이스 연결 테스트 성공");
        } catch (dbConnectionError) {
          console.error("데이터베이스 연결 오류:", dbConnectionError);
          return addCorsHeaders(
            NextResponse.json({ 
              success: false, 
              message: "데이터베이스 연결에 실패했습니다." 
            }, { status: 500 })
          );
        }
      }
      
      // 구매 목록 조회
      const purchases = await prisma.purchase.findMany({
        where: {
          buyerId: authUser.id,
          status: {
            in: ['PENDING', 'COMPLETED', 'PROCESSING', 'CONFIRMED']
          }
        },
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
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      });
      
      // 총 구매 수 조회
      const totalCount = await prisma.purchase.count({
        where: {
          buyerId: authUser.id,
          status: {
            in: ['PENDING', 'COMPLETED', 'PROCESSING', 'CONFIRMED']
          }
        }
      });
      
      console.log("조회된 총 구매 수:", totalCount);
      
      // 조회 결과가 없어도 빈 배열 반환
      const safePurchasesList = purchases || [];
      console.log(`${safePurchasesList.length}개의 구매를 찾았습니다.`);
      
      // BigInt 값을 문자열로 변환
      const serializedPurchases = convertBigIntToString(safePurchasesList);
      
      // 성공 응답 반환
      return addCorsHeaders(NextResponse.json({
        success: true,
        purchases: serializedPurchases,
        pagination: {
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
          hasMore: skip + safePurchasesList.length < totalCount
        }
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
    console.error("구매 목록 조회 오류:", error instanceof Error ? error.message : String(error));
    console.error("상세 오류 스택:", error);
    
    return addCorsHeaders(
      NextResponse.json({ 
        success: false, 
        message: "구매 목록 조회 중 오류가 발생했습니다." 
      }, { status: 500 })
    );
  } finally {
    await prisma.$disconnect();
  }
} 