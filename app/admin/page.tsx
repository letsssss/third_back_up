"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Ticket = {
  id: number
  title: string
  artist: string
  date: string
  price: number
}

export default function AdminPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [newTicket, setNewTicket] = useState<Omit<Ticket, "id">>({ title: "", artist: "", date: "", price: 0 })

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    const response = await fetch("/api/tickets")
    const data = await response.json()
    setTickets(data)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewTicket((prev) => ({ ...prev, [name]: name === "price" ? Number(value) : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTicket),
    })
    setNewTicket({ title: "", artist: "", date: "", price: 0 })
    fetchTickets()
  }

  const handleDelete = async (id: number) => {
    await fetch("/api/tickets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    fetchTickets()
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">티켓 관리</h1>
      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <Input
          type="text"
          name="title"
          value={newTicket.title}
          onChange={handleInputChange}
          placeholder="공연 제목"
          required
        />
        <Input
          type="text"
          name="artist"
          value={newTicket.artist}
          onChange={handleInputChange}
          placeholder="아티스트"
          required
        />
        <Input type="date" name="date" value={newTicket.date} onChange={handleInputChange} required />
        <Input
          type="number"
          name="price"
          value={newTicket.price}
          onChange={handleInputChange}
          placeholder="가격"
          required
        />
        <Button type="submit">티켓 추가</Button>
      </form>
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="border p-4 rounded">
            <h2 className="text-xl font-semibold">{ticket.title}</h2>
            <p>{ticket.artist}</p>
            <p>{ticket.date}</p>
            <p>{ticket.price.toLocaleString()}원</p>
            <Button onClick={() => handleDelete(ticket.id)} variant="destructive" className="mt-2">
              삭제
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

