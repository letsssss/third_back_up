"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { PostForm } from "@/components/PostForm"
import { toast } from "sonner"

export default function WritePostPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // 로그인 상태가 아니면 로그인 페이지로 리디렉션
    if (!isLoading && !user) {
      toast.error('로그인이 필요한 페이지입니다')
      router.push('/login')
    }
  }, [user, isLoading, router])

  // 로그인 확인 중일 때는 로딩 화면 표시
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-6 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 로그인한 상태가 아니면 렌더링하지 않음
  if (!user) {
    return null
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-6">새 글 작성</h1>
        <PostForm onCancel={() => router.back()} />
      </div>
    </div>
  )
}