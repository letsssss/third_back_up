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
    console.log('메시지 조회 API 호출됨');
    console.log('요청 URL:', request.url);
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

    // URL 파라미터 가져오기
    const url = new URL(request.url);
    const purchaseIdParam = url.searchParams.get('purchaseId');
    const conversationWith = url.searchParams.get('conversationWith');
    
    console.log('조회 파라미터:', { purchaseIdParam, conversationWith });
    
    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    });
    
    if (!user) {
      console.log('존재하지 않는 사용자:', userId);
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

    // 메시지 조회
    let messages;
    
    // 1. 거래 ID로 메시지 조회
    if (purchaseIdParam) {
      console.log('거래 ID로 메시지 조회:', purchaseIdParam);
      
      // 거래 ID 숫자로 변환
      let purchaseId: number;
      try {
        purchaseId = parseInt(purchaseIdParam);
        if (isNaN(purchaseId)) {
          throw new Error('유효하지 않은 구매 ID 형식');
        }
      } catch (error) {
        console.log('유효하지 않은 구매 ID:', purchaseIdParam);
        return new NextResponse(
          JSON.stringify({ error: '유효하지 않은 구매 ID 형식입니다.' }),
          { 
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...cors
            }
          }
        );
      }
      
      // 거래 정보 확인
      const purchase = await prisma.purchase.findUnique({
        where: { id: purchaseId },
        select: {
          id: true,
          buyerId: true,
          sellerId: true,
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          post: {
            select: {
              id: true,
              title: true,
            }
          }
        }
      });
      
      if (!purchase) {
        console.log('존재하지 않는 거래:', purchaseId);
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
          JSON.stringify({ error: '이 거래에 대한 메시지를 조회할 권한이 없습니다.' }),
          { 
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              ...cors
            }
          }
        );
      }
      
      // 채팅방 조회
      const room = await prisma.room.findFirst({
        where: { purchaseId: purchaseId }
      });
      
      // 채팅방이 없으면 생성
      let roomId: number;
      if (!room) {
        const newRoom = await prisma.room.create({
          data: {
            name: `purchase_${purchaseId}`,
            purchaseId: purchaseId,
          }
        });
        roomId = newRoom.id;
        console.log(`새 채팅방 생성: ${newRoom.name} (ID: ${roomId})`);
      } else {
        roomId = room.id;
        console.log(`기존 채팅방 사용: ${room.name} (ID: ${roomId})`);
      }
      
      // 사용자가 채팅방 참여자인지 확인
      const userParticipant = await prisma.roomParticipant.findFirst({
        where: {
          roomId: roomId,
          userId: userId
        }
      });
      
      // 참여자가 아니면 추가
      if (!userParticipant) {
        await prisma.roomParticipant.create({
          data: {
            roomId: roomId,
            userId: userId
          }
        });
        console.log(`사용자 ${userId}를 채팅방 ${roomId}에 참여자로 등록`);
      }
      
      // 상대방도 채팅방 참여자로 등록
      const otherUserId = userId === purchase.buyerId ? purchase.sellerId : purchase.buyerId;
      
      const otherParticipant = await prisma.roomParticipant.findFirst({
        where: {
          roomId: roomId,
          userId: otherUserId
        }
      });
      
      if (!otherParticipant) {
        await prisma.roomParticipant.create({
          data: {
            roomId: roomId,
            userId: otherUserId
          }
        });
        console.log(`상대방 ${otherUserId}를 채팅방 ${roomId}에 참여자로 등록`);
      }
      
      // 메시지 조회
      messages = await prisma.message.findMany({
        where: {
          purchaseId: purchaseId
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          purchase: {
            select: {
              id: true,
              post: {
                select: {
                  id: true,
                  title: true,
                }
              },
              buyer: {
                select: {
                  id: true,
                  name: true
                }
              },
              seller: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
      
      console.log(`거래 ID ${purchaseId}에 대한 메시지 ${messages.length}개 조회 성공`);
      
      // 읽지 않은 수신 메시지를 '읽음' 상태로 업데이트
      try {
        const updateResult = await prisma.message.updateMany({
          where: {
            purchaseId: purchaseId,
            receiverId: userId,
            isRead: false
          },
          data: {
            isRead: true
          }
        });
        
        console.log(`${updateResult.count}개의 메시지를 읽음 상태로 업데이트`);
      } catch (updateError) {
        console.warn('메시지 읽음 상태 업데이트 실패:', updateError);
      }
      
      // 메시지 및 관련 정보 반환
      return new NextResponse(
        JSON.stringify({
          messages,
          purchaseInfo: purchase,
          room: {
            id: roomId
          }
        }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    // 2. 특정 사용자와의 대화 조회
    else if (conversationWith) {
      console.log('특정 사용자와의 대화 조회:', conversationWith);
      
      let otherUserId: number;
      try {
        otherUserId = parseInt(conversationWith);
        if (isNaN(otherUserId)) {
          throw new Error('유효하지 않은 사용자 ID 형식');
        }
      } catch (error) {
        console.log('유효하지 않은 사용자 ID:', conversationWith);
        return new NextResponse(
          JSON.stringify({ error: '유효하지 않은 사용자 ID 형식입니다.' }),
          { 
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...cors
            }
          }
        );
      }
      
      // 상대방 존재 여부 확인
      const otherUser = await prisma.user.findUnique({
        where: { id: otherUserId },
        select: { id: true, name: true, email: true }
      });
      
      if (!otherUser) {
        console.log('존재하지 않는 사용자:', otherUserId);
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
      
      // 채팅방 이름 (두 사용자 ID 정렬)
      const userIds = [userId, otherUserId].sort((a, b) => a - b);
      const directRoomName = `direct_${userIds[0]}_${userIds[1]}`;
      
      // 채팅방 조회
      let room = await prisma.room.findFirst({
        where: { name: directRoomName }
      });
      
      // 채팅방이 없으면 생성
      if (!room) {
        room = await prisma.room.create({
          data: {
            name: directRoomName,
            purchaseId: null,
          }
        });
        console.log(`새 1:1 채팅방 생성: ${room.name} (ID: ${room.id})`);
      }
      
      // 사용자가 채팅방 참여자인지 확인
      const userParticipant = await prisma.roomParticipant.findFirst({
        where: {
          roomId: room.id,
          userId: userId
        }
      });
      
      // 참여자가 아니면 추가
      if (!userParticipant) {
        await prisma.roomParticipant.create({
          data: {
            roomId: room.id,
            userId: userId
          }
        });
        console.log(`사용자 ${userId}를 채팅방 ${room.id}에 참여자로 등록`);
      }
      
      // 상대방도 채팅방 참여자로 등록
      const otherParticipant = await prisma.roomParticipant.findFirst({
        where: {
          roomId: room.id,
          userId: otherUserId
        }
      });
      
      if (!otherParticipant) {
        await prisma.roomParticipant.create({
          data: {
            roomId: room.id,
            userId: otherUserId
          }
        });
        console.log(`상대방 ${otherUserId}를 채팅방 ${room.id}에 참여자로 등록`);
      }
      
      // 1:1 메시지 조회
      messages = await prisma.message.findMany({
        where: {
          roomId: room.id,
          purchaseId: null
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
      
      console.log(`사용자 ${otherUserId}와의 1:1 메시지 ${messages.length}개 조회 성공`);
      
      // 읽지 않은 수신 메시지를 '읽음' 상태로 업데이트
      try {
        const updateResult = await prisma.message.updateMany({
          where: {
            roomId: room.id,
            receiverId: userId,
            isRead: false
          },
          data: {
            isRead: true
          }
        });
        
        console.log(`${updateResult.count}개의 메시지를 읽음 상태로 업데이트`);
      } catch (updateError) {
        console.warn('메시지 읽음 상태 업데이트 실패:', updateError);
      }
      
      // 메시지 및 관련 정보 반환
      return new NextResponse(
        JSON.stringify({
          messages,
          conversationWith: otherUser,
          room: {
            id: room.id
          }
        }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    // 3. 모든 대화 목록 조회 (방 ID에 따라 그룹화)
    else {
      console.log('사용자의 모든 대화 목록 조회');
      
      // 채팅방 정보와 함께 메시지 그룹 조회
      // 1. 사용자가 참여자인 방 조회
      const rooms = await prisma.roomParticipant.findMany({
        where: { userId: userId },
        include: {
          room: {
            include: {
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: {
                  sender: {
                    select: {
                      id: true,
                      name: true,
                    }
                  }
                }
              },
              participants: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    }
                  }
                }
              },
              purchase: {
                include: {
                  post: {
                    select: {
                      id: true,
                      title: true,
                    }
                  },
                  buyer: {
                    select: {
                      id: true,
                      name: true,
                    }
                  },
                  seller: {
                    select: {
                      id: true,
                      name: true,
                    }
                  }
                }
              }
            }
          }
        }
      });
      
      // 각 방에 대한 읽지 않은 메시지 수 계산
      const conversationList = await Promise.all(
        rooms.map(async (roomParticipant) => {
          const room = roomParticipant.room;
          
          // 읽지 않은 메시지 수 계산
          const unreadCount = await prisma.message.count({
            where: {
              roomId: room.id,
              receiverId: userId,
              isRead: false
            }
          });
          
          // 대화 상대 결정
          let otherParticipant = null;
          if (!room.purchaseId) {
            // 1:1 채팅인 경우, 상대방 정보 찾기
            otherParticipant = room.participants.find(p => p.userId !== userId)?.user || null;
          }
          
          return {
            roomId: room.id,
            roomName: room.name,
            lastMessage: room.messages[0] || null,
            unreadCount,
            purchaseInfo: room.purchase, 
            otherUser: otherParticipant,
            updatedAt: room.messages[0]?.createdAt || room.updatedAt
          };
        })
      );
      
      // 최신 메시지 순으로 정렬
      conversationList.sort((a, b) => {
        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();
        return dateB - dateA;
      });
      
      console.log(`${conversationList.length}개의 대화 목록 조회 성공`);
      
      return new NextResponse(
        JSON.stringify({ conversations: conversationList }),
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
    
    // content는 항상 필수
    if (!content) {
      console.log('필수 정보 누락: 메시지 내용 없음');
      return new NextResponse(
        JSON.stringify({ error: '메시지 내용을 입력해주세요.' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    // purchaseId나 receiverId 중 하나는 필수
    if (!purchaseId && !receiverId) {
      console.log('필수 정보 누락: purchaseId와 receiverId 모두 없음');
      return new NextResponse(
        JSON.stringify({ error: '대화 상대 또는 거래 정보가 필요합니다.' }),
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
    let receiverIdNumber: number | undefined;
    
    if (receiverId !== undefined && receiverId !== null) {
      if (typeof receiverId === 'string') {
        receiverIdNumber = parseInt(receiverId);
        if (isNaN(receiverIdNumber)) {
          console.log('유효하지 않은 수신자 ID 형식:', receiverId);
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
          JSON.stringify({ error: '유효하지 않은 수신자 ID 타입입니다.' }),
          { 
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...cors
            }
          }
        );
      }
    }
    
    // 구매 ID 안전하게 변환
    let purchaseIdNumber: number | undefined;
    
    if (purchaseId !== undefined && purchaseId !== null) {
      if (typeof purchaseId === 'string') {
        purchaseIdNumber = parseInt(purchaseId);
        if (isNaN(purchaseIdNumber)) {
          console.log('유효하지 않은 구매 ID 형식:', purchaseId);
          return new NextResponse(
            JSON.stringify({ error: '유효하지 않은 구매 ID 형식입니다.' }),
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
      } else {
        console.log('유효하지 않은 구매 ID 타입:', typeof purchaseId);
        return new NextResponse(
          JSON.stringify({ error: '유효하지 않은 구매 ID 타입입니다.' }),
          { 
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...cors
            }
          }
        );
      }
    }
    
    // 수신자 ID가 없으면서 구매 ID가 있는 경우, 구매 정보에서 상대방 ID 결정
    if (!receiverIdNumber && purchaseIdNumber) {
      console.log('수신자 ID가 없습니다. 구매 ID를 통해 수신자를 찾습니다:', purchaseIdNumber);
      
      try {
        // 거래 정보 가져오기
        const purchase = await prisma.purchase.findUnique({
          where: { id: purchaseIdNumber },
          select: { buyerId: true, sellerId: true }
        });
        
        if (!purchase) {
          console.log('존재하지 않는 거래 정보:', purchaseIdNumber);
          return new NextResponse(
            JSON.stringify({ error: '존재하지 않는 거래 정보입니다.' }),
            { 
              status: 404,
              headers: {
                'Content-Type': 'application/json',
                ...cors
              }
            }
          );
        }
        
        // 현재 사용자가 구매자인지 판매자인지에 따라 수신자 결정
        if (purchase.buyerId === userId) {
          receiverIdNumber = purchase.sellerId;
        } else if (purchase.sellerId === userId) {
          receiverIdNumber = purchase.buyerId;
        } else {
          console.log('사용자가 거래의 당사자가 아닙니다:', userId, purchase);
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
        
        console.log('수신자 ID 결정:', { '원본': receiverId, '변환됨': receiverIdNumber, '타입': typeof receiverIdNumber });
      } catch (error) {
        console.error('거래 정보 조회 중 오류:', error);
        return new NextResponse(
          JSON.stringify({ 
            error: '거래 정보 조회 중 오류가 발생했습니다.', 
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
    
    // 수신자 ID가 여전히 없다면 오류 반환
    if (!receiverIdNumber) {
      console.log('수신자 ID를 결정할 수 없습니다');
      return new NextResponse(
        JSON.stringify({ error: '수신자를 찾을 수 없습니다.' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
    
    // 수신자 정보 확인
    let receiver;
    try {
      if (receiverIdNumber) {
        receiver = await prisma.user.findUnique({
          where: { id: receiverIdNumber },
          select: { id: true, email: true, name: true }
        });
        
        if (!receiver) {
          console.log('존재하지 않는 수신자:', receiverIdNumber);
          return new NextResponse(
            JSON.stringify({ error: '존재하지 않는 수신자입니다.' }),
            { 
              status: 404,
              headers: {
                'Content-Type': 'application/json',
                ...cors
              }
            }
          );
        }
        
        console.log('수신자 정보:', receiver);
      }
    } catch (error) {
      console.error('수신자 정보 조회 중 오류:', error);
      return new NextResponse(
        JSON.stringify({ 
          error: '수신자 정보 조회 중 오류가 발생했습니다.', 
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
    
    // 1. 거래 ID가 있는 경우 처리
    if (purchaseIdNumber) {
      console.log('거래 ID:', purchaseIdNumber);
      
      // 거래 정보 확인
      try {
        const purchase = await prisma.purchase.findUnique({
          where: { id: purchaseIdNumber },
          select: { id: true, buyerId: true, sellerId: true, postId: true }
        });
        
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
        
        console.log('거래 정보:', purchase);
        
        // 채팅방 조회 또는 생성
        const room = await prisma.room.findFirst({
          where: { purchaseId: purchaseIdNumber }
        });
        
        let roomId;
        
        // 채팅방이 없으면 새로 생성
        if (!room) {
          const newRoom = await prisma.room.create({
            data: {
              name: `purchase_${purchaseIdNumber}`,
              purchaseId: purchaseIdNumber,
              // 추가 초기화 필드 있으면 설정
            }
          });
          
          roomId = newRoom.id;
          console.log(`채팅방이 생성됨: ${newRoom.name} (ID: ${roomId})`);
        } else {
          roomId = room.id;
          console.log(`기존 채팅방 사용: ${room.name} (ID: ${roomId})`);
        }
        
        // 발신자(현재 사용자)를 채팅방 참여자로 등록 (없는 경우)
        const senderParticipant = await prisma.roomParticipant.findFirst({
          where: {
            roomId: roomId,
            userId: userId
          }
        });
        
        if (!senderParticipant) {
          await prisma.roomParticipant.create({
            data: {
              roomId: roomId,
              userId: userId
            }
          });
          console.log(`발신자 ${userId}를 채팅방 ${roomId}에 참여자로 등록함`);
        }
        
        // 수신자도 채팅방 참여자로 등록 (없는 경우)
        const receiverParticipant = await prisma.roomParticipant.findFirst({
          where: {
            roomId: roomId,
            userId: receiverIdNumber
          }
        });
        
        if (!receiverParticipant) {
          await prisma.roomParticipant.create({
            data: {
              roomId: roomId,
              userId: receiverIdNumber
            }
          });
          console.log(`수신자 ${receiverIdNumber}를 채팅방 ${roomId}에 참여자로 등록함`);
        }
        
        // 메시지 생성 (트랜잭션 사용)
        const result = await prisma.$transaction(async (tx) => {
          // 메시지 생성
          const message = await tx.message.create({
            data: {
              senderId: userId,
              receiverId: receiverIdNumber,
              content: content,
              isRead: false,
              roomId: roomId,
              purchaseId: purchaseIdNumber,
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
          
          // 알림 생성
          const notification = await tx.notification.create({
            data: {
              userId: receiverIdNumber,
              message: `${user?.name || '사용자'}님으로부터 새 메시지가 도착했습니다: "${content.substring(0, 20)}${content.length > 20 ? '...' : ''}"`,
              type: 'MESSAGE',
              postId: null
            }
          });
          
          return { message, notification };
        });
        
        console.log('메시지 생성 성공:', result.message);
        console.log('알림 생성 성공:', result.notification);
        
        return new NextResponse(
          JSON.stringify({ 
            success: true, 
            messageId: result.message.id,
            roomId: result.message.roomId
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
        console.error('거래 메시지 처리 중 오류:', error);
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
    }
    
    // 2. 일반 메시지 처리 (거래 ID 없이 1:1 대화)
    // 메시지 ID 형식: direct_[작은ID]_[큰ID] (사용자 ID 정렬하여 일관된 룸 ID 생성)
    const userIds = [userId, receiverIdNumber].sort((a, b) => Number(a) - Number(b));
    console.log('1:1 채팅 룸 이름 생성을 위한 ID 정렬:', userIds);
    const directRoomName = `direct_${userIds[0]}_${userIds[1]}`;

    console.log('1:1 채팅 룸 이름:', directRoomName);
    
    try {
      // 기존 채팅방 찾기
      let room = await prisma.room.findFirst({
        where: { name: directRoomName }
      });
      
      // 채팅방이 없으면 새로 생성
      if (!room) {
        try {
          room = await prisma.room.create({
            data: {
              name: directRoomName,
              purchaseId: null
            }
          });
          console.log('새로운 1:1 채팅방 생성됨:', room);
        } catch (roomError) {
          // 동시에 생성 시도할 경우 충돌이 발생할 수 있으므로, 다시 조회
          console.warn('채팅방 생성 실패, 다시 조회 시도:', roomError);
          room = await prisma.room.findFirst({
            where: { name: directRoomName }
          });
          
          if (!room) {
            throw new Error('채팅방을 찾거나 생성할 수 없습니다.');
          }
        }
      }
      
      // 발신자를 채팅방 참여자로 등록 (없는 경우)
      const senderParticipant = await prisma.roomParticipant.findFirst({
        where: {
          roomId: room.id,
          userId: userId
        }
      });
      
      if (!senderParticipant) {
        await prisma.roomParticipant.create({
          data: {
            roomId: room.id,
            userId: userId
          }
        });
        console.log(`발신자 ${userId}를 1:1 채팅방에 참여자로 등록함`);
      }
      
      // 수신자도 채팅방 참여자로 등록 (없는 경우)
      const receiverParticipant = await prisma.roomParticipant.findFirst({
        where: {
          roomId: room.id,
          userId: receiverIdNumber
        }
      });
      
      if (!receiverParticipant) {
        await prisma.roomParticipant.create({
          data: {
            roomId: room.id,
            userId: receiverIdNumber
          }
        });
        console.log(`수신자 ${receiverIdNumber}를 1:1 채팅방에 참여자로 등록함`);
      }
      
      // 메시지 및 알림 생성 (트랜잭션 사용)
      const result = await prisma.$transaction(async (tx) => {
        const message = await tx.message.create({
          data: {
            senderId: userId,
            receiverId: receiverIdNumber,
            content: content,
            purchaseId: null,
            roomId: room.id,
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
        
        // 알림 생성
        const notification = await tx.notification.create({
          data: {
            userId: receiverIdNumber,
            message: `${user?.name || '사용자'}님으로부터 새 메시지가 도착했습니다: "${content.substring(0, 20)}${content.length > 20 ? '...' : ''}"`,
            type: 'MESSAGE',
            postId: null
          }
        });
        
        return { message, notification };
      });
      
      console.log('일반 메시지 생성 성공:', result.message);
      console.log('알림 생성 성공:', result.notification);
      
      return new NextResponse(
        JSON.stringify({ 
          success: true, 
          messageId: result.message.id,
          roomId: result.message.roomId
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
      console.error('일반 메시지 처리 중 오류:', error);
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