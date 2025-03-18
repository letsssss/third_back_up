"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { User, MessageSquare, Clock, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/auth-context'

// Post 타입 정의
export interface Post {
  id: string
  title: string
  content: string
  category: string
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    image?: string
  }
  _count?: {
    comments: number
  }
}

interface PostListProps {
  category?: string
}

export function PostList({ category = '전체' }: PostListProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(category)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { user } = useAuth()

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      try {
        const url = `/api/posts?category=${encodeURIComponent(activeCategory !== '전체' ? activeCategory : '')}&page=${currentPage}&limit=5`
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error('게시글을 불러오는데 실패했습니다')
        }
        
        const data = await response.json()
        setPosts(data.posts)
        setTotalPages(data.meta?.totalPages || 1)
      } catch (error) {
        console.error('게시글 불러오기 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [activeCategory, currentPage])

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category)
    setCurrentPage(1)
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy.MM.dd', { locale: ko })
    } catch (e) {
      return dateString
    }
  }

  const renderSkeleton = () => (
    <>
      {Array(5).fill(0).map((_, i) => (
        <div key={i} className="flex flex-col space-y-3 p-4 border-b">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex space-x-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </>
  )

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">커뮤니티</h2>
        {user && (
          <Link href="/write-post">
            <Button variant="outline">
              글쓰기
            </Button>
          </Link>
        )}
      </div>

      <Tabs defaultValue={activeCategory} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger 
            value="전체" 
            onClick={() => handleCategoryChange('전체')}
            className={activeCategory === '전체' ? 'data-[state=active]:bg-blue-500' : ''}
          >
            전체
          </TabsTrigger>
          <TabsTrigger 
            value="콘서트" 
            onClick={() => handleCategoryChange('콘서트')}
            className={activeCategory === '콘서트' ? 'data-[state=active]:bg-blue-500' : ''}
          >
            콘서트
          </TabsTrigger>
          <TabsTrigger 
            value="뮤지컬/연극" 
            onClick={() => handleCategoryChange('뮤지컬/연극')}
            className={activeCategory === '뮤지컬/연극' ? 'data-[state=active]:bg-blue-500' : ''}
          >
            뮤지컬/연극
          </TabsTrigger>
          <TabsTrigger 
            value="기타" 
            onClick={() => handleCategoryChange('기타')}
            className={activeCategory === '기타' ? 'data-[state=active]:bg-blue-500' : ''}
          >
            기타
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          renderSkeleton()
        ) : posts.length > 0 ? (
          <div className="divide-y">
            {posts.map((post) => (
              <Link key={post.id} href={`/posts/${post.id}`}>
                <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <h3 className="font-medium text-lg mb-2">{post.title}</h3>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{post.content}</p>
                  <div className="flex items-center text-xs text-gray-500 space-x-4">
                    <div className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      <span>{post.author.name}</span>
                    </div>
                    <div className="flex items-center">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      <span>{post._count?.comments || 0}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{formatDate(post.createdAt)}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">{post.category}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            게시글이 없습니다. 첫 번째 글을 작성해보세요!
          </div>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <Pagination className="my-4">
          <PaginationContent>
            {currentPage > 1 && (
              <PaginationItem>
                <PaginationPrevious onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} />
              </PaginationItem>
            )}
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink 
                  isActive={page === currentPage}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            
            {currentPage < totalPages && (
              <PaginationItem>
                <PaginationNext onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
} 