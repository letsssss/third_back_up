import { sign, verify } from 'jsonwebtoken';

// 환경 변수에서 JWT 시크릿 키를 가져옵니다. 실제 환경에서는 .env 파일에 설정해야 합니다.
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

/**
 * 사용자 ID로 JWT 토큰 생성
 * @param userId 사용자 ID
 * @returns 생성된 JWT 토큰
 */
export function createToken(userId: number) {
  return sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * JWT 토큰 검증
 * @param token 검증할 JWT 토큰
 * @returns 검증된 페이로드 또는 null
 */
export function verifyToken(token: string) {
  try {
    return verify(token, JWT_SECRET) as { userId: number };
  } catch (error) {
    console.error('토큰 검증 실패:', error);
    return null;
  }
} 