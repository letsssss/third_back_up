import type React from "react"
import { Check } from "lucide-react"

type TransactionStep = {
  id: string
  label: string
  icon: React.ReactNode
  date?: string
}

interface TransactionStepperProps {
  currentStep: string
  steps: TransactionStep[]
}

export function TransactionStepper({ currentStep, steps }: TransactionStepperProps) {
  // 현재 단계의 인덱스 찾기
  let stepIndex = 0;
  
  // DB 상태값(PENDING, PROCESSING, COMPLETED, CONFIRMED)을 스텝퍼 단계 인덱스로 변환
  switch (currentStep) {
    case "PENDING":
      stepIndex = 0; // 결제 완료
      break;
    case "PROCESSING":
      stepIndex = 1; // 취켓팅 시작
      break;
    case "COMPLETED":
      stepIndex = 2; // 취켓팅 완료
      break;
    case "CONFIRMED":
      stepIndex = 3; // 구매 확정
      break;
    default:
      // ID로 직접 찾기 (이전 방식 유지)
      const foundIndex = steps.findIndex((step) => step.id === currentStep);
      stepIndex = foundIndex >= 0 ? foundIndex : 0;
  }

  return (
    <div className="w-full py-6">
      <div className="relative flex items-start justify-between">
        {/* 배경 연결선 - 전체 배경으로 깔아두기 */}
        <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-gray-200 rounded-full"></div>

        {/* 진행 연결선 - 현재까지 진행된 부분 */}
        <div
          className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-blue-500 rounded-full transition-all duration-500 ease-in-out"
          style={{
            width: `${stepIndex === 0 ? 0 : stepIndex === steps.length - 1 ? "100%" : (stepIndex / (steps.length - 1)) * 100 + "%"}`,
          }}
        ></div>

        {/* 단계 아이콘들 */}
        {steps.map((step, index) => {
          // 단계 상태 결정 (완료, 현재, 대기)
          const isCompleted = index < stepIndex
          const isCurrent = index === stepIndex
          const isPending = index > stepIndex

          return (
            <div key={step.id} className="flex flex-col items-center relative z-10 mt-0">
              {/* 아이콘 원 */}
              <div
                className={`z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                  isCompleted
                    ? "bg-blue-500 border-blue-500 text-white shadow-md"
                    : isCurrent
                      ? "bg-white border-blue-500 text-blue-500 ring-4 ring-blue-100 shadow-lg"
                      : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {isCompleted ? <Check className="w-6 h-6" /> : step.icon}
              </div>

              {/* 라벨 */}
              <div className="mt-3 text-center">
                <p
                  className={`text-sm font-medium ${isCompleted ? "text-blue-600" : isCurrent ? "text-blue-600" : "text-gray-500"}`}
                >
                  {step.label}
                </p>
                {step.date && (
                  <p className={`text-xs mt-1 ${isCompleted || isCurrent ? "text-gray-600" : "text-gray-400"}`}>
                    {step.date}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

