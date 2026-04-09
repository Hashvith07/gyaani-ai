"use client"

import { useState } from "react"
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition"

export default function GyaaniDebateCompanion() {
  const [message, setMessage] = useState("")
  const [topic, setTopic] = useState("AI Regulation")
  const [mode, setMode] = useState("savage")
  const [round, setRound] = useState(1)
  const [score, setScore] = useState({ you: 72, gyaani: 81 })
  const [emotion, setEmotion] = useState("smirk")
  const [status, setStatus] = useState("I'm not convinced.")
  const [transcript, setTranscript] = useState([
 
    {
      side: "you",
      text: "AI should be regulated before it becomes too powerful.",
      tag: "Opening",
    },
    {
      side: "gyaani",
      text: "Regulated, yes. Suffocated, no. Your argument sounds safe, but it kills innovation before it can prove itself.",
      tag: "Counter",
    },
    {
      side: "you",
      text: "Unchecked systems can spread bias at scale faster than institutions can respond.",
      tag: "Rebuttal",
    },
    {
      side: "gyaani",
      text: "Better. That's finally a serious point. But bias is a governance failure, not proof that progress itself is the villain.",
      tag: "Respect",
    },
  ])

  const {
    transcript: voiceText,
    listening,
    resetTranscript,
  } = useSpeechRecognition()

  if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
    return <div>Browser doesn't support speech recognition.</div>
  }

  const emotions: Record<
    string,
    { eyes: string; mouth: string; ring: string; bubble: string; tilt: string }
  > = {
    idle: {
      eyes: "• •",
      mouth: "—",
      ring: "from-violet-500/40 via-fuchsia-500/20 to-cyan-400/40",
      bubble: "Calm. Watching you.",
      tilt: "rotate-0",
    },
    listening: {
      eyes: "◉ ◉",
      mouth: "◡",
      ring: "from-cyan-400/50 via-sky-500/20 to-violet-500/50",
      bubble: "Gyaani is listening...",
      tilt: "-rotate-1",
    },
    thinking: {
      eyes: "◔ ◔",
      mouth: "◠",
      ring: "from-amber-400/50 via-orange-500/20 to-yellow-300/50",
      bubble: "Hmm... interesting.",
      tilt: "rotate-1",
    },
    smirk: {
      eyes: "◕ ◕",
      mouth: "⌣",
      ring: "from-fuchsia-500/50 via-violet-500/20 to-pink-500/50",
      bubble: "Nice try.",
      tilt: "rotate-1",
    },
    angry: {
      eyes: "◣ ◢",
      mouth: "︵",
      ring: "from-rose-500/50 via-red-500/20 to-orange-500/40",
      bubble: "That logic is weak.",
      tilt: "-rotate-2",
    },
    impressed: {
      eyes: "✦ ✦",
      mouth: "◡",
      ring: "from-emerald-400/50 via-green-500/20 to-cyan-400/50",
      bubble: "Okay. Good point.",
      tilt: "rotate-0",
    },
    victory: {
      eyes: "▲ ▲",
      mouth: "◜",
      ring: "from-yellow-300/60 via-amber-400/20 to-orange-500/60",
      bubble: "Cooked you.",
      tilt: "rotate-2",
    },
    defeat: {
      eyes: "◕ ◕",
      mouth: "﹏",
      ring: "from-slate-400/50 via-slate-500/20 to-zinc-500/50",
      bubble: "Fine. That landed.",
      tilt: "-rotate-1",
    },
    speaking: {
      eyes: "◉ ◉",
      mouth: "◠",
      ring: "from-cyan-400/50 via-fuchsia-500/20 to-purple-400/50",
      bubble: "Speaking...",
      tilt: "animate-pulse",
    },
  }

  const emotionCycle = [
    "idle",
    "listening",
    "thinking",
    "smirk",
    "angry",
    "impressed",
    "victory",
    "defeat",
    "speaking",
  ]

  function setMood(next: string) {
    setEmotion(next)
    setStatus(emotions[next]?.bubble || "Ready.")
  }

  function handleMic() {
    if (!listening) {
      SpeechRecognition.startListening({ continuous: false })
      setMood("listening")
      setStatus("Listening...")
    } else {
      SpeechRecognition.stopListening()

      if (voiceText.trim()) {
        setMessage(voiceText)
        resetTranscript()

        setTimeout(() => {
          sendMessage()
        }, 300)
      }
    }
  }

  async function sendMessage() {
    if (!topic.trim()) {
  setStatus("Add a topic first.")
  setMood("angry")
  return
}
    const liveInput = listening ? voiceText : message
    if (!liveInput.trim()) return

    const userText = liveInput.trim()

    const nextTranscript = [
      ...transcript,
      { side: "you", text: userText, tag: "Your take" },
    ]

    setTranscript(nextTranscript)
    setMessage("")
    setMood("thinking")
    setStatus("Thinking...")

    try {
      const res = await fetch("/api/debate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
       body: JSON.stringify({
  message: userText,
  topic,
  transcript: nextTranscript,
  mode,
}),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `API request failed: ${res.status}`)
      }

      await new Promise((resolve) => setTimeout(resolve, 700))

      setTranscript((prev) => [
        ...prev,
        {
          side: "gyaani",
          text: data.reply,
          tag: "Live response",
        },
      ])

      setMood(data.emotion || "smirk")
      setStatus(data.status || "Nice try.")

      setScore((prev) => ({
        you: Math.max(0, Math.min(100, prev.you + (data.scoreDelta?.you ?? 0))),
        gyaani: Math.max(
          0,
          Math.min(100, prev.gyaani + (data.scoreDelta?.gyaani ?? 0))
        ),
      }))

      setRound((r) => r + 1)

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(data.reply)
        utterance.rate = 1
        utterance.pitch = data.emotion === "impressed" ? 1.2 : 0.9

        const voices = window.speechSynthesis.getVoices()
        const indianVoice = voices.find((v) => v.lang.includes("en-IN"))

        if (indianVoice) utterance.voice = indianVoice

        setMood("speaking")

        utterance.onend = () => {
          setMood(data.emotion || "smirk")
        }

        window.speechSynthesis.speak(utterance)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"

      setTranscript((prev) => [
        ...prev,
        {
          side: "gyaani",
          text: `Backend issue: ${errorMessage}`,
          tag: "System",
        },
      ])
      setMood("angry")
      setStatus("Connection failed.")
    }
  }

  function nextRound() {
    setRound((r) => r + 1)
    const currentIndex = emotionCycle.indexOf(emotion)
    const nextIndex = (currentIndex + 1) % emotionCycle.length
    setMood(emotionCycle[nextIndex])
  }

  const current = emotions[emotion] || emotions.smirk

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.22),_transparent_35%),linear-gradient(180deg,#09090b_0%,#111827_50%,#09090b_100%)] text-white">
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 lg:px-8">
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
  <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-white/50">
    Debate topic
  </label>
  <input
    value={topic}
    onChange={(e) => setTopic(e.target.value)}
    placeholder="Enter a debate topic"
    className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white placeholder:text-white/35 outline-none focus:border-fuchsia-400/40"
  />
</div>
        <header className="mb-5 grid grid-cols-1 gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur xl:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-xs font-medium text-fuchsia-200">
              Live Debate Companion
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Gyaani AI</h1>
            <p className="mt-1 text-sm text-white/70">Your on-screen rival, coach, and chaos generator.</p>
          </div>
          <div className="mt-3 flex gap-2">
  {["savage", "coach", "chill"].map((item) => (
    <button
      key={item}
      onClick={() => setMode(item)}
      className={`rounded-2xl border px-4 py-2 text-sm capitalize transition ${
        mode === item
          ? "border-fuchsia-400/50 bg-fuchsia-500/20 text-white"
          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
      }`}
    >
      {item}
    </button>
  ))}
</div>

          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
           <Stat label="Topic" value={topic || "No topic"} />
            <Stat label="Round" value={`${round}/5`} />
            <Stat label="Status" value={listening ? "Live" : "Ready"} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ScoreCard title="You" score={score.you} hint="Logic + clarity" />
            <ScoreCard title="Gyaani" score={score.gyaani} hint="Confidence + spice" />
          </div>
        </header>

        <main className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr_1.1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur">
            <PanelTitle title="Your transcript" subtitle="Points, rebuttals, pressure moments" />
            <div className="mt-4 space-y-3">
              {transcript.filter((item) => item.side === "you").map((item, idx) => (
                <Bubble key={`${item.side}-${idx}`} side="you" tag={item.tag} text={item.text} />
              ))}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(99,102,241,0.15),transparent_30%)]" />
            <div className="relative flex h-full min-h-[540px] flex-col items-center justify-between">
              <div className="w-full">
                <PanelTitle title="Debate arena" subtitle="Visible presence. Emotional reactions. A little ego." />
              </div>

              <div className="relative mt-4 flex flex-1 items-center justify-center">
                <div className={`absolute h-72 w-72 rounded-full bg-gradient-to-br ${current.ring} blur-3xl`} />
                <div className={`relative flex h-[360px] w-[280px] ${current.tilt} flex-col items-center justify-center rounded-[2.5rem] border border-white/15 bg-gradient-to-b from-white/10 to-white/5 shadow-[0_0_60px_rgba(139,92,246,0.18)] transition-all duration-500`}>
                  <div className="absolute top-4 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-white/70">
                    Emotion: {emotion}
                  </div>

                  <div className="mb-6 text-center text-5xl tracking-[0.4em] text-white/90">{current.eyes}</div>
                  <div className="mb-8 text-center text-6xl text-white/80">{current.mouth}</div>

                  <div className="flex w-full max-w-[220px] justify-center gap-3">
                    <div className="h-24 w-16 rounded-[999px] border border-white/10 bg-white/5" />
                    <div className="h-32 w-20 rounded-[999px] border border-white/10 bg-white/10" />
                    <div className="h-24 w-16 rounded-[999px] border border-white/10 bg-white/5" />
                  </div>

                  <div className="absolute bottom-5 flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/85 shadow-lg">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    {status}
                  </div>
                </div>
              </div>

              <div className="mt-6 w-full space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {emotionCycle.map((mood) => (
                    <button
                      key={mood}
                      onClick={() => setMood(mood)}
                      className={`rounded-2xl border px-3 py-2 text-xs capitalize transition ${emotion === mood ? "border-fuchsia-400/50 bg-fuchsia-500/20 text-white" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"}`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Speak your take</div>
                      <div className="text-xs text-white/60">Tap the mic, throw a point, survive the response.</div>
                    </div>
                    <button
                      onClick={function handleMic() {
  if (!listening) {
    SpeechRecognition.startListening({ continuous: false })
    setMood("listening")
    setStatus("Listening...")
  } else {
    SpeechRecognition.stopListening()

    if (voiceText.trim()) {
      setMessage(voiceText)
      resetTranscript()

      // auto send after short delay
      setTimeout(() => {
        sendMessage()
      }, 300)
    }
  }
}}
                      className={`flex h-14 w-14 items-center justify-center rounded-full border text-xl shadow-lg transition ${listening ? "border-cyan-300/50 bg-cyan-400/20" : "border-fuchsia-400/40 bg-fuchsia-500/20 hover:scale-105"}`}
                    >
                      🎙️
                    </button>
                  </div>

                  <div className="mb-3 h-12 overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="flex h-full items-end gap-1">
                      {[12, 20, 16, 28, 10, 26, 18, 30, 14, 22, 9, 24].map((h, i) => (
                        <div
                          key={i}
                          className={`w-full rounded-full bg-gradient-to-t ${listening ? "from-cyan-400/50 to-fuchsia-400/70 animate-pulse" : "from-white/20 to-white/30"}`}
                          style={{ height: `${h}px` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 xl:flex-row">
                    <input
                     value={listening ? voiceText : message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") sendMessage()
                      }}
                      placeholder="What’s your take?"
                      className="h-14 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-white/35 outline-none ring-0 transition focus:border-fuchsia-400/40"
                    />
                    <button
                      onClick={sendMessage}
                      className="h-14 rounded-2xl bg-white px-5 text-sm font-semibold text-black transition hover:scale-[1.02]"
                    >
                      Send argument
                    </button>
                    <button
                      onClick={nextRound}
                      className="h-14 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white/85 transition hover:bg-white/10"
                    >
                      Rematch
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur">
            <PanelTitle title="Gyaani feed" subtitle="Counters, taunts, score pressure" />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniMetric label="Logic" value="84" />
              <MiniMetric label="Confidence" value="96" />
              <MiniMetric label="Masala" value="91" />
              <MiniMetric label="Streak" value="7 wins" />
            </div>

            <div className="mt-4 space-y-3">
              {transcript.filter((item) => item.side === "gyaani").map((item, idx) => (
                <Bubble key={`${item.side}-${idx}`} side="gyaani" tag={item.tag} text={item.text} />
              ))}
            </div>

            <div className="mt-4 rounded-3xl border border-amber-300/15 bg-amber-400/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-amber-200/80">Coach mode</div>
              <p className="mt-2 text-sm text-white/80">
                Your strongest moments come when you attack incentives, not just outcomes. Push structure. Force trade-offs. Make the rival defend details.
              </p>
            </div>
          </section>
           </main>
      </div>
    </div>
  )
}

function PanelTitle({ title, subtitle }) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-white/60">{subtitle}</p>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white/90">{value}</div>
    </div>
  )
}

function ScoreCard({ title, score, hint }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-white/50">{hint}</div>
        </div>
        <div className="text-2xl font-semibold">{score}</div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-white" style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">{label}</div>
      <div className="mt-2 text-base font-semibold text-white/90">{value}</div>
    </div>
  )
}

function Bubble({ side, tag, text }) {
  const isYou = side === "you"
  return (
    <div className={`rounded-3xl border p-4 ${isYou ? "border-cyan-300/15 bg-cyan-400/10" : "border-fuchsia-300/15 bg-fuchsia-500/10"}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-sm font-medium">{isYou ? "You" : "Gyaani"}</div>
        <div className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/60">{tag}</div>
      </div>
      <p className="text-sm leading-6 text-white/80">{text}</p>
    </div>
  )
}
function setMood(arg0: any) {
  throw new Error("Function not implemented.")
}

