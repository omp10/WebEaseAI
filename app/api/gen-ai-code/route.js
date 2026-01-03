import { getCodeGenerationResponse } from "@/configs/AiModel";
import { NextResponse } from "next/server";
import Prompt from "@/data/Prompt";

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
            console.error("NEXT_PUBLIC_GROQ_API_KEY is not set");
            return NextResponse.json({ 
                error: "API key is not configured. Please set NEXT_PUBLIC_GROQ_API_KEY environment variable.",
                details: "The Groq API key is missing from your environment variables."
            }, { status: 500 });
        }

        if (model === "gemini" && !process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
            console.error("NEXT_PUBLIC_GEMINI_API_KEY is not set");
            return NextResponse.json({ 
                error: "API key is not configured. Please set NEXT_PUBLIC_GEMINI_API_KEY environment variable.",
                details: "The Gemini API key is missing from your environment variables."
            }, { status: 500 });
        }

        if (model === "deepseek" && !process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY) {
            console.error("NEXT_PUBLIC_DEEPSEEK_API_KEY is not set");
            return NextResponse.json({ 
                error: "API key is not configured. Please set NEXT_PUBLIC_DEEPSEEK_API_KEY environment variable.",
                details: "The DeepSeek API key is missing from your environment variables."
            }, { status: 500 });
        }

        if (model === "openrouter" && !process.env.NEXT_PUBLIC_OPENROUTER_API_KEY) {
            console.error("NEXT_PUBLIC_OPENROUTER_API_KEY is not set");
            return NextResponse.json({ 
                error: "API key is not configured. Please set NEXT_PUBLIC_OPENROUTER_API_KEY environment variable.",
                details: "The OpenRouter API key is missing from your environment variables."
            }, { status: 500 });
        }

        console.log("Starting code generation with prompt length:", prompt.length);
        console.log("Using model:", model);
        
        let respText;
        try {
            // Build messages array for Groq
            // Parse the prompt to extract messages if it's JSON, otherwise use as single message
            let messages;
            try {
                const parsedPrompt = JSON.parse(prompt);
                if (Array.isArray(parsedPrompt) && parsedPrompt.length > 0) {
                    // Convert from MessagesContext format to Groq format
                    messages = parsedPrompt.map(msg => ({
                        role: msg.role === "user" ? "user" : "assistant",
                        content: msg.content || msg.text || ""
                    }));
                } else {
                    messages = [{ role: "user", content: prompt }];
                }
            } catch {
                // If parsing fails, treat as single prompt
                messages = [{ role: "user", content: prompt }];
            }
            
            // Add the code generation prompt to the last user message
            // Groq works better with user messages, so we'll append the prompt
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.role === "user") {
                lastMessage.content = `${lastMessage.content}\n\n${Prompt.CODE_GEN_PROMPT}`;
            } else {
                // If no user message, add one with the prompt
                messages.push({
                    role: "user",
                    content: Prompt.CODE_GEN_PROMPT
                });
            }
            
            respText = await getCodeGenerationResponse(messages, model);
            console.log("Response received, length:", respText.length);
            console.log("Response preview (first 500 chars):", respText.substring(0, 500));
            
            // For OpenRouter, check if response seems incomplete
            if (model === "openrouter" && respText.length > 0 && !respText.trim().endsWith('}')) {
                console.warn("OpenRouter response may be incomplete - doesn't end with }");
            }
        } catch (sendError) {
            console.error(`Failed to send message to ${model === "gemini" ? "Gemini" : "Groq"}:`, sendError);
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
            
            // Rate limit errors (both Groq and Gemini)
            if (errorMsg.includes("429") || errorMsg.includes("rate limit") || errorMsg.includes("too many requests") || errorMsg.includes("quota") || errorMsg.includes("Quota exceeded")) {
                errorMessage = model === "gemini" 
                    ? "API quota exceeded. You've reached the free tier limit. Please wait or upgrade your plan."
                    : "Rate limit exceeded. Please wait a moment before trying again.";
                statusCode = 429;
                
                const retryMatch = errorMsg.match(/retry.*?(\d+)/i) || errorMsg.match(/retry in ([\d.]+)s/i);
                if (retryMatch) {
                    retryAfter = Math.ceil(parseFloat(retryMatch[1]));
                }
            } else if (errorMsg.includes("402") || errorMsg.includes("Insufficient Balance") || errorMsg.includes("insufficient balance")) {
                const modelName = model === "gemini" ? "Gemini" : model === "deepseek" ? "DeepSeek" : model === "openrouter" ? "OpenRouter" : "Groq";
                errorMessage = `${modelName} account has insufficient balance. Please add credits to your ${modelName} account or try a different model.`;
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

        // Try to parse JSON, handle cases where response might not be valid JSON
        let parsedResponse;
        let cleanedText = respText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // If the response starts with text (not JSON), try to extract JSON from it
        // Common patterns: "I've taken...", "Here's...", etc. followed by JSON
        if (!cleanedText.trim().startsWith('{') && !cleanedText.trim().startsWith('[')) {
            // Try to find JSON object in the text - use a more robust pattern
            // Look for { followed by content and try to find matching }
            const jsonStart = cleanedText.indexOf('{');
            if (jsonStart >= 0) {
                // Extract from first { to end, then we'll find the matching }
                let depth = 0;
                let inString = false;
                let escapeNext = false;
                let jsonEnd = -1;
                
                for (let i = jsonStart; i < cleanedText.length; i++) {
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
                        inString = !inString;
                        continue;
                    }
                    
                    if (!inString) {
                        if (char === '{') {
                            depth++;
                        } else if (char === '}') {
                            depth--;
                            if (depth === 0) {
                                jsonEnd = i + 1;
                                break;
                            }
                        }
                    }
                }
                
                if (jsonEnd > jsonStart) {
                    cleanedText = cleanedText.substring(jsonStart, jsonEnd);
                } else {
                    // If we couldn't find the end, try regex as fallback
                    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        cleanedText = jsonMatch[0];
                    }
                }
            } else {
                // Try to find JSON array
                const arrayMatch = cleanedText.match(/\[[\s\S]*\]/);
                if (arrayMatch) {
                    cleanedText = arrayMatch[0];
                }
            }
        }
        
        // First, try a simple parse - if it works, we're done
        try {
            parsedResponse = JSON.parse(cleanedText);
            return NextResponse.json(parsedResponse);
        } catch (firstParseError) {
            // If simple parse fails, proceed with recovery
            console.log("Initial JSON parse failed, attempting recovery...");
        }
        
        // Fix control characters in JSON strings (newlines, tabs, etc. need to be escaped)
        // Process the text character by character to properly handle strings
        let result = '';
        let inString = false;
        let escapeNext = false;
        
        for (let i = 0; i < cleanedText.length; i++) {
            const char = cleanedText[i];
            
            if (escapeNext) {
                result += char;
                escapeNext = false;
                continue;
            }
            
            if (char === '\\') {
                result += char;
                escapeNext = true;
                continue;
            }
            
            if (char === '"') {
                inString = !inString;
                result += char;
                continue;
            }
            
            if (inString) {
                // Inside a string - escape control characters
                const code = char.charCodeAt(0);
                if (code >= 0 && code <= 31 && code !== 9 && code !== 10 && code !== 13) {
                    // Control character that needs escaping (except tab, newline, carriage return which should be \t, \n, \r)
                    result += '\\u' + ('0000' + code.toString(16)).slice(-4);
                } else if (code === 9) {
                    result += '\\t';
                } else if (code === 10) {
                    result += '\\n';
                } else if (code === 13) {
                    result += '\\r';
                } else {
                    result += char;
                }
            } else {
                result += char;
            }
        }
        
        cleanedText = result;
        
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
                
                // Check for "Unexpected token" errors - usually means text before JSON
                if (parseError.message && parseError.message.includes("Unexpected token") && parseError.message.includes("is not valid JSON")) {
                    // Try to extract JSON from text response
                    // Look for the first { or [ and extract from there
                    const firstBrace = cleanedText.indexOf('{');
                    const firstBracket = cleanedText.indexOf('[');
                    let jsonStart = -1;
                    
                    if (firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket)) {
                        jsonStart = firstBrace;
                    } else if (firstBracket >= 0) {
                        jsonStart = firstBracket;
                    }
                    
                    if (jsonStart >= 0) {
                        // Extract from the first brace/bracket
                        cleanedText = cleanedText.substring(jsonStart);
                        
                        // Try to find the matching closing brace/bracket
                        let depth = 0;
                        let inString = false;
                        let escapeNext = false;
                        let jsonEnd = -1;
                        
                        for (let i = 0; i < cleanedText.length; i++) {
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
                                inString = !inString;
                                continue;
                            }
                            
                            if (!inString) {
                                if (char === '{' || char === '[') {
                                    depth++;
                                } else if (char === '}' || char === ']') {
                                    depth--;
                                    if (depth === 0) {
                                        jsonEnd = i + 1;
                                        break;
                                    }
                                }
                            }
                        }
                        
                        if (jsonEnd > 0) {
                            cleanedText = cleanedText.substring(0, jsonEnd);
                            continue; // Retry parsing with extracted JSON
                        }
                    }
                }
                
                // Check for control character errors
                if (parseError.message && parseError.message.includes('Bad control character')) {
                    // Extract position from error message
                    const positionMatch = parseError.message.match(/position (\d+)/);
                    const errorPosition = positionMatch ? parseInt(positionMatch[1]) : -1;
                    
                    if (errorPosition >= 0 && errorPosition < cleanedText.length) {
                        // Find the string that contains the control character
                        let stringStart = -1;
                        let inString = false;
                        let escapeNext = false;
                        
                        for (let i = 0; i < errorPosition; i++) {
                            const char = cleanedText[i];
                            
                            if (escapeNext) {
                                escapeNext = false;
                                continue;
                            }
                            
                            if (char === '\\') {
                                escapeNext = true;
                                continue;
                            }
                            
                            if (char === '"' && !escapeNext) {
                                if (!inString) {
                                    stringStart = i;
                                    inString = true;
                                } else {
                                    inString = false;
                                }
                            }
                        }
                        
                        if (inString && stringStart >= 0) {
                            // Replace control characters in this string
                            let beforeString = cleanedText.substring(0, stringStart + 1);
                            let stringContent = cleanedText.substring(stringStart + 1, errorPosition);
                            let afterString = cleanedText.substring(errorPosition);
                            
                            // Find where the string ends
                            let stringEnd = afterString.indexOf('"');
                            if (stringEnd >= 0) {
                                stringContent += afterString.substring(0, stringEnd);
                                afterString = afterString.substring(stringEnd);
                                
                                // Escape control characters in string content
                                stringContent = stringContent.replace(/[\x00-\x1F\x7F]/g, (char) => {
                                    const code = char.charCodeAt(0);
                                    if (code === 10) return '\\n';
                                    if (code === 13) return '\\r';
                                    if (code === 9) return '\\t';
                                    return '\\u' + ('0000' + code.toString(16)).slice(-4);
                                });
                                
                                cleanedText = beforeString + stringContent + afterString;
                                continue; // Retry parsing
                            }
                        }
                    }
                }
                
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
                        
                        if (char === '"' || char === "'") {
                            stringStart = i;
                            break;
                        }
                    }
                    
                    if (stringStart >= 0) {
                        // Find a safe break point before the error position
                        // Look for end of a word, closing tag, or other safe break points
                        let safeBreakPoint = errorPosition;
                        for (let i = errorPosition - 1; i > stringStart; i--) {
                            const char = cleanedText[i];
                            // Safe break points: before incomplete HTML/JSX tags, attributes, function calls
                            if (char === ' ' || char === '\n' || char === '>' || char === '}' || char === ')') {
                                safeBreakPoint = i + 1;
                                break;
                            }
                        }
                        
                        // Close the string at the safe break point
                        cleanedText = cleanedText.substring(0, safeBreakPoint) + '"';
                        
                        // Try to remove any trailing incomplete JSON
                        // Find the last complete structure
                        let lastCompleteBrace = cleanedText.lastIndexOf('}');
                        let lastCompleteBracket = cleanedText.lastIndexOf(']');
                        let lastComplete = Math.max(lastCompleteBrace, lastCompleteBracket);
                        
                        if (lastComplete > 0) {
                            cleanedText = cleanedText.substring(0, lastComplete + 1);
                        }
                        
                        // Close any remaining open structures
                        let openBraces = (cleanedText.match(/{/g) || []).length;
                        let closeBraces = (cleanedText.match(/}/g) || []).length;
                        let openBrackets = (cleanedText.match(/\[/g) || []).length;
                        let closeBrackets = (cleanedText.match(/\]/g) || []).length;
                        
                        for (let i = 0; i < openBraces - closeBraces; i++) {
                            cleanedText += '}';
                        }
                        for (let i = 0; i < openBrackets - closeBrackets; i++) {
                            cleanedText += ']';
                        }
                        
                        continue; // Retry parsing
                    }
                }
                
                // Check for "Unexpected end of JSON input" errors - truncated/incomplete JSON
                if (parseError.message && (parseError.message.includes("Unexpected end of JSON input") || parseError.message.includes("Unexpected end of input"))) {
                    // Try to close any open structures intelligently
                    let openBraces = (cleanedText.match(/{/g) || []).length;
                    let closeBraces = (cleanedText.match(/}/g) || []).length;
                    let openBrackets = (cleanedText.match(/\[/g) || []).length;
                    let closeBrackets = (cleanedText.match(/\]/g) || []).length;
                    
                    // Count unclosed strings more carefully
                    let inString = false;
                    let escapeNext = false;
                    let openStrings = 0;
                    for (let i = 0; i < cleanedText.length; i++) {
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
                            inString = !inString;
                            if (inString) openStrings++;
                        }
                    }
                    
                    // If we're in a string, close it
                    if (inString) {
                        // Find where the string likely should end
                        // Look for common patterns that indicate end of value
                        let lastColon = cleanedText.lastIndexOf(':');
                        let lastComma = cleanedText.lastIndexOf(',');
                        let lastBrace = cleanedText.lastIndexOf('}');
                        let lastBracket = cleanedText.lastIndexOf(']');
                        
                        // If we're in a string and there's no clear end, close it
                        cleanedText += '"';
                    }
                    
                    // Close any incomplete property values
                    // Look for patterns like: "key": "incomplete value...
                    const incompleteValuePattern = /("(?:[^"\\]|\\.)*"\s*:\s*")([^"]*)$/;
                    const incompleteMatch = cleanedText.match(incompleteValuePattern);
                    if (incompleteMatch && incompleteMatch[2]) {
                        // Close the incomplete string value
                        cleanedText = cleanedText.substring(0, cleanedText.length - incompleteMatch[2].length) + incompleteMatch[2] + '"';
                    }
                    
                    // Close any open brackets first (inner structures)
                    for (let i = 0; i < openBrackets - closeBrackets; i++) {
                        cleanedText += ']';
                    }
                    
                    // Close any open braces (outer structures)
                    for (let i = 0; i < openBraces - closeBraces; i++) {
                        cleanedText += '}';
                    }
                    
                    // If we still have issues, try to find the last complete structure
                    if (parseAttempts === maxAttempts - 1) {
                        // Last attempt - try to extract what we can
                        const lastCompleteBrace = cleanedText.lastIndexOf('}');
                        const lastCompleteBracket = cleanedText.lastIndexOf(']');
                        const lastComplete = Math.max(lastCompleteBrace, lastCompleteBracket);
                        
                        if (lastComplete > cleanedText.length * 0.5) {
                            // If we have at least 50% of the JSON, try using that
                            cleanedText = cleanedText.substring(0, lastComplete + 1);
                        }
                    }
                    
                    continue; // Retry parsing
                }
                
                // Check for "Expected double-quoted property name" errors - unquoted property names
                if (parseError.message && parseError.message.includes("Expected double-quoted property name")) {
                    const positionMatch = parseError.message.match(/position (\d+)/);
                    const errorPosition = positionMatch ? parseInt(positionMatch[1]) : -1;
                    
                    if (errorPosition >= 0 && errorPosition < cleanedText.length) {
                        // Look backwards to find where the property name should start
                        let beforeError = cleanedText.substring(0, errorPosition);
                        let afterError = cleanedText.substring(errorPosition);
                        
                        // Strategy 1: Look for unquoted property names near the error position
                        // Pattern: { propertyName: or , propertyName: or } propertyName:
                        const unquotedPropertyPattern = /([{,}\]]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g;
                        let lastMatch = null;
                        let lastMatchIndex = -1;
                        let match;
                        
                        // Find the last match before or at the error position
                        while ((match = unquotedPropertyPattern.exec(beforeError + afterError.substring(0, 50))) !== null) {
                            if (match.index <= errorPosition + 50) {
                                lastMatch = match;
                                lastMatchIndex = match.index;
                            }
                        }
                        
                        if (lastMatch && lastMatchIndex >= 0) {
                            // Found unquoted property, add quotes around it
                            const propertyName = lastMatch[2];
                            const insertPos = lastMatchIndex + lastMatch[1].length;
                            const replaceEnd = insertPos + propertyName.length;
                            
                            cleanedText = cleanedText.substring(0, insertPos) + 
                                        '"' + propertyName + '"' + 
                                        cleanedText.substring(replaceEnd);
                            continue; // Retry parsing
                        }
                        
                        // Strategy 2: Look for identifier pattern starting at or near error position
                        const identifierMatch = afterError.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/);
                        if (identifierMatch) {
                            const propertyName = identifierMatch[1];
                            cleanedText = cleanedText.substring(0, errorPosition) + 
                                        '"' + propertyName + '"' + 
                                        cleanedText.substring(errorPosition + propertyName.length);
                            continue; // Retry parsing
                        }
                        
                        // Strategy 3: Look backwards from error position for unquoted identifiers
                        // Scan backwards to find where a property name might start
                        let scanStart = Math.max(0, errorPosition - 100);
                        let scanText = cleanedText.substring(scanStart, errorPosition + 50);
                        const backwardPattern = /([{,}\]]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/;
                        const backwardMatch = scanText.match(backwardPattern);
                        
                        if (backwardMatch) {
                            const propertyName = backwardMatch[2];
                            const relativePos = scanText.indexOf(backwardMatch[0]) + backwardMatch[1].length;
                            const absolutePos = scanStart + relativePos;
                            
                            cleanedText = cleanedText.substring(0, absolutePos) + 
                                        '"' + propertyName + '"' + 
                                        cleanedText.substring(absolutePos + propertyName.length);
                            continue; // Retry parsing
                        }
                        
                        // Strategy 4: More aggressive - find any identifier followed by colon that's not quoted
                        // This is a last resort
                        const aggressivePattern = /([{,}\]]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/;
                        const aggressiveMatch = cleanedText.substring(Math.max(0, errorPosition - 200), errorPosition + 100).match(aggressivePattern);
                        
                        if (aggressiveMatch) {
                            const propertyName = aggressiveMatch[2];
                            const searchStart = Math.max(0, errorPosition - 200);
                            const foundIndex = cleanedText.substring(searchStart, errorPosition + 100).indexOf(aggressiveMatch[0]);
                            
                            if (foundIndex >= 0) {
                                const absolutePos = searchStart + foundIndex + aggressiveMatch[1].length;
                                cleanedText = cleanedText.substring(0, absolutePos) + 
                                            '"' + propertyName + '"' + 
                                            cleanedText.substring(absolutePos + propertyName.length);
                                continue; // Retry parsing
                            }
                        }
                    }
                }
                
                // Check for "Expected ',' or '}'" errors - missing comma or closing brace
                if (parseError.message && (parseError.message.includes("Expected ','") || parseError.message.includes("Expected '}'") || parseError.message.includes("Expected ',' or '}'"))) {
                    const positionMatch = parseError.message.match(/position (\d+)/);
                    const errorPosition = positionMatch ? parseInt(positionMatch[1]) : -1;
                    
                    if (errorPosition >= 0 && errorPosition < cleanedText.length) {
                        // Look backwards from error position to find the problematic property
                        let beforeError = cleanedText.substring(0, errorPosition);
                        let afterError = cleanedText.substring(errorPosition);
                        
                        // Try to find the context around the error
                        // Look for patterns like: "key": "value" "nextKey" (missing comma)
                        // Or: "key": "value" } (might be OK, but could be missing comma before closing)
                        
                        // Pattern 1: Missing comma between properties
                        // Match: closing quote of value, whitespace, opening quote of next key
                        const missingCommaPattern = /("(?:[^"\\]|\\.)*")\s+("(?:[^"\\]|\\.)*"\s*:)/;
                        let lastMatch = null;
                        let lastMatchIndex = -1;
                        let match;
                        const regex = new RegExp(missingCommaPattern, 'g');
                        
                        while ((match = regex.exec(beforeError)) !== null) {
                            if (match.index + match[0].length <= errorPosition) {
                                lastMatch = match;
                                lastMatchIndex = match.index;
                            }
                        }
                        
                        if (lastMatch) {
                            // Insert comma after the value
                            const insertPos = lastMatchIndex + lastMatch[1].length;
                            cleanedText = cleanedText.substring(0, insertPos) + ',' + cleanedText.substring(insertPos);
                            continue; // Retry parsing
                        }
                        
                        // Pattern 2: Missing comma before closing brace or bracket
                        // Look for: value followed by } or ] without comma
                        const missingCommaBeforeClose = /("(?:[^"\\]|\\.)*"|\d+|true|false|null)\s*([}\]])/;
                        const closeMatch = beforeError.match(missingCommaBeforeClose);
                        if (closeMatch && closeMatch.index + closeMatch[0].length >= errorPosition - 10) {
                            // Insert comma before the closing brace/bracket
                            const insertPos = closeMatch.index + closeMatch[1].length;
                            cleanedText = cleanedText.substring(0, insertPos) + ',' + cleanedText.substring(insertPos);
                            continue; // Retry parsing
                        }
                        
                        // Pattern 3: Check if we're missing a closing brace
                        let openBraces = (beforeError.match(/{/g) || []).length;
                        let closeBraces = (beforeError.match(/}/g) || []).length;
                        let openBrackets = (beforeError.match(/\[/g) || []).length;
                        let closeBrackets = (beforeError.match(/\]/g) || []).length;
                        
                        if (openBraces > closeBraces || openBrackets > closeBrackets) {
                            // Find a safe place to insert closing brace/bracket
                            let safeInsertPos = errorPosition;
                            
                            // Look for the end of the current structure
                            for (let i = errorPosition; i < Math.min(errorPosition + 50, cleanedText.length); i++) {
                                const char = cleanedText[i];
                                if (char === '}' || char === ']') {
                                    // Already has closing, might need comma before it
                                    safeInsertPos = i;
                                    break;
                                }
                                if (char === '{' || char === '[') {
                                    // New structure starts, close previous one
                                    safeInsertPos = i;
                                    break;
                                }
                                if (char === ',' && i > errorPosition + 5) {
                                    // Found comma, might be safe to close before it
                                    safeInsertPos = i;
                                    break;
                                }
                            }
                            
                            // Insert appropriate closing character
                            if (openBraces > closeBraces) {
                                cleanedText = cleanedText.substring(0, safeInsertPos) + '}' + cleanedText.substring(safeInsertPos);
                            } else if (openBrackets > closeBrackets) {
                                cleanedText = cleanedText.substring(0, safeInsertPos) + ']' + cleanedText.substring(safeInsertPos);
                            }
                            continue; // Retry parsing
                        }
                    }
                }
                
                // If we can't fix it and we've tried max attempts, break
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
            // Try to extract files from truncated response using more robust regex
            const projectTitleMatch = cleanedText.match(/"projectTitle"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            const explanationMatch = cleanedText.match(/"explanation"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            
            // More robust file extraction - handle incomplete JSON
            let recoveredJson = {
                projectTitle: projectTitleMatch ? projectTitleMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : "Generated Project",
                explanation: explanationMatch ? explanationMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : "Code generation response was incomplete but partial files were recovered.",
                files: {},
                generatedFiles: []
            };
            
            // Try multiple patterns to extract files
            // Pattern 1: Standard file pattern with escaped strings
            const filePattern1 = /"(\/[^"]+)"\s*:\s*\{[^}]*"code"\s*:\s*"((?:[^"\\]|\\(?:.|\n))*?)"/gs;
            let fileMatch;
            const extractedFiles = new Set();
            
            while ((fileMatch = filePattern1.exec(cleanedText)) !== null) {
                try {
                    const filePath = fileMatch[1];
                    if (extractedFiles.has(filePath)) continue;
                    extractedFiles.add(filePath);
                    
                    let fileCode = fileMatch[2];
                    // Unescape common escape sequences
                    fileCode = fileCode
                        .replace(/\\n/g, '\n')
                        .replace(/\\t/g, '\t')
                        .replace(/\\r/g, '\r')
                        .replace(/\\"/g, '"')
                        .replace(/\\\\/g, '\\')
                        .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
                    
                    recoveredJson.files[filePath] = { code: fileCode };
                    recoveredJson.generatedFiles.push(filePath);
                } catch (e) {
                    console.error("Error extracting file (pattern 1):", e);
                }
            }
            
            // Pattern 2: More lenient - find file paths and try to extract code blocks (including truncated)
            if (Object.keys(recoveredJson.files).length === 0) {
                // Find all file path patterns
                const filePathPattern = /"(\/[^"]+\.js)"\s*:\s*\{/g;
                let pathMatch;
                while ((pathMatch = filePathPattern.exec(cleanedText)) !== null) {
                    try {
                        const filePath = pathMatch[1];
                        if (extractedFiles.has(filePath)) continue;
                        
                        // Find the code field after this file path
                        const afterPath = cleanedText.substring(pathMatch.index + pathMatch[0].length);
                        const codeFieldMatch = afterPath.match(/"code"\s*:\s*"/);
                        
                        if (codeFieldMatch) {
                            const codeStartIndex = pathMatch.index + pathMatch[0].length + afterPath.indexOf(codeFieldMatch[0]) + codeFieldMatch[0].length;
                            
                            // Try to find the end of the code string (handling escaped quotes)
                            let codeEndIndex = codeStartIndex;
                            let inEscape = false;
                            let foundEnd = false;
                            
                            for (let j = codeStartIndex; j < Math.min(cleanedText.length, codeStartIndex + 30000); j++) {
                                const char = cleanedText[j];
                                
                                if (inEscape) {
                                    inEscape = false;
                                    continue;
                                }
                                
                                if (char === '\\') {
                                    inEscape = true;
                                    continue;
                                }
                                
                                if (char === '"') {
                                    // Check if this is followed by comma, closing brace, or end
                                    const nextChar = j + 1 < cleanedText.length ? cleanedText[j + 1] : '';
                                    if (nextChar === ',' || nextChar === '}' || nextChar === '' || /\s/.test(nextChar)) {
                                        codeEndIndex = j;
                                        foundEnd = true;
                                        break;
                                    }
                                }
                            }
                            
                            // If we didn't find the end, use everything up to a reasonable limit
                            if (!foundEnd) {
                                codeEndIndex = Math.min(cleanedText.length, codeStartIndex + 30000);
                            }
                            
                            let fileCode = cleanedText.substring(codeStartIndex, codeEndIndex);
                            fileCode = fileCode
                                .replace(/\\n/g, '\n')
                                .replace(/\\t/g, '\t')
                                .replace(/\\r/g, '\r')
                                .replace(/\\"/g, '"')
                                .replace(/\\\\/g, '\\')
                                .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
                            
                            if (fileCode.length > 10) {
                                recoveredJson.files[filePath] = { code: fileCode };
                                recoveredJson.generatedFiles.push(filePath);
                                extractedFiles.add(filePath);
                            }
                        }
                    } catch (e) {
                        console.error("Error extracting file (pattern 2):", e);
                    }
                }
            }
            
            // If we got any files, return the recovered JSON
            if (Object.keys(recoveredJson.files).length > 0) {
                console.log(`Recovered ${Object.keys(recoveredJson.files).length} file(s) from incomplete JSON`);
                return NextResponse.json(recoveredJson);
            }
            
            // Last resort: try to close braces and re-parse
            let lastBrace = cleanedText.lastIndexOf('}');
            if (lastBrace > 0) {
                let testText = cleanedText.substring(0, lastBrace + 1);
                // Count and close braces
                let openCount = (testText.match(/{/g) || []).length;
                let closeCount = (testText.match(/}/g) || []).length;
                for (let i = 0; i < openCount - closeCount; i++) {
                    testText += '}';
                }
                try {
                    parsedResponse = JSON.parse(testText);
                    return NextResponse.json(parsedResponse);
                } catch (e) {
                    // Still failed - try aggressive extraction
                    console.log("Final parse attempt failed, trying aggressive extraction...");
                }
            }
            
            // Final attempt: aggressive extraction from incomplete JSON
            // Look for file patterns even in incomplete JSON - handle truncated code strings
            console.log("Attempting aggressive extraction from incomplete JSON...");
            console.log("Cleaned text length:", cleanedText.length);
            console.log("Last 200 chars:", cleanedText.substring(Math.max(0, cleanedText.length - 200)));
            
            // First, try to find all file paths
            const filePathPattern = /"(\/[^"]+\.js)"/g;
            const filePaths = [];
            let pathMatch;
            while ((pathMatch = filePathPattern.exec(cleanedText)) !== null) {
                filePaths.push({
                    path: pathMatch[1],
                    index: pathMatch.index
                });
            }
            
            console.log(`Found ${filePaths.length} file path(s) in response`);
            
            const finalRecovery = {
                projectTitle: projectTitleMatch ? projectTitleMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : "Recovered Project",
                explanation: explanationMatch ? explanationMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : "Response was incomplete but some files were recovered.",
                files: {},
                generatedFiles: []
            };
            
            // For each file path, try to extract its code
            for (let i = 0; i < filePaths.length; i++) {
                try {
                    const currentPath = filePaths[i];
                    const nextPathIndex = i < filePaths.length - 1 ? filePaths[i + 1].index : cleanedText.length;
                    
                    // Find "code" field for this file
                    const fileSection = cleanedText.substring(currentPath.index, nextPathIndex);
                    const codeFieldMatch = fileSection.match(/"code"\s*:\s*"/);
                    
                    if (codeFieldMatch) {
                        const codeStartIndex = currentPath.index + fileSection.indexOf(codeFieldMatch[0]) + codeFieldMatch[0].length;
                        
                        // Find the end of the code string
                        // We need to handle escaped quotes and find the actual end
                        let codeEndIndex = codeStartIndex;
                        let inEscape = false;
                        let foundEnd = false;
                        
                        for (let j = codeStartIndex; j < Math.min(cleanedText.length, codeStartIndex + 50000); j++) {
                            const char = cleanedText[j];
                            
                            if (inEscape) {
                                inEscape = false;
                                continue;
                            }
                            
                            if (char === '\\') {
                                inEscape = true;
                                continue;
                            }
                            
                            if (char === '"') {
                                // Check if this is followed by comma, closing brace, or end of text
                                const nextChar = j + 1 < cleanedText.length ? cleanedText[j + 1] : '';
                                if (nextChar === ',' || nextChar === '}' || nextChar === '' || /\s/.test(nextChar)) {
                                    codeEndIndex = j;
                                    foundEnd = true;
                                    break;
                                }
                            }
                        }
                        
                        // If we didn't find the end, use everything up to the next file or end of text
                        if (!foundEnd) {
                            codeEndIndex = Math.min(cleanedText.length, codeStartIndex + 30000);
                        }
                        
                        let fileCode = cleanedText.substring(codeStartIndex, codeEndIndex);
                        
                        // Unescape the code
                        fileCode = fileCode
                            .replace(/\\n/g, '\n')
                            .replace(/\\t/g, '\t')
                            .replace(/\\r/g, '\r')
                            .replace(/\\"/g, '"')
                            .replace(/\\\\/g, '\\')
                            .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
                        
                        if (fileCode.length > 10) { // Only add if we got meaningful content
                            finalRecovery.files[currentPath.path] = { code: fileCode };
                            finalRecovery.generatedFiles.push(currentPath.path);
                            console.log(`Extracted code for ${currentPath.path} (${fileCode.length} chars)`);
                        }
                    }
                } catch (e) {
                    console.error(`Error extracting code for ${filePaths[i].path}:`, e);
                }
            }
            
            if (Object.keys(finalRecovery.files).length > 0) {
                console.log(`Aggressive recovery extracted ${Object.keys(finalRecovery.files).length} file(s) from incomplete JSON`);
                return NextResponse.json(finalRecovery);
            }
            
            return NextResponse.json({ 
                error: "Failed to parse AI response as JSON",
                details: parseError.message,
                rawResponse: cleanedText.substring(0, 500) // First 500 chars for debugging
            }, { status: 500 });
        } catch (recoveryParseError) {
            return NextResponse.json({ 
                error: "Failed to parse AI response as JSON",
                details: recoveryParseError.message,
                rawResponse: cleanedText.substring(0, 500)
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
        
        // Check for API errors (both Groq and Gemini)
        if (fullErrorText.includes("429") || 
            fullErrorText.includes("rate limit") ||
            fullErrorText.includes("too many requests") ||
            fullErrorText.includes("quota") ||
            fullErrorText.includes("Quota exceeded")) {
            errorMessage = model === "gemini" 
                ? "API quota exceeded. You've reached the free tier limit. Please wait or upgrade your plan."
                : "Rate limit exceeded. Please wait a moment before trying again.";
            statusCode = 429;
            
            const retryMatch = fullErrorText.match(/retry.*?(\d+)/i) || fullErrorText.match(/retry in ([\d.]+)s/i);
            if (retryMatch) {
                retryAfter = Math.ceil(parseFloat(retryMatch[1]));
            }
        } else if (fullErrorText.includes("402") || fullErrorText.includes("Insufficient Balance") || fullErrorText.includes("insufficient balance")) {
            const modelName = model === "gemini" ? "Gemini" : model === "deepseek" ? "DeepSeek" : model === "openrouter" ? "OpenRouter" : "Groq";
            errorMessage = `${modelName} account has insufficient balance. Please add credits to your ${modelName} account or try a different model.`;
            statusCode = 402;
        } else if (errorMsg.includes("401") || errorMsg.includes("unauthorized") || errorMsg.includes("invalid api key")) {
            const modelName = model === "gemini" ? "Gemini" : model === "deepseek" ? "DeepSeek" : model === "openrouter" ? "OpenRouter" : "Groq";
            errorMessage = `Invalid API key. Please check your ${modelName} API key configuration.`;
            statusCode = 401;
        } else if (errorMsg.includes("API_KEY") || errorMsg.includes("API key")) {
            errorMessage = "Invalid or missing API key. Please check your API key configuration.";
            statusCode = 500;
        } else if (errorMsg.includes("limit") && !errorMsg.includes("rate")) {
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

