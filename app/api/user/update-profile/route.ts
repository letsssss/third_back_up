import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthenticatedUser, getTokenFromHeaders, verifyToken } from "@/lib/auth";
import { z } from "zod";

const prisma = new PrismaClient();

// 입력 데이터 유효성 검사를 위한 zod 스키마
const updateProfileSchema = z.object({
  name: z.string().min(2, "이름은 2글자 이상이어야 합니다.").optional(),
  phoneNumber: z.string().regex(/^[0-9]{10,11}$/, "유효한 전화번호 형식이 아닙니다.").optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolder: z.string().optional(),
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

// 인증 처리 함수 - 직접 인증 확인하는 로직 추가
async function authenticate(request: NextRequest) {
  try {
    // 먼저 getAuthenticatedUser 함수 사용 시도
    const authUser = await getAuthenticatedUser(request);
    if (authUser) {
      console.log("인증된 사용자 찾음 (getAuthenticatedUser):", authUser.id);
      return authUser;
    }
    
    // 직접 헤더에서 토큰 확인
    const headerToken = getTokenFromHeaders(request.headers);
    if (headerToken) {
      console.log("Authorization 헤더에서 토큰 찾음");
      const payload = verifyToken(headerToken);
      if (payload && payload.userId) {
        const user = await prisma.user.findUnique({ 
          where: { id: payload.userId } 
        });
        if (user) {
          console.log("헤더 토큰으로 사용자 찾음:", user.id);
          return user;
        }
      }
    }
    
    // 쿠키 직접 확인 (추가 처리)
    const cookieToken = request.cookies.get('auth-token')?.value;
    if (cookieToken) {
      console.log("쿠키에서 토큰 찾음");
      const payload = verifyToken(cookieToken);
      if (payload && payload.userId) {
        const user = await prisma.user.findUnique({ 
          where: { id: payload.userId } 
        });
        if (user) {
          console.log("쿠키 토큰으로 사용자 찾음:", user.id);
          return user;
        }
      }
    }
    
    console.log("인증 실패: 유효한 토큰 또는 사용자 없음");
    return null;
  } catch (error) {
    console.error("인증 확인 중 오류:", error);
    return null;
  }
}

// 프로필 정보 업데이트 API
export async function PUT(request: NextRequest) {
  try {
    console.log("프로필 업데이트 API 호출됨");
    
    // 쿠키 로깅
    const allCookies = request.cookies.getAll();
    console.log("모든 쿠키:", allCookies);
    
    const authCookie = request.cookies.get('auth-token');
    console.log("인증 쿠키 존재 여부:", !!authCookie);
    
    // 현재 인증된 사용자 정보 가져오기
    const authUser = await authenticate(request);
    
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
    const validationResult = updateProfileSchema.safeParse(body);
    
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

    // 사용자 정보 업데이트 (타입 오류 해결을 위해 any 사용)
    const updatedUser = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.phoneNumber ? { phoneNumber: body.phoneNumber } : {}),
        // 계좌 정보는 별도의 테이블이 없으므로 JSON 형태로 저장
        ...(body.bankName || body.accountNumber || body.accountHolder ? { 
          bankInfo: JSON.stringify({
            bankName: body.bankName || "",
            accountNumber: body.accountNumber || "",
            accountHolder: body.accountHolder || ""
          })
        } : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true
      } as any
    });

    console.log("사용자 프로필 업데이트 성공:", updatedUser.id);

    // bankInfo 필드 가져오기 (타입 오류 회피를 위해 별도 쿼리)
    const userWithBankInfo = await prisma.$queryRaw`
      SELECT bankInfo FROM User WHERE id = ${authUser.id}
    ` as any[];
    
    // 사용자 정보 응답 전에 안전하게 bankInfo를 파싱
    let bankInfoData = null;
    if (userWithBankInfo?.[0]?.bankInfo) {
      try {
        bankInfoData = JSON.parse(userWithBankInfo[0].bankInfo);
      } catch (e) {
        console.error("bankInfo 파싱 오류:", e);
      }
    }

    return addCorsHeaders(NextResponse.json(
      { 
        success: true, 
        message: "프로필이 성공적으로 업데이트되었습니다.", 
        user: {
          ...updatedUser,
          bankInfo: bankInfoData
        }
      },
      { status: 200 }
    ));
  } catch (error) {
    console.error("프로필 업데이트 오류:", error);
    return addCorsHeaders(NextResponse.json(
      { success: false, message: "프로필 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    ));
  } finally {
    await prisma.$disconnect();
  }
}

// 현재 사용자의 프로필 정보 조회 API
export async function GET(request: NextRequest) {
  try {
    console.log("프로필 정보 조회 API 호출됨");
    
    // 쿠키 로깅
    const allCookies = request.cookies.getAll();
    console.log("모든 쿠키:", allCookies);
    
    const authCookie = request.cookies.get('auth-token');
    console.log("인증 쿠키 존재 여부:", !!authCookie);
    
    // Authorization 헤더 로깅
    const authHeader = request.headers.get('authorization');
    console.log("Authorization 헤더:", authHeader || "없음");
    
    // 현재 인증된 사용자 정보 가져오기
    const authUser = await authenticate(request);
    
    if (!authUser) {
      console.log("인증된 사용자를 찾을 수 없음");
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "인증되지 않은 사용자입니다." },
        { status: 401 }
      ));
    }

    console.log("인증된 사용자 ID:", authUser.id);

    // 사용자 정보 조회 (타입 오류 해결을 위해 any 사용)
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        updatedAt: true
      } as any
    });

    if (!user) {
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      ));
    }

    console.log("사용자 프로필 조회 성공:", user.id);

    // bankInfo 필드 가져오기 (타입 오류 회피를 위해 별도 쿼리)
    const userWithBankInfo = await prisma.$queryRaw`
      SELECT bankInfo FROM User WHERE id = ${authUser.id}
    ` as any[];
    
    // 사용자 정보 응답 전에 안전하게 bankInfo를 파싱
    let bankInfoData = null;
    if (userWithBankInfo?.[0]?.bankInfo) {
      try {
        bankInfoData = JSON.parse(userWithBankInfo[0].bankInfo);
      } catch (e) {
        console.error("bankInfo 파싱 오류:", e);
      }
    }

    return addCorsHeaders(NextResponse.json(
      { 
        success: true, 
        user: {
          ...user,
          bankInfo: bankInfoData
        }
      },
      { status: 200 }
    ));
  } catch (error) {
    console.error("사용자 정보 조회 오류:", error);
    return addCorsHeaders(NextResponse.json(
      { success: false, message: "사용자 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    ));
  } finally {
    await prisma.$disconnect();
  }
} 