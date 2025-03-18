import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { z } from "zod";

const prisma = new PrismaClient();

// 입력 데이터 유효성 검사를 위한 zod 스키마
const postSchema = z.object({
  title: z.string().min(2, "제목은 2글자 이상이어야 합니다."),
  content: z.string().min(10, "내용은 10글자 이상이어야 합니다."),
  category: z.string().optional(),
  eventName: z.string().optional(),
  eventDate: z.string().optional(),
  eventVenue: z.string().optional(),
  ticketPrice: z.number()
    .refine(val => val >= 0 && val <= 2000000000, {
      message: "티켓 가격은 0원 이상 20억원 이하여야 합니다."
    })
    .optional(),
  contactInfo: z.string().optional(),
});

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

// 글 작성 API
export async function POST(request: NextRequest) {
  try {
    console.log("글 작성 API 호출됨");
    
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

    // 요청 본문 파싱
    const body = await request.json();
    
    // 입력 데이터 유효성 검사
    const validationResult = postSchema.safeParse(body);
    
    if (!validationResult.success) {
      return addCorsHeaders(NextResponse.json(
        { 
          success: false, 
          message: "유효하지 않은 입력 데이터입니다.", 
          errors: validationResult.error.errors 
        },
        { status: 400 }
      ));
    }

    // 가격 상한선 제한 (틱켓 가격이 존재하는 경우)
    const ticketPrice = body.ticketPrice !== undefined && body.ticketPrice !== null
      ? Math.min(body.ticketPrice, 2000000000)
      : body.ticketPrice;

    // 글 저장
    const post = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        category: body.category || "GENERAL",
        authorId: authUser.id,
        eventName: body.eventName,
        eventDate: body.eventDate,
        eventVenue: body.eventVenue,
        ticketPrice: ticketPrice,
        contactInfo: body.contactInfo,
      }
    });

    console.log("글 작성 성공:", post.id);

    // BigInt 값을 문자열로 변환하여 JSON 직렬화 오류 방지
    const safePost = {
      id: Number(post.id),
      title: post.title,
      content: post.content,
      category: post.category,
      authorId: Number(post.authorId),
      eventName: post.eventName,
      eventDate: post.eventDate,
      eventVenue: post.eventVenue,
      ticketPrice: post.ticketPrice !== null ? String(post.ticketPrice) : null,
      contactInfo: post.contactInfo,
      isDeleted: post.isDeleted,
      viewCount: Number(post.viewCount),
      status: post.status,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    };

    console.log("안전하게 직렬화된 게시글 데이터:", 
      JSON.stringify({ id: safePost.id, title: safePost.title, ticketPrice: safePost.ticketPrice }));

    return addCorsHeaders(NextResponse.json(
      { 
        success: true, 
        message: "글이 성공적으로 작성되었습니다.", 
        post: safePost
      },
      { status: 201 }
    ));
  } catch (error) {
    console.error("글 작성 오류:", error);
    return addCorsHeaders(NextResponse.json(
      { success: false, message: "글 작성 중 오류가 발생했습니다." },
      { status: 500 }
    ));
  } finally {
    await prisma.$disconnect();
  }
}

// GET 요청 핸들러 - 글 목록 가져오기
export async function GET(request: NextRequest) {
  try {
    console.log("글 목록 API 호출됨");
    
    // 쿼리 파라미터 처리
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category') || undefined;
    const userId = searchParams.get('userId');
    
    console.log("API 요청 파라미터:", { page, limit, category, userId });
    
    // 페이지네이션 계산
    const skip = (page - 1) * limit;
    
    // where 조건 설정 - 삭제된 글 제외 및 카테고리 필터
    const where: any = { 
      isDeleted: false 
    };
    
    // 카테고리 필터링 추가
    if (category) {
      where.category = category;
    }
    
    // 특정 사용자의 게시글만 필터링
    if (userId) {
      where.authorId = parseInt(userId);
    }
    
    console.log("적용된 where 조건:", where);
    
    // DB 작업을 위한 try-catch 블록
    try {
      // 총 게시글 수 조회
      const totalCount = await prisma.post.count({ where });
      console.log("조회된 총 게시글 수:", totalCount);
      
      // 간단한 접근법: 모든 필드를 함께 조회
      const posts = await prisma.post.findMany({
        where,
        include: {
          author: {
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
      
      // 안전하게 가격 변환
      const processedPosts = posts.map(post => {
        let price = 0;
        
        // 실제 가격이 있는 경우
        if (post.ticketPrice !== null && post.ticketPrice !== undefined) {
          // BigInt인 경우 Number로 변환
          try {
            if (typeof post.ticketPrice === 'bigint') {
              // 20억 이하로 제한 (BigInt 리터럴 대신 BigInt 함수 사용)
              const MAX_PRICE = BigInt(2000000000);
              price = Number(
                post.ticketPrice > MAX_PRICE ? MAX_PRICE : post.ticketPrice
              );
            } else {
              // 이미 숫자인 경우
              price = typeof post.ticketPrice === 'number' 
                ? Math.min(post.ticketPrice, 2000000000)
                : 0;
            }
          } catch (e) {
            console.error("가격 변환 오류:", e);
            // 변환 실패 시 기본값 사용
            price = 0;
          }
        }
        
        // 가격 필드 포함하여 정보 반환
        return {
          ...post,
          ticketPrice: String(price)
        };
      });
      
      console.log(`${processedPosts.length}개의 게시글을 찾았습니다. 예시 가격:`, 
        processedPosts.length > 0 ? processedPosts[0].ticketPrice : "게시글 없음");
      
      // 성공 응답 반환
      return addCorsHeaders(NextResponse.json({
        success: true,
        posts: processedPosts,
        pagination: {
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
          hasMore: skip + processedPosts.length < totalCount
        }
      }, { status: 200 }));
    } catch (dbError) {
      console.error("데이터베이스 조회 오류:", dbError instanceof Error ? dbError.message : String(dbError));
      
      // 더 자세한 오류 메시지 제공
      const errorMessage = dbError instanceof Error 
        ? `데이터베이스 조회 중 오류가 발생했습니다: ${dbError.message}`
        : "데이터베이스 조회 중 오류가 발생했습니다.";
      
      // 클라이언트에 JSON 형태로 오류 응답 제공
      return addCorsHeaders(NextResponse.json({
        success: false,
        message: errorMessage,
        error: String(dbError)
      }, { status: 500 }));
    }
  } catch (error) {
    console.error("글 목록 조회 오류:", error instanceof Error ? error.message : String(error));
    
    // 오류 응답
    const errorResponse = { 
      success: false, 
      message: error instanceof Error ? error.message : "글 목록을 가져오는 중 오류가 발생했습니다." 
    };
    
    return addCorsHeaders(
      NextResponse.json(errorResponse, { status: 500 })
    );
  } finally {
    // 데이터베이스 연결 해제
    await prisma.$disconnect();
  }
} 