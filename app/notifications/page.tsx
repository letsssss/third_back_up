"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"

interface Notification {
  id: number
  title: string
  message: string
  link: string
  isRead: boolean
  createdAt: string
  type: string
  formattedDate?: string
}

export default function NotificationsPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login?callbackUrl=/notifications')
      return
    }

    fetchNotifications()
  }, [user, router])

  // 날짜 포맷팅 함수 (날짜 오류 방지를 위해 JavaScript 내장 기능만 사용)
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

  const fetchNotifications = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/notifications')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '알림을 불러오는데 실패했습니다')
      }

      const data = await response.json()
      
      // 데이터 가공 및 날짜 포맷팅
      const processedNotifications = data.notifications.map((notification: any) => ({
        ...notification,
        formattedDate: formatDateToRelative(notification.createdAt)
      }));
      
      setNotifications(processedNotifications)
    } catch (error) {
      console.error('알림 목록 로딩 오류:', error)
      setError(error instanceof Error ? error.message : '알림을 불러오는데 실패했습니다')
      toast.error('알림 목록을 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsRead = async (id: number) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId: id }),
      })

      if (!response.ok) {
        throw new Error('알림 상태 업데이트에 실패했습니다')
      }

      setNotifications(
        notifications.map((notification) => 
          notification.id === id ? { ...notification, isRead: true } : notification
        )
      )
    } catch (error) {
      console.error('알림 상태 업데이트 중 오류 발생:', error)
      toast.error('알림 상태 업데이트에 실패했습니다')
    }
  }

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.isRead)
    if (unreadNotifications.length === 0) return

    try {
      await Promise.all(
        unreadNotifications.map(notification =>
          fetch('/api/notifications', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ notificationId: notification.id }),
          })
        )
      )

      setNotifications(notifications.map(notification => ({ ...notification, isRead: true })))
      toast.success('모든 알림을 읽음 표시했습니다')
    } catch (error) {
      console.error('알림 상태 일괄 업데이트 중 오류 발생:', error)
      toast.error('알림 상태 업데이트에 실패했습니다')
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-6">알림</h1>
        <div className="text-center py-10">로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-6">알림</h1>
        <div className="text-center py-10 text-red-500">{error}</div>
      </div>
    )
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">알림</h1>
        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            모두 읽음 표시
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-10 text-gray-500">알림이 없습니다</div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Link
              href={notification.link}
              key={notification.id}
              onClick={() => handleMarkAsRead(notification.id)}
            >
              <div className={`p-4 rounded-md border ${notification.isRead ? "bg-white" : "bg-blue-50"}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`font-medium ${notification.isRead ? "text-gray-800" : "text-blue-700"}`}>
                    {notification.title}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {notification.formattedDate}
                  </span>
                </div>
                <p className="text-gray-600">{notification.message}</p>
                <div className="mt-2">
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    notification.type === 'TICKET_REQUEST' 
                      ? 'bg-blue-100 text-blue-800'
                      : notification.type === 'PURCHASE_COMPLETE'
                      ? 'bg-green-100 text-green-800'
                      : notification.type === 'SYSTEM'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {notification.type === 'TICKET_REQUEST' 
                      ? '취켓팅 신청'
                      : notification.type === 'PURCHASE_COMPLETE'
                      ? '구매 완료'
                      : notification.type === 'SYSTEM'
                      ? '시스템'
                      : '알림'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

