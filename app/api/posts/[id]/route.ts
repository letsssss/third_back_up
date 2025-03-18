import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthenticatedUser } from "@/lib/auth"

const prisma = new PrismaClient()

// CORS 헤더 설정
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, DELETE, PUT',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// BigInt를 안전하게 직렬화하는 함수
const formatDataForJson = (data: any) => {
  return JSON.parse(JSON.stringify(data, (key, value) => {
    // BigInt를 문자열로 변환
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }));
}

// 특정 게시글 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // params 안전하게 다루기
    const idParam = params.id;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '유효하지 않은 게시글 ID입니다' },
        { status: 400, headers: corsHeaders }
      )
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
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다' },
        { status: 404, headers: corsHeaders }
      )
    }
    
    try {
      // 응답 형태 변환
      const formattedPost = {
        ...post,
        author: {
          ...post.author,
          image: post.author.profileImage,
        },
        _count: {
          comments: 0 // 댓글 기능은 아직 구현되지 않음
        }
      }
      
      // BigInt를 안전하게 직렬화
      const safeFormattedPost = formatDataForJson(formattedPost);
      
      return NextResponse.json({ post: safeFormattedPost }, { headers: corsHeaders })
    } catch (jsonError) {
      console.error('JSON 직렬화 오류:', jsonError);
      // BigInt 직렬화 문제 처리를 위한 대체 방법
      // 타입 안전성을 위해 속성 존재 여부 확인 후 사용
      const simplifiedPost = {
        id: post.id.toString(),
        title: post.title,
        content: post.content,
        authorId: post.authorId.toString(),
        category: post.category,
        eventName: 'eventName' in post ? post.eventName : null,
        eventDate: 'eventDate' in post ? post.eventDate : null,
        eventTime: 'eventTime' in post ? post.eventTime : null,
        venue: 'venue' in post ? post.venue : null,
        ticketPrice: 'ticketPrice' in post && post.ticketPrice ? post.ticketPrice.toString() : null,
        imageUrl: 'imageUrl' in post ? post.imageUrl : null,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        isDeleted: post.isDeleted,
        viewCount: post.viewCount,
        author: {
          id: post.author.id.toString(),
          name: post.author.name,
          image: post.author.profileImage,
        },
        _count: {
          comments: 0
        }
      }
      return NextResponse.json({ post: simplifiedPost }, { headers: corsHeaders })
    }
  } catch (error) {
    console.error('게시글 조회 오류:', error)
    return NextResponse.json(
      { error: '게시글 조회 중 오류가 발생했습니다' },
      { status: 500, headers: corsHeaders }
    )
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
    // 인증 확인
    const authUser = await getAuthenticatedUser(request)
    
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "인증되지 않은 사용자입니다." },
        { status: 401 }
      )
    }

    const userId = authUser.id
    // params.id를 안전하게 처리
    const idParam = params.id;
    const postId = parseInt(idParam);

    if (isNaN(postId)) {
      return NextResponse.json(
        { success: false, message: "유효하지 않은 게시글 ID입니다." },
        { status: 400 }
      )
    }

    // 게시글 조회
    const post = await prisma.post.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return NextResponse.json(
        { success: false, message: "게시글을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 작성자 확인
    if (post.authorId !== userId) {
      return NextResponse.json(
        { success: false, message: "해당 게시글을 삭제할 권한이 없습니다." },
        { status: 403 }
      )
    }

    // 삭제 처리 (소프트 삭제)
    await prisma.post.update({
      where: { id: postId },
      data: { isDeleted: true }
    })

    return NextResponse.json(
      { success: true, message: "게시글이 삭제되었습니다." },
      { status: 200 }
    )
  } catch (error) {
    console.error("게시글 삭제 오류:", error)
    return NextResponse.json(
      { success: false, message: "게시글 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// CORS Preflight 요청 처리
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
} 