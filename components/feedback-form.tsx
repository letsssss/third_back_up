"use client"

import type React from "react"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function FeedbackForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [feedback, setFeedback] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedback }),
      })
      if (response.ok) {
        alert("피드백이 성공적으로 제출되었습니다. 감사합니다!")
        setFeedback("")
        setIsOpen(false)
      } else {
        throw new Error("피드백 제출에 실패했습니다.")
      }
    } catch (error) {
      console.error("Error submitting feedback:", error)
      alert("피드백 제출 중 오류가 발생했습니다. 나중에 다시 시도해 주세요.")
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-white p-4 rounded-lg shadow-lg w-80">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">피드백</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={handleSubmit}>
            <Textarea
              placeholder="여러분의 의견을 들려주세요"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="mb-2"
              required
            />
            <Button type="submit" className="w-full">
              제출하기
            </Button>
          </form>
        </div>
      ) : (
        <Button onClick={() => setIsOpen(true)} className="bg-[#FFD600] hover:bg-[#FFE600] text-black px-6 py-2">
          피드백 주기
        </Button>
      )}
    </div>
  )
}

