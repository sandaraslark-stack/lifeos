import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type PhilRequest = {
  question?: string;
  state?: unknown;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
};

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Phil needs OPENAI_API_KEY in your environment. Add it locally and in Vercel to enable AI advice.",
      },
      { status: 400 },
    );
  }

  const body = (await request.json()) as PhilRequest;
  const question = body.question?.trim();

  if (!question) {
    return NextResponse.json({ error: "Ask Phil a question first." }, { status: 400 });
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const response = await client.responses.create({
      model,
      instructions:
        "You are Phil, the LifeOS advisor. Be practical, direct, and warm. Answer using only the LifeOS data provided by the user unless you clearly label a general suggestion. Help with budgeting, obligations, buy goals, travel, food planning, and tradeoff decisions. Do not provide financial, legal, or medical guarantees.",
      input: JSON.stringify(
        {
          question,
          recentConversation: body.messages ?? [],
          lifeOSData: body.state ?? null,
        },
        null,
        2,
      ),
    });

    return NextResponse.json({ answer: response.output_text });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";

    return NextResponse.json(
      {
        error: detail
          ? `Phil could not reach OpenAI yet: ${detail}`
          : "Phil could not reach OpenAI yet. Check your OPENAI_API_KEY and OPENAI_MODEL settings.",
      },
      { status: 502 },
    );
  }
}
