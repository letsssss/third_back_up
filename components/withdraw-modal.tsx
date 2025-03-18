"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { ArrowRight, Calendar, CreditCard, AlertCircle, Wallet } from "lucide-react"

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
  balance: number
}

export function WithdrawModal({ isOpen, onClose, balance }: WithdrawModalProps) {
  const [amount, setAmount] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("6개월")
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [endDate, setEndDate] = useState(format(new Date(new Date().setMonth(new Date().getMonth() + 6)), "yyyy-MM-dd"))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // 실제 구현에서는 여기에 출금 처리 로직을 추가합니다
    console.log("출금 신청:", amount)
    onClose()
  }

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value)
    const today = new Date()
    let start = new Date()

    switch (value) {
      case "오늘":
        start = today
        break
      case "1주일":
        start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "1개월":
        start = new Date(today.setMonth(today.getMonth() - 1))
        break
      case "3개월":
        start = new Date(today.setMonth(today.getMonth() - 3))
        break
      case "6개월":
        start = new Date(today.setMonth(today.getMonth() - 6))
        break
      case "1년":
        start = new Date(today.setFullYear(today.getFullYear() - 1))
        break
    }

    setStartDate(format(start, "yyyy-MM-dd"))
    setEndDate(format(new Date(), "yyyy-MM-dd"))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-xl max-h-[90vh] overflow-y-auto my-8">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <DialogTitle className="text-2xl font-bold flex items-center">
            <Wallet className="mr-2 h-6 w-6" /> 출금 신청
          </DialogTitle>
          <DialogDescription className="text-blue-100 mt-1">예치금을 계좌로 출금하실 수 있습니다.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6 p-6">
          <div className="col-span-3">
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="bg-blue-50 p-5 rounded-xl">
                    <label className="text-sm font-medium text-blue-700">총 보유 예치금</label>
                    <div className="text-2xl font-bold text-blue-800 mt-1">{balance.toLocaleString()}원</div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center">
                      <ArrowRight className="h-4 w-4 mr-1 text-blue-600" /> 출금신청
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="예치금"
                        className="text-right flex-1 h-12 text-lg"
                      />
                      <Button
                        type="button"
                        onClick={() => setAmount(balance.toString())}
                        className="whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white h-12 px-4"
                      >
                        전액
                      </Button>
                    </div>
                    <div className="text-sm text-gray-500 text-right">
                      출금 후 잔액:{" "}
                      <span className="font-medium">{(balance - Number(amount || 0)).toLocaleString()}원</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center">
                      <CreditCard className="h-4 w-4 mr-1 text-blue-600" /> 출금계좌
                    </label>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
                      <span className="font-medium">케이뱅크(100166020***)</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        계좌변경
                      </Button>
                    </div>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-amber-700 space-y-1">
                        <p>• 판매금액 및 환불금 등한 예치금은 실시간으로 적립되며,</p>
                        <p className="font-medium">
                          계좌출금은 신청일 기준 다음날 오후 2시부터 순차적으로 입금됩니다.(주말 및 공휴일 제외)
                        </p>
                        <p>[출금 계좌 등록]은 가입자명과 예금주명이 일치하는 본인명의 통장으로만 가능하며,</p>
                        <p className="font-medium">
                          매일 23시~01시 까지는 은행 점검으로 인해 출금계좌 등록/수정이 어렵습니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!amount || Number(amount) <= 0}
                  >
                    출금 신청하기
                  </Button>
                </form>
              </div>

              <div className="bg-gradient-to-b from-blue-800 to-blue-900 rounded-xl p-6 text-center h-fit shadow-lg">
                <div className="w-20 h-20 bg-yellow-400 rounded-full mx-auto mb-4 flex items-center justify-center shadow-md">
                  <span className="text-2xl font-bold">W</span>
                </div>
                <h3 className="text-white text-lg font-bold mb-4">출금신청</h3>
                <div className="bg-blue-700/50 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-blue-100 text-sm leading-relaxed">
                    다음날 오후2시부터
                    <br />
                    순차적으로 입금
                    <br />
                    (주말 및 공휴일 제외)
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 col-span-3">
            <h3 className="font-medium mb-4 text-lg flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600" /> 예치금 내역
            </h3>
            <Tabs defaultValue={selectedPeriod} onValueChange={handlePeriodChange} className="mb-6">
              <TabsList className="w-full justify-start mb-4 bg-gray-100 p-1">
                <TabsTrigger value="오늘" className="data-[state=active]:bg-white">
                  오늘
                </TabsTrigger>
                <TabsTrigger value="1주일" className="data-[state=active]:bg-white">
                  1주일
                </TabsTrigger>
                <TabsTrigger value="1개월" className="data-[state=active]:bg-white">
                  1개월
                </TabsTrigger>
                <TabsTrigger value="3개월" className="data-[state=active]:bg-white">
                  3개월
                </TabsTrigger>
                <TabsTrigger value="6개월" className="data-[state=active]:bg-white">
                  6개월
                </TabsTrigger>
                <TabsTrigger value="1년" className="data-[state=active]:bg-white">
                  1년
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-4 mb-4">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
              <span className="text-gray-500">~</span>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
              <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                조회
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-3 text-left text-gray-600 font-medium">날짜</th>
                    <th className="p-3 text-left text-gray-600 font-medium">내용</th>
                    <th className="p-3 text-right text-gray-600 font-medium">적립</th>
                    <th className="p-3 text-right text-gray-600 font-medium">출금/사용</th>
                    <th className="p-3 text-right text-gray-600 font-medium">잔액</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-gray-700">2025.03.10</td>
                    <td className="p-3 text-gray-700">[출금완료]계좌출금(100166020104/케이뱅크)</td>
                    <td className="p-3 text-right text-gray-700">-</td>
                    <td className="p-3 text-right text-red-500 font-medium">622,900</td>
                    <td className="p-3 text-right text-gray-700 font-medium">0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

