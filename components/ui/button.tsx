"use client"

import React from "react"
import confetti from "canvas-confetti"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "outline" | "ghost" | "withdraw" | "confirm"
}

// 버튼 스타일 변형을 위한 함수
export const buttonVariants = ({
  variant = "default",
  className = "",
}: {
  variant?: "default" | "outline" | "ghost" | "withdraw" | "confirm" | null;
  className?: string;
} = {}) => {
  return cn(
    "rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    {
      "border border-input bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground": variant === "outline",
      "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
      "bg-red-500 text-white shadow-sm hover:bg-red-600": variant === "withdraw",
      "bg-[#FFD600] text-black shadow-sm hover:bg-[#FFE600]": variant === "confirm" || variant === "default"
    },
    className
  )
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, variant, onClick, ...props }, ref) => {
    // 버튼 클릭 핸들러
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // 출금 신청하기 버튼인 경우 특별한 처리
      if (typeof children === "string" && children === "출금 신청하기" && !props.disabled) {
        // 랜덤하게 성공 또는 실패 결정 (90% 확률로 성공)
        const isSuccess = Math.random() > 0.1

        if (isSuccess) {
          // 성공 시 confetti 효과
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          })

          // 성공 토스트 메시지
          toast.success("출금 신청이 완료되었습니다!", {
            description: "신청하신 금액은 다음 영업일에 입금됩니다.",
            duration: 4000,
          })
        } else {
          // 실패 토스트 메시지
          toast.error("출금 신청에 실패했습니다.", {
            description: "잠시 후 다시 시도해주세요.",
            duration: 4000,
          })
        }
      }

      // 구매확정 버튼인 경우 특별한 처리
      if (typeof children === "string" && (children === "구매확정" || children === "구매 확정") && !props.disabled) {
        // 성공 시 confetti 효과
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#4CAF50", "#2196F3", "#FFC107"],
        })

        // 성공 토스트 메시지
        toast.success("구매가 확정되었습니다!", {
          description: "티켓 구매가 완료되었습니다. 즐거운 공연 되세요!",
          duration: 3000,
        })

        // 1.5초 후 다음 화면으로 이동
        setTimeout(() => {
          // 현재 URL에서 transaction ID 추출
          const pathParts = window.location.pathname.split("/")
          const transactionId = pathParts[pathParts.length - 1]

          // 구매 확정 완료 상태로 업데이트된 페이지로 이동
          if (transactionId) {
            window.location.href = `/transaction/${transactionId}?status=confirmed`
          } else {
            // 트랜잭션 ID가 없는 경우 마이페이지로 이동
            window.location.href = "/mypage"
          }
        }, 1500)
      }

      // 기존 onClick 핸들러 호출
      if (onClick) {
        onClick(e)
      }
    }

    // buttonVariants 함수를 사용해 클래스를 생성
    const buttonClasses = cn(
      buttonVariants({ variant: variant || "default" }),
      typeof children === "string" && children === "출금 신청하기" ? "sticky bottom-6 z-10 shadow-lg" : "",
      typeof children === "string" && (children === "구매확정" || children === "구매 확정") ? "py-3 px-6 font-semibold text-base bg-[#FFD600] text-black hover:bg-[#FFE600] shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all" : "",
      className
    )

    return (
      <button className={buttonClasses} ref={ref} type={props.type || "button"} onClick={handleClick} {...props}>
        {children}
      </button>
    )
  },
)
Button.displayName = "Button"

