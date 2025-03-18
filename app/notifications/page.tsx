"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Bell } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// 더미 알림 데이터
const dummyNotifications = [
  {
    id: 1,
    title: "티켓 예매 성공",
    message: "세븐틴 콘서트 티켓 예매가 성공적으로 완료되었습니다.",
    link: "/transaction/1",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30분 전
  },
  {
    id: 2,
    title: "취켓팅 알림",
    message: "신청하신 아이유 콘서트의 취소표가 발생했습니다. 빠르게 확인해주세요!",
    link: "/ticket-cancellation/3",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2시간 전
  },
  {
    id: 3,
    title: "판매 완료",
    message: "등록하신 BTS 콘서트 티켓이 판매 완료되었습니다.",
    link: "/mypage",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1일 전
  },
  {
    id: 4,
    title: "쿠폰 지급",
    message: "신규 가입 축하 쿠폰이 지급되었습니다. 마이페이지에서 확인하세요.",
    link: "/mypage",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3일 전
  },
  {
    id: 5,
    title: "티켓 가격 인하",
    message: "관심 등록하신 블랙핑크 콘서트 티켓의 가격이 인하되었습니다.",
    link: "/ticket/4",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5일 전
  },
]

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(dummyNotifications)
  const [activeTab, setActiveTab] = useState("all")

  const unreadCount = notifications.filter((notification) => !notification.isRead).length

  const handleNotificationClick = (id: number) => {
    // 알림을 읽음 상태로 변경
    setNotifications(
      notifications.map((notification) => (notification.id === id ? { ...notification, isRead: true } : notification)),
    )
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map((notification) => ({ ...notification, isRead: true })))
  }

  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "all") return true
    if (activeTab === "unread") return !notification.isRead
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>홈으로 돌아가기</span>
          </Link>
          <h1 className="text-3xl font-bold mt-4">알림</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b">
              <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="all">전체</TabsTrigger>
                  <TabsTrigger value="unread">읽지 않음 {unreadCount > 0 && `(${unreadCount})`}</TabsTrigger>
                </TabsList>
              </Tabs>

              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead} className="ml-4 whitespace-nowrap">
                  모두 읽음 표시
                </Button>
              )}
            </div>

            <div className="divide-y">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => (
                  <Link
                    href={notification.link}
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <div
                      className={`p-6 hover:bg-gray-50 transition-colors ${notification.isRead ? "bg-white" : "bg-blue-50"}`}
                    >
                      <div className="flex items-start">
                        <div
                          className={`flex-shrink-0 mr-4 p-2 rounded-full ${notification.isRead ? "bg-gray-100" : "bg-blue-100"}`}
                        >
                          <Bell className={`h-5 w-5 ${notification.isRead ? "text-gray-500" : "text-blue-500"}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <span className={`font-medium ${notification.isRead ? "text-gray-800" : "text-blue-700"}`}>
                              {notification.title}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              {formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: ko })}
                            </span>
                          </div>
                          <p className="text-gray-600">{notification.message}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">알림이 없습니다</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

