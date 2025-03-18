import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { GoogleAnalytics } from "@next/third-parties/google"
import "./globals.css"
import { FeedbackForm } from "@/components/feedback-form"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "이지티켓",
  description: "쉽고 빠른 티켓 거래 플랫폼",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <FeedbackForm />
          <Toaster position="top-center" />
          <GoogleAnalytics gaId="G-XXXXXXXXXX" />
        </AuthProvider>
      </body>
    </html>
  )
}



import './globals.css'