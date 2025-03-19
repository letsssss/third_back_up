import { NextResponse } from 'next/server';

// CORS 헤더 추가 함수
export function cors(req: Request, res: Response): Response | null {
  // 허용할 출처들
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
  ];

  const origin = req.headers.get('origin');
  
  // OPTIONS 요청 처리 (preflight)
  if (req.method === 'OPTIONS') {
    const preflightResponse = new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
    return preflightResponse;
  }

  // 요청에 CORS 헤더 추가
  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', origin || '*');
  
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

// NextResponse에 CORS 헤더 추가 함수
export function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
} 