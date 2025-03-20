import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { comparePassword, generateAccessToken, generateRefreshToken } from "@/lib/auth"
import jwt from "jsonwebtoken"

// JWT 시크릿 키 정의
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 개발 환경 확인 함수
const isDevelopment = () => !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

// Edge 브라우저를 포함한 모든 브라우저에서 쿠키를 올바르게 설정하는 헬퍼 함수
function setAuthCookie(response: NextResponse, name: string, value: string, httpOnly: boolean = true) {
  response.cookies.set(name, value, {
    httpOnly,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7일 (초)
    path: '/',
  });
}

// OPTIONS 메서드 처리
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "이메일과 비밀번호는 필수 입력값입니다." }, { status: 400 })
    }

    try {
      // 사용자 찾기
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      
      if (!user) {
        console.log("사용자 없음:", email);
        return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
      }
      
      console.log("DB에서 사용자 찾음:", user.email);
      
      // 비밀번호 검증
      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        console.log("비밀번호 불일치");
        return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
      }

      // 로그인 성공
      console.log("로그인 성공:", user.email);
      
      // JWT 토큰 생성
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      
      // 리프레시 토큰 생성
      const refreshToken = generateRefreshToken(user.id);

      // 리프레시 토큰을 데이터베이스에 저장
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
      });

      // 응답에서 민감한 정보 제외
      const { password: _, refreshToken: __, ...userWithoutSensitiveInfo } = user;

      // 응답 객체 생성
      const response = NextResponse.json({
        success: true,
        message: "로그인 성공",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      });

      // 쿠키 설정 (헬퍼 함수 사용)
      setAuthCookie(response, 'auth-token', token);
      setAuthCookie(response, 'auth-status', 'authenticated', false);
      
      // 캐시 방지 헤더 추가
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      return response;
    } catch (dbError) {
      console.error("데이터베이스 오류:", dbError);
      return NextResponse.json({ 
        error: "로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("로그인 중 오류 발생:", error);
    return NextResponse.json({ error: "로그인 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

