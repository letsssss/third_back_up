import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { feedback } = await request.json()

    // 여기에서 실제로 데이터베이스에 피드백을 저장하는 로직을 구현합니다.
    // 예: await db.insertFeedback(feedback)

    console.log("Received feedback:", feedback)

    return NextResponse.json({ message: "Feedback received successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error processing feedback:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

