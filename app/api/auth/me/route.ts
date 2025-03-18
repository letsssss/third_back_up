import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeaders, getTokenFromCookies, verifyAccessToken } from "@/lib/auth";
import jwt from "jsonwebtoken";

// 타입스크립트 인터페이스 정의
interface MemoryUser {
  id: number;
  email: string;
  password: string;
  name: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

// JWT 시크릿 키 정의 (login 라우트와 동일한 키 사용)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 개발 환경 확인 함수
const isDevelopment = () => !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

// Edge 브라우저 포함한 모든 브라우저에서 쿠키를 올바르게 설정하는 헬퍼 함수
function setAuthCookie(response: NextResponse, name: string, value: string, httpOnly: boolean = true) {
  response.cookies.set(name, value, {
    httpOnly,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7일 (초)
    path: '/',
  });
}

// 메모리 기반 사용자 저장소 (독립적으로 유지)
export const memoryUsers: MemoryUser[] = [];

// 개발 환경에서 메모리 사용자 추가 함수
export function addMemoryUser(user: Omit<MemoryUser, 'id' | 'createdAt' | 'updatedAt'>) {
  const newUser: MemoryUser = {
    ...user,
    id: memoryUsers.length + 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  memoryUsers.push(newUser);
  console.log(`메모리 사용자 추가됨: ${newUser.email}, ID: ${newUser.id}`);
  return newUser;
}

// OPTIONS 메서드 처리 (CORS)
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

export async function GET(request: Request) {
  try {
    // 인증 헤더에서 토큰 확인
    const authHeader = request.headers.get('authorization');
    let token: string | undefined;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      // 쿠키에서 토큰 확인
      const cookies = request.headers.get('cookie');
      if (cookies) {
        const cookiePairs = cookies.split('; ');
        const authTokenCookie = cookiePairs.find(c => c.startsWith('auth-token='));
        if (authTokenCookie) {
          token = authTokenCookie.split('=')[1];
        }
      }
    }
    
    // 토큰이 없는 경우
    if (!token) {
      console.log("토큰 없음: 인증되지 않음");
      return NextResponse.json({ error: "인증되지 않음" }, { status: 401 });
    }
    
    try {
      // 토큰 검증
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const userId = decoded.userId;
      
      // 개발 환경에서 테스트 사용자 허용
      if (isDevelopment() && memoryUsers.some(u => u.id === userId)) {
        const user = memoryUsers.find(u => u.id === userId);
        
        // 응답 생성
        const response = NextResponse.json({
          success: true,
          user,
          token // 클라이언트가 새로운 토큰을 저장할 수 있도록 다시 전달
        });
        
        // 쿠키 설정 - Edge 호환성을 위해 헬퍼 함수 사용
        setAuthCookie(response, 'auth-token', token);
        setAuthCookie(response, 'auth-status', 'authenticated', false);
        
        // 캐시 방지 헤더 추가
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        
        return response;
      }
      
      // 데이터베이스에서 사용자 조회
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      });
      
      if (!user) {
        console.log("사용자를 찾을 수 없음:", userId);
        return NextResponse.json({ error: "사용자를 찾을 수 없음" }, { status: 404 });
      }
      
      console.log("사용자 인증 성공:", user.email);
      
      // 응답 생성
      const response = NextResponse.json({
        success: true,
        user,
        token // 클라이언트가 새로운 토큰을 저장할 수 있도록 다시 전달
      });
      
      // 쿠키 설정 - Edge 호환성을 위해 헬퍼 함수 사용
      setAuthCookie(response, 'auth-token', token);
      setAuthCookie(response, 'auth-status', 'authenticated', false);
      
      // 캐시 방지 헤더 추가
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      return response;
      
    } catch (e) {
      console.error("토큰 검증 오류:", e);
      return NextResponse.json({ error: "유효하지 않은 토큰" }, { status: 401 });
    }
    
  } catch (e) {
    console.error("인증 확인 오류:", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
} 