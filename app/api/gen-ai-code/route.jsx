import { GenAiCode } from "@/configs/AiModel";
import { NextResponse } from "next/server";

//export const config = { runtime: "edge" };

export async function POST(req) {
    const { prompt } = await req.json();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
  
    try {
      console.time("GenAiCode");
      const result = await GenAiCode.sendMessage(prompt, { signal: controller.signal });
      console.timeEnd("GenAiCode");
      clearTimeout(timeout);
      const respText = await result.response.text();
      return NextResponse.json(JSON.parse(respText));
    } catch (error) {
      console.error("Error in /api/gen-ai-code:", error);
      return NextResponse.json({ error: error.message || "Request Timeout" }, { status: 504 });
    }
  }
  
