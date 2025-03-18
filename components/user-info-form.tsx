"use client"

import type React from "react"
import { useState } from "react"
import { Input } from "@/components/ui/input"

interface UserInfoFormProps {
  onSubmit?: (userData: UserData) => void
}

interface UserData {
  userId: string
  name: string
  birthDate: string
  age: string
  phoneNumber: string
  email: string
}

export function UserInfoForm({ onSubmit }: UserInfoFormProps) {
  const [userData, setUserData] = useState<UserData>({
    userId: "",
    name: "",
    birthDate: "",
    age: "",
    phoneNumber: "",
    email: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setUserData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSubmit) {
      onSubmit(userData)
    }
    alert("사용자 정보가 제출되었습니다: " + JSON.stringify(userData))
    console.log("제출된 사용자 정보:", userData)
  }

  const handleButtonClick = () => {
    console.log("버튼이 클릭되었습니다!")
    // 폼 제출 트리거
    document.getElementById("user-info-form")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }))
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">사용자 정보 입력</h2>

      <form id="user-info-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
            아이디
          </label>
          <Input
            id="userId"
            name="userId"
            type="text"
            value={userData.userId}
            onChange={handleChange}
            placeholder="아이디를 입력하세요"
            required
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            이름
          </label>
          <Input
            id="name"
            name="name"
            type="text"
            value={userData.name}
            onChange={handleChange}
            placeholder="이름을 입력하세요"
            required
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-1">
              생년월일
            </label>
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              value={userData.birthDate}
              onChange={handleChange}
              required
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
              나이
            </label>
            <Input
              id="age"
              name="age"
              type="number"
              value={userData.age}
              onChange={handleChange}
              placeholder="나이"
              required
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
            휴대폰번호
          </label>
          <Input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            value={userData.phoneNumber}
            onChange={handleChange}
            placeholder="010-0000-0000"
            pattern="[0-9]{3}-[0-9]{4}-[0-9]{4}"
            required
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">형식: 010-0000-0000</p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            이메일
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            value={userData.email}
            onChange={handleChange}
            placeholder="example@email.com"
            required
            className="w-full"
          />
        </div>

        <div className="pt-4">
          <button
            type="button"
            onClick={handleButtonClick}
            className="w-full bg-[#0061FF] hover:bg-[#0052D6] text-white rounded-md py-2 px-4 font-medium"
          >
            정보 제출하기
          </button>
        </div>
      </form>
    </div>
  )
}

