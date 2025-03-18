import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthenticatedUser } from "@/lib/auth"

const prisma = new PrismaClient()

// CORS 헤더 설정을 위한 함수
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, DELETE, PUT');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// 특정 게시글 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // params.id 비동기적으로 처리
    const id = parseInt(params.id as string)
    
    if (isNaN(id)) {
      return addCorsHeaders(NextResponse.json(
        { error: '유효하지 않은 게시글 ID입니다' },
        { status: 400 }
      ));
    }
    
    // 게시글 조회 및 조회수 증가
    const post = await prisma.post.update({
      where: {
        id,
        isDeleted: false,
      },
      data: {
        viewCount: { increment: 1 }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        }
      },
    })
    
    if (!post) {
      return addCorsHeaders(NextResponse.json(
        { error: '게시글을 찾을 수 없습니다' },
        { status: 404 }
      ));
    }
    
    // 응답 형태 변환 및 BigInt 처리
    const formattedPost = {
      ...JSON.parse(JSON.stringify(post, (key, value) => 
        typeof value === 'bigint' ? Number(value) : value
      )),
      author: {
        ...post.author,
        image: post.author.profileImage,
      },
      _count: {
        comments: 0 // 댓글 기능은 아직 구현되지 않음
      }
    }
    
    return addCorsHeaders(NextResponse.json({ post: formattedPost }));
  } catch (error) {
    console.error('게시글 조회 오류:', error)
    return addCorsHeaders(NextResponse.json(
      { error: '게시글 조회 중 오류가 발생했습니다' },
      { status: 500 }
    ));
  } finally {
    await prisma.$disconnect()
  }
}

// 게시글 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("게시물 삭제 API 호출됨");
    
    // 현재 인증된 사용자 정보 가져오기
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      console.log("인증된 사용자를 찾을 수 없음");
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "인증되지 않은 사용자입니다." },
        { status: 401 }
      ));
    }

    console.log("인증된 사용자 ID:", authUser.id);

    const userId = authUser.id;
    const postId = parseInt(params.id);

    if (isNaN(postId)) {
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "유효하지 않은 게시물 ID입니다." },
        { status: 400 }
      ));
    }

    // 게시물이 존재하는지 확인
    const existingPost = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!existingPost) {
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "게시물을 찾을 수 없습니다." },
        { status: 404 }
      ));
    }

    // 게시물 작성자 확인
    if (existingPost.authorId !== userId) {
      return addCorsHeaders(NextResponse.json(
        { success: false, message: "게시물 삭제 권한이 없습니다." },
        { status: 403 }
      ));
    }

    // 게시물 삭제 (소프트 삭제)
    await prisma.post.update({
      where: { id: postId },
      data: { isDeleted: true }
    });

    console.log("게시물 삭제 성공:", postId);

    return addCorsHeaders(NextResponse.json({ 
      success: true, 
      message: "게시물이 성공적으로 삭제되었습니다." 
    }));
  } catch (error) {
    console.error("게시물 삭제 오류:", error);
    return addCorsHeaders(NextResponse.json(
      { success: false, message: "게시물 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    ));
  }
}

// CORS Preflight 요청 처리
export async function OPTIONS() {
  return addCorsHeaders(NextResponse.json({}));
} 