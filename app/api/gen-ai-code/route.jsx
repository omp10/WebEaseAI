import { GenAiCode } from "@/configs/AiModel";
import { NextResponse } from "next/server";

// export const config = { runtime: "edge" }; // Uncomment if Edge runtime works better

export async function POST(req) {
    try {
        const { prompt } = await req.json();
        console.log("Received prompt:", prompt);
        
        const result = await GenAiCode.sendMessage(prompt);
        const respText = await result.response.text();

        console.log("AI Response:", respText);
        return NextResponse.json(JSON.parse(respText));
    } catch (error) {
        console.error("Error in API:", error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}

