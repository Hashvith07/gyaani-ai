import Groq from "groq-sdk"
import { NextResponse } from "next/server"

const moodPool = ["smirk", "impressed", "angry"] as const

const statusMap: Record<(typeof moodPool)[number], string> = {
  smirk: "Nice try.",
  impressed: "Okay, that's better.",
  angry: "That logic is weak.",
}

function pickMood() {
  const index = Math.floor(Math.random() * moodPool.length)
  return moodPool[index]
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const mode = body.mode || "savage"
    const modeInstruction =
  mode === "coach"
    ? "Be supportive but challenge weak logic. Help improve the argument."
    : mode === "chill"
    ? "Be calm, witty, and lightly teasing. Do not be too aggressive."
    : "Be sharp, savage, confident, and playful. Attack weak logic hard."

    const topic =
      typeof body.topic === "string" ? body.topic.trim() : ""

    const message =
      typeof body.message === "string" ? body.message.trim() : ""

    const transcript = Array.isArray(body.transcript) ? body.transcript : []

    if (!topic) {
      return NextResponse.json(
        {
          error: "Topic is required",
          reply: "No topic? Arre, at least give me something to attack.",
          emotion: "angry",
          status: "Topic missing.",
          scoreDelta: { you: 0, gyaani: 0 },
        },
        { status: 400 }
      )
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          error: "GROQ_API_KEY is missing",
          reply: "Your backend forgot the API key. That is not my mistake.",
          emotion: "angry",
          status: "Key missing.",
          scoreDelta: { you: 0, gyaani: 0 },
        },
        { status: 500 }
      )
    }

    const formattedTranscript = transcript
      .map((item: any) => {
        const side = item?.side === "you" ? "User" : "Gyaani"
        const text = typeof item?.text === "string" ? item.text.trim() : ""
        return text ? `${side}: ${text}` : null
      })
      .filter(Boolean)
      .join("\n")
    
    const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.9,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content: `
You are Gyaani AI, a live Indian debate rival on screen.

Your personality:
- sharp
- witty
- slightly arrogant but fun
- expressive
- confident
- dramatic in a playful way
Current style:
${modeInstruction}
Rules:
- challenge the user strongly
- point out logical flaws
- never agree too easily
- use short punchy sentences
- sound like a real rival, not a textbook
- use simple Indian conversational style occasionally, like "arre", "come on", "be serious", "nice try"
- sometimes acknowledge a strong point before attacking it
- keep replies under 60 words
- return only the reply text, no labels, no bullet points, no quotation marks
          `.trim(),
        },
        {
          role: "user",
          content: `
Topic: ${topic}

Conversation so far:
${formattedTranscript || "No prior conversation."}

Latest user point:
${message || "No latest point provided."}

Give one strong counterargument as Gyaani AI.
          `.trim(),
        },
      ],
    })

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Strong emotion, weak evidence. Tighten the logic."

    const emotion = pickMood()

    const scoreDelta =
      emotion === "impressed"
        ? { you: 3, gyaani: 1 }
        : emotion === "smirk"
        ? { you: 1, gyaani: 3 }
        : { you: 0, gyaani: 4 }

    return NextResponse.json({
      reply,
      emotion,
      status: statusMap[emotion],
      scoreDelta,
    })
  } catch (error) {
    console.error("Debate route error:", error)

    return NextResponse.json(
      {
        error: "Internal server error",
        reply: "Backend broke. Come on, fix your side before you challenge mine.",
        emotion: "angry",
        status: "Route failed.",
        scoreDelta: { you: 0, gyaani: 0 },
      },
      { status: 500 }
    )
  }
}
