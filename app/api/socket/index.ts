import { Server, Socket } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { 
  NextApiResponseServerIO, 
  ClientToServerEvents, 
  ServerToClientEvents, 
  InterServerEvents, 
  SocketData 
} from '@/lib/socket';
import { cors } from '@/lib/cors';
import { verifyToken } from '@/lib/auth';
import { randomUUID } from 'crypto';

// 채팅방 타입 정의
interface ChatUser {
  id: number;
  name: string;
  profileImage: string;
}

interface ChatMessage {
  id: string;
  senderId: number;
  senderName: string;
  text: string;
  timestamp: string;
}

interface ChatRoom {
  id: string;
  messages: ChatMessage[];
  users: ChatUser[];
}

// 메모리 채팅방 저장소 (개발 용도)
const rooms: ChatRoom[] = [];

export const config = {
  api: {
    bodyParser: false,
  },
};

// 쿠키에서 토큰 추출 함수
function getTokenFromCookies(req: NextApiRequest): string | null {
  const cookies = req.headers.cookie;
  if (!cookies) return null;
  
  const tokenCookie = cookies.split(';').find(c => c.trim().startsWith('token='));
  if (!tokenCookie) return null;
  
  return tokenCookie.split('=')[1];
}

// 헤더에서 토큰 추출 함수
function getTokenFromHeaders(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  
  return authHeader.substring(7);
}

// 실시간 채팅을 위한 소켓 서버 설정
export default async function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  // 이미 초기화된 소켓 서버가 있는지 확인
  if (res.socket.server.io) {
    console.log('Socket.io 서버가 이미 실행 중입니다.');
    res.end();
    return;
  }

  console.log('Socket.io 서버를 설정합니다...');
  
  // Socket.io 서버 생성
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(res.socket.server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  
  // 서버 인스턴스 저장
  res.socket.server.io = io;

  // 소켓 연결 이벤트 핸들러
  io.on('connect', (socket) => {
    console.log('새로운 클라이언트 연결됨:', socket.id);

    // 인증 이벤트 핸들러 추가
    socket.on('authenticate', async (data) => {
      try {
        if (!data || !data.token) {
          console.log('인증 토큰이 제공되지 않았습니다.');
          socket.emit('authenticated', { 
            success: false, 
            message: '인증 토큰이 필요합니다.' 
          });
          return;
        }
        
        console.log(`토큰 인증 시도: ${data.token.substring(0, 10)}...`);
        
        // 토큰 검증
        try {
          const decoded = verifyToken(data.token);
          if (!decoded) {
            console.log('토큰 검증 실패: 유효하지 않은 토큰');
            socket.emit('authenticated', { 
              success: false, 
              message: '유효하지 않은 인증 토큰입니다.' 
            });
            return;
          }
          
          if (typeof decoded !== 'object' || !('userId' in decoded)) {
            console.log('토큰 검증 실패: 올바른 페이로드 구조가 아님', decoded);
            socket.emit('authenticated', { 
              success: false, 
              message: '유효하지 않은 인증 토큰 형식입니다.', 
              details: '토큰에 userId가 없습니다.' 
            });
            return;
          }
          
          // 사용자 정보 저장
          socket.data.userId = decoded.userId;
          socket.data.username = decoded.name || '사용자';
          console.log(`소켓 ${socket.id}가 인증됨: userId=${decoded.userId}, name=${socket.data.username}`);
          
          // 사용자 정보 가져오기
          try {
            const user = await prisma.user.findUnique({
              where: { id: decoded.userId },
              select: {
                id: true,
                name: true,
                profileImage: true
              }
            });
            
            if (!user) {
              console.log(`해당 ID의 사용자를 찾을 수 없습니다: ${decoded.userId}`);
              socket.emit('authenticated', { 
                success: false, 
                message: '사용자 정보를 찾을 수 없습니다.' 
              });
              return;
            }
            
            // 인증 성공 응답
            socket.emit('authenticated', {
              success: true,
              user: {
                id: user.id,
                name: user.name || '알 수 없음',
                profileImage: user.profileImage || null
              }
            });
          } catch (dbError: any) {
            console.error('사용자 정보 조회 중 오류:', dbError);
            socket.emit('authenticated', { 
              success: false, 
              message: '사용자 정보를 조회하는 중 오류가 발생했습니다.',
              details: process.env.NODE_ENV === 'development' ? dbError.message : '데이터베이스 오류'
            });
          }
        } catch (tokenError: any) {
          console.error('토큰 검증 중 오류:', tokenError);
          socket.emit('authenticated', { 
            success: false, 
            message: '인증 토큰 검증 중 오류가 발생했습니다.',
            details: process.env.NODE_ENV === 'development' ? tokenError.message : '인증 오류'
          });
        }
      } catch (error: any) {
        console.error('인증 처리 중 오류:', error);
        socket.emit('authenticated', { 
          success: false, 
          message: '인증 처리 중 오류가 발생했습니다.',
          details: process.env.NODE_ENV === 'development' ? error.message : '서버 오류'
        });
      }
    });
    
    // 채팅방 생성 또는 참여 이벤트
    socket.on('createOrJoinRoom', async (data: any) => {
      try {
        console.log(`채팅방 생성/참여 요청:`, data);
        console.log(`현재 소켓 인증 상태:`, socket.data.userId ? `인증됨 (ID: ${socket.data.userId})` : '인증되지 않음');
        
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        if (!data) {
          console.log('데이터 없이 채팅방 생성/참여 요청이 들어왔습니다.');
          socket.emit('socketError', { 
            message: '올바른 데이터가 제공되지 않았습니다.',
            code: 'INVALID_DATA'
          });
          return;
        }
        
        // 개발 환경에서는 인증 없이도 진행
        if (!socket.data.userId && !isDevelopment) {
          console.log('인증되지 않은 사용자가 채팅방 생성/참여를 시도했습니다.');
          socket.emit('socketError', { 
            message: '인증이 필요합니다.',
            code: 'AUTH_REQUIRED' 
          });
          return;
        }
        
        // 개발 환경에서 임시 사용자 ID 할당
        if (!socket.data.userId && isDevelopment) {
          socket.data.userId = data.userId || data.user?.id || 2;
          socket.data.username = data.userName || data.user?.name || '개발 테스트 사용자';
          console.log(`개발 환경: 임시 사용자 ID ${socket.data.userId} 할당됨`);
        }
        
        // 필수 정보 확인 - 구매 ID 또는 방 ID가 있어야 함
        if (!data.purchaseId && !data.roomId) {
          console.log('구매 ID나 방 ID 없이 채팅방 생성/참여 요청이 들어왔습니다.');
          socket.emit('socketError', { 
            message: '채팅방 정보가 부족합니다. 구매 ID 또는 방 ID가 필요합니다.',
            code: 'MISSING_ROOM_INFO'
          });
          return;
        }
        
        // 방 이름 결정 (구매 ID가 있으면 그것을 기준으로, 없으면 방 ID 사용)
        const roomName = data.purchaseId ? `purchase_${data.purchaseId}` : data.roomId as string;
        console.log(`사용할 채팅방 이름: ${roomName}`);
        
        // 채팅방 존재 확인
        let room;
        try {
          // 정확한 이름 매칭으로 조회
          room = await prisma.room.findFirst({
            where: { 
              name: { equals: roomName }
            },
            include: {
              participants: true
            }
          });
          
          console.log(`채팅방 검색 결과:`, room ? `${roomName} 채팅방을 찾았습니다.` : `${roomName} 채팅방을 찾을 수 없습니다.`);
          
          // 채팅방이 없으면 새로 생성
          if (!room) {
            console.log(`채팅방 ${roomName}이 존재하지 않습니다. 새로 생성합니다.`);
            
            // 개발 환경이거나 구매 정보가 있을 때만 채팅방 생성 시도
            const purchaseId = data.purchaseId ? parseInt(data.purchaseId) : undefined;
            
            try {
              let participants = [];
              
              // 구매 정보가 있으면 구매자와 판매자를 참가자로 추가
              if (purchaseId && !isNaN(purchaseId)) {
                const purchase = await prisma.purchase.findUnique({
                  where: { id: purchaseId }
                });
                
                if (purchase) {
                  participants = [
                    { userId: purchase.buyerId },
                    { userId: purchase.sellerId }
                  ];
                } else if (isDevelopment) {
                  // 개발 환경에서는 임시 참가자 추가
                  participants = [
                    { userId: socket.data.userId },
                    { userId: socket.data.userId === 1 ? 2 : 1 }
                  ];
                } else {
                  throw new Error(`구매 정보(ID: ${purchaseId})를 찾을 수 없습니다.`);
                }
              } else if (isDevelopment) {
                // 개발 환경에서 구매 정보 없이도 임시 채팅방 생성
                participants = [
                  { userId: socket.data.userId },
                  { userId: socket.data.userId === 1 ? 2 : 1 }
                ];
              } else {
                throw new Error('채팅방을 생성하기 위한 정보가 부족합니다.');
              }
              
              // 채팅방 생성
              room = await prisma.room.create({
                data: {
                  name: roomName,
                  purchaseId: !isNaN(purchaseId) ? purchaseId : undefined,
                  participants: {
                    create: participants
                  }
                },
                include: {
                  participants: true
                }
              });
              
              console.log(`채팅방 ${roomName}이 성공적으로 생성되었습니다.`);
            } catch (createError: any) {
              console.error('채팅방 생성 중 오류 발생:', createError);
              socket.emit('socketError', { 
                message: '채팅방 생성에 실패했습니다.',
                details: isDevelopment ? (createError.message || '알 수 없는 오류') : '서버 오류',
                code: 'ROOM_CREATION_ERROR'
              });
              return;
            }
          }
        } catch (findError: any) {
          console.error('채팅방 검색 중 오류 발생:', findError);
          socket.emit('socketError', { 
            message: '채팅방 검색 중 오류가 발생했습니다.',
            details: isDevelopment ? (findError.message || '알 수 없는 오류') : '서버 오류',
            code: 'ROOM_SEARCH_ERROR'
          });
          return;
        }
        
        // 채팅방이 여전히 없으면 에러 반환
        if (!room || !room.id) {
          console.error('채팅방을 찾거나 생성할 수 없습니다:', roomName);
          socket.emit('socketError', { 
            message: '채팅방을 찾을 수 없습니다.',
            details: `채팅방 (${roomName})을 찾을 수 없으며, 자동 생성에 실패했습니다.`,
            code: 'ROOM_NOT_FOUND'
          });
          return;
        }
        
        // 채팅방에 사용자가 참여자로 등록되어 있는지 확인
        const isParticipant = room.participants?.some(p => p.userId === socket.data.userId);
        
        if (!isParticipant && !isDevelopment) {
          console.log(`사용자 ${socket.data.userId}는 채팅방 ${roomName}의 참여자가 아닙니다.`);
          socket.emit('socketError', { 
            message: '이 채팅방에 참여할 권한이 없습니다.',
            code: 'NOT_AUTHORIZED'
          });
          return;
        }
        
        // 소켓을 채팅방에 참여
        socket.join(roomName);
        console.log(`사용자 ${socket.data.userId}가 채팅방 ${roomName}에 입장했습니다.`);
        
        // 채팅 기록 조회
        try {
          // 메시지 조회 - roomId와 일치하는 메시지 조회
          const messages = await prisma.message.findMany({
            where: {
              roomId: roomName
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  profileImage: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          });
          
          console.log(`조회된 메시지 수: ${messages.length}`);
          
          // 읽음 상태 업데이트
          if (messages.length > 0) {
            await prisma.message.updateMany({
              where: {
                roomId: roomName,
                receiverId: socket.data.userId,
                isRead: false
              },
              data: {
                isRead: true
              }
            });
          }
          
          // 클라이언트에 메시지 목록 전송
          socket.emit('chatHistory', {
            messages: messages.map(msg => ({
              id: String(msg.id),
              content: msg.content,
              createdAt: msg.createdAt.toISOString(),
              timestamp: msg.createdAt.toISOString(),
              isRead: msg.isRead,
              senderId: String(msg.sender.id),
              user: {
                id: msg.sender.id,
                name: msg.sender.name,
                profileImage: msg.sender.profileImage
              }
            }))
          });
          
          console.log(`채팅 기록(${messages.length}개)이 사용자 ${socket.data.userId}에게 전송되었습니다.`);
        } catch (error: any) {
          console.error('채팅 기록 조회 중 오류 발생:', error);
          socket.emit('socketError', { 
            message: '채팅 기록을 불러오는 중 오류가 발생했습니다.', 
            details: isDevelopment ? (error.message || '알 수 없는 오류') : '서버 오류',
            code: 'CHAT_HISTORY_ERROR'
          });
          // 메시지 조회 실패해도 채팅방 입장은 유지
        }
      } catch (error: any) {
        console.error('채팅방 생성/참여 중 오류:', error);
        socket.emit('socketError', {
          message: error?.message || '채팅방 생성/참여 중 오류가 발생했습니다.',
          details: process.env.NODE_ENV === 'development' ? (error?.stack || '디버그 정보 없음') : '서버에서 오류가 발생했습니다.',
          code: 'SOCKET_ERROR'
        });
      }
    });

    // 기존 인증 시도 코드는 유지 (후방 호환성을 위해)
    try {
      const token = getTokenFromHeaders(req) || getTokenFromCookies(req);
      if (token) {
        try {
          const decoded = verifyToken(token);
          if (decoded && typeof decoded === 'object' && 'userId' in decoded) {
            socket.data.userId = decoded.userId;
            socket.data.username = decoded.name || '사용자';
            console.log(`소켓 ${socket.id}가 인증됨: userId=${decoded.userId}, name=${socket.data.username}`);
          }
        } catch (error) {
          console.error('소켓 인증 실패:', error);
        }
      }
    } catch (error) {
      console.error('소켓 인증 실패:', error);
    }

    // 채팅방 입장 이벤트
    socket.on('onJoinRoom', async (roomId) => {
      try {
        if (!socket.data.userId) {
          socket.emit('socketError', { 
            message: '인증되지 않은 사용자입니다.',
            code: 'UNAUTHENTICATED'
          });
          return;
        }

        // 채팅방 정보 확인
        const room = await prisma.room.findUnique({
          where: { name: roomId },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    profileImage: true,
                  }
                }
              }
            }
          }
        });

        if (!room) {
          socket.emit('socketError', { 
            message: '채팅방을 찾을 수 없습니다.',
            details: `요청한 채팅방 ID: ${roomId}`,
            code: 'ROOM_NOT_FOUND'
          });
          return;
        }

        // 참여자가 아니면 권한 없음
        const isParticipant = room.participants.some(p => p.userId === socket.data.userId);
        if (!isParticipant) {
          socket.emit('socketError', { 
            message: '채팅방에 참여할 권한이 없습니다.',
            code: 'ACCESS_DENIED'
          });
          return;
        }

        // 채팅방 입장
        socket.join(roomId);
        console.log(`사용자 ${socket.data.userId}가 채팅방 ${roomId}에 입장했습니다.`);

        // 채팅 내역 조회
        const messages = await prisma.message.findMany({
          where: {
            room: {
              id: room.id
            }
          },
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                profileImage: true
              }
            }
          }
        });

        // 읽음 처리
        await prisma.message.updateMany({
          where: {
            room: {
              id: room.id
            },
            receiverId: socket.data.userId,
            isRead: false
          },
          data: { isRead: true }
        });
        
        // 참가자 정보 추출
        const formattedParticipants = room.participants.map(p => {
          if (!p.user) {
            console.warn(`참가자 정보 누락: userId=${p.userId}`);
            return { 
              id: p.userId, 
              name: '알 수 없음', 
              profileImage: null 
            };
          }
          return { 
            id: p.user.id, 
            name: p.user.name || '알 수 없음', 
            profileImage: p.user.profileImage || null 
          };
        });
        
        // 채팅방 정보와 메시지 전송
        socket.emit('roomJoined', {
          roomId,
          participants: formattedParticipants,
          messages: messages.map(msg => ({
            id: msg.id.toString(),
            senderId: msg.senderId.toString(),
            content: msg.content,
            createdAt: msg.createdAt.toISOString(),
            timestamp: msg.createdAt.toISOString(),
            isRead: msg.isRead
          }))
        });
      } catch (error) {
        console.error('채팅방 입장 오류:', error);
        socket.emit('socketError', { 
          message: '채팅방 입장 중 오류가 발생했습니다.',
          details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
          code: 'ROOM_JOIN_ERROR'
        });
      }
    });

    // 메시지 전송 이벤트
    socket.on('onSend', async (data) => {
      console.log('Socket onSend 이벤트 수신:', data);
      try {
        const { roomId, chat, user, clientId } = data;
        
        if (!roomId || !chat) {
          console.error('메시지 전송 오류: 필수 데이터 누락 (roomId 또는 메시지 내용)');
          socket.emit('socketError', { 
            message: '메시지 데이터가 올바르지 않습니다.',
            code: 'INVALID_MESSAGE_DATA',
            details: '채팅방 ID 또는 메시지 내용이 누락되었습니다.'
          });
          
          // 메시지 전송 실패 응답
          if (clientId) {
            socket.emit('messageSent', {
              messageId: clientId,
              status: 'failed',
              roomId: roomId || '',
              error: '메시지 데이터가 올바르지 않습니다.'
            });
          }
          return;
        }
        
        // 채팅방 확인 로직 개선
        let chatRoom = rooms.find(room => room.id === roomId);
        
        // 채팅방이 없으면 자동으로 생성 (개발 환경 및 실제 환경 모두 대응)
        if (!chatRoom) {
          console.log(`채팅방 ${roomId}를 찾을 수 없어 자동 생성합니다.`);
          try {
            chatRoom = {
              id: roomId,
              messages: [],
              users: []
            };
            rooms.push(chatRoom);
            console.log(`채팅방 ${roomId}가 성공적으로 생성되었습니다.`);
          } catch (error) {
            console.error(`채팅방 ${roomId} 생성 중 오류:`, error);
            socket.emit('socketError', { 
              message: '채팅방을 생성할 수 없습니다.',
              details: process.env.NODE_ENV === 'development' ? '메모리에 채팅방을 저장하는 중 오류가 발생했습니다.' : undefined,
              code: 'ROOM_CREATION_ERROR'
            });
            
            // 메시지 전송 실패 응답
            if (clientId) {
              socket.emit('messageSent', {
                messageId: clientId,
                status: 'failed',
                roomId: roomId,
                error: '채팅방을 생성할 수 없습니다.'
              });
            }
            return;
          }
        }
        
        // 사용자 정보 확인 및 설정
        const messageUser = user || { 
          id: socket.data.userId || 0, 
          name: socket.data.username || '알 수 없음',
          profileImage: '/placeholder.svg'
        };
        
        // 사용자가 채팅방에 없으면 추가
        if (messageUser && !chatRoom.users.some(u => u.id === messageUser.id)) {
          // ChatUser 타입에 맞게 사용자 정보 구조 조정
          const userToAdd: ChatUser = {
            id: messageUser.id,
            name: messageUser.name,
            profileImage: messageUser.profileImage || '/placeholder.svg'
          };
          chatRoom.users.push(userToAdd);
        }
        
        // 개발 환경에서는 구매 정보가 없어도 메시지 전송 허용
        const isDevelopment = process.env.NODE_ENV === 'development';
        let purchaseId: number | undefined;
        
        if (roomId.startsWith('purchase_')) {
          const purchaseIdStr = roomId.split('_')[1];
          const parsedId = parseInt(purchaseIdStr);
          if (!isNaN(parsedId)) {
            purchaseId = parsedId;
          }
        }
        
        console.log(`메시지 처리: roomId=${roomId}, purchaseId=${purchaseId || '없음'}`);
        
        // 데이터베이스 채팅 로직
        let dbRecipientId: number | undefined;
        
        try {
          if (purchaseId) {
            // 구매 정보 조회
            const purchase = await prisma.purchase.findUnique({
              where: { id: purchaseId },
              select: {
                buyerId: true,
                sellerId: true
              }
            });
            
            if (purchase) {
              // 수신자 ID 결정 - 발신자가 구매자면 판매자에게, 발신자가 판매자면 구매자에게
              dbRecipientId = messageUser.id === purchase.buyerId 
                ? purchase.sellerId 
                : purchase.buyerId;
              
              console.log(`발신자 ID: ${messageUser.id}, 구매자 ID: ${purchase.buyerId}, 판매자 ID: ${purchase.sellerId}, 수신자 ID: ${dbRecipientId}`);
            } else if (!isDevelopment) {
              console.error(`구매 ID ${purchaseId}에 해당하는 구매 정보가 없습니다.`);
              // 개발 환경이 아니면 오류 반환, 개발 환경이면 진행
              if (!isDevelopment) {
                socket.emit('socketError', { 
                  message: '구매 정보를 찾을 수 없습니다.',
                  code: 'PURCHASE_NOT_FOUND'
                });
                return;
              }
            }
          }
          
          // 개발 환경 또는 DB에서 수신자를 찾지 못한 경우 임시 수신자 설정
          if (!dbRecipientId) {
            if (isDevelopment) {
              // 개발 환경에서 임시 수신자 ID 설정 (발신자가 1이면 2, 아니면 1)
              dbRecipientId = messageUser.id === 1 ? 2 : 1;
              console.log(`개발 환경: 임시 수신자 ID ${dbRecipientId} 할당됨`);
            } else {
              console.warn('수신자 정보를 찾을 수 없지만, 메시지는 계속 처리합니다.');
              // 임시 수신자로 메시지 처리 (발신자와 다른 ID로 설정)
              dbRecipientId = messageUser.id === 1 ? 2 : 1;
            }
          }
        } catch (error) {
          console.error('수신자 정보 조회 중 오류:', error);
          
          if (isDevelopment) {
            // 개발 환경에서는 임시 수신자 ID 설정 (발신자가 1이면 2, 아니면 1)
            dbRecipientId = messageUser.id === 1 ? 2 : 1;
            console.log(`개발 환경 (오류 발생): 임시 수신자 ID ${dbRecipientId} 할당됨`);
          } else {
            socket.emit('socketError', { 
              message: '메시지 수신자 정보를 확인할 수 없습니다.',
              details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
              code: 'RECIPIENT_ERROR'
            });
            return;
          }
        }
        
        // 새 메시지 객체 생성
        const messageId = data.clientId || randomUUID();
        const newMessage: ChatMessage = {
          id: messageId,
          senderId: messageUser.id,
          senderName: messageUser.name,
          text: chat,
          timestamp: new Date().toISOString()
        };
        
        // 채팅방에 메시지 추가
        chatRoom.messages.push(newMessage);
        
        // 메시지를 채팅방에 브로드캐스트
        io.to(roomId).emit('onReceive', {
          messageId: messageId,
          chat: newMessage.text,
          timestamp: newMessage.timestamp,
          user: {
            id: messageUser.id,
            name: messageUser.name,
            profileImage: messageUser.profileImage
          },
          clientId: clientId // 클라이언트 ID 전달 (동일성 확인용)
        });
        
        // 성공 응답 전송
        if (clientId) {
          socket.emit('messageSent', {
            messageId: messageId,
            status: 'sent',
            roomId: roomId,
            clientId: clientId
          });
        }

        console.log(`메시지 전송됨: ${roomId} - ${messageUser.name}: ${chat}`);
      } catch (error) {
        console.error('메시지 전송 오류:', error);
        
        // 오류 상세 정보 생성
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        // 소켓 오류 이벤트 발생
        socket.emit('socketError', { 
          message: '메시지 전송 중 오류가 발생했습니다.',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
          stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
          code: 'MESSAGE_SEND_ERROR'
        });
        
        // 메시지 전송 실패 이벤트 발생 (클라이언트 ID가 있는 경우)
        if (data.clientId) {
          socket.emit('messageSent', {
            messageId: data.clientId,
            status: 'failed',
            roomId: data.roomId || '',
            error: errorMessage
          });
        }
      }
    });

    // 메시지 읽음 처리 이벤트
    socket.on('markAsRead', async ({ roomId, userId }) => {
      try {
        if (!socket.data.userId) {
          socket.emit('error', { message: '인증되지 않은, 사용자입니다.' });
          return;
        }

        // 채팅방 정보 확인
        const room = await prisma.room.findUnique({
          where: { name: roomId }
        });

        if (!room) {
          socket.emit('error', { message: '존재하지 않는 채팅방입니다.' });
          return;
        }

        // 메시지 읽음 처리
        const result = await prisma.message.updateMany({
          where: {
            room: {
              id: room.id
            },
            receiverId: socket.data.userId,
            isRead: false
          },
          data: { isRead: true }
        });

        // 읽은 메시지 ID 조회
        if (result.count > 0) {
          const readMessages = await prisma.message.findMany({
            where: {
              room: {
                id: room.id
              },
              receiverId: socket.data.userId,
              isRead: true
            },
            select: { id: true }
          });

          // 발신자에게 읽음 상태 알림
          socket.to(roomId).emit('messageRead', {
            roomId,
            messageIds: readMessages.map(msg => msg.id.toString())
          });
        }
      } catch (error) {
        console.error('메시지 읽음 처리 오류:', error);
        socket.emit('error', { 
          message: error instanceof Error ? error.message : '메시지 읽음 처리 중 오류가 발생했습니다.',
          details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : '상세 정보 없음') : undefined
        });
      }
    });

    // 채팅방 나가기 이벤트
    socket.on('leaveRoom', async ({ roomId }) => {
      try {
        socket.leave(roomId);
        console.log(`사용자 ${socket.data.userId}가 채팅방 ${roomId}에서 나갔습니다.`);

        if (socket.data.userId) {
          // 채팅방 나가기 처리 (채팅 안보이게)
          await prisma.room.update({
            where: { name: roomId },
            data: { chatInvisibleTo: socket.data.userId }
          });
        }
      } catch (error) {
        console.error('채팅방 나가기 오류:', error);
        socket.emit('error', { 
          message: error instanceof Error ? error.message : '채팅방 나가기 중 오류가 발생했습니다.',
          details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : '상세 정보 없음') : undefined
        });
      }
    });

    // 연결 해제 이벤트
    socket.on('disconnect', () => {
      console.log('클라이언트 연결 해제:', socket.id);
    });

    // 소켓 내장 오류 핸들러
    socket.on('error', (error) => {
      console.error('Socket.io 내장 오류:', error);
      
      // 로그에 더 많은 정보 출력
      console.debug('Socket.io 오류 상세 정보:', typeof error === 'object' ? JSON.stringify(error, null, 2) : error);
      
      // 빈 객체인 경우 기본 오류 메시지 설정
      let errorMessage = '채팅 서버 연결에 문제가 발생했습니다.';
      let errorDetails = '알 수 없는 오류입니다.';
      let errorCode = 'UNKNOWN_ERROR';
      
      if (error) {
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (typeof error === 'object') {
          if (Object.keys(error).length > 0) {
            errorMessage = error.message || error.details || '알 수 없는 오류가 발생했습니다.';
            errorDetails = error.stack || error.details || '상세 정보 없음';
            errorCode = error.code || 'ERROR';
          } else {
            // 빈 객체인 경우 구체적인 오류 메시지 설정
            errorMessage = '채팅방을 찾을 수 없거나 참여할 권한이 없습니다.';
            errorCode = 'ROOM_ACCESS_ERROR';
          }
        }
      }
      
      // 항상 message 속성이 포함된 객체를 전달
      socket.emit('socketError', { 
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        timestamp: new Date().toISOString(),
        code: errorCode
      });
    });
  });

  console.log('Socket.io 서버 설정 완료!');
  res.end();
} 