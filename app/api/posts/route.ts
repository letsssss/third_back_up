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
    .int("가격은 정수여야 합니다.")
    .nonnegative("가격은 0 이상이어야 합니다.")
    .safe("가격이 너무 큽니다. 더 작은 값을 입력해주세요.")
    .optional(),
  contactInfo: z.string().optional(),
  type: z.string().optional(),
});

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
        ticketPrice: body.ticketPrice && body.ticketPrice > 0 ? BigInt(Math.min(body.ticketPrice, Number.MAX_SAFE_INTEGER)) : null,
        contactInfo: body.contactInfo,
      }
    });

    console.log("글 작성 성공:", post.id);

    // BigInt 값을 문자열로 변환
    const serializedPost = convertBigIntToString(post);

    return addCorsHeaders(NextResponse.json(
      { 
        success: true, 
        message: "글이 성공적으로 작성되었습니다.", 
        post: serializedPost
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
    const searchQuery = searchParams.get('search') || '';
    
    console.log("API 요청 파라미터:", { page, limit, category, userId, searchQuery });
    
    // 페이지네이션 계산
    const skip = (page - 1) * limit;
    
    // where 조건 설정 - 삭제된 글 제외 및 카테고리 필터
    const where: any = { 
      isDeleted: false 
    };
    
    // 상태가 ACTIVE인 게시물만 표시 - 판매 중인 게시물만 보이도록 함
    // 단, 유저 프로필에서는 모든 상태의 게시물 표시 위해 userId가 있을 때는 적용하지 않음
    if (!userId) {
      where.status = 'ACTIVE';
    }
    
    // 카테고리 필터링 추가
    if (category) {
      where.category = category;
      console.log(`카테고리로 필터링: ${category}`);
    }
    
    // 특정 사용자의 게시글만 필터링
    if (userId) {
      where.authorId = parseInt(userId);
    }
    
    // 검색어 필터링 추가
    if (searchQuery && searchQuery.trim() !== '') {
      where.OR = [
        { title: { contains: searchQuery } },
        { eventName: { contains: searchQuery } },
        { content: { contains: searchQuery } },
        { eventVenue: { contains: searchQuery } }
      ];
      console.log(`검색어로 필터링: ${searchQuery}`);
    }
    
    console.log("적용된 where 조건:", where);
    
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
      
      // 총 게시글 수 조회
      const totalCount = await prisma.post.count({ where });
      console.log("조회된 총 게시글 수:", totalCount);
      
      // 글 목록 조회 (작성자 정보 포함)
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
      
      // 조회 결과가 없어도 빈 배열 반환
      const safePostsList = posts || [];
      console.log(`${safePostsList.length}개의 게시글을 찾았습니다.`);
      
      // BigInt 값을 문자열로 변환
      const serializedPosts = convertBigIntToString(safePostsList);
      
      // 성공 응답 반환
      return addCorsHeaders(NextResponse.json({
        success: true,
        posts: serializedPosts,
        pagination: {
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
          hasMore: skip + safePostsList.length < totalCount
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
    console.error("글 목록 조회 오류:", error instanceof Error ? error.message : String(error));
    console.error("상세 오류 스택:", error);
    
    // 오류 응답
    const errorResponse = { 
      success: false, 
      message: error instanceof Error ? error.message : "글 목록을 가져오는 중 오류가 발생했습니다.",
      // 개발 환경에서만 자세한 오류 정보 포함
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    };
    
    return addCorsHeaders(
      NextResponse.json(errorResponse, { status: 500 })
    );
  } finally {
    // 데이터베이스 연결 해제
    await prisma.$disconnect();
  }
} 