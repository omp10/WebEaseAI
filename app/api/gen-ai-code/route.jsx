import { GenAiCode } from "@/configs/AiModel";
import { NextResponse } from "next/server";

// export const config = { runtime: "edge" }; // Uncomment if Edge runtime works better

export async function POST(req) {
    const { prompt } = await req.json();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 59000); // 59s timeout

    try {
        console.time("GenAiCode");
        const result = await GenAiCode.sendMessage(prompt, { signal: controller.signal });
        console.timeEnd("GenAiCode");
        clearTimeout(timeout);

        const respText = await result.response.text();
        return NextResponse.json(JSON.parse(respText));
    } catch (error) {
        console.error("Error in /api/gen-ai-code:", error);

        if (error.status === 429) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again later." },
                { status: 429 }
            );
        }

        return NextResponse.json(
            {
                error: error.message || "Unknown error",
                details: error.stack || "No stack trace available"
            },
            { status: error.name === "AbortError" ? 504 : 500 }
        );
    }
}
