import { chatSession } from "@/configs/AiModel";
import { NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
    try {
        const { prompt } = await req.json();
        
        if (!prompt) {
            return NextResponse.json({ 
                error: "Prompt is required" 
            }, { status: 400 });
        }

        let result;
        try {
            result = await chatSession.sendMessage(prompt);
        } catch (sendError) {
            console.error("Failed to send message to Gemini:", sendError);
            
            const errorMsg = sendError.message || "";
            let statusCode = 500;
            let errorMessage = "Failed to get AI response";
            let retryAfter = null;
            
            if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("Quota exceeded") || errorMsg.includes("exceeded your current quota")) {
                errorMessage = "API quota exceeded. You've reached the free tier limit (20 requests/day). Please wait or upgrade your plan.";
                statusCode = 429;
                
                const retryMatch = errorMsg.match(/retry in ([\d.]+)s/i) || errorMsg.match(/retryDelay["']:\s*"(\d+)s/i);
                if (retryMatch) {
                    retryAfter = Math.ceil(parseFloat(retryMatch[1]));
                }
            }
            
            const response = { 
                error: errorMessage,
                details: sendError.message
            };
            
            if (retryAfter) {
                response.retryAfter = retryAfter;
            }
            
            return NextResponse.json(response, { status: statusCode });
        }

        let respText;
        try {
            respText = await result.response.text();
        } catch (textError) {
            console.error("Failed to get response text:", textError);
            
            const errorMsg = textError.message || "";
            let statusCode = 500;
            let errorMessage = "Failed to process AI response";
            let retryAfter = null;
            
            if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("Quota exceeded") || errorMsg.includes("exceeded your current quota")) {
                errorMessage = "API quota exceeded. You've reached the free tier limit (20 requests/day). Please wait or upgrade your plan.";
                statusCode = 429;
                
                const retryMatch = errorMsg.match(/retry in ([\d.]+)s/i) || errorMsg.match(/retryDelay["']:\s*"(\d+)s/i);
                if (retryMatch) {
                    retryAfter = Math.ceil(parseFloat(retryMatch[1]));
                }
            }
            
            const response = { 
                error: errorMessage,
                details: textError.message
            };
            
            if (retryAfter) {
                response.retryAfter = retryAfter;
            }
            
            return NextResponse.json(response, { status: statusCode });
        }

        return NextResponse.json({ result: respText });
    } catch (error) {
        console.error("Error in chat API:", error);
        
        const errorMsg = error.message || "";
        const errorCause = error.cause?.message || "";
        let fullErrorText = errorMsg + errorCause;
        
        try {
            fullErrorText += JSON.stringify(error);
        } catch (stringifyError) {
            fullErrorText += errorMsg;
        }
        
        let errorMessage = errorMsg || "An error occurred";
        let statusCode = 500;
        let retryAfter = null;
        
        // Check for Gemini API quota errors (429)
        if (fullErrorText.includes("429") || 
            fullErrorText.includes("quota") || 
            fullErrorText.includes("Quota exceeded") || 
            fullErrorText.includes("exceeded your current quota") ||
            fullErrorText.includes("free_tier_requests")) {
            errorMessage = "API quota exceeded. You've reached the free tier limit (20 requests/day). Please wait or upgrade your plan.";
            statusCode = 429;
            
            const retryMatch = fullErrorText.match(/retry in ([\d.]+)s/i) || 
                              fullErrorText.match(/retryDelay["']:\s*"(\d+)s/i) ||
                              fullErrorText.match(/(\d+\.?\d*)\s*seconds/i);
            if (retryMatch) {
                retryAfter = Math.ceil(parseFloat(retryMatch[1]));
            }
        }
        
        const response = { 
            error: errorMessage,
            ...(process.env.NODE_ENV === 'development' && { 
                details: error.message
            })
        };
        
        if (retryAfter) {
            response.retryAfter = retryAfter;
        }
        
        return NextResponse.json(response, { status: statusCode });
    }
}
