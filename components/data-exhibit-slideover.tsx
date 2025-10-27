"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, BarChartBig as ChartBar } from "lucide-react"
import { cn } from "@/lib/utils"

interface DataExhibit {
  id: string
  title: string
  type: "chart" | "table" | "image"
  data: any
  imageUrl?: string
  description?: string
}

interface DataExhibitSlideoverProps {
  exhibits?: DataExhibit[]
}

export function DataExhibitSlideover({ exhibits = [] }: DataExhibitSlideoverProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (exhibits.length === 0) return null

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed right-4 top-20 z-40 h-12 w-12 rounded-full bg-white shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        <ChartBar className="h-5 w-5" />
      </Button>

      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/20 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Slideover Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-md transform bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:max-w-lg",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold">Data Exhibits</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {exhibits.map((exhibit) => (
                <Card key={exhibit.id} className="p-4">
                  <h3 className="mb-3 font-medium">{exhibit.title}</h3>
                  {exhibit.description && (
                    <p className="mb-3 text-sm text-muted-foreground">{exhibit.description}</p>
                  )}
                  <div className="rounded-lg bg-white border p-4">
                    {exhibit.imageUrl ? (
                      <img
                        src={exhibit.imageUrl}
                        alt={exhibit.title}
                        className="w-full h-auto rounded"
                      />
                    ) : (
                      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                        {exhibit.type === "chart" && "Chart visualization"}
                        {exhibit.type === "table" && "Table data"}
                        {exhibit.type === "image" && "Image exhibit"}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
