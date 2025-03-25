"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MigrationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    updatedPosts?: Array<{ id: number; productNumber: string }>;
  } | null>(null);

  // 관리자 권한 확인
  if (!user || user.role !== "ADMIN") {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-4">접근 권한이 없습니다</h1>
        <p className="text-gray-600 mb-4">관리자만 이 페이지에 접근할 수 있습니다.</p>
        <Button onClick={() => router.push("/")}>메인으로 돌아가기</Button>
      </div>
    );
  }

  const runMigration = async () => {
    try {
      setLoading(true);
      setResult(null);

      const response = await fetch("/api/migration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("마이그레이션 실행 오류:", error);
      setResult({
        success: false,
        message: "마이그레이션 실행 중 오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">데이터베이스 마이그레이션</h1>
      <p className="text-gray-600 mb-8">
        이 페이지에서는 데이터베이스 마이그레이션을 실행할 수 있습니다.
      </p>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Product Number 마이그레이션</h2>
        <p className="text-gray-600 mb-4">
          모든 게시물에 productNumber가 존재하는지 확인하고, 없는 경우 12자리 숫자로 된 고유한 productNumber를 생성합니다.
        </p>
        <Button 
          onClick={runMigration} 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? "실행 중..." : "마이그레이션 실행"}
        </Button>
      </div>

      {result && (
        <div className={`p-6 rounded-lg shadow-md ${result.success ? "bg-green-50" : "bg-red-50"}`}>
          <h2 className="text-xl font-semibold mb-4">마이그레이션 결과</h2>
          <p className={`${result.success ? "text-green-600" : "text-red-600"} mb-4`}>
            {result.message}
          </p>
          
          {result.success && result.updatedPosts && result.updatedPosts.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">업데이트된 게시물</h3>
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Number</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {result.updatedPosts.map((post) => (
                      <tr key={post.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{post.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{post.productNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {result.success && (!result.updatedPosts || result.updatedPosts.length === 0) && (
            <p className="text-gray-600">업데이트할 게시물이 없습니다. 모든 게시물에 이미 productNumber가 설정되어 있습니다.</p>
          )}
        </div>
      )}
    </div>
  );
} 