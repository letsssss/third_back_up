import { compare, hash } from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";

const prisma = new PrismaClient();

// 환경 변수에서 JWT 시크릿 키를 가져옵니다. 실제 환경에서는 .env 파일에 설정해야 합니다.
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

// 개발 환경인지 확인하는 함수
export const isDevelopment = process.env.NODE_ENV === 'development';

// 사용자 비밀번호를 해싱합니다.
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

// 해싱된 비밀번호와 일반 텍스트 비밀번호를 비교합니다.
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(plainPassword, hashedPassword);
}

// JWT 액세스 토큰 생성
export function generateAccessToken(userId: number, email: string, role: string): string {
  return sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: '24h' } // 24시간으로 연장
  );
}

// JWT 리프레시 토큰 생성
export function generateRefreshToken(userId: number): string {
  return sign(
    { userId },
    JWT_REFRESH_SECRET,
    { expiresIn: '30d' } // 30일로 연장
  );
}

// JWT 토큰 검증 함수 - 직접 구현하여 외부 의존성 제거
export function verifyToken(token: string) {
  try {
    console.log("JWT 토큰 검증 시도");
    
    // 개발 환경에서 dev-jwt 형식 토큰 처리
    if (isDevelopment && token.startsWith('dev-jwt-')) {
      console.log("개발 환경 토큰 감지됨");
      const parts = token.split('-');
      if (parts.length >= 3) {
        const userId = parseInt(parts[parts.length - 1]);
        if (!isNaN(userId)) {
          console.log("개발 환경 토큰 검증 성공, userId:", userId);
          return { userId };
        }
      }
      return null;
    }
    
    // 표준 JWT 토큰 검증
    const decoded = verify(token, JWT_SECRET) as { userId: number };
    console.log("JWT 토큰 검증 성공", decoded);
    return decoded;
  } catch (error) {
    console.error("JWT 토큰 검증 실패:", error);
    return null;
  }
}

// JWT 토큰 유효성 검증
export function verifyAccessToken(token: string) {
  try {
    console.log("JWT 토큰 검증 시도");
    
    // 개발 환경에서 dev-jwt 형식 토큰 처리
    if (isDevelopment && token.startsWith('dev-jwt-')) {
      console.log("개발 환경 토큰 감지됨");
      const parts = token.split('-');
      if (parts.length >= 3) {
        const userId = parseInt(parts[parts.length - 1]);
        if (!isNaN(userId)) {
          console.log("개발 환경 토큰 검증 성공, userId:", userId);
          return { userId };
        }
      }
      return null;
    }
    
    // 표준 JWT 토큰 검증
    const decoded = verify(token, JWT_SECRET);
    console.log("JWT 토큰 검증 성공", decoded);
    return decoded;
  } catch (error) {
    console.error("JWT 토큰 검증 실패:", error);
    return null;
  }
}

// 리프레시 토큰 유효성 검증
export function verifyRefreshToken(token: string) {
  try {
    return verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
}

// 요청 헤더에서 인증 토큰을 가져오는 함수
export function getTokenFromHeaders(headers: Headers): string | null {
  const authHeader = headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
}

// 쿠키에서 인증 토큰을 가져오는 함수
export function getTokenFromCookies(request: Request): string | null {
  const cookies = request.headers.get('cookie');
  if (!cookies) return null;
  
  const tokenCookie = cookies.split(';').find(c => c.trim().startsWith('auth-token='));
  if (!tokenCookie) return null;
  
  return tokenCookie.split('=')[1].trim();
}

/**
 * 요청에서 인증된 사용자 정보를 가져오는 함수
 * @param request Next.js 요청 객체
 * @returns 인증된 사용자 객체 또는 null
 */
export async function getAuthenticatedUser(request: NextRequest) {
  try {
    console.log("사용자 인증 확인 시작");
    
    // 개발 환경에서는 임시로 인증 우회
    if (process.env.NODE_ENV === 'development') {
      console.log("개발 환경에서 인증 우회");
      // 기본 사용자 가져오기(첫 번째 사용자)
      const devUser = await prisma.user.findFirst();
      
      if (devUser) {
        console.log("개발용 사용자 찾음:", devUser.id);
        return devUser;
      }
      
      // 사용자가 없으면 임시 사용자 생성
      if (!devUser) {
        console.log("개발용 임시 사용자 생성");
        try {
          const tempUser = await prisma.user.create({
            data: {
              email: "dev@example.com",
              password: await hashPassword("password"),
              name: "Development User",
              role: "USER"
            }
          });
          return tempUser;
        } catch (createError) {
          console.error("임시 사용자 생성 실패:", createError);
        }
      }
    }
    
    // 모든 쿠키 로깅
    console.log("모든 쿠키:", request.cookies.getAll());
    
    // 쿠키에서 토큰 가져오기
    const token = request.cookies.get("auth-token")?.value;
    console.log("쿠키에서 가져온 auth-token:", token ? "존재함" : "없음");
    
    // 헤더에서 토큰 가져오기
    const headerToken = getTokenFromHeaders(request.headers);
    console.log("헤더에서 가져온 토큰:", headerToken ? "존재함" : "없음");
    
    // 쿠키 또는 헤더에서 토큰 사용
    const authToken = token || headerToken;
    
    if (!authToken) {
      console.log("인증 토큰이 없음");
      return null;
    }
    
    // 토큰 검증
    const payload = verifyToken(authToken);
    if (!payload || !payload.userId) {
      console.log("토큰은 있지만 유효하지 않음");
      return null;
    }
    
    console.log("토큰 검증 성공, 사용자 ID:", payload.userId);
    
    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    
    if (!user) {
      console.log("토큰은 유효하지만 사용자를 찾을 수 없음");
      return null;
    }
    
    console.log("인증된 사용자 찾음:", user.id);
    return user;
  } catch (error) {
    console.error("인증된 사용자 정보 조회 오류:", error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
} 