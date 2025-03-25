import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// BigInt를 문자열로 변환하는 함수
function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => convertBigIntToString(item));
  }
  
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = convertBigIntToString(obj[key]);
    }
    return newObj;
  }
  
  return obj;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { productNumber: string } }
) {
  try {
    console.log("게시글 상세 조회 API 호출됨 (productNumber):", params.productNumber);
    
    // productNumber로 게시글 조회
    const post = await prisma.post.findFirst({
      where: {
        // TypeScript 오류 우회를 위해 any 타입 사용
        // Prisma 타입 정의에 productNumber가 아직 반영되지 않았습니다
        ...(params.productNumber ? { productNumber: params.productNumber } as any : {}),
        isDeleted: false
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true
          }
        }
      }
    });
    
    if (!post) {
      console.log("게시글을 찾을 수 없음");
      return NextResponse.json(
        { success: false, message: "게시글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    
    console.log("게시글 조회 성공:", post.id);
    
    // BigInt 값을 문자열로 변환
    const serializedPost = convertBigIntToString(post);
    
    return NextResponse.json(
      { success: true, post: serializedPost },
      { status: 200 }
    );
  } catch (error) {
    console.error("게시글 조회 오류:", error);
    return NextResponse.json(
      { success: false, message: "게시글 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 