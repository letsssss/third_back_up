import { NextResponse } from "next/server";

// 테스트 API 엔드포인트
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "API 테스트 성공",
    timestamp: new Date().toISOString()
  });
} 