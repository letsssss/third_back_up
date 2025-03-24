import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { cors } from '@/lib/cors';

// OPTIONS 요청 처리 (CORS 지원)
export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// GET 요청 처리 - 특정 거래 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`거래 상세 정보 API 호출됨 - ID: ${params.id}`);
    
    // 인증된 사용자 확인
    const user = await getAuthenticatedUser(request);
    if (!user) {
      console.log('인증된 사용자를 찾을 수 없음');
      return new NextResponse(
        JSON.stringify({ error: '인증되지 않은 사용자입니다.' }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    const userId = user.id;
    console.log('인증된 사용자 ID:', userId);
    
    // 거래 ID 확인
    const transactionId = parseInt(params.id);
    if (isNaN(transactionId)) {
      return new NextResponse(
        JSON.stringify({ error: '유효하지 않은 거래 ID입니다.' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    // 거래 정보 조회 (구매 테이블에서)
    const purchase = await prisma.purchase.findUnique({
      where: { id: transactionId },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            category: true,
            date: true,
            venue: true,
            price: true,
            images: true,
            author: {
              select: {
                id: true,
                name: true,
                profileImage: true
              }
            }
          }
        },
        buyer: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        }
      }
    });
    
    if (!purchase) {
      return new NextResponse(
        JSON.stringify({ error: '거래를 찾을 수 없습니다.' }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    // 현재 사용자가 구매자 또는 판매자인지 확인
    if (purchase.buyerId !== userId && purchase.sellerId !== userId) {
      return new NextResponse(
        JSON.stringify({ error: '이 거래에 접근할 권한이 없습니다.' }),
        { 
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    // 사용자의 역할 확인 (구매자 또는 판매자)
    const isBuyer = purchase.buyerId === userId;
    
    // 클라이언트에 전달할 데이터 포맷팅
    const transactionData = {
      id: purchase.id.toString(),
      type: isBuyer ? 'purchase' : 'sale',
      status: getStatusText(purchase.status),
      currentStep: getCurrentStep(purchase.status),
      stepDates: {
        payment: purchase.createdAt.toISOString(),
        ticketing_started: purchase.createdAt.toISOString(), // 실제로는 취켓팅 시작 시간
        ticketing_completed: purchase.status === 'COMPLETED' || purchase.status === 'CONFIRMED' 
          ? new Date().toISOString()  // 실제로는 취켓팅 완료 시간
          : null,
        confirmed: purchase.status === 'CONFIRMED' 
          ? new Date().toISOString()  // 실제로는 구매 확정 시간
          : null,
      },
      ticket: {
        title: purchase.ticketTitle || (purchase.post?.title || ''),
        date: purchase.eventDate || (purchase.post?.eventDate ? new Date(purchase.post.eventDate).toISOString().split('T')[0] : ''),
        time: '', // 빈 문자열로 설정 (UI에서 조건부 렌더링)
        venue: purchase.eventVenue || (purchase.post?.eventVenue || ''),
        seat: purchase.selectedSeats || '',
        image: purchase.imageUrl || (purchase.post?.images && purchase.post.images.length > 0 
          ? purchase.post.images[0] 
          : '/placeholder.svg')
      },
      price: Number(purchase.totalPrice) || 0,
      paymentMethod: '신용카드', // 임시 데이터
      paymentStatus: '결제 완료',
      ticketingStatus: getTicketingStatusText(purchase.status),
      ticketingInfo: '취소표 발생 시 알림을 보내드립니다. 취소표 발생 시 빠르게 예매를 진행해 드립니다.',
      seller: !isBuyer ? null : {
        id: purchase.seller.id.toString(),
        name: purchase.seller.name,
        profileImage: purchase.seller.profileImage || '/placeholder.svg',
      },
      buyer: isBuyer ? null : {
        id: purchase.buyer.id.toString(),
        name: purchase.buyer.name,
        profileImage: purchase.buyer.profileImage || '/placeholder.svg',
      },
    };
    
    console.log('거래 정보 조회 성공:', purchase.id);
    
    return new NextResponse(
      JSON.stringify(transactionData),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...cors
        }
      }
    );
  } catch (error) {
    console.error('거래 조회 중 오류:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: '거래 조회 중 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined 
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...cors
        }
      }
    );
  }
}

// PUT 요청 처리 - 거래 상태 업데이트
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`거래 상태 업데이트 API 호출됨 - ID: ${params.id}`);
    
    // 인증된 사용자 확인
    const user = await getAuthenticatedUser(request);
    if (!user) {
      console.log('인증된 사용자를 찾을 수 없음');
      return new NextResponse(
        JSON.stringify({ error: '인증되지 않은 사용자입니다.' }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    const userId = user.id;
    console.log('인증된 사용자 ID:', userId);
    
    // 요청 바디 파싱
    const body = await request.json();
    const { currentStep } = body;
    
    // 거래 ID 확인
    const transactionId = parseInt(params.id);
    if (isNaN(transactionId)) {
      return new NextResponse(
        JSON.stringify({ error: '유효하지 않은 거래 ID입니다.' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    // 거래 정보 조회
    const purchase = await prisma.purchase.findUnique({
      where: { id: transactionId },
      include: {
        buyer: { select: { id: true } },
        seller: { select: { id: true } }
      }
    });
    
    if (!purchase) {
      return new NextResponse(
        JSON.stringify({ error: '거래를 찾을 수 없습니다.' }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    // 현재 사용자가 구매자 또는 판매자인지 확인
    if (purchase.buyerId !== userId && purchase.sellerId !== userId) {
      return new NextResponse(
        JSON.stringify({ error: '이 거래에 접근할 권한이 없습니다.' }),
        { 
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    // 사용자의 역할 확인 (구매자 또는 판매자)
    const isBuyer = purchase.buyerId === userId;
    
    // 상태 업데이트 로직
    let newStatus;
    if (currentStep === 'ticketing_completed' && !isBuyer) {
      // 판매자가 취켓팅 완료 처리
      newStatus = 'COMPLETED';
    } else if (currentStep === 'confirmed' && isBuyer) {
      // 구매자가 구매 확정 처리
      newStatus = 'CONFIRMED';
    } else {
      return new NextResponse(
        JSON.stringify({ error: '유효하지 않은 상태 변경 요청입니다.' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    // 상태 업데이트
    const updatedPurchase = await prisma.purchase.update({
      where: { id: transactionId },
      data: { status: newStatus }
    });
    
    console.log('거래 상태 업데이트 성공:', updatedPurchase.id, '새 상태:', newStatus);
    
    return new NextResponse(
      JSON.stringify({ 
        success: true,
        message: '거래 상태가 업데이트되었습니다.',
        status: newStatus
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...cors
        }
      }
    );
  } catch (error) {
    console.error('거래 상태 업데이트 중 오류:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: '거래 상태 업데이트 중 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined 
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...cors
        }
      }
    );
  }
}

// 상태 텍스트 변환 함수
function getStatusText(status: string): string {
  switch (status) {
    case 'PENDING':
      return '결제 완료';
    case 'PROCESSING':
      return '취켓팅 시작';
    case 'COMPLETED':
      return '취켓팅 완료';
    case 'CONFIRMED':
      return '구매 확정';
    case 'CANCELLED':
      return '취소됨';
    default:
      return '진행 중';
  }
}

// 현재 단계 변환 함수
function getCurrentStep(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'payment';
    case 'PROCESSING':
      return 'ticketing_started';
    case 'COMPLETED':
      return 'ticketing_completed';
    case 'CONFIRMED':
      return 'confirmed';
    default:
      return 'payment';
  }
}

// 취켓팅 상태 텍스트 변환 함수
function getTicketingStatusText(status: string): string {
  switch (status) {
    case 'PENDING':
      return '결제 완료';
    case 'PROCESSING':
      return '취켓팅 진행중';
    case 'COMPLETED':
      return '취켓팅 완료';
    case 'CONFIRMED':
      return '구매 확정';
    case 'CANCELLED':
      return '취소됨';
    default:
      return '진행 중';
  }
} 