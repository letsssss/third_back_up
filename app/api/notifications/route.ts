import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, getTokenFromHeaders, getTokenFromCookies } from '@/lib/auth';
import { cors } from '@/lib/cors';

// OPTIONS 요청 처리
export async function OPTIONS(request: Request) {
  return new NextResponse(null, { 
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// 알림 목록 조회
export async function GET(req: Request) {
  try {
    console.log('알림 API 호출됨');
    
    // JWT 토큰 확인
    const token = getTokenFromHeaders(req.headers) || getTokenFromCookies(req);
    console.log('토큰 정보:', token ? '토큰 있음' : '토큰 없음');
    
    if (!token) {
      console.log('토큰이 없음');
      return new NextResponse(
        JSON.stringify({ 
          error: '로그인이 필요합니다.', 
          code: 'AUTH_ERROR' 
        }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      );
    }

    // 토큰 검증
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      console.log('유효하지 않은 토큰');
      return new NextResponse(
        JSON.stringify({ 
          error: '유효하지 않은 인증 정보입니다.', 
          code: 'AUTH_ERROR' 
        }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      );
    }

    console.log('사용자 ID:', decoded.userId);
    
    // 사용자 정보 조회
    try {
      let user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true
        }
      });
      
      if (!user) {
        console.log('사용자 정보 없음:', decoded.userId);
        return new NextResponse(
          JSON.stringify({ 
            error: '사용자 정보를 찾을 수 없습니다.', 
            code: 'USER_NOT_FOUND' 
          }),
          { 
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
          }
        );
      }

      console.log('사용자 정보 조회 성공:', user);

      // 사용자의 알림 목록 조회
      try {
        console.log('알림 데이터 조회 시도...');
        console.log('조회 조건:', { userId: user.id });
        
        const notifications = await prisma.notification.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          include: {
            post: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        });

        console.log('조회된 알림 수:', notifications.length);
        console.log('원본 알림 데이터:', notifications);

        // 날짜를 상대적 시간으로 포맷팅하는 함수
        const formatDateToRelative = (dateStr: string): string => {
          try {
            if (!dateStr) return "방금 전";

            // Date 객체 생성
            const date = new Date(dateStr);
            
            // 유효하지 않은 날짜인 경우
            if (isNaN(date.getTime())) {
              return "방금 전";
            }
            
            const now = new Date();
            
            // 미래 시간인 경우 - 서버/클라이언트 시간 차이를 고려해 10분까지는 허용
            if (date > now) {
              const diffMs = date.getTime() - now.getTime();
              if (diffMs <= 10 * 60 * 1000) { // 10분 이내
                return "방금 전";
              }
              // 심각한 미래 시간인 경우 
              return "최근";
            }
            
            // 시간 차이 계산
            const diffMs = now.getTime() - date.getTime();
            const seconds = Math.floor(diffMs / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            // 상대적 시간 표시
            if (days > 30) {
              // 절대 날짜 형식으로 표시 (1달 이상 지난 경우)
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              return `${year}.${month}.${day}`;
            } else if (days > 0) {
              return `${days}일 전`;
            } else if (hours > 0) {
              return `${hours}시간 전`;
            } else if (minutes > 0) {
              return `${minutes}분 전`;
            } else {
              return "방금 전";
            }
          } catch (error) {
            console.error("날짜 변환 오류:", error);
            return "방금 전";
          }
        };

        const formattedNotifications = notifications.map(notification => ({
          id: notification.id,
          title: notification.type === 'TICKET_REQUEST' 
            ? '티켓 구매 신청' 
            : notification.type === 'PURCHASE_COMPLETE'
            ? '구매 완료 알림'
            : '시스템 알림',
          message: notification.message,
          link: notification.postId ? `/posts/${notification.postId}` : '/mypage',
          isRead: notification.isRead,
          createdAt: notification.createdAt,
          type: notification.type,
          formattedDate: formatDateToRelative(notification.createdAt.toString())
        }));

        console.log('포맷된 알림 데이터:', formattedNotifications);
        
        return new NextResponse(
          JSON.stringify({ notifications: formattedNotifications }),
          { 
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
          }
        );

      } catch (dbError) {
        console.error('데이터베이스 쿼리 오류:', dbError);
        return new NextResponse(
          JSON.stringify({ 
            error: '알림 데이터 조회 중 오류가 발생했습니다.', 
            code: 'DB_ERROR',
            details: process.env.NODE_ENV === 'development' ? String(dbError) : undefined
          }),
          { 
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
          }
        );
      }
    } catch (error) {
      console.error('사용자 정보 조회 중 오류:', error);
      return new NextResponse(
        JSON.stringify({ 
          error: '사용자 정보를 조회하는 중 오류가 발생했습니다.', 
          code: 'USER_ERROR',
          details: process.env.NODE_ENV === 'development' ? String(error) : undefined
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      );
    }
  } catch (error) {
    console.error('알림 API 전역 오류:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: '서버에서 오류가 발생했습니다.', 
        code: 'SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
  }
}

// 알림 생성
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, postId, message, type = 'SYSTEM' } = body;

    if (!userId || !message) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400, headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }}
      );
    }

    // 알림 생성 - Prisma 쿼리를 사용하여 Notification 모델에 접근
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          postId,
          message,
          type,
        },
      });

      return NextResponse.json({ notification }, 
        { status: 201, headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }}
      );
    } catch (dbError) {
      console.error('데이터베이스 쿼리 오류:', dbError);
      return NextResponse.json(
        { error: '알림 생성 중 데이터베이스 오류가 발생했습니다. 데이터베이스가 최신 상태인지 확인하세요.' },
        { status: 500, headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }}
      );
    }
  } catch (error) {
    console.error('알림 생성 중 오류 발생:', error);
    return NextResponse.json(
      { error: '알림을 생성하는 중 오류가 발생했습니다.' },
      { status: 500, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }}
    );
  }
}

// 알림 읽음 상태 변경
export async function PATCH(req: Request) {
  try {
    // 요청 본문 파싱
    const body = await req.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json(
        { error: '알림 ID가 필요합니다.' },
        { status: 400, headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }}
      );
    }

    // 토큰 확인
    const token = getTokenFromHeaders(req.headers) || getTokenFromCookies(req);
    if (!token) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401, headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }}
      );
    }

    // 토큰 검증
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: '유효하지 않은 인증 정보입니다.' },
        { status: 401, headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }}
      );
    }

    // 알림 소유자 확인
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true }
    });

    if (!notification) {
      return NextResponse.json(
        { error: '알림을 찾을 수 없습니다.' },
        { status: 404, headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }}
      );
    }

    if (notification.userId !== decoded.userId) {
      return NextResponse.json(
        { error: '이 알림에 대한 권한이 없습니다.' },
        { status: 403, headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }}
      );
    }

    // 읽음 상태 업데이트
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    return NextResponse.json(
      { success: true, notification: updatedNotification },
      { status: 200, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }}
    );

  } catch (error) {
    console.error('알림 업데이트 오류:', error);
    return NextResponse.json(
      { error: '알림 업데이트 중 오류가 발생했습니다.', details: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status: 500, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }}
    );
  }
} 