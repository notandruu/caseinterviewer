"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { ChevronLeft, Lock, EyeOff, Fingerprint, Share2, FileText, Target, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type OnboardingStep =
  | "welcome"
  | "name"
  | "university"
  | "source"
  | "schoolwork"
  | "difference"
  | "targetfirm"
  | "experience"
  | "proven"
  | "purpose"
  | "testimonials"
  | "commitment"
  | "availability"
  | "calibrating"
  | "allset"

export default function OnboardingPage() {
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome")
  const [selectedPurpose, setSelectedPurpose] = useState<string>("")
  const [name, setName] = useState("")
  const [selectedUniversity, setSelectedUniversity] = useState<string>("")
  const [selectedSchoolWork, setSelectedSchoolWork] = useState<string>("")
  const [selectedTargetFirm, setSelectedTargetFirm] = useState<string>("")
  const [selectedExperience, setSelectedExperience] = useState<string>("")
  const [selectedSource, setSelectedSource] = useState<string>("")
  const [calibrationProgress, setCalibrationProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/auth/login")
    }
  }, [isLoggedIn, router])

  const steps: OnboardingStep[] = [
    "welcome",
    "name",
    "university",
    "source",
    "schoolwork",
    "difference",
    "targetfirm",
    "experience",
    "proven",
    "purpose",
    "testimonials",
    "commitment",
    "availability",
    "calibrating",
    "allset",
  ]

  const currentStepIndex = steps.indexOf(currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const goBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex])
    }
  }

  const goNext = async () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex])

      if (steps[nextIndex] === "calibrating") {
        const messages = [
          "Analyzing your interview style…",
          "Preparing your interviewer…",
          "Reviewing case materials…",
          "Setting up your mock interview…",
          "Aligning on difficulty level…",
        ]

        let progress = 0
        setCalibrationProgress(0)
        setLoadingMessage(messages[0])

        const updateProgress = () => {
          progress += 1
          setCalibrationProgress(progress)

          if (progress <= 20) {
            setLoadingMessage(messages[0])
          } else if (progress <= 40) {
            setLoadingMessage(messages[1])
          } else if (progress <= 60) {
            setLoadingMessage(messages[2])
          } else if (progress <= 80) {
            setLoadingMessage(messages[3])
          } else {
            setLoadingMessage(messages[4])
          }

          if (progress >= 100) {
            return
          }

          // Accelerate towards the end - faster as we approach 100%
          let delay = 80
          if (progress > 80) {
            delay = 20 // Much faster in final 20%
          } else if (progress > 60) {
            delay = 40 // Faster after 60%
          } else if (progress > 40) {
            delay = 60 // Slightly faster after 40%
          }

          setTimeout(updateProgress, delay)
        }

        updateProgress()
      }
    } else if (currentStep === "allset") {
      // Save onboarding data and start first case interview
      setIsLoading(true)
      const supabase = createClient()

      // Save onboarding completion
      await supabase.from("user_profiles").upsert({
        user_id: user?.id,
        name,
        referral_source: selectedSource,
        target_firm: selectedTargetFirm,
        experience_level: selectedExperience,
        primary_goal: selectedPurpose,
        onboarding_completed: true,
        completed_at: new Date().toISOString(),
      })

      // Get the first case (lowest difficulty level)
      const { data: firstCase } = await supabase
        .from("cases")
        .select("id")
        .order("difficulty_level", { ascending: true })
        .limit(1)
        .single()

      if (firstCase) {
        // Redirect to the interview with smooth transition
        router.push(`/interview/${firstCase.id}`)
      } else {
        // Fallback to dashboard if no cases available
        router.push("/dashboard")
      }
    }
  }

  const canContinue = () => {
    switch (currentStep) {
      case "welcome":
      case "difference":
      case "proven":
      case "testimonials":
      case "commitment":
      case "availability":
      case "allset":
        return true
      case "purpose":
        return selectedPurpose !== ""
      case "name":
        return name.trim() !== ""
      case "university":
        return selectedUniversity !== ""
      case "schoolwork":
        return selectedSchoolWork !== ""
      case "targetfirm":
        return selectedTargetFirm !== ""
      case "experience":
        return selectedExperience !== ""
      case "source":
        return selectedSource !== ""
      case "calibrating":
        return calibrationProgress >= 100
      default:
        return false
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-3 w-3 rounded-full bg-[#2196F3] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="min-h-screen h-screen bg-white overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-[500px] min-h-screen md:h-[800px] relative flex flex-col">
          {currentStep === "welcome" ? (
            <WelcomeScreen onStart={() => setCurrentStep("name")} />
          ) : (
            <>
              <div className="flex-shrink-0 px-6 pt-8 pb-5 bg-white z-10">
                <div className="flex items-center gap-4">
                  {currentStep !== "allset" && (
                    <button onClick={goBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                  )}
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-black transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>

              <div className="flex-1 px-5 py-4 pb-24">
                {currentStep === "name" && <NameScreen value={name} onChange={setName} />}
                {currentStep === "university" && (
                  <UniversityScreen selected={selectedUniversity} onSelect={setSelectedUniversity} />
                )}
                {currentStep === "source" && <SourceScreen selected={selectedSource} onSelect={setSelectedSource} />}
                {currentStep === "schoolwork" && (
                  <SchoolWorkScreen selected={selectedSchoolWork} onSelect={setSelectedSchoolWork} />
                )}
                {currentStep === "difference" && <DifferenceScreen />}
                {currentStep === "targetfirm" && (
                  <TargetFirmScreen selected={selectedTargetFirm} onSelect={setSelectedTargetFirm} />
                )}
                {currentStep === "experience" && (
                  <ExperienceScreen selected={selectedExperience} onSelect={setSelectedExperience} />
                )}
                {currentStep === "proven" && <ProvenScreen />}
                {currentStep === "purpose" && (
                  <PurposeScreen selected={selectedPurpose} onSelect={setSelectedPurpose} />
                )}
                {currentStep === "testimonials" && <TestimonialsScreen />}
                {currentStep === "commitment" && <CommitmentScreen />}
                {currentStep === "availability" && <AvailabilityScreen />}
                {currentStep === "calibrating" && (
                  <CalibratingScreen progress={calibrationProgress} message={loadingMessage} />
                )}
                {currentStep === "allset" && <AllSetScreen />}
              </div>

              <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] px-6 pb-8 pt-5 bg-white z-20">
                <button
                  onClick={goNext}
                  disabled={!canContinue() || isLoading}
                  className={`w-full h-14 text-base font-medium bg-black text-white hover:bg-black/90 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-2xl transition-all duration-300 ${isLoading ? "opacity-75" : ""}`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      Starting your interview...
                    </span>
                  ) : (
                    "Continue"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <>
      <div className="absolute top-0 left-0 right-0 px-6 pt-8 pb-5 bg-white z-10">
        <div className="flex items-center gap-4">
          <button className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-black w-[5%]" />
          </div>
        </div>
      </div>

      <div className="absolute top-[88px] bottom-[100px] left-0 right-0 overflow-y-auto px-6 pb-8">
        <div className="space-y-6 pt-2">
          <img src="/logo.png" alt="Case Interviewer" className="w-12 h-12" />

          <div className="space-y-3.5 text-base leading-relaxed">
            <p className="font-medium">Welcome,</p>

            <p>We built Case Interviewer to help you master case interviews with confidence.</p>

            <p>
              Whether you're preparing for McKinsey, BCG, Bain, or any consulting firm, we're here to support your
              journey.
            </p>

            <p>
              Practice realistic cases,
              <br />
              build your frameworks,
              <br />
              and develop the skills you need to succeed.
            </p>

            <p className="font-semibold">Let's get started.</p>

            <p>Best,</p>
            <p className="font-['Brush_Script_MT',cursive] text-lg">Andrew and Farouk</p>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={onStart}
              className="w-auto h-12 px-8 text-base font-medium bg-black text-white hover:bg-black/90 rounded-2xl transition-colors"
            >
              Start
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function PurposeScreen({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (value: string) => void
}) {
  const options = [
    "Build my framework skills",
    "Practice under pressure",
    "Improve my structuring",
    "Build confidence",
    "Prepare for upcoming interviews",
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold leading-tight">What brings you to Case Interviewer?</h1>
      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={`w-full text-left px-6 py-4 rounded-2xl text-base transition-colors ${
              selected === option ? "bg-black text-white" : "bg-gray-100 text-black hover:bg-gray-200"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function DifferenceScreen() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold leading-tight">How is that different from ChatGPT?</h1>
      <div className="flex flex-col items-center justify-center py-10">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-b3rvUPTQaJs9BMRt2kzpv4hJ3ixLdw.png"
          alt="Stack of consulting books"
          className="w-48 h-48 mb-8 object-contain"
        />
        <p className="text-center text-base leading-relaxed max-w-sm">
          Case Interviewer is built for case interviews,
          <br />
          trained on real consulting frameworks
        </p>
      </div>
    </div>
  )
}

function ProvenScreen() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold leading-tight">Proven to help</h1>
      <div className="flex flex-col items-center justify-center py-10">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-bFg5cwfX4Suf8MQc0ROdWofDyGYmyW.png"
          alt="Performance improvement chart"
          className="w-60 h-48 mb-8 object-contain"
        />
        <p className="text-center text-base leading-relaxed max-w-md">
          In a recent study, AI interview prep led to a 75% improvement in performance
        </p>
      </div>
    </div>
  )
}

function NameScreen({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold leading-tight">What's your name?</h1>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Name..."
        className="w-full border-b-2 border-gray-300 focus:border-black outline-none pb-3 text-base placeholder:text-gray-400"
      />
    </div>
  )
}

function UniversityScreen({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (value: string) => void
}) {
  const options = ["Under 18", "18-24", "25-34", "35+", "Prefer not to say"]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold leading-tight">How many years young are you?</h1>
      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={`w-full text-left px-6 py-4 rounded-2xl text-base transition-colors ${
              selected === option ? "bg-black text-white" : "bg-gray-100 text-black hover:bg-gray-200"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function ExperienceScreen({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (value: string) => void
}) {
  const options = [
    "Complete beginner",
    "Done a few cases",
    "Intermediate (10+ cases)",
    "Advanced (preparing for finals)",
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold leading-tight">Experience with case interviews?</h1>
      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={`w-full text-left px-6 py-4 rounded-2xl text-base transition-colors ${
              selected === option ? "bg-black text-white" : "bg-gray-100 text-black hover:bg-gray-200"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function TargetFirmScreen({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (value: string) => void
}) {
  const options = ["McKinsey", "BCG", "Bain", "Deloitte", "PwC", "Not sure yet"]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold leading-tight">Target firm?</h1>
      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={`w-full text-left px-6 py-4 rounded-2xl text-base transition-colors ${
              selected === option ? "bg-black text-white" : "bg-gray-100 text-black hover:bg-gray-200"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function SourceScreen({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (value: string) => void
}) {
  const options = [
    { value: "instagram", label: "Instagram" },
    { value: "tiktok", label: "TikTok" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "reddit", label: "Reddit" },
    { value: "twitter", label: "Twitter" },
    { value: "friend", label: "Friend/family" },
  ]

  const getIcon = (value: string) => {
    switch (value) {
      case "instagram":
        return (
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/instagramlogo-yVfgoFQIf1SCJMO6csAlDOIJLtWbbp.png"
            alt="Instagram"
            className="w-5 h-5"
          />
        )
      case "tiktok":
        return (
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/tiktok%20logo-I65vxMY2VDvzl5Oe6m5ma415FxPtn7.png"
            alt="TikTok"
            className="w-5 h-5"
          />
        )
      case "linkedin":
        return (
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/linkedinlogo-EUPqZmbO3BURYTqWlOtTvMwXc0cXRu.png"
            alt="LinkedIn"
            className="w-5 h-5"
          />
        )
      case "reddit":
        return (
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/reddit%20logo-DwayFfGqmte9rMVldemdu1215T1Oer.png"
            alt="Reddit"
            className="w-5 h-5"
          />
        )
      case "twitter":
        return (
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/twitter%20logo-vRhC6dpHXW9XXI97CreClOrkzNkRWU.png"
            alt="Twitter"
            className="w-5 h-5"
          />
        )
      case "friend":
        return <Users className="w-5 h-5" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold leading-tight">How did you hear about Case Interviewer?</h1>
      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`w-full text-left px-6 py-4 rounded-2xl text-base transition-colors flex items-center gap-3 ${
              selected === option.value ? "bg-black text-white" : "bg-gray-100 text-black hover:bg-gray-200"
            }`}
          >
            {getIcon(option.value)}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function SchoolWorkScreen({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (value: string) => void
}) {
  const [otherValue, setOtherValue] = useState("")

  const schools = ["Berkeley", "Vanderbilt", "Harvard", "Princeton", "Stanford"]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold leading-tight">What university?</h1>
      <div className="space-y-3">
        {schools.map((school) => (
          <button
            key={school}
            onClick={() => onSelect(school)}
            className={`w-full text-left px-6 py-4 rounded-2xl text-base transition-colors ${
              selected === school ? "bg-black text-white" : "bg-gray-100 text-black hover:bg-gray-200"
            }`}
          >
            {school}
          </button>
        ))}
        <button
          onClick={() => onSelect("other")}
          className={`w-full text-left px-6 py-4 rounded-2xl text-base transition-colors ${
            selected === "other" ? "bg-black text-white" : "bg-gray-100 text-black hover:bg-gray-200"
          }`}
        >
          Other
        </button>
        {selected === "other" && (
          <input
            type="text"
            value={otherValue}
            onChange={(e) => setOtherValue(e.target.value)}
            placeholder="Enter your university..."
            className="w-full border-b-2 border-gray-300 focus:border-black outline-none pb-3 text-base placeholder:text-gray-400 mt-2"
            autoFocus
          />
        )}
      </div>
    </div>
  )
}

function TestimonialsScreen() {
  const testimonials = [
    {
      quote: "this literally saved my McKinsey interview. practiced for 2 days and felt so prepared.",
      username: "@_rose_boy_1029",
    },
    {
      quote: "to be honest, i gave it a try and it's really good. my framework structuring improved so much.",
      username: "@manzanitawoo",
    },
    {
      quote:
        "i'm... speechless. i used this for less than 5 minutes and i'm already seeing where i was going wrong. thank you so much.",
      username: "@mvggotz",
    },
    {
      quote: "i tried it and i can genuinely say—this is insane. i'm so amused by how realistic the cases are.",
      username: "@orianagxmez",
    },
    {
      quote: "guys. it works. i swear. got my BCG offer after using this.",
      username: "@alisson.music",
    },
    {
      quote: "this ateeeee. best case prep tool i've used.",
      username: "@aflynaaa",
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold leading-tight">What people are saying</h1>

      <div className="flex justify-center py-4 -mx-5">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-10-13%20at%2010.21.47%E2%80%AFAM-DLAZ2tNvlHLUBhh7gqXWZrBbZth6Pp.png"
          alt="Stars"
          className="w-full max-w-full h-auto object-contain"
        />
      </div>

      <div className="text-center space-y-3">
        <p className="text-base leading-relaxed">
          you're not alone.
          <br />
          thousands preparing for their dream consulting job.
        </p>
        <div className="flex items-center justify-center gap-2">
          <div className="flex -space-x-2">
            <img
              src="/avatars/avatar-1.jpg"
              alt="User"
              className="w-8 h-8 rounded-full border-2 border-white object-cover"
            />
            <img
              src="/avatars/avatar-2.jpg"
              alt="User"
              className="w-8 h-8 rounded-full border-2 border-white object-cover"
            />
            <img
              src="/avatars/avatar-3.jpg"
              alt="User"
              className="w-8 h-8 rounded-full border-2 border-white object-cover"
            />
          </div>
          <span className="text-sm text-gray-600">1,250+ students</span>
        </div>
      </div>

      <div className="space-y-4 pt-4">
        {testimonials.map((testimonial, index) => (
          <div
            key={index}
            className={`bg-gray-100 rounded-2xl p-5 space-y-3 w-[70%] ${index % 2 === 0 ? "mr-auto" : "ml-auto"}`}
          >
            <p className="text-sm leading-relaxed">{testimonial.quote}</p>
            <p className="text-xs text-gray-600">{testimonial.username}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function CommitmentScreen() {
  return (
    <div className="h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold leading-tight">Our commitment to you</h1>
        <p className="text-gray-600 mt-2 text-base">Your practice sessions are personal and private</p>
      </div>

      <div className="flex-1 flex items-center">
        <div className="space-y-12 w-full">
          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-1">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-base">End-to-end encryption</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                All your practice sessions and data are protected with industry-standard encryption protocols.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-1">
              <EyeOff className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-base">Privacy guaranteed</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Your practice sessions are never used to train our models or shared with third parties.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-1">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-base">Your trust matters</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                We prioritize your privacy and security above all else. Your data belongs to you, always.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AvailabilityScreen() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold leading-tight">Practice anytime, anywhere</h1>
      <div className="flex flex-col items-center justify-center py-10">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-JeqNs1Z5kUNbA2tOlVHtWxKf5axm3K.png"
          alt="24/7 availability satellite"
          className="w-60 h-48 mb-8 object-contain"
        />
        <p className="text-center text-base leading-relaxed max-w-md">
          Your personal case interviewer is available 24/7. Practice whenever you're ready.
        </p>
      </div>
    </div>
  )
}

function CalibratingScreen({ progress, message }: { progress: number; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative w-48 h-48">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E7EB" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#2196F3"
            strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 40}`}
            strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold">{progress}%</span>
        </div>
      </div>
      <p className="text-base mt-8 text-center px-6">{message}</p>
    </div>
  )
}

function AllSetScreen() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold leading-tight">You're all set!</h1>
        <p className="text-gray-600 mt-2 text-base">Let's begin your first case interview.</p>
      </div>

      <div className="space-y-8 py-4">
        <div className="flex gap-4">
          <div className="flex-shrink-0 mt-1">
            <Target className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-base">Realistic pressure</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Practice with the same intensity you'll face in real McKinsey, BCG, and Bain interviews.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0 mt-1">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-base">Built on frameworks</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Trained on real consulting frameworks to keep your practice sharp and structured.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-shrink-0 mt-1">
            <Share2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-base">24/7 availability</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Practice anytime, anywhere. Your personal case interviewer is always ready.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
