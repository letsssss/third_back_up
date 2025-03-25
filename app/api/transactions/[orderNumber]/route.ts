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
  { params }: { params: { orderNumber: string } }
) {
  try {
    console.log(`거래 상세 정보 API 호출됨 - 주문번호: ${params.orderNumber}`);
    
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
    
    // 주문번호 확인
    const orderNumber = params.orderNumber;
    if (!orderNumber) {
      return new NextResponse(
        JSON.stringify({ error: '유효하지 않은 주문번호입니다.' }),
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
      where: { orderNumber },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            category: true,
            eventDate: true,
            eventVenue: true,
            ticketPrice: true,
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
        date: purchase.eventDate || (purchase.post?.eventDate || ''),
        time: '', // 빈 문자열로 설정 (UI에서 조건부 렌더링)
        venue: purchase.eventVenue || (purchase.post?.eventVenue || ''),
        seat: purchase.selectedSeats || '',
        image: purchase.imageUrl || '/placeholder.svg'
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
  { params }: { params: { orderNumber: string } }
) {
  try {
    console.log(`거래 상태 업데이트 API 호출됨 - 주문번호: ${params.orderNumber}`);
    
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
    
    // 요청 데이터 파싱
    const requestData = await request.json();
    console.log('요청 데이터:', requestData);
    
    // 주문번호 확인
    const orderNumber = params.orderNumber;
    if (!orderNumber) {
      return new NextResponse(
        JSON.stringify({ error: '유효하지 않은 주문번호입니다.' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    // 상태 값 확인
    if (!requestData.status) {
      return new NextResponse(
        JSON.stringify({ error: '업데이트할 상태 값이 제공되지 않았습니다.' }),
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
      where: { orderNumber },
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
        JSON.stringify({ error: '이 거래의 상태를 업데이트할 권한이 없습니다.' }),
        { 
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    // 구매자 또는 판매자 역할 확인 및 권한 검증
    const isBuyer = purchase.buyerId === userId;
    
    // 각 상태별 권한 확인
    if (!isStatusUpdateAllowed(purchase.status, requestData.status, isBuyer)) {
      return new NextResponse(
        JSON.stringify({ error: '이 거래 상태로 업데이트할 권한이 없습니다.' }),
        { 
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    // 상태 업데이트
    const updatedPurchase = await prisma.purchase.update({
      where: { id: purchase.id },
      data: { status: requestData.status }
    });
    
    console.log(`거래 상태 업데이트 성공: ${purchase.id}, 새 상태: ${requestData.status}`);
    
    return new NextResponse(
      JSON.stringify({
        success: true,
        message: '거래 상태가 성공적으로 업데이트되었습니다.',
        newStatus: requestData.status
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

// 상태 업데이트 권한 확인 함수
function isStatusUpdateAllowed(currentStatus: string, newStatus: string, isBuyer: boolean): boolean {
  // 상태 별 전환 권한 확인
  if (currentStatus === 'PENDING' && newStatus === 'PROCESSING') {
    return !isBuyer; // 판매자만 처리 중으로 변경 가능
  }
  
  if (currentStatus === 'PROCESSING' && newStatus === 'COMPLETED') {
    return !isBuyer; // 판매자만 완료로 변경 가능
  }
  
  if (currentStatus === 'COMPLETED' && newStatus === 'CONFIRMED') {
    return isBuyer; // 구매자만 확정으로 변경 가능
  }
  
  if (currentStatus === 'PENDING' && newStatus === 'CANCELLED') {
    return true; // 구매자, 판매자 모두 취소 가능
  }
  
  if (currentStatus === 'PROCESSING' && newStatus === 'CANCELLED') {
    return true; // 구매자, 판매자 모두 취소 가능
  }
  
  // 기타 상태 변경은 거부
  return false;
}

// 상태 텍스트 변환 함수
function getStatusText(status: string): string {
  const statusMap: { [key: string]: string } = {
    'PENDING': '결제 완료',
    'PROCESSING': '처리 중',
    'COMPLETED': '티켓 발송 완료',
    'CONFIRMED': '구매 확정',
    'CANCELLED': '취소됨',
    'FAILED': '실패'
  };
  
  return statusMap[status] || status;
}

// 현재 단계 계산 함수
function getCurrentStep(status: string): string {
  const stepMap: { [key: string]: string } = {
    'PENDING': 'payment_completed',
    'PROCESSING': 'ticketing_in_progress',
    'COMPLETED': 'ticketing_completed',
    'CONFIRMED': 'purchase_confirmed',
    'CANCELLED': 'cancelled',
    'FAILED': 'failed'
  };
  
  return stepMap[status] || status;
}

// 티켓팅 상태 텍스트 변환 함수
function getTicketingStatusText(status: string): string {
  const statusMap: { [key: string]: string } = {
    'PENDING': '대기 중',
    'PROCESSING': '취켓팅 진행 중',
    'COMPLETED': '취켓팅 완료',
    'CONFIRMED': '확정됨',
    'CANCELLED': '취소됨',
    'FAILED': '실패'
  };
  
  return statusMap[status] || status;
} 