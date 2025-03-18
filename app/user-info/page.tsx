import { UserInfoForm } from "@/components/user-info-form"

export default function UserInfoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold text-center mb-8">사용자 정보 등록</h1>
        <UserInfoForm />
      </div>
    </div>
  )
}

