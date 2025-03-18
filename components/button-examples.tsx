import { Button } from "@/components/ui/button"

export function ButtonExamples() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold mb-4">버튼 예시</h2>

      <div className="flex flex-wrap gap-4">
        <Button className="text-base">충전하기</Button>

        <Button className="text-base">프로필 수정</Button>

        <Button className="text-base">피드백 주기</Button>

        <Button variant="outline" className="text-base">
          취소
        </Button>

        <Button variant="withdraw" className="text-base">
          출금하기
        </Button>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-3">큰 버튼</h3>
        <Button className="w-full text-base py-3">충전하기</Button>
      </div>
    </div>
  )
}

