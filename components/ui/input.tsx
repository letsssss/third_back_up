import React from "react"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  // date 타입이고 value나 defaultValue가 없는 경우에만 오늘 날짜를 defaultValue로 설정
  const inputProps = { ...props }

  if (type === "date" && !props.value && !props.defaultValue) {
    const today = new Date()
    const formattedDate = today.toISOString().split("T")[0] // YYYY-MM-DD 형식
    inputProps.defaultValue = formattedDate
  }

  return (
    <input
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      ref={ref}
      type={type}
      {...inputProps}
    />
  )
})
Input.displayName = "Input"

