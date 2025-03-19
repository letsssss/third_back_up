import { NextResponse } from 'next/server';

interface CorsOptions {
  origin?: string;
  methods?: string[];
  headers?: string[];
}

/**
 * CORS 헤더 설정 함수
 * @param response NextResponse 객체
 * @param options CORS 옵션
 * @returns 헤더가 설정된 NextResponse 객체
 */
export function cors(response: NextResponse, options: CorsOptions = {}): NextResponse {
  const origin = options.origin || '*';
  const methods = options.methods?.join(', ') || 'GET, POST, PUT, DELETE, OPTIONS, PATCH';
  const headers = options.headers?.join(', ') || 'Content-Type, Authorization';
  
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', methods);
  response.headers.set('Access-Control-Allow-Headers', headers);
  
  // 캐시 방지 헤더
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}

/**
 * OPTIONS 메서드 핸들러 함수
 * @returns CORS 헤더가 설정된 204 상태 코드의 응답
 */
export function handleCorsOptions(): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return cors(response, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    headers: ['Content-Type', 'Authorization']
  });
} 