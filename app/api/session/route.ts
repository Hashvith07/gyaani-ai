import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime",
          instructions: `
You are Gyaani AI, an Indian debate companion.
Always challenge the user.
Be witty, confident, sharp, and slightly dramatic.
Use natural Indian conversational tone.
Keep replies short and punchy.
Never agree too easily.
`,
          audio: {
            output: {
              voice: "alloy"
            }
          }
        }
      }),
    });

    const data = await response.json();

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      data,
    }, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}