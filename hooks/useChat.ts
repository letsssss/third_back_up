import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket, io } from 'socket.io-client';

// 메시지 인터페이스 정의
export interface Message {
  id: number | string;
  senderId: number | string;
  text: string;
  timestamp: string;
  clientId?: string;
  status?: 'sending' | 'sent' | 'failed';
  isMine?: boolean;
}

// 채팅 훅 옵션 인터페이스
interface UseChatOptions {
  transactionId: string | number; // 거래 ID
  userId: string | number;        // 현재 사용자 ID
  userRole: 'buyer' | 'seller';   // 사용자 역할 (구매자/판매자)
  otherUserId?: number | string;  // 상대방 ID
}

// 채팅 훅 반환 타입
interface UseChatReturn {
  messages: Message[];                    // 메시지 목록
  isLoading: boolean;                     // 로딩 상태
  isSocketConnected: boolean;             // 소켓 연결 상태
  sendMessage: (content: string) => Promise<boolean>; // 메시지 전송 함수
  fetchMessages: () => Promise<void>;     // 메시지 가져오기 함수
}

// 채팅 커스텀 훅
export function useChat({
  transactionId,
  userId,
  userRole,
  otherUserId
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);

  // 메시지 목록 가져오기
  const fetchMessages = useCallback(async () => {
    if (!transactionId) return;
    
    setIsLoading(true);
    try {
      console.log('메시지 가져오기 시도 - 거래 ID:', transactionId);
      const response = await fetch(`/api/messages?purchaseId=${transactionId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('메시지가 없습니다.');
          setMessages([]);
          return;
        }
        throw new Error('메시지를 불러오는데 실패했습니다');
      }
      
      const data = await response.json();
      console.log('받은 메시지 데이터:', data);
      
      if (data.messages && Array.isArray(data.messages)) {
        // API 응답 데이터를 컴포넌트 형식에 맞게 변환
        const formattedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          senderId: Number(msg.senderId),
          text: msg.content,
          timestamp: msg.createdAt,
          isMine: Number(msg.senderId) === Number(userId)
        }));
        
        console.log('변환된 메시지:', formattedMessages, '사용자 ID:', userId);
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('메시지 가져오기 오류:', error);
    } finally {
      setIsLoading(false);
    }
  }, [transactionId, userId]);

  // 소켓 연결 설정
  useEffect(() => {
    if (!transactionId || !userId) return;

    const setupSocket = async () => {
      try {
        // 소켓 API 초기화
        await fetch('/api/socket');
        
        // 소켓 클라이언트 생성
        const socket = io({
          path: '/api/socket',
          reconnectionAttempts: 5,        // 재연결 시도 횟수
          reconnectionDelay: 1000,        // 재연결 간격 (ms)
          timeout: 10000,                 // 연결 타임아웃 (ms)
          forceNew: true,                 // 새 연결 강제
          transports: ['websocket', 'polling'],  // 연결 방식
        });
        
        socketRef.current = socket;
        
        // 연결 이벤트
        socket.on('connect', () => {
          console.log('Socket.io 연결됨:', socket.id);
          setSocketConnected(true);
          
          // 거래 ID로 채팅방 참가
          const roomId = `purchase_${transactionId}`;
          socket.emit('createOrJoinRoom', {
            purchaseId: transactionId,
            userId: userId,
            userRole: userRole
          });
          console.log(`채팅방 참가: ${roomId}, 사용자: ${userId} (${userRole})`);
        });
        
        // 메시지 수신 이벤트
        socket.on('message', (data) => {
          console.log('메시지 수신:', data);
          
          const newMsg: Message = {
            id: data.id || Date.now(),
            senderId: data.senderId,
            text: data.content,
            timestamp: data.timestamp || new Date().toISOString(),
            isMine: Number(data.senderId) === Number(userId)
          };
          
          setMessages(prev => [...prev, newMsg]);
        });
        
        // 메시지 전송 결과 이벤트 (메시지 상태 업데이트)
        socket.on('messageSent', (data) => {
          console.log('메시지 전송 결과:', data);
          // 여기서 메시지 상태를 업데이트할 수 있음
        });
        
        // 채팅방 참가 결과 이벤트
        socket.on('roomJoined', (data) => {
          console.log('채팅방 참가 결과:', data);
        });
        
        // 소켓 오류 이벤트
        socket.on('socketError', (error) => {
          console.error('소켓 오류:', error);
        });
        
        // 연결 해제 시 이벤트
        socket.on('disconnect', () => {
          console.log('Socket.io 연결 해제됨');
          setSocketConnected(false);
        });
        
        // 오류 이벤트
        socket.on('error', (error) => {
          const errorInfo = error ? 
            (typeof error === 'object' ? JSON.stringify(error, null, 2) : error) : 
            '알 수 없는 오류';
          console.error('Socket.io 오류 발생:', errorInfo);
        });

        // 연결 오류 이벤트
        socket.on('connect_error', (error) => {
          const errorInfo = error ? 
            (typeof error === 'object' ? JSON.stringify(error, null, 2) : error) : 
            '알 수 없는 오류';
          console.error('Socket.io 연결 오류:', errorInfo);
        });

        // 재연결 실패 이벤트
        socket.on('reconnect_failed', () => {
          console.error('Socket.io 재연결 실패');
          setSocketConnected(false);
        });

        return socket;
      } catch (error) {
        console.error('Socket.io 초기화 오류:', error);
        return null;
      }
    };
    
    let socket: Socket | undefined;
    setupSocket().then(s => {
      if (s) socket = s;
    });
    
    // 컴포넌트 언마운트 시 소켓 연결 해제
    return () => {
      console.log('Socket.io 연결 정리 중...');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [transactionId, userId, userRole]);

  // 메시지 전송 함수
  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!content.trim() || !transactionId || !userId || !otherUserId) {
      console.error('메시지 전송에 필요한 정보가 부족합니다');
      return false;
    }
    
    // 전송할 메시지 준비
    const tempMessageId = `${userRole}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const purchaseId = typeof transactionId === 'string' ? parseInt(transactionId) : transactionId;
    const receiverId = typeof otherUserId === 'string' ? parseInt(otherUserId as string) : otherUserId;
    
    console.log('메시지 전송 시도:', {
      수신자ID: receiverId,
      수신자ID타입: typeof receiverId,
      발신자ID: userId,
      발신자ID타입: typeof userId,
      내용: content,
      거래ID: purchaseId,
      거래ID타입: typeof purchaseId
    });
    
    // 낙관적 UI 업데이트 - 메시지 즉시 표시
    const newMessage: Message = {
      id: Date.now(),
      senderId: userId,
      text: content,
      timestamp: new Date().toISOString(),
      clientId: tempMessageId,
      status: 'sending',
      isMine: true
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    try {
      // API로 메시지 저장 (소켓 상태와 관계없이 항상 실행)
      const devToken = `dev-jwt-${userId}`;
      
      // API 메시지 저장 요청
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${devToken}`
        },
        credentials: 'include',
        body: JSON.stringify({
          receiverId: receiverId,
          content: content,
          purchaseId: purchaseId
        })
      });
      
      console.log('서버 응답 상태:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API 응답 오류:', response.status, errorText);
        
        // API 저장 실패 시 메시지 상태 업데이트
        setMessages(prev => 
          prev.map(msg => 
            msg.clientId === tempMessageId 
              ? { ...msg, status: 'failed' } 
              : msg
          )
        );
        return false;
      }
      
      // API 성공 시 메시지 상태를 'sent'로 업데이트
      setMessages(prev => 
        prev.map(msg => 
          msg.clientId === tempMessageId 
            ? { ...msg, status: 'sent' } 
            : msg
        )
      );
      
      // 소켓이 연결되어 있으면 소켓을 통한 실시간 메시지 전송 시도 (백그라운드에서)
      if (socketRef.current && socketConnected) {
        // 비동기적으로 소켓 전송 시도 (결과를 기다리지 않음)
        Promise.race([
          (async () => {
            try {
              socketRef.current?.emit('chatMessage', {
                roomId: `purchase_${purchaseId}`,
                message: {
                  senderId: userId,
                  receiverId: receiverId,
                  content: content,
                  purchaseId: purchaseId,
                  messageId: tempMessageId
                }
              });
              
              console.log('소켓 메시지 전송 시도 완료');
              return { success: true };
            } catch (error) {
              console.error('소켓 메시지 전송 중 오류:', error);
              return { success: false, error };
            }
          })(),
          // 타임아웃 Promise (3초로 감소)
          new Promise<{success: false, error: string}>(resolve => 
            setTimeout(() => resolve({ success: false, error: '소켓 타임아웃 (3초 경과)' }), 3000)
          )
        ]).then(result => {
          console.log('소켓 전송 백그라운드 결과:', result);
        }).catch(error => {
          console.log('소켓 전송 백그라운드 오류:', error);
        });
      }
      
      // API 저장이 성공했으므로 메시지 전송 성공으로 간주
      return true;
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      
      // 오류 발생 시 메시지 상태 업데이트
      setMessages(prev => 
        prev.map(msg => 
          msg.clientId === tempMessageId 
            ? { ...msg, status: 'failed' } 
            : msg
        )
      );
      return false;
    }
  }, [transactionId, userId, userRole, otherUserId, socketConnected]);

  return {
    messages,
    isLoading,
    isSocketConnected: socketConnected,
    sendMessage,
    fetchMessages
  };
} 