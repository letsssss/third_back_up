import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
    
    // 세션 확인
    const session = await getServerSession(authOptions);
    console.log('세션 정보:', session);
    
    if (!session) {
      console.log('세션이 없음');
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

    if (!session.user?.email) {
      console.log('세션에 이메일 정보 없음');
      return new NextResponse(
        JSON.stringify({ 
          error: '유효하지 않은 세션입니다.', 
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

    console.log('사용자 이메일:', session.user.email);
    
    // 사용자 정보 조회
    try {
      let user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          email: true,
          name: true
        }
      });
      
      // 사용자가 없으면 자동으로 생성
      if (!user) {
        console.log('사용자 정보 없음, 새로 생성 시도:', session.user.email);
        try {
          user = await prisma.user.create({
            data: {
              email: session.user.email,
              name: session.user.name || session.user.email.split('@')[0],
              password: '', // 임시 비밀번호, OAuth 사용자는 실제로 사용하지 않음
            },
            select: {
              id: true,
              email: true,
              name: true
            }
          });
          console.log('새 사용자 생성 성공:', user);
        } catch (createError) {
          console.error('사용자 생성 실패:', createError);
          return new NextResponse(
            JSON.stringify({ 
              error: '사용자 정보 생성에 실패했습니다. 다시 시도해주세요.', 
              code: 'USER_CREATE_ERROR' 
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

      console.log('사용자 정보 조회/생성 성공:', user);

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

// 알림 읽음 상태 업데이트
export async function PATCH(req: Request) {
  try {
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

    // 세션 확인
    const session = await getServerSession(authOptions);
    console.log('세션 정보:', session);
    
    if (!session) {
      console.log('세션이 없음');
      return NextResponse.json(
        { error: '로그인이 필요합니다.', code: 'AUTH_ERROR' },
        { status: 401 }
      );
    }

    if (!session.user?.email) {
      console.log('세션에 이메일 정보 없음');
      return NextResponse.json(
        { error: '유효하지 않은 세션입니다.', code: 'AUTH_ERROR' },
        { status: 401 }
      );
    }

    console.log('사용자 이메일:', session.user.email);
    
    // 사용자 정보 조회
    try {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          email: true,
          name: true
        }
      });
      
      if (!user) {
        console.log('사용자를 찾을 수 없음:', session.user.email);
        return NextResponse.json(
          { 
            error: '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.', 
            code: 'USER_NOT_FOUND' 
          },
          { status: 404 }
        );
      }

      console.log('사용자 정보 조회 성공:', user);

      // 알림 조회
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
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

      // 알림이 해당 사용자의 것인지 확인
      if (notification.userId !== user.id) {
        return NextResponse.json(
          { error: '권한이 없습니다.' },
          { status: 403, headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }}
        );
      }

      // 알림 읽음 상태 업데이트
      const updatedNotification = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      return NextResponse.json({ notification: updatedNotification }, 
        { status: 200, headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }}
      );
    } catch (dbError) {
      console.error('데이터베이스 쿼리 오류:', dbError);
      return NextResponse.json(
        { error: '알림 상태 업데이트 중 데이터베이스 오류가 발생했습니다. 데이터베이스가 최신 상태인지 확인하세요.' },
        { status: 500, headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }}
      );
    }
  } catch (error) {
    console.error('알림 업데이트 중 오류 발생:', error);
    return NextResponse.json(
      { error: '알림을 업데이트하는 중 오류가 발생했습니다.' },
      { status: 500, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }}
    );
  }
} 