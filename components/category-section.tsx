"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const categories = [
  { name: "콘서트", href: "/category/콘서트" },
  { name: "뮤지컬/연극", href: "/category/뮤지컬-연극" },
  { name: "스포츠", href: "/category/스포츠" },
  { name: "전시/행사", href: "/category/전시-행사" },
  { name: "대리 티켓팅", href: "/proxy-ticketing", highlight: true },
]

export function CategorySection() {
  const [activeCategory, setActiveCategory] = useState("콘서트")

  return (
    <section className="border-b">
      <div className="container mx-auto">
        <div className="flex space-x-8">
          {categories.map((category) => (
            <Link
              href={category.href}
              key={category.name}
              onClick={() => setActiveCategory(category.name)}
              className={cn(
                "py-4 px-2 relative cursor-pointer",
                activeCategory === category.name && "font-bold",
                category.highlight && "text-green-600 font-semibold",
              )}
            >
              {category.name}
              {activeCategory === category.name && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black" />}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

