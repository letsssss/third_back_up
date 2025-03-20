import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, getTokenFromHeaders, getTokenFromCookies } from '@/lib/auth';
import { cors } from '@/lib/cors';

// OPTIONS 요청 처리
export async function OPTIONS(request: Request) {
  return new NextResponse(null, { 
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// 메시지 목록 조회
// GET /api/messages?purchaseId=123 (특정 거래 관련 메시지)
// GET /api/messages?conversationWith=123 (특정 사용자와의 대화)
export async function GET(request: NextRequest) {
  try {
    console.log('메시지 목록 조회 API 호출됨');
    
    // JWT 토큰 확인
    const token = getTokenFromHeaders(request.headers) || getTokenFromCookies(request);
    
    if (!token) {
      return new NextResponse(
        JSON.stringify({ error: '로그인이 필요합니다.' }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    // 토큰 검증
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return new NextResponse(
        JSON.stringify({ error: '유효하지 않은 인증 정보입니다.' }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    const userId = decoded.userId;
    console.log('인증된 사용자:', userId);
    
    // URL 파라미터 가져오기
    const url = new URL(request.url);
    const purchaseId = url.searchParams.get('purchaseId');
    const conversationWith = url.searchParams.get('conversationWith');
    
    let whereCondition = {};
    
    if (purchaseId) {
      // 특정 거래에 관련된 메시지만 조회
      whereCondition = {
        purchaseId: parseInt(purchaseId),
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      };
      console.log('거래 ID로 메시지 조회:', purchaseId);
    } else if (conversationWith) {
      // 특정 사용자와의 대화만 조회
      whereCondition = {
        OR: [
          {
            senderId: userId,
            receiverId: parseInt(conversationWith)
          },
          {
            senderId: parseInt(conversationWith),
            receiverId: userId
          }
        ]
      };
      console.log('대화 상대 ID로 메시지 조회:', conversationWith);
    } else {
      // 모든 대화 조회 (사용자가 참여한)
      whereCondition = {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      };
      console.log('사용자의 모든 메시지 조회');
    }
    
    console.log('메시지 조회 조건:', JSON.stringify(whereCondition));
    
    // 메시지 조회 - Prisma에서 메시지 조회
    try {
      const messages = await prisma.message.findMany({
        where: whereCondition,
        orderBy: {
          createdAt: 'asc'
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true
            }
          },
          receiver: {
            select: {
              id: true,
              name: true
            }
          },
          purchase: {
            select: {
              id: true,
              status: true,
              post: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          }
        }
      });
      
      console.log(`조회된 메시지 수: ${messages.length}`);
      
      // 자신이 받은 메시지의 읽음 상태 업데이트
      await prisma.message.updateMany({
        where: {
          receiverId: userId,
          isRead: false
        },
        data: {
          isRead: true
        }
      });
      
      return new NextResponse(
        JSON.stringify({ messages }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    } catch (error) {
      console.error('Prisma 메시지 조회 오류:', error);
      return new NextResponse(
        JSON.stringify({ 
          error: 'Prisma 메시지 조회 중 오류가 발생했습니다.', 
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
  } catch (error) {
    console.error('메시지 조회 중 오류:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: '메시지 조회 중 오류가 발생했습니다.', 
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

// 메시지 전송
export async function POST(request: NextRequest) {
  try {
    console.log('메시지 전송 API 호출됨');
    console.log('요청 헤더:', JSON.stringify(Object.fromEntries([...request.headers.entries()])));
    
    // JWT 토큰 확인
    const token = getTokenFromHeaders(request.headers) || getTokenFromCookies(request);
    
    console.log('토큰 확인:', token ? '토큰 있음' : '토큰 없음');
    
    if (!token) {
      console.log('인증 토큰 없음 - 로그인 필요');
      return new NextResponse(
        JSON.stringify({ error: '로그인이 필요합니다.' }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    // 토큰 검증
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      console.log('유효하지 않은 토큰:', decoded);
      return new NextResponse(
        JSON.stringify({ error: '유효하지 않은 인증 정보입니다.' }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    const userId = decoded.userId;
    console.log('인증된 사용자:', userId);
    
    const body = await request.json();
    console.log('요청 바디:', JSON.stringify(body, null, 2));
    
    const { receiverId, content, purchaseId } = body;
    
    console.log('요청 파라미터 타입:', {
      receiverId: typeof receiverId,
      content: typeof content,
      purchaseId: typeof purchaseId
    });
    
    if (!receiverId || !content) {
      console.log('필수 정보 누락:', { receiverId, content });
      return new NextResponse(
        JSON.stringify({ error: '필수 정보가 누락되었습니다.' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    // 사용자 정보 가져오기
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });
    
    console.log('발신자 정보:', user);
    
    // 수신자 ID 안전하게 변환 (문자열이면 정수로, NaN이면 오류)
    let receiverIdNumber;
    
    try {
      if (typeof receiverId === 'string') {
        receiverIdNumber = parseInt(receiverId);
        if (isNaN(receiverIdNumber)) {
          console.log('수신자 ID 변환 실패:', receiverId);
          return new NextResponse(
            JSON.stringify({ error: '유효하지 않은 수신자 ID 형식입니다.' }),
            { 
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                ...cors
              }
            }
          );
        }
      } else if (typeof receiverId === 'number') {
        receiverIdNumber = receiverId;
      } else {
        console.log('유효하지 않은 수신자 ID 타입:', typeof receiverId);
        return new NextResponse(
          JSON.stringify({ error: '수신자 ID가 제공되지 않았습니다.' }),
          { 
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...cors
            }
          }
        );
      }
    } catch (error) {
      console.error('수신자 ID 변환 중 오류:', error);
      return new NextResponse(
        JSON.stringify({ error: '수신자 ID 처리 중 오류가 발생했습니다.' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    console.log('수신자 ID 검증:', {
      원본: receiverId,
      변환됨: receiverIdNumber,
      타입: typeof receiverIdNumber
    });
    
    // 수신자 존재 여부 확인
    try {
      const receiver = await prisma.user.findUnique({
        where: { id: receiverIdNumber }
      });
      
      console.log('수신자 정보:', receiver);
      
      if (!receiver) {
        console.log('존재하지 않는 수신자:', receiverIdNumber);
        return new NextResponse(
          JSON.stringify({ error: '존재하지 않는 사용자입니다.' }),
          { 
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              ...cors
            }
          }
        );
      }
      
      // 중요: 자기 자신에게 메시지를 보내는 경우 확인 및 방지
      if (receiverIdNumber === userId) {
        console.log('자기 자신에게 메시지를 보내려고 시도:', userId);
        return new NextResponse(
          JSON.stringify({ error: '자기 자신에게 메시지를 보낼 수 없습니다.' }),
          { 
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...cors
            }
          }
        );
      }
      
      // 거래 정보 확인 (purchaseId가 있는 경우)
      let purchaseIdNumber = null;
      
      if (purchaseId) {
        if (typeof purchaseId === 'string') {
          purchaseIdNumber = parseInt(purchaseId);
          if (isNaN(purchaseIdNumber)) {
            console.log('거래 ID 변환 실패:', purchaseId);
            return new NextResponse(
              JSON.stringify({ error: '유효하지 않은 거래 ID 형식입니다.' }),
              { 
                status: 400,
                headers: {
                  'Content-Type': 'application/json',
                  ...cors
                }
              }
            );
          }
        } else if (typeof purchaseId === 'number') {
          purchaseIdNumber = purchaseId;
        }
        
        console.log('거래 ID:', purchaseIdNumber);
        
        if (purchaseIdNumber) {
          const purchase = await prisma.purchase.findUnique({
            where: { id: purchaseIdNumber }
          });
          
          console.log('거래 정보:', purchase);
          
          if (!purchase) {
            console.log('존재하지 않는 거래:', purchaseIdNumber);
            return new NextResponse(
              JSON.stringify({ error: '존재하지 않는 거래입니다.' }),
              { 
                status: 404,
                headers: {
                  'Content-Type': 'application/json',
                  ...cors
                }
              }
            );
          }
          
          // 해당 거래의 구매자나 판매자인지 확인
          if (purchase.buyerId !== userId && purchase.sellerId !== userId) {
            console.log('권한 없음:', { userId, buyerId: purchase.buyerId, sellerId: purchase.sellerId });
            return new NextResponse(
              JSON.stringify({ error: '이 거래에 대한 메시지를 보낼 권한이 없습니다.' }),
              { 
                status: 403,
                headers: {
                  'Content-Type': 'application/json',
                  ...cors
                }
              }
            );
          }
          
          // 수신자가 거래의 다른 당사자(구매자 또는 판매자)인지 확인
          if (purchase.buyerId !== receiverIdNumber && purchase.sellerId !== receiverIdNumber) {
            console.log('잘못된 수신자:', { receiverIdNumber, 구매자: purchase.buyerId, 판매자: purchase.sellerId });
            return new NextResponse(
              JSON.stringify({ error: '이 거래와 관련이 없는 사용자에게 메시지를 보낼 수 없습니다.' }),
              { 
                status: 400,
                headers: {
                  'Content-Type': 'application/json',
                  ...cors
                }
              }
            );
          }
          
          // 메시지 저장 - Prisma에서 메시지 생성
          const message = await prisma.message.create({
            data: {
              senderId: userId,
              receiverId: receiverIdNumber,
              content: content,
              purchaseId: purchaseIdNumber,
              roomId: await getRoomId(purchaseIdNumber),
              isRead: false,
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true
                }
              },
              receiver: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          });
          
          console.log('메시지 생성 성공:', message);
          
          // 알림 생성 (수신자에게만 알림 전송)
          const notification = await prisma.notification.create({
            data: {
              userId: receiverIdNumber,  // 수신자 ID 사용
              message: `${user?.name || '사용자'}님으로부터 새 메시지가 도착했습니다: "${content.substring(0, 20)}${content.length > 20 ? '...' : ''}"`,
              type: 'MESSAGE',
              postId: null
            }
          });
          
          console.log('알림 생성 성공:', notification);
          
          return new NextResponse(
            JSON.stringify({ 
              success: true, 
              messageId: message.id,
              roomId: message.roomId  // 클라이언트에 roomId 반환
            }),
            { 
              status: 201,
              headers: {
                'Content-Type': 'application/json',
                ...cors
              }
            }
          );
        }
      }
      
      // purchaseId가 없는 일반 메시지 처리
      // 메시지 ID 형식: direct_[작은ID]_[큰ID] (사용자 ID 정렬하여 일관된 룸 ID 생성)
      const userIds = [userId, receiverIdNumber].sort((a, b) => a - b);
      const directRoomId = `direct_${userIds[0]}_${userIds[1]}`;
      
      const message = await prisma.message.create({
        data: {
          senderId: userId,
          receiverId: receiverIdNumber,
          content: content,
          purchaseId: null,
          roomId: directRoomId, // 1:1 대화용 채팅방 ID 설정
          isRead: false,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true
            }
          },
          receiver: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      
      console.log('일반 메시지 생성 성공:', message);
      
      // 알림 생성 (수신자에게만 알림 전송)
      const notification = await prisma.notification.create({
        data: {
          userId: receiverIdNumber,  // 수신자 ID 사용
          message: `${user?.name || '사용자'}님으로부터 새 메시지가 도착했습니다: "${content.substring(0, 20)}${content.length > 20 ? '...' : ''}"`,
          type: 'MESSAGE',
          postId: null
        }
      });
      
      console.log('알림 생성 성공:', notification);
      
      return new NextResponse(
        JSON.stringify({ 
          success: true, 
          messageId: message.id,
          roomId: message.roomId // 클라이언트에 roomId 반환
        }),
        { 
          status: 201,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    } catch (error) {
      console.error('메시지 전송 중 오류:', error);
      return new NextResponse(
        JSON.stringify({ 
          error: '메시지 전송 중 오류가 발생했습니다.',
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
  } catch (error) {
    console.error('메시지 API 전체 오류:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: '서버 오류가 발생했습니다.', 
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

// 메시지 읽음 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    console.log('메시지 읽음 상태 업데이트 API 호출됨');
    
    // JWT 토큰 확인
    const token = getTokenFromHeaders(request.headers) || getTokenFromCookies(request);
    
    if (!token) {
      return new NextResponse(
        JSON.stringify({ error: '로그인이 필요합니다.' }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    // 토큰 검증
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return new NextResponse(
        JSON.stringify({ error: '유효하지 않은 인증 정보입니다.' }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    const userId = decoded.userId;
    
    const body = await request.json();
    const { messageId } = body;
    
    if (!messageId) {
      // 모든 자신에게 온 메시지를 읽음으로 표시
      const result = await prisma.message.updateMany({
        where: {
          receiverId: userId,
          isRead: false
        },
        data: {
          isRead: true
        }
      });
      
      console.log(`모든 메시지 읽음 처리 완료: ${result.count}개`);
      
      return new NextResponse(
        JSON.stringify({ success: true, count: result.count }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    } else {
      // 특정 메시지만 읽음으로 표시 - 먼저 메시지가 존재하는지 확인
      const message = await prisma.message.findUnique({
        where: { id: messageId }
      });
      
      if (!message) {
        return new NextResponse(
          JSON.stringify({ error: '존재하지 않는 메시지입니다.' }),
          { 
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              ...cors
            }
          }
        );
      }
      
      // 자신이 받은 메시지인지 확인
      if (message.receiverId !== userId) {
        return new NextResponse(
          JSON.stringify({ error: '권한이 없습니다.' }),
          { 
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              ...cors
            }
          }
        );
      }
      
      // 메시지 읽음 처리
      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: { isRead: true }
      });
      
      console.log('메시지 읽음 처리 완료:', messageId);
      
      return new NextResponse(
        JSON.stringify({ success: true, message: updatedMessage }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
  } catch (error) {
    console.error('메시지 읽음 상태 업데이트 중 오류:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: '메시지 읽음 상태 업데이트 중 오류가 발생했습니다.', 
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

// 채팅방 ID를 가져오는 함수 추가 (파일의 적절한 위치에 추가)
async function getRoomId(purchaseId: number): Promise<number | null> {
  // 기존 채팅방이 있는지 확인
  let room = await prisma.room.findFirst({
    where: {
      purchaseId: purchaseId
    }
  });
  
  // 채팅방이 없으면 새로 생성
  if (!room) {
    try {
      room = await prisma.room.create({
        data: {
          name: `purchase_${purchaseId.toString()}`,
          purchaseId: purchaseId
        }
      });
      console.log('새 채팅방 생성:', room.id);
    } catch (error) {
      console.error('채팅방 생성 오류:', error);
      return null;
    }
  }
  
  return room.id;
} 