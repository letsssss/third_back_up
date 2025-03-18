import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 보호된 경로 목록
const PROTECTED_ROUTES = [
  '/proxy-ticketing',
  '/ticket-cancellation',
  '/tickets',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // API 경로인 경우 CORS 헤더 설정
  if (pathname.startsWith('/api')) {
    console.log(`API 요청 처리: ${pathname}`);
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Edge 브라우저 호환성을 위한 추가 헤더
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    return response;
  }
  
  // 보호된 경로인지 확인
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  
  if (isProtectedRoute) {
    console.log(`보호된 경로 접근: ${pathname}`);
    
    // 쿠키에서 토큰 확인
    const token = request.cookies.get('auth-token')?.value;
    const authStatus = request.cookies.get('auth-status')?.value;
    
    console.log(`인증 상태: 토큰=${token ? '있음' : '없음'}, auth-status=${authStatus || '없음'}`);
    
    // 토큰이 없거나 auth-status가 'authenticated'가 아니면 로그인 페이지로 리다이렉트
    if (!token || authStatus !== 'authenticated') {
      console.log(`접근 제한: ${pathname} - 유효한 인증 정보 없음`);
      const url = new URL('/login', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
    
    // 토큰이 있는 경우에도 응답에 토큰이 있는지 확인하고 유지
    const response = NextResponse.next();
    
    // 토큰 쿠키 설정
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일 (초 단위)
      path: '/',
    });
    
    // auth-status 쿠키 설정 (클라이언트에서 읽을 수 있게 httpOnly 아님)
    if (authStatus === 'authenticated') {
      response.cookies.set('auth-status', 'authenticated', {
        httpOnly: false, // 클라이언트에서 읽을 수 있도록 함
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7일 (초 단위)
        path: '/',
      });
    }
    
    console.log(`인증 토큰 및 상태 확인됨: ${pathname}`);
    
    // 캐시 방지 헤더 추가
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  }
  
  return NextResponse.next();
}

// 미들웨어를 적용할 경로 설정
export const config = {
  matcher: [
    '/api/:path*',
    '/proxy-ticketing/:path*',
    '/ticket-cancellation/:path*', 
    '/tickets/:path*'
  ],
}; 