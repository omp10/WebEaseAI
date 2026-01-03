import { GenAiCode } from "@/configs/AiModel";
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

        console.log("Starting code generation with prompt length:", prompt.length);
        
        let result;
        try {
            // Check if GenAiCode is available
            if (!GenAiCode) {
                throw new Error("GenAiCode session is not available. Check AiModel configuration.");
            }
            
            result = await GenAiCode.sendMessage(prompt);
            console.log("Message sent, waiting for response...");
        } catch (sendError) {
            console.error("Failed to send message to Gemini:", sendError);
            console.error("Error details:", {
                message: sendError.message,
                name: sendError.name,
                stack: sendError.stack,
                cause: sendError.cause
            });
            
            const errorMsg = sendError.message || "";
            let statusCode = 500;
            let errorMessage = "Failed to generate code";
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
                details: sendError.message,
                ...(process.env.NODE_ENV === 'development' && { 
                    stack: sendError.stack,
                    name: sendError.name,
                    fullError: String(sendError)
                })
            };
            
            if (retryAfter) {
                response.retryAfter = retryAfter;
            }
            
            console.error("Returning error response:", response);
            return NextResponse.json(response, { status: statusCode });
        }

        let respText;
        try {
            respText = await result.response.text();
            console.log("Response received, length:", respText.length);
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

        // Try to parse JSON, handle cases where response might not be valid JSON
        let parsedResponse;
        let cleanedText = respText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Fix incomplete escape sequences before parsing
        cleanedText = cleanedText.replace(/\\+(?=["'])/g, '');
        cleanedText = cleanedText.replace(/\\u(?![\da-fA-F]{4})/g, '');
        cleanedText = cleanedText.replace(/\\+$/g, '');
        
        // Try parsing with error recovery
        let parseAttempts = 0;
        const maxAttempts = 3;
        let parseSuccess = false;
        
        while (parseAttempts < maxAttempts && !parseSuccess) {
            try {
                parsedResponse = JSON.parse(cleanedText);
                parseSuccess = true;
                break; // Success!
            } catch (parseError) {
                parseAttempts++;
                
                // Check if it's an unterminated string error
                if (parseError.message && parseError.message.includes('Unterminated string')) {
                    // Extract position from error message if available
                    const positionMatch = parseError.message.match(/position (\d+)/);
                    const errorPosition = positionMatch ? parseInt(positionMatch[1]) : cleanedText.length;
                    
                    // Find the start of the unterminated string by going backwards from error position
                    let stringStart = -1;
                    let escapeNext = false;
                    
                    // Go backwards from error position to find where string started
                    for (let i = Math.min(errorPosition, cleanedText.length - 1); i >= 0; i--) {
                        const char = cleanedText[i];
                        
                        if (escapeNext) {
                            escapeNext = false;
                            continue;
                        }
                        
                        if (char === '\\') {
                            escapeNext = true;
                            continue;
                        }
                        
                        if (char === '"') {
                            // Check if this is the start of the unterminated string
                            let foundClose = false;
                            let aheadEscape = false;
                            
                            for (let j = i + 1; j < Math.min(i + 1000, cleanedText.length); j++) {
                                if (aheadEscape) {
                                    aheadEscape = false;
                                    continue;
                                }
                                if (cleanedText[j] === '\\') {
                                    aheadEscape = true;
                                    continue;
                                }
                                if (cleanedText[j] === '"') {
                                    foundClose = true;
                                    break;
                                }
                                // If we hit a structural character before a quote, this isn't a string
                                if (cleanedText[j] === '}' || cleanedText[j] === ']' || cleanedText[j] === ',') {
                                    break;
                                }
                            }
                            
                            if (!foundClose && i < errorPosition) {
                                stringStart = i;
                                break;
                            }
                        }
                    }
                    
                    if (stringStart !== -1) {
                        // Found the unterminated string - close it at a safe position
                        const beforeString = cleanedText.substring(0, stringStart + 1);
                        const stringContent = cleanedText.substring(stringStart + 1, errorPosition);
                        
                        // Find a safe break point (before incomplete code patterns)
                        let safeEnd = stringContent.length;
                        
                        // Look for incomplete patterns in the last portion
                        const checkFrom = Math.max(0, stringContent.length - Math.min(500, stringContent.length * 0.3));
                        const endPortion = stringContent.substring(checkFrom);
                        
                        const incompletePatterns = [
                            /<[^>]*$/,  // Incomplete tag
                            /className=\\?["']?$/,  // Incomplete attribute
                            /function\s*\([^)]*$/,  // Incomplete function
                            /console\.\w+\($/,  // Incomplete call
                        ];
                        
                        for (const pattern of incompletePatterns) {
                            const match = endPortion.match(pattern);
                            if (match) {
                                safeEnd = checkFrom + match.index - 5;
                                break;
                            }
                        }
                        
                        // Find last safe break (newline or space)
                        if (safeEnd === stringContent.length) {
                            const lastNewline = stringContent.lastIndexOf('\\n');
                            const lastSpace = stringContent.lastIndexOf(' ');
                            
                            if (lastNewline > stringContent.length * 0.8) {
                                safeEnd = lastNewline;
                            } else if (lastSpace > stringContent.length * 0.9) {
                                safeEnd = lastSpace;
                            } else {
                                safeEnd = Math.floor(stringContent.length * 0.95);
                            }
                        }
                        
                        safeEnd = Math.max(0, Math.min(safeEnd, stringContent.length));
                        
                        // Close the string and remove everything after it
                        const safeContent = stringContent.substring(0, safeEnd);
                        cleanedText = beforeString + safeContent + '"';
                        
                        // Remove any trailing incomplete JSON
                        const lastBrace = cleanedText.lastIndexOf('}');
                        const lastBracket = cleanedText.lastIndexOf(']');
                        const lastComplete = Math.max(lastBrace, lastBracket);
                        
                        if (lastComplete > cleanedText.length * 0.7) {
                            cleanedText = cleanedText.substring(0, lastComplete + 1);
                        }
                        
                        // Close any remaining open structures
                        const openBraces = (cleanedText.match(/{/g) || []).length;
                        const closeBraces = (cleanedText.match(/}/g) || []).length;
                        const openBrackets = (cleanedText.match(/\[/g) || []).length;
                        const closeBrackets = (cleanedText.match(/\]/g) || []).length;
                        
                        for (let i = 0; i < openBrackets - closeBrackets; i++) {
                            cleanedText += ']';
                        }
                        for (let i = 0; i < openBraces - closeBraces; i++) {
                            cleanedText += '}';
                        }
                        
                        continue; // Try parsing again
                    }
                }
                
                // If we can't fix it or max attempts reached, throw
                if (parseAttempts >= maxAttempts) {
                    throw parseError;
                }
            }
        }
        
        // If parsing succeeded, return the response
        if (parseSuccess && parsedResponse) {
            return NextResponse.json(parsedResponse);
        }
        
        // If we get here, parsing failed - try to recover
        let parseError = new Error("Failed to parse JSON after max attempts");
        try {
            console.error("Failed to parse JSON response:", parseError);
            console.error("Response length:", respText.length);
            console.error("Response preview (first 1000 chars):", respText.substring(0, 1000));
            console.error("Response preview (last 500 chars):", respText.substring(Math.max(0, respText.length - 500)));
            
            // Try to extract what we can from the response even if truncated
            try {
                // Find the files object start
                const filesStartIndex = respText.indexOf('"files"');
                if (filesStartIndex !== -1) {
                    // Extract all file entries we can find
                    let extractedFiles = {};
                    const filePattern = /"\/[^"]+":\s*\{[^}]*"code":\s*"([^"]*(?:\\.[^"]*)*)"/g;
                    let match;
                    
                    while ((match = filePattern.exec(respText)) !== null) {
                        const filePathMatch = match[0].match(/"\/([^"]+)"/);
                        const codeMatch = match[0].match(/"code":\s*"([^"]*(?:\\.[^"]*)*)"/);
                        if (filePathMatch && codeMatch) {
                            try {
                                const filePath = filePathMatch[1];
                                // Unescape the code string
                                const code = codeMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                                extractedFiles[`/${filePath}`] = { code };
                            } catch (e) {
                                console.warn(`Failed to extract code for file`);
                            }
                        }
                    }
                    
                    // If we extracted any files, try to build a valid response
                    if (Object.keys(extractedFiles).length > 0) {
                        // Try to extract projectTitle and explanation if available
                        const titleMatch = respText.match(/"projectTitle":\s*"([^"]*)"/);
                        const explanationMatch = respText.match(/"explanation":\s*"([^"]*)"/);
                        
                        const recoveredResponse = {
                            projectTitle: titleMatch ? titleMatch[1] : "Recovered Project",
                            explanation: explanationMatch ? explanationMatch[1] : "Code was partially recovered due to response truncation.",
                            files: extractedFiles,
                            generatedFiles: Object.keys(extractedFiles)
                        };
                        
                        console.warn("Successfully recovered partial response with", Object.keys(extractedFiles).length, "files");
                        return NextResponse.json(recoveredResponse);
                    }
                }
                
                // Fallback: try to fix incomplete JSON by closing structures
                let attemptFix = respText;
                
                // Remove any incomplete string at the end
                if (attemptFix.match(/"[^"]*$/)) {
                    const lastCompleteQuote = attemptFix.lastIndexOf('"', attemptFix.length - 2);
                    if (lastCompleteQuote > attemptFix.length * 0.9) {
                        attemptFix = attemptFix.substring(0, lastCompleteQuote + 1);
                    }
                }
                
                // Close any open structures
                const openBraces = (attemptFix.match(/{/g) || []).length;
                const closeBraces = (attemptFix.match(/}/g) || []).length;
                const openBrackets = (attemptFix.match(/\[/g) || []).length;
                const closeBrackets = (attemptFix.match(/\]/g) || []).length;
                
                for (let i = 0; i < openBrackets - closeBrackets; i++) {
                    attemptFix += ']';
                }
                for (let i = 0; i < openBraces - closeBraces; i++) {
                    attemptFix += '}';
                }
                
                try {
                    const partialParsed = JSON.parse(attemptFix);
                    console.warn("Successfully recovered response by fixing JSON structure");
                    return NextResponse.json(partialParsed);
                } catch (recoveryError) {
                    console.error("Could not recover partial response:", recoveryError);
                }
            } catch (extractError) {
                console.error("Could not extract partial response:", extractError);
            }
            
            return NextResponse.json({ 
                error: "Failed to parse AI response as JSON. The response may have been truncated. Try requesting a simpler project or fewer files.",
                details: parseError.message,
                responseLength: respText.length,
                responsePreview: respText.substring(0, 1000),
                suggestion: "The response exceeded the maximum length. Try breaking your request into smaller parts or requesting fewer components."
            }, { status: 500 });
        } catch (recoveryParseError) {
            // If recovery also fails, return error
            return NextResponse.json({ 
                error: "Failed to parse AI response as JSON. The response may have been truncated.",
                details: recoveryParseError.message,
                responseLength: respText.length
            }, { status: 500 });
        }
    } catch (error) {
        console.error("Error in code generation API:", error);
        
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
        } else if (errorMsg.includes("API_KEY") || errorMsg.includes("API key")) {
            errorMessage = "Invalid or missing API key. Please check your Gemini API key configuration.";
            statusCode = 500;
        } else if (errorMsg.includes("limit") && !errorMsg.includes("quota")) {
            errorMessage = "Rate limit exceeded. Please wait a moment before trying again.";
            statusCode = 429;
        } else if (errorMsg.includes("timeout")) {
            errorMessage = "Request timed out. The AI service is taking too long to respond.";
            statusCode = 504;
        }
        
        const response = { 
            error: errorMessage,
            ...(process.env.NODE_ENV === 'development' && { 
                stack: error.stack,
                name: error.name,
                details: error.message
            })
        };
        
        if (retryAfter) {
            response.retryAfter = retryAfter;
        }
        
        return NextResponse.json(response, { status: statusCode });
    }
}
