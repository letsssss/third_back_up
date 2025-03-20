import { Server as NetServer } from 'http';
import { Socket } from 'net';
import { NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { User } from '@prisma/client';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

// 클라이언트 → 서버 이벤트 정의
export interface ClientToServerEvents {
  authenticate: (data: { token: string }) => void;
  createOrJoinRoom: (data: { 
    roomId?: string; 
    purchaseId?: string;
    userId?: number;
    userName?: string;
    user?: {
      id: number;
      name: string;
      profileImage?: string;
    }
  }) => void;
  onJoinRoom: (roomId: string) => void;
  onSend: (data: { 
    roomId: string; 
    chat: string; 
    user?: {
      id: number;
      name: string;
      profileImage?: string;
    };
    clientId?: string;
  }) => void;
  leaveRoom: (data: { roomId: string }) => void;
  markAsRead: (data: { roomId: string; userId: number }) => void;
}

// 서버 → 클라이언트 이벤트 정의
export interface ServerToClientEvents {
  authenticated: (data: { 
    success: boolean; 
    message?: string; 
    user?: { 
      id: number; 
      name: string; 
      profileImage?: string | null; 
    };
    details?: string;
  }) => void;
  socketError: (data: { 
    message: string; 
    details?: string; 
    code?: string;
    timestamp?: string;
    originalError?: any;
  }) => void;
  chatHistory: (data: { messages: Message[] }) => void;
  roomJoined: (data: {
    roomId: string;
    participants: { id: number; name: string; profileImage?: string | null }[];
    messages: Message[];
  }) => void;
  onReceive: (data: { 
    user: { 
      id: number; 
      name: string; 
      profileImage?: string; 
    }; 
    chat: string; 
    messageId?: string;
    timestamp?: string;
  }) => void;
  messageRead: (data: { 
    messageId?: string; 
    roomId?: string; 
    messageIds?: string[];
  }) => void;
  error: (data: { message: string; details?: string; code?: string }) => void;
  messageSent: (data: { messageId: string; status: string; roomId: string }) => void;
}

// 서버 간 이벤트 정의 (클러스터링 시 사용)
export interface InterServerEvents {
  ping: () => void;
}

// 소켓 데이터 정의
export interface SocketData {
  userId: number;
  username: string;
}

export interface ChatUser {
  id: number;
  name: string;
  profileImage?: string | null;
}

export interface Message {
  id: number | string;
  content: string;
  createdAt: Date | string;
  isRead: boolean;
  user?: ChatUser;
  senderId?: number;
  timestamp?: string; // 호환성을 위해 추가
} 