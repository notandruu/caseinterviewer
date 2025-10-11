"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, X, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AudioVisualizer } from "@/components/audio-visualizer";
import { DataExhibitSlideover } from "@/components/data-exhibit-slideover";
import { createClient } from "@/lib/supabase/client";

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

type Role = "user" | "assistant";

interface ChatMessage {
  role: Role;
  content: string;
  timestamp: Date;
}

interface VoiceInterviewClientProps {
  caseData: {
    id: string;
    title: string;
    description: string;
    prompt: string;
    industry: string;
    difficulty: string;
  };
  interviewId: string;
  userId: string;
}

export function VoiceInterviewClient({ caseData, interviewId, userId }: VoiceInterviewClientProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [currentAIText, setCurrentAIText] = useState("");
  const [displayedAIText, setDisplayedAIText] = useState("");
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const ELEVEN_DEFAULT_VOICE = useRef<string>("pNInz6obpgDQGcFmaJgB"); // Adam

  const router = useRouter();
  const supabase = createClient();
  const startTimeRef = useRef<Date>(new Date());

  useEffect(() => {
    if (typeof window === "undefined") return;

    synthRef.current = window.speechSynthesis;

    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (SR) {
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.lang = "en-US";

      r.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += t;
          else interim += t;
        }

        // User started speaking - interrupt AI if it's speaking
        if ((interim || final) && isSpeaking) {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          synthRef.current?.cancel();
          setIsSpeaking(false);
          setCurrentAIText("");
        }

        if (final) {
          const userMessage: ChatMessage = { role: "user", content: final, timestamp: new Date() };
          setMessages((prev) => [...prev, userMessage]);
          setInterimTranscript("");
          handleAIResponse(final);
        } else {
          setInterimTranscript(interim);
        }
      };

      r.onerror = (e: any) => {
        console.error("[CaserAI] Speech recognition error:", e?.error);
        setIsListening(false);
      };

      r.onend = () => {
        if (isListening) r.start();
      };

      recognitionRef.current = r;
    }

    return () => {
      recognitionRef.current?.stop();
      synthRef.current?.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [isListening]);

  useEffect(() => {
    if (!currentAIText) {
      setDisplayedAIText("");
      return;
    }
    let i = 0;
    setDisplayedAIText("");
    const id = setInterval(() => {
      if (i < currentAIText.length) {
        setDisplayedAIText(currentAIText.slice(0, i + 1));
        i++;
      } else clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [currentAIText]);

  const handleAIResponse = async (userInput: string) => {
    try {
      const res = await fetch("/api/interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userInput }],
          caseContext: caseData,
          interviewId,
        }),
      });

      const data = await res.json();

      // Handle insufficient balance error
      if (res.status === 402 && data.requiresPayment) {
        const errorMessage = "You've run out of credits. Please add funds to your account to continue this interview.";
        const aiMessage: ChatMessage = { role: "assistant", content: errorMessage, timestamp: new Date() };
        setMessages((prev) => [...prev, aiMessage]);
        setCurrentAIText(errorMessage);
        await speakText(errorMessage);

        // Redirect to pricing page after 3 seconds
        setTimeout(() => {
          router.push('/pricing');
        }, 3000);
        return;
      }

      // Handle rate limit error
      if (res.status === 429) {
        const errorMessage = "Too many requests. Please wait a moment and try again.";
        const aiMessage: ChatMessage = { role: "assistant", content: errorMessage, timestamp: new Date() };
        setMessages((prev) => [...prev, aiMessage]);
        setCurrentAIText(errorMessage);
        await speakText(errorMessage);
        return;
      }

      const aiMessage: ChatMessage = { role: "assistant", content: data.message, timestamp: new Date() };
      setMessages((prev) => [...prev, aiMessage]);
      setCurrentAIText(data.message);
      await speakText(data.message);
    } catch (e) {
      console.error("[CaserAI] AI response error:", e);
    }
  };

  const speakText = async (text: string) => {
    // Keep listening active so user can interrupt
    setIsSpeaking(true);

    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice_id: ELEVEN_DEFAULT_VOICE.current,
          model_id: "eleven_turbo_v2",
        }),
      });

      const ct = r.headers.get("content-type") || "";
      if (r.ok && ct.includes("audio")) {
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        if (!audioRef.current) audioRef.current = new Audio();
        audioRef.current.src = url;
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          setCurrentAIText("");
        };
        await audioRef.current.play();
        return;
      }

      console.warn("[CaserAI] TTS not audio:", await r.text());
      playLocal(text);
    } catch (e) {
      console.error("[CaserAI] TTS fetch failed:", e);
      playLocal(text);
    }
  };

  const playLocal = (text: string) => {
    if (!synthRef.current) {
      setIsSpeaking(false);
      return;
    }
    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    u.pitch = 1;
    u.onend = () => {
      setIsSpeaking(false);
      setCurrentAIText("");
    };
    synthRef.current.speak(u);
  };

  const startInterview = () => {
    setHasStarted(true);
    const welcome: ChatMessage = { role: "assistant", content: caseData.prompt, timestamp: new Date() };
    setMessages([welcome]);
    setCurrentAIText(caseData.prompt);
    speakText(caseData.prompt);
    startTimeRef.current = new Date();
    // Start listening immediately
    setTimeout(() => {
      recognitionRef.current?.start?.();
      setIsListening(true);
    }, 500);
  };

  const endInterview = async () => {
    recognitionRef.current?.stop();
    synthRef.current?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    const duration = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);

    if (!interviewId.startsWith("demo-")) {
      await supabase
        .from("interviews")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          duration,
          transcript: messages,
        })
        .eq("id", interviewId);

      await fetch("/api/interview/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId }),
      });
    }

    router.push(`/interview/${interviewId}/feedback`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div>
            <h1 className="text-lg font-semibold">{caseData.title}</h1>
            <p className="text-sm text-muted-foreground">
              {caseData.industry} • {caseData.difficulty}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={endInterview}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <DataExhibitSlideover exhibits={sampleExhibits} />

      <main className="container mx-auto flex flex-1 items-center justify-center p-6">
        <div className="flex w-full max-w-2xl flex-col items-center justify-center gap-8">
          {!hasStarted ? (
            <div className="text-center">
              <h2 className="mb-2 text-3xl font-bold">Ready to begin?</h2>
              <p className="mb-8 text-lg text-muted-foreground">Click the microphone to start your case interview</p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border">
                  <div className={`h-2 w-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : isSpeaking ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`} />
                  <p className="text-sm font-medium">
                    {isListening ? "🎤 Listening - Speak anytime" : isSpeaking ? "🗣️ AI Speaking - You can interrupt" : "Ready to listen"}
                  </p>
                </div>
              </div>

              <AudioVisualizer isActive={isSpeaking} isListening={isListening} />

              <div className="min-h-[200px] w-full max-w-2xl">
                {/* Current speaker */}
                <div className="mb-6 text-center min-h-[80px] flex items-center justify-center">
                  {isSpeaking && displayedAIText && (
                    <div className="w-full">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Interviewer</p>
                      <p className="text-balance text-lg leading-relaxed text-foreground">
                        {displayedAIText}
                        <span className="animate-pulse">|</span>
                      </p>
                    </div>
                  )}
                  {isListening && interimTranscript && (
                    <div className="w-full">
                      <p className="text-xs uppercase tracking-wide text-blue-600 mb-2">You</p>
                      <p className="text-balance text-lg leading-relaxed italic text-blue-600 font-medium">
                        {interimTranscript}
                        <span className="animate-pulse">|</span>
                      </p>
                    </div>
                  )}
                  {!isSpeaking && !interimTranscript && (
                    <p className="text-muted-foreground italic">Speak to continue...</p>
                  )}
                </div>

                {/* Recent conversation history */}
                <div className="max-h-[200px] overflow-y-auto space-y-3 px-4">
                  {messages.slice(-4).map((msg, i) => (
                    <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <span className={`inline-block px-3 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        {msg.content}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-6">
            {!hasStarted ? (
              <Button
                size="lg"
                className="h-20 w-20 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-all shadow-lg"
                onClick={startInterview}
              >
                <Mic className="h-8 w-8" />
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-16 w-16 rounded-full bg-white hover:bg-gray-100 border"
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.pause();
                      audioRef.current.currentTime = 0;
                    }
                    synthRef.current?.cancel();
                    setIsSpeaking(false);
                    setCurrentAIText("");
                  }}
                  disabled={!isSpeaking}
                  title="Skip AI response"
                >
                  <Volume2 className="h-6 w-6" />
                </Button>

                <div className="flex flex-col items-center gap-2">
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
                    isListening ? 'bg-green-500' : 'bg-gray-300'
                  } transition-colors`}>
                    <Mic className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-xs text-muted-foreground">Always listening</p>
                </div>

                <Button
                  size="lg"
                  variant="ghost"
                  className="h-16 w-16 rounded-full bg-white hover:bg-gray-100 border"
                  onClick={endInterview}
                  title="End interview"
                >
                  <X className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </div>
      </main>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}

const sampleExhibits = [
  { id: "1", title: "Market Size Analysis", type: "chart" as const, data: {} },
  { id: "2", title: "Revenue Breakdown", type: "table" as const, data: {} },
];