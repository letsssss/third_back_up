import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket, io } from 'socket.io-client';

// 메시지 인터페이스 정의
export interface Message {
  id: string;
  clientId?: string;
  senderId: string;
  receiverId?: string;
  text: string;
  timestamp: string;
  isMine: boolean;
  status?: 'sending' | 'sent' | 'failed';
}

// useChat 훅의 옵션
export interface ChatOptions {
  userId?: string;
  transactionId?: string;
  otherUserId?: string;
  userRole?: 'buyer' | 'seller' | 'user';
}

// 훅 반환 타입
export interface ChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  socketConnected: boolean;
  sendMessage: (content: string) => Promise<boolean>;
  fetchMessages: (force?: boolean) => Promise<boolean>;
  roomId: string | null;
  transactionInfo: any | null;
  otherUserInfo: any | null;
  conversations: any[];
  hasMore: boolean;
}

// 로컬 스토리지에서 사용자 정보 가져오기 함수
const getUserFromLocalStorage = (): { id?: number, name?: string } => {
  if (typeof window === 'undefined') return {};
  
  try {
    const userString = localStorage.getItem('user');
    if (!userString) return {};
    
    const user = JSON.parse(userString);
    return user;
  } catch (error) {
    console.error('로컬 스토리지에서 사용자 정보를 불러오는 중 오류 발생:', error);
    return {};
  }
};

// 채팅 커스텀 훅
export function useChat({
  transactionId,
  userId = '',
  userRole = 'buyer',
  otherUserId = ''
}: ChatOptions): ChatReturn {
  // 상태 관리
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [transactionInfo, setTransactionInfo] = useState<any | null>(null);
  const [otherUserInfo, setOtherUserInfo] = useState<any | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  
  // Socket 인스턴스와 연결 시도 카운트 참조
  const socketRef = useRef<Socket | null>(null);
  const connectionAttempts = useRef(0);
  
  // 사용자 ID를 localStorage에서 가져오기
  const [actualUserId, setActualUserId] = useState<string | null>(null);
  
  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') return;
    
    let id: string | null = null;
    
    try {
      // 우선 제공된 userId 사용
      if (userId) {
        id = userId;
      } else {
        // localStorage에서 사용자 정보 가져오기
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user && user.id) {
            id = user.id.toString();
          }
        }
        
        // 직접 userId 시도
        if (!id) {
          const directUserId = localStorage.getItem('userId');
          if (directUserId) {
            id = directUserId;
          }
        }
      }
    } catch (error) {
      console.error('로컬스토리지에서 사용자 ID 가져오기 실패:', error);
    }
    
    setActualUserId(id);
    console.log('[useChat] 사용자 ID 설정:', id);
  }, [userId]);

  // setupSocket 함수 선언
  const setupSocket = useCallback(() => {
    if (!actualUserId) {
      console.log('[useChat] 사용자 ID 없음: 소켓 연결 취소');
      return;
    }

    // 이미 연결이 시도 중이거나 연결된 경우 리턴
    if (socketRef.current) {
      console.log('[useChat] 이미 소켓이 존재함, 연결 시도 취소');
      return;
    }

    try {
      console.log('[useChat] 소켓 연결 시도:', {
        userId: actualUserId,
        transactionId,
        otherUserId,
        userRole
      });

      // 소켓 연결 객체 생성
      socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
        path: '/api/socket',
        withCredentials: true,
        reconnectionAttempts: 15,
        timeout: 20000,
        auth: {
          userId: actualUserId,
          token: localStorage.getItem('auth-token') || localStorage.getItem('token') || ''
        },
        extraHeaders: {
          Authorization: `Bearer ${localStorage.getItem('auth-token') || localStorage.getItem('token') || ''}`
        }
      });

      const authToken = localStorage.getItem('auth-token') || localStorage.getItem('token') || '';
      console.log('[useChat] 소켓 연결 정보:', {
        userId: actualUserId,
        hasToken: !!authToken,
        tokenLength: authToken.length > 0 ? `${authToken.substring(0, 10)}...` : '토큰 없음'
      });

      // 연결 이벤트 처리
      socketRef.current.on('connect', () => {
        console.log('Socket.io 연결 성공!');
        setSocketConnected(true);
        connectionAttempts.current = 0;
        
        // 거래 ID가 있으면 해당 거래 채팅방에 참여
        if (transactionId) {
          console.log('거래 채팅방 참여 요청:', transactionId);
          socketRef.current?.emit('createOrJoinRoom', {
            purchaseId: transactionId,
            userId: actualUserId,
            userRole: userRole
          });
        }
      });

      // 안전하게 이벤트 리스너 연결
      if (socketRef.current) {
        const socket = socketRef.current;

        // 메시지 수신 이벤트
        socket.on('onReceive', (msg) => {
          console.log('메시지 수신:', msg);
          
          // 이미 존재하는 메시지인지 확인 (중복 방지)
          setMessages(prev => {
            const isDuplicate = prev.some(m => 
              m.id === msg.id || 
              (m.clientId && m.clientId === msg.clientId)
            );
            
            if (!isDuplicate) {
              const receivedMessage: Message = {
                id: msg.id || `temp-${Date.now()}`,
                senderId: String(msg.senderId || msg.user?.id),
                text: msg.content || msg.chat,
                timestamp: msg.createdAt || new Date().toISOString(),
                isMine: String(msg.senderId || msg.user?.id) === actualUserId,
                status: 'sent',
                clientId: msg.clientId
              };
              
              return [...prev, receivedMessage];
            }
            return prev;
          });
        });
        
        // 메시지 전송 결과 이벤트 (메시지 상태 업데이트)
        socket.on('messageSent', (data) => {
          console.log('메시지 전송 결과:', data);
          // 임시 메시지의 상태 업데이트
          if (data && data.messageId) {
            if (data.status === 'sent' || data.status === 'success') {
              // 성공적으로 전송된 메시지 상태 업데이트
              updateMessageStatus(
                data.clientId || data.messageId, 
                'sent', 
                data.messageId
              );
              console.log('메시지 전송 성공:', data.messageId);
            } else if (data.status === 'failed') {
              // 실패한 메시지 상태 업데이트
              updateMessageStatus(
                data.clientId || data.messageId, 
                'failed'
              );
              console.error('메시지 전송 실패:', data.error || '알 수 없는 오류');
            }
          }
        });
        
        // 채팅방 참가 결과 이벤트
        socket.on('roomJoined', (data) => {
          console.log('채팅방 참가 결과:', data);
          if (data && data.messages && Array.isArray(data.messages)) {
            const formattedMessages = data.messages.map((msg: any) => ({
              id: msg.id,
              senderId: Number(msg.senderId),
              text: msg.content,
              timestamp: msg.createdAt || msg.timestamp,
              isMine: Number(msg.senderId) === Number(actualUserId),
              status: 'sent'
            }));
            setMessages(formattedMessages);
          }
        });
        
        // 채팅 기록 이벤트
        socket.on('chatHistory', (data) => {
          console.log('채팅 기록 수신:', data);
          if (data && data.messages && Array.isArray(data.messages)) {
            const formattedMessages = data.messages.map((msg: any) => ({
              id: msg.id,
              senderId: Number(msg.senderId || msg.user?.id),
              text: msg.content,
              timestamp: msg.createdAt || msg.timestamp,
              isMine: Number(msg.senderId || msg.user?.id) === Number(actualUserId),
              status: 'sent'
            }));
            setMessages(formattedMessages);
          }
        });
        
        // 소켓 오류 이벤트
        socket.on('socketError', (error) => {
          console.error('소켓 오류:', error);
        });
        
        // 연결 해제 시 이벤트
        socket.on('disconnect', (reason) => {
          console.log('Socket.io 연결 해제됨, 이유:', reason);
          setSocketConnected(false);
          
          // 자동 재연결이 불가능한 경우에만 수동으로 재연결 시도
          if (reason === 'io server disconnect' || reason === 'io client disconnect') {
            console.log('수동 재연결 시도...');
            setTimeout(() => socketRef.current?.connect(), 1000);
          }
        });
        
        // 재연결 시도 이벤트
        socket.on('reconnect_attempt', (attemptNumber) => {
          console.log(`재연결 시도 ${attemptNumber}번째...`);
        });
        
        // 재연결 성공 이벤트
        socket.on('reconnect', (attemptNumber) => {
          console.log(`재연결 성공! (${attemptNumber}번째 시도)`);
          setSocketConnected(true);
          
          // 재연결 후 채팅방 재참가
          console.log('재연결 후 채팅방 재참가 시도');
          socketRef.current?.emit('createOrJoinRoom', {
            purchaseId: transactionId,
            userId: actualUserId,
            userRole: userRole
          });
        });
        
        // 오류 이벤트
        socket.on('error', (error) => {
          const errorInfo = error ? 
            (typeof error === 'object' ? JSON.stringify(error, null, 2) : error) : 
            '알 수 없는 오류';
          console.error('Socket.io 오류 발생:', errorInfo);
          
          // 소켓 오류가 발생해도 메시지 로드 시도
          if ((errorInfo.includes('인증') || errorInfo.includes('auth')) && !isLoading) {
            console.log('인증 오류 발생으로 HTTP API 통해 메시지 로드 시도');
            fetchMessages(true).catch(err => 
              console.error('메시지 로드 실패:', err)
            );
          }
        });

        // 연결 오류 이벤트
        socket.on('connect_error', (error) => {
          const errorInfo = error ? 
            (typeof error === 'object' ? JSON.stringify(error, null, 2) : error) : 
            '알 수 없는 오류';
          console.error('Socket.io 연결 오류:', errorInfo);
          
          // 인증 관련 오류인 경우 추가 디버깅 정보 제공
          if (errorInfo.includes('인증') || errorInfo.includes('auth')) {
            const authToken = localStorage.getItem('auth-token') || localStorage.getItem('token') || '';
            console.error('Socket.io 인증 오류 - 추가 정보:', {
              userId: actualUserId,
              hasToken: !!authToken,
              tokenLength: authToken.length > 0 ? `${authToken.substring(0, 10)}...` : '토큰 없음',
              tokenProvider: authToken ? (localStorage.getItem('auth-token') ? 'auth-token' : 'token') : '없음',
              cookieAvailable: document.cookie.includes('token') || document.cookie.includes('auth-token')
            });
            
            // 인증 오류 발생 시 에러 메시지 설정
            setError('소켓 연결 인증 오류 발생');
          }
        });

        // 재연결 실패 이벤트
        socket.on('reconnect_failed', () => {
          console.error('Socket.io 재연결 실패');
          setSocketConnected(false);
          
          // 재연결 실패 시 다시 연결 시도
          console.log('재연결 완전 실패 후 소켓 재생성 시도...');
          setTimeout(setupSocket, 2000);
        });
      }

      return socketRef.current;
    } catch (error) {
      console.error('[useChat] 소켓 연결 생성 중 오류:', error);
      setError('소켓 연결 실패');
      return null;
    }
  }, [actualUserId, transactionId, otherUserId, userRole]);

  // 소켓 연결 설정 useEffect 제거하고 actualUserId 변경 시 소켓 설정 실행하는 useEffect만 유지
  useEffect(() => {
    if (actualUserId) {
      setupSocket();
    }
    
    return () => {
      if (socketRef.current) {
        console.log('[useChat] 소켓 연결 정리');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [actualUserId, setupSocket]);

  // 메시지 상태 업데이트 도우미 함수
  const updateMessageStatus = useCallback(
    (messageId: string, status: 'sending' | 'sent' | 'failed', newId?: string) => {
      setMessages((prev) =>
        prev.map((msg) => {
          // clientId나 id가 일치하는 메시지 찾기
          if (msg.id === messageId || msg.clientId === messageId) {
            // 새 ID가 제공된 경우 ID 업데이트
            return {
              ...msg,
              id: newId || msg.id,
              status
            };
          }
          return msg;
        })
      );
    },
    []
  );
  
  // 중복 메시지 확인 함수
  const isMessageDuplicate = useCallback((messageId: string | number, clientId?: string) => {
    return messages.some(msg => 
      (messageId && (msg.id === messageId)) || 
      (clientId && msg.clientId === clientId)
    );
  }, [messages]);

  // 메시지 목록 가져오기
  const fetchMessages = useCallback(async (force: boolean = false): Promise<boolean> => {
    if (!actualUserId) {
      console.error('[useChat] 사용자 ID가 없어 메시지를 가져올 수 없습니다.');
      return false;
    }
    
    // 이미 로딩 중이면 중복 요청 방지 (isLoadingRef 대신 isLoading 사용)
    if (isLoading && !force) {
      console.log('[useChat] 이미 메시지를 가져오는 중입니다.');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[useChat] 메시지 가져오기 시도:', { 
        transactionId, 
        userId: actualUserId,
        otherUserId
      });
      
      // HTTP API를 통해 메시지 가져오기
      const params = new URLSearchParams();
      if (transactionId) {
        params.append('purchaseId', transactionId);
      }
      if (otherUserId) {
        params.append('conversationWith', otherUserId);
      }
      
      const response = await fetch(`/api/messages?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token') || ''}`,
        }
      });
      
      if (!response.ok) {
        throw new Error(`메시지 가져오기 실패: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[useChat] 메시지 가져오기 결과:', data);
      
      if (data.messages && Array.isArray(data.messages)) {
        // 메시지 형식 변환
        const formattedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          senderId: String(msg.senderId),
          receiverId: msg.receiverId ? String(msg.receiverId) : undefined,
          text: msg.content,
          timestamp: msg.createdAt,
          isMine: String(msg.senderId) === actualUserId,
          status: 'sent'
        }));
        
        setMessages(formattedMessages);
      }
      
      // 추가 정보 설정
      if (data.room) {
        setRoomId(data.room.id);
      }
      if (data.transaction) {
        setTransactionInfo(data.transaction);
      }
      if (data.otherUser) {
        setOtherUserInfo(data.otherUser);
      }
      if (data.conversations) {
        setConversations(data.conversations);
      }
      if (data.hasMore !== undefined) {
        setHasMore(data.hasMore);
      }
      
      return true;
    } catch (error) {
      console.error('[useChat] 메시지 가져오기 오류:', error);
      setError('메시지를 불러오는데 실패했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [actualUserId, transactionId, otherUserId, isLoading]);

  // 사용자가 보기에 쉬운 오류 메시지 반환
  const getHumanReadableError = useCallback((error: any): string => {
    if (!error) return '알 수 없는 오류가 발생했습니다.';
    
    const errorStr = typeof error === 'string' 
      ? error 
      : error.message || JSON.stringify(error);
      
    if (errorStr.includes('인증') || errorStr.includes('auth')) {
      return '인증 오류가 발생했습니다. 로그인 상태를 확인해 주세요.';
    }
    
    if (errorStr.includes('timeout') || errorStr.includes('시간 초과')) {
      return '서버 연결 시간이 초과되었습니다. 네트워크 상태를 확인해 주세요.';
    }
    
    if (errorStr.includes('network') || errorStr.includes('네트워크')) {
      return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.';
    }
    
    return errorStr;
  }, []);

  // 메시지 전송 실패 시 자동 재시도 기능 (1회만)
  const handleMessageSendError = useCallback(async (
    clientId: string, 
    content: string, 
    error: any
  ): Promise<boolean> => {
    console.warn('[useChat] 메시지 전송 실패, 다시 시도:', error);
    
    // 오류 메시지 설정
    setError(getHumanReadableError(error));
    
    // 실패한 메시지 상태 업데이트
    updateMessageStatus(clientId, 'failed');
    
    return false;
  }, [getHumanReadableError, updateMessageStatus]);

  // 메시지 전송 함수
  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!content || !content.trim()) {
      console.error('메시지 내용이 없습니다.');
      return false;
    }
    
    if (!actualUserId) {
      console.error('사용자 ID가 설정되지 않았습니다.');
      setError('사용자 ID가 설정되지 않았습니다.');
      return false;
    }

    // 새 메시지 객체 생성
    const clientId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: Message = {
      id: clientId,
      clientId,
      senderId: actualUserId,
      receiverId: otherUserId || '',
      text: content,
      timestamp: new Date().toISOString(),
      isMine: true,
      status: 'sending'
    };

    // 메시지 배열에 추가
    setMessages(prev => [...prev, newMessage]);

    // 소켓 전송 시도
    try {
      // 소켓 연결 상태 확인 강화
      if (socketRef.current && socketConnected && !error) {
        console.log('[useChat] 소켓으로 메시지 전송 시도:', { 
          content, 
          senderId: actualUserId,
          receiverId: otherUserId,
          transactionId
        });
        
        // 5초 타임아웃 설정
        const socketPromise = new Promise<boolean>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('소켓 메시지 전송 시간 초과'));
          }, 5000);
          
          // 소켓 이벤트로 메시지 전송 - 안전하게 null 체크
          const socket = socketRef.current;
          if (socket) {
            socket.emit('onSend', {
              roomId: `purchase_${transactionId}`,
              chat: content,
              user: {
                id: actualUserId,
                name: '사용자'
              },
              clientId: clientId
            });
            
            console.log('[useChat] 소켓으로 메시지 전송 시도 - 상세 정보:', {
              roomId: `purchase_${transactionId}`,
              userId: actualUserId,
              clientId: clientId
            });
            
            // 응답 대기 이벤트 리스너
            const messageHandler = (response: any) => {
              clearTimeout(timeout);
              socket.off('messageSent', messageHandler);
              
              if (response.clientId === clientId || response.messageId === clientId) {
                if (response.status === 'sent' || response.status === 'success') {
                  updateMessageStatus(clientId, 'sent', response.messageId);
                  resolve(true);
                } else {
                  updateMessageStatus(clientId, 'failed');
                  reject(new Error(response.error || '메시지 전송 실패'));
                }
              }
            };
            
            socket.on('messageSent', messageHandler);
          } else {
            clearTimeout(timeout);
            reject(new Error('소켓 객체가 존재하지 않습니다'));
          }
        });
        
        return await socketPromise;
      } else {
        console.log('[useChat] 소켓 연결 상태가 좋지 않아 HTTP API로 전환:', {
          socketExists: !!socketRef.current,
          socketConnected,
          hasError: !!error
        });
        throw new Error('소켓 연결이 없거나 연결되지 않음');
      }
    } catch (socketError) {
      console.warn('[useChat] 소켓 전송 실패, HTTP API로 시도:', socketError);
      
      // HTTP API 폴백
      try {
        console.log('[useChat] HTTP API로 메시지 전송 시도');
        
        const requestBody: any = {
          content,
          senderId: actualUserId
        };
        
        // 거래 ID가 있으면 포함
        if (transactionId) {
          requestBody.purchaseId = transactionId;
        }
        
        // 수신자 ID가 있고 자신의 ID와 다른 경우에만 포함
        if (otherUserId && otherUserId !== actualUserId) {
          requestBody.receiverId = otherUserId;
        }
        
        // 인증 토큰 가져오기
        const authToken = localStorage.getItem('auth-token') || localStorage.getItem('token') || '';
        
        console.log('[useChat] HTTP API 요청 정보:', { 
          url: '/api/messages',
          hasToken: !!authToken, 
          tokenLength: authToken.length,
          tokenPreview: authToken ? `${authToken.substring(0, 10)}...` : '토큰 없음',
          requestBody 
        });
        
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          console.log('[useChat] HTTP API 메시지 전송 성공:', result);
          updateMessageStatus(clientId, 'sent', result.messageId || result.id);
          return true;
        } else {
          throw new Error(result.error || result.message || '메시지 전송 실패');
        }
      } catch (httpError) {
        console.error('[useChat] HTTP API 메시지 전송 오류:', httpError);
        return handleMessageSendError(clientId, content, httpError);
      }
    }
  }, [actualUserId, otherUserId, transactionId, socketConnected, updateMessageStatus, error, handleMessageSendError]);

  // 훅 반환 객체
  return {
    messages,
    isLoading,
    error,
    socketConnected,
    sendMessage,
    fetchMessages,
    roomId,
    transactionInfo,
    otherUserInfo,
    conversations,
    hasMore
  };
} 