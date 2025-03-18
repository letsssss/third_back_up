import { NextResponse } from "next/server"

// 임시 사용자 데이터베이스
const users = [
  { id: 1, username: "user1", email: "user1@example.com", password: "hashedpassword1" },
  { id: 2, username: "user2", email: "user2@example.com", password: "hashedpassword2" },
]

export async function GET() {
  // 실제 애플리케이션에서는 비밀번호를 제외하고 반환해야 합니다
  return NextResponse.json(users.map(({ password, ...user }) => user))
}

export async function POST(request: Request) {
  const newUser = await request.json()
  // 실제 애플리케이션에서는 비밀번호를 해시화해야 합니다
  newUser.id = users.length + 1
  users.push(newUser)
  const { password, ...userWithoutPassword } = newUser
  return NextResponse.json(userWithoutPassword, { status: 201 })
}

export async function PUT(request: Request) {
  const updatedUser = await request.json()
  const index = users.findIndex((u) => u.id === updatedUser.id)
  if (index !== -1) {
    users[index] = { ...users[index], ...updatedUser }
    const { password, ...userWithoutPassword } = users[index]
    return NextResponse.json(userWithoutPassword)
  }
  return NextResponse.json({ error: "User not found" }, { status: 404 })
}

export async function DELETE(request: Request) {
  const { id } = await request.json()
  const index = users.findIndex((u) => u.id === id)
  if (index !== -1) {
    users.splice(index, 1)
    return NextResponse.json({ message: "User deleted successfully" })
  }
  return NextResponse.json({ error: "User not found" }, { status: 404 })
}

