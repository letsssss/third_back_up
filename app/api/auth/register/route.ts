// 타입 정의 추가
interface MemoryUser {
  id: number;
  email: string;
  name: string;
  role: string;
  [key: string]: any;
}

// global 타입 정의
declare global {
  var memoryUsers: MemoryUser[] | undefined;
}

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { addMemoryUser } from "../me/route"; // 개발 환경 테스트용

// 이메일 유효성 검사 함수
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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
    // 요청 본문 파싱
    const body = await request.json();
    const { email, password, name } = body;

    // 비밀번호는 로그에 출력하지 않음
    console.log("회원가입 요청:", { email, name });

    // 필수 입력값 검증
    if (!email || !password || !name) {
      return NextResponse.json({ error: "이메일, 비밀번호, 이름은 필수 입력값입니다." }, { status: 400 });
    }

    // 이메일 형식 검증
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "유효하지 않은 이메일 형식입니다." }, { status: 400 });
    }

    // 비밀번호 복잡도 검증 (최소 6자 이상)
    if (password.length < 6) {
      return NextResponse.json({ error: "비밀번호는 최소 6자 이상이어야 합니다." }, { status: 400 });
    }

    try {
      // 이메일을 소문자로 변환하여 일관성 유지
      const emailLowerCase = email.toLowerCase();
      
      // 이메일 중복 검사
      const existingUser = await prisma.user.findUnique({
        where: { email: emailLowerCase },
      });

      if (existingUser) {
        console.log("중복 이메일 감지:", emailLowerCase);
        return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
      }

      // 비밀번호 해시 처리
      const hashedPassword = await hashPassword(password);

      // 사용자 생성 - 실제 데이터베이스에 저장
      const user = await prisma.user.create({
        data: {
          email: emailLowerCase,
          password: hashedPassword,
          name,
          role: "USER",
        },
      });

      console.log("데이터베이스에 사용자 생성 완료:", user.id);

      // JWT 토큰 생성
      const accessToken = generateAccessToken(user.id, user.email, user.role);
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
        message: "회원가입이 완료되었습니다.",
        user: userWithoutSensitiveInfo,
        token: accessToken, // 클라이언트에서 필요할 경우
      }, { status: 201 });

      // 응답 헤더에 쿠키 설정
      response.cookies.set("auth-token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60, // 1시간 (초 단위)
        path: "/",
      });

      console.log("회원가입 성공:", userWithoutSensitiveInfo.email);
      return response;
    } catch (dbError: any) {  // any 타입으로 처리
      console.error("데이터베이스 오류:", dbError);
      
      // Prisma 에러 분석
      if (dbError.code === 'P2002' && dbError.meta?.target?.includes('email')) {
        return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
      }
      
      return NextResponse.json({ 
        error: "서버 오류가 발생했습니다. 나중에 다시 시도해주세요." 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("회원가입 처리 오류:", error);
    return NextResponse.json({ error: "회원가입 중 오류가 발생했습니다." }, { status: 500 });
  }
} 