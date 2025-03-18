import { Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react"

type TicketingStatus = "waiting" | "in_progress" | "completed" | "success" | "failed"

interface TicketingStatusCardProps {
  status: TicketingStatus
  message?: string
  updatedAt?: string
}

export function TicketingStatusCard({ status, message, updatedAt }: TicketingStatusCardProps) {
  const statusConfig = {
    waiting: {
      icon: <Clock className="h-6 w-6 text-yellow-500" />,
      title: "취소표 대기 중",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-800",
      borderColor: "border-yellow-200",
      progressColor: "bg-yellow-200",
    },
    in_progress: {
      icon: <AlertCircle className="h-6 w-6 text-blue-500" />,
      title: "취켓팅 진행 중",
      bgColor: "bg-blue-50",
      textColor: "text-blue-800",
      borderColor: "border-blue-200",
      progressColor: "bg-blue-200",
    },
    completed: {
      icon: <CheckCircle className="h-6 w-6 text-teal-500" />,
      title: "취켓팅 완료",
      bgColor: "bg-teal-50",
      textColor: "text-teal-800",
      borderColor: "border-teal-200",
      progressColor: "bg-teal-200",
    },
    success: {
      icon: <CheckCircle className="h-6 w-6 text-green-500" />,
      title: "취켓팅 성공",
      bgColor: "bg-green-50",
      textColor: "text-green-800",
      borderColor: "border-green-200",
      progressColor: "bg-green-200",
    },
    failed: {
      icon: <XCircle className="h-6 w-6 text-red-500" />,
      title: "취켓팅 실패",
      bgColor: "bg-red-50",
      textColor: "text-red-800",
      borderColor: "border-red-200",
      progressColor: "bg-red-200",
    },
  }

  const config = statusConfig[status]

  return (
    <div
      className={`${config.bgColor} border ${config.borderColor} rounded-lg p-5 transition-all duration-300 hover:shadow-md`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm">{config.icon}</div>
        <div className="ml-4">
          <h3 className={`text-base font-semibold ${config.textColor}`}>{config.title}</h3>
          {message && (
            <div className={`mt-2 text-sm ${config.textColor.replace("800", "700")}`}>
              <p>취켓팅 완료 알림을 받으시면 계정에 접속해 티켓을 확인 해 보신 후 구매확정을 누르시면 되십니다</p>
            </div>
          )}
          {updatedAt && (
            <div className="mt-3 flex items-center">
              <div className="flex-grow h-0.5 rounded-full bg-gray-100">
                <div
                  className={`h-0.5 rounded-full ${config.progressColor}`}
                  style={{
                    width: status === "success" || status === "failed" || status === "completed" ? "100%" : "60%",
                  }}
                ></div>
              </div>
              <p className="ml-2 text-xs text-gray-500 whitespace-nowrap">{updatedAt}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

