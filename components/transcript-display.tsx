"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface TranscriptDisplayProps {
  messages: Message[]
  interimTranscript?: string
}

export function TranscriptDisplay({ messages, interimTranscript }: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, interimTranscript])

  return (
    <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
      <div className="space-y-4">
        {messages.length === 0 && !interimTranscript && (
          <div className="flex h-full items-center justify-center text-center text-muted-foreground">
            <p>Your conversation will appear here</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={cn("flex flex-col gap-1", message.role === "user" ? "items-end" : "items-start")}>
            <span className="text-xs font-medium text-muted-foreground">
              {message.role === "user" ? "You" : "AI Interviewer"}
            </span>
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-2",
                message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}

        {interimTranscript && (
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-medium text-muted-foreground">You (speaking...)</span>
            <div className="max-w-[80%] rounded-lg bg-primary/50 px-4 py-2">
              <p className="text-sm italic leading-relaxed text-primary-foreground">{interimTranscript}</p>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
