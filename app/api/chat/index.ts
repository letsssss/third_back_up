import { NextApiRequest } from 'next';
import { NextApiResponseServerIO } from '@/lib/socket';
import prisma from '@/lib/prisma';
import { cors } from '@/lib/cors';
import { verifyToken, getTokenFromHeaders, getTokenFromCookies } from '@/lib/auth';

// 채팅방 API 핸들러
export default async function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // 인증 토큰 검증
  try {
    const token = getTokenFromHeaders(req) || getTokenFromCookies(req);
    if (!token) {
      return res.status(401).json({ error: '인증되지 않은 요청입니다.' });
    }
    
    const decoded = verifyToken(token);
    if (!decoded || typeof decoded !== 'object' || !('userId' in decoded)) {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }
    
    const userId = decoded.userId;
    
    // GET 요청 처리 - 채팅방 목록 또는 특정 채팅방 조회
    if (req.method === 'GET') {
      const { roomId, purchaseId } = req.query;
      
      // 특정 채팅방 조회
      if (roomId) {
        const room = await prisma.room.findUnique({
          where: { name: roomId as string },
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
            },
            messages: {
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
            }
          }
        });
        
        if (!room) {
          return res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' });
        }
        
        // 채팅방 접근 권한 확인
        const isParticipant = room.participants.some(p => p.userId === userId);
        if (!isParticipant) {
          return res.status(403).json({ error: '채팅방에 접근할 권한이 없습니다.' });
        }
        
        return res.status(200).json({ room });
      }
      
      // 특정 구매에 연결된 채팅방 조회
      if (purchaseId) {
        const room = await prisma.room.findFirst({
          where: { 
            purchaseId: parseInt(purchaseId as string),
            participants: {
              some: {
                userId
              }
            }
          },
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
        
        return res.status(200).json({ room });
      }
      
      // 사용자의 모든 채팅방 목록 조회
      const rooms = await prisma.room.findMany({
        where: {
          participants: {
            some: {
              userId
            }
          }
        },
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
          },
          purchase: {
            select: {
              id: true,
              status: true,
              post: {
                select: {
                  id: true,
                  title: true,
                }
              }
            }
          }
        },
        orderBy: {
          timeOfLastChat: 'desc'
        }
      });
      
      return res.status(200).json({ rooms });
    }
    
    // POST 요청 처리 - 새 채팅방 생성
    if (req.method === 'POST') {
      const { name, purchaseId, participantIds } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: '채팅방 이름은 필수입니다.' });
      }
      
      if (!participantIds || !Array.isArray(participantIds) || participantIds.length < 2) {
        return res.status(400).json({ error: '최소 2명 이상의 참여자가 필요합니다.' });
      }
      
      // 자신이 포함되어 있는지 확인
      if (!participantIds.includes(userId)) {
        return res.status(400).json({ error: '채팅방 생성자는 반드시 참여자에 포함되어야 합니다.' });
      }
      
      // 채팅방 이름 중복 확인
      const existingRoom = await prisma.room.findUnique({
        where: { name }
      });
      
      if (existingRoom) {
        return res.status(409).json({ error: '이미 존재하는 채팅방 이름입니다.' });
      }
      
      // 채팅방 생성
      const room = await prisma.room.create({
        data: {
          name,
          purchaseId: purchaseId ? parseInt(purchaseId as string) : undefined,
          participants: {
            create: participantIds.map(id => ({
              user: { connect: { id: parseInt(id.toString()) } }
            }))
          }
        },
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
      
      return res.status(201).json({ room });
    }
    
    // PUT 요청 처리 - 채팅방 업데이트 (나가기 등)
    if (req.method === 'PUT') {
      const { roomId, action } = req.body;
      
      if (!roomId) {
        return res.status(400).json({ error: '채팅방 ID는 필수입니다.' });
      }
      
      // 채팅방 존재 확인
      const room = await prisma.room.findUnique({
        where: { name: roomId as string },
        include: {
          participants: true
        }
      });
      
      if (!room) {
        return res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' });
      }
      
      // 채팅방 참여자 확인
      const isParticipant = room.participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return res.status(403).json({ error: '채팅방에 접근할 권한이 없습니다.' });
      }
      
      // 채팅방 나가기
      if (action === 'leave') {
        await prisma.room.update({
          where: { name: roomId as string },
          data: { chatInvisibleTo: userId }
        });
        
        return res.status(200).json({ message: '채팅방을 나갔습니다.' });
      }
      
      return res.status(400).json({ error: '지원하지 않는 작업입니다.' });
    }
    
    return res.status(405).json({ error: '지원하지 않는 HTTP 메서드입니다.' });
  } catch (error) {
    console.error('채팅방 API 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
} 