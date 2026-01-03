import { getChatResponse } from "@/configs/AiModel";
import { NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
    try {
        const { prompt, model = "groq" } = await req.json();
        
        if (!prompt) {
            return NextResponse.json({ 
                error: "Prompt is required" 
            }, { status: 400 });
        }

        // Validate model type
        if (!["groq", "gemini", "deepseek", "openrouter"].includes(model)) {
            return NextResponse.json({ 
                error: "Invalid model type. Supported models: groq, gemini, deepseek, openrouter"
            }, { status: 400 });
        }

        // Check if API key is set based on model
        if (model === "groq" && !process.env.NEXT_PUBLIC_GROQ_API_KEY) {
            return NextResponse.json({ 
                error: "API key is not configured. Please set NEXT_PUBLIC_GROQ_API_KEY environment variable.",
                details: "The Groq API key is missing from your environment variables."
            }, { status: 500 });
        }

        if (model === "gemini" && !process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
            return NextResponse.json({ 
                error: "API key is not configured. Please set NEXT_PUBLIC_GEMINI_API_KEY environment variable.",
                details: "The Gemini API key is missing from your environment variables."
            }, { status: 500 });
        }

        let result;
        try {
            // Convert prompt to messages format
            const messages = [
                {
                    role: "user",
                    content: prompt
                }
            ];
            
            result = await getChatResponse(messages, model);
        } catch (sendError) {
            console.error("Failed to send message to Groq:", sendError);
            
            const errorMsg = sendError.message || "";
            let statusCode = 500;
            let errorMessage = "Failed to get AI response";
            let retryAfter = null;
            
            // Rate limit errors (both Groq and Gemini)
            if (errorMsg.includes("429") || errorMsg.includes("rate limit") || errorMsg.includes("too many requests") || errorMsg.includes("quota") || errorMsg.includes("Quota exceeded")) {
                errorMessage = model === "gemini" 
                    ? "API quota exceeded. You've reached the free tier limit. Please wait or upgrade your plan."
                    : "Rate limit exceeded. Please wait a moment before trying again.";
                statusCode = 429;
                
                // Try to extract retry after from error
                const retryMatch = errorMsg.match(/retry.*?(\d+)/i) || errorMsg.match(/retry in ([\d.]+)s/i);
                if (retryMatch) {
                    retryAfter = Math.ceil(parseFloat(retryMatch[1]));
                }
            } else if (errorMsg.includes("402") || errorMsg.includes("Insufficient Balance") || errorMsg.includes("insufficient balance")) {
                const modelName = model === "gemini" ? "Gemini" : model === "deepseek" ? "DeepSeek" : model === "openrouter" ? "OpenRouter" : "Groq";
                errorMessage = `${modelName} account has insufficient balance. Please add credits to your ${modelName} account.`;
                statusCode = 402;
            } else if (errorMsg.includes("401") || errorMsg.includes("unauthorized") || errorMsg.includes("invalid api key")) {
                const modelName = model === "gemini" ? "Gemini" : model === "deepseek" ? "DeepSeek" : model === "openrouter" ? "OpenRouter" : "Groq";
                errorMessage = `Invalid API key. Please check your ${modelName} API key configuration.`;
                statusCode = 401;
            } else if (errorMsg.includes("404") || errorMsg.includes("No endpoints found") || errorMsg.includes("model not found")) {
                const modelName = model === "openrouter" ? "OpenRouter" : "";
                errorMessage = model === "openrouter" 
                    ? "The selected model is not available on OpenRouter. Please try a different model or check OpenRouter's available models."
                    : "Model not found. Please try a different model.";
                statusCode = 404;
            }
            
            const response = { 
                error: errorMessage,
                details: sendError.message,
                ...(process.env.NODE_ENV === 'development' && { 
                    stack: sendError.stack,
                    name: sendError.name
                })
            };
            
            if (retryAfter) {
                response.retryAfter = retryAfter;
            }
            
            return NextResponse.json(response, { status: statusCode });
        }

        return NextResponse.json({ result: result });
    } catch (error) {
        console.error("Error in chat API:", error);
        
        const errorMsg = error.message || "";
        let errorMessage = errorMsg || "An error occurred";
        let statusCode = 500;
        let retryAfter = null;
        
        // Check for API errors (both Groq and Gemini)
        if (errorMsg.includes("429") || errorMsg.includes("rate limit") || errorMsg.includes("quota")) {
            errorMessage = "Rate limit exceeded. Please wait a moment before trying again.";
            statusCode = 429;
        } else if (errorMsg.includes("402") || errorMsg.includes("Insufficient Balance") || errorMsg.includes("insufficient balance")) {
            errorMessage = "API account has insufficient balance. Please add credits to your account or try a different model.";
            statusCode = 402;
        } else if (errorMsg.includes("401") || errorMsg.includes("unauthorized")) {
            errorMessage = "Invalid API key. Please check your API key configuration.";
            statusCode = 401;
        }
        
        const response = { 
            error: errorMessage,
            ...(process.env.NODE_ENV === 'development' && { 
                details: error.message,
                stack: error.stack
            })
        };
        
        if (retryAfter) {
            response.retryAfter = retryAfter;
        }
        
        return NextResponse.json(response, { status: statusCode });
    }
}

