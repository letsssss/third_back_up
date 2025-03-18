"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { UserCircle, Calendar, ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

// Post 타입 정의
interface Post {
  id: string
  title: string
  content: string
  category: string
  createdAt: string
  updatedAt: string
  author: {
    id: number | string  // ID는 숫자 또는 문자열일 수 있음
    name: string
    image?: string
  }
  _count?: {
    comments: number
  }
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/posts/${id}`)
        if (!response.ok) {
          throw new Error('게시글을 불러오는데 실패했습니다')
        }
        const data = await response.json()
        setPost(data.post)
      } catch (error) {
        console.error('게시글 불러오기 오류:', error)
        toast.error('게시글을 불러오는데 문제가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }
    
    if (id) {
      fetchPost()
    }
  }, [id])
  
  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('게시글 삭제에 실패했습니다')
      }
      
      toast.success('게시글이 성공적으로 삭제되었습니다')
      router.push('/ticket-cancellation')
    } catch (error) {
      console.error('게시글 삭제 오류:', error)
      toast.error('게시글 삭제 중 오류가 발생했습니다')
    }
  }
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })
    } catch (e) {
      return dateString
    }
  }
  
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-2 mt-6">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  if (!post) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800">게시글을 찾을 수 없습니다</h1>
          <p className="mt-4 text-gray-600">요청하신 게시글이 존재하지 않거나 삭제되었습니다.</p>
          <Button className="mt-6" onClick={() => router.push('/ticket-cancellation')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }
  
  // 사용자 ID를 문자열로 변환하여 비교하여 작성자 확인
  const isAuthor = user && String(post.author.id) === String(user.id)
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div className="mb-2">
            <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
              {post.category}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">{post.title}</h1>
          
          <div className="flex items-center text-gray-500 text-sm mb-6">
            <div className="flex items-center mr-4">
              <UserCircle className="h-5 w-5 mr-1" />
              <span>{post.author.name}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>{formatDate(post.createdAt)}</span>
            </div>
          </div>
          
          <div className="border-t border-b py-6 my-6">
            <div className="prose max-w-none">
              {/* 콘텐츠 줄바꿈 처리 */}
              {post.content.split('\n').map((paragraph: string, idx: number) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => router.push('/ticket-cancellation')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              목록으로
            </Button>
            
            {isAuthor && (
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => router.push(`/posts/${id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  수정
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="bg-red-100 hover:bg-red-200 border-red-200 text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      삭제
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>게시글 삭제</AlertDialogTitle>
                      <AlertDialogDescription>
                        이 게시글을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 