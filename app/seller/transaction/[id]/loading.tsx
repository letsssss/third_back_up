export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]">
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            로딩 중...
          </span>
        </div>
        <div className="mt-4 text-lg font-semibold">페이지 로딩 중...</div>
        <div className="text-muted-foreground">잠시만 기다려주세요.</div>
      </div>
    </div>
  )
} 