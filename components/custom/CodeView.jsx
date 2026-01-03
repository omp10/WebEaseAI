"use client";
import React, { useContext, useEffect, useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackFileExplorer,
} from "@codesandbox/sandpack-react";
import Lookup from "@/data/Lookup";
import toast from "react-hot-toast";
import axios from "axios";
import { UserDetailContext } from "@/context/UserDetailContext";
import { MessagesContext } from "@/context/MessagesContext";
import { ModelSelectionContext } from "@/context/ModelSelectionContext";
import Prompt from "@/data/Prompt";
import { useConvex, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Loader2Icon, PlayCircle } from "lucide-react"; // Added PlayCircle icon
import { countToken } from "./ChatView";
import SandpackPreviewClient from "./SandpackPreviewClient";
import { motion, AnimatePresence } from "framer-motion"; // Import Framer Motion

function CodeView() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("code");
  const [files, setFiles] = useState(Lookup?.DEFAULT_FILE);
  const { messages } = useContext(MessagesContext);
  const { selectedModel } = useContext(ModelSelectionContext);
  const UpdateFiles = useMutation(api.workspace.UpdateFiles);
  const convex = useConvex();
  const [loading, setLoading] = useState(false);
  const UpdateTokens = useMutation(api.users.UpdateToken);
  const { userDetail, setUserDetail } = useContext(UserDetailContext);

  useEffect(() => {
    if (id) {
      GetFiles();
    }
  }, [id]);

  const GetFiles = async () => {
    setLoading(true);
    const result = await convex.query(api.workspace.GetWorkspace, {
      workspaceId: id,
    });
    const mergedFiles = { ...Lookup.DEFAULT_FILE, ...result?.fileData };
    setFiles(mergedFiles);
    setLoading(false);
  };

  useEffect(() => {
    if (messages?.length > 0) {
      const role = messages[messages.length - 1].role;
      if (role === "user") {
        GeneratedAiCode();
      }
    }
  }, [messages]);

  const GeneratedAiCode = async () => {
    setLoading(true);
    
    // Warn user about OpenRouter's limitations
    if (selectedModel === "openrouter") {
      toast(
        "⚠️ OpenRouter's free model may generate incomplete code. For best results, use Groq, Gemini, or DeepSeek.",
        { 
          duration: 8000, 
          id: "openrouter-warning",
          icon: '⚠️',
          style: {
            background: '#f59e0b',
            color: '#fff',
          }
        }
      );
    }
    
    // Timeout for fetching - increased for OpenRouter which can be slower
    const timeoutDuration = selectedModel === "openrouter" ? 180000 : 90000; // 180s (3min) for OpenRouter, 90s for others
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), timeoutDuration)
    );

    try {
      const PROMPT = JSON.stringify(messages) + " " + Prompt.CODE_GEN_PROMPT;
      const requestPromise = axios.post(
        "/api/gen-ai-code",
        { prompt: PROMPT, model: selectedModel || "groq" },
        { timeout: timeoutDuration } // Dynamic timeout based on model
      );

      const result = await Promise.race([requestPromise, timeoutPromise]);
      
      // Check if response has an error
      if (result.data?.error) {
        throw new Error(result.data.error || "Code generation failed");
      }
      
      const aiResp = result.data;
      
      if (!aiResp?.files || Object.keys(aiResp.files).length === 0) {
        toast.error("No files were generated. Please try again.");
        return;
      }
      
      
      // Validate code completeness before setting files
      const validatedFiles = {};
      for (const [filePath, fileData] of Object.entries(aiResp.files)) {
        if (fileData?.code) {
          let code = fileData.code;
          
          // Fix invalid import syntax patterns
          // Fix nested destructuring in imports: import { Chart, { Line, Bar } } -> import { Chart, Line, Bar }
          code = code.replace(/import\s+\{\s*([^,}]+),\s*\{\s*([^}]+)\s*\}\s*\}\s+from\s+['"]([^'"]+)['"]/g, 
            (match, first, nested, module) => {
              const nestedItems = nested.split(',').map(s => s.trim()).join(', ');
              return `import { ${first}, ${nestedItems} } from '${module}'`;
            }
          );
          
          // Fix invalid imports from 'tailwindcss' (these aren't React components)
          code = code.replace(/import\s+\{\s*Container,\s*Flex,\s*Grid,\s*Box,\s*Heading,\s*Text[^}]*\}\s+from\s+['"]tailwindcss['"]/g, 
            '// Tailwind CSS utilities are used via className, not imported as components'
          );
          
          // Fix duplicate imports (e.g., importing Line from both react-chartjs-2 and chart.js)
          // Remove duplicate import statements
          const importLines = code.split('\n').filter(line => line.trim().startsWith('import'));
          const seenImports = new Set();
          const uniqueImports = [];
          importLines.forEach(line => {
            const normalized = line.trim();
            if (!seenImports.has(normalized)) {
              seenImports.add(normalized);
              uniqueImports.push(line);
            }
          });
          
          // Replace all imports with unique ones
          if (importLines.length !== uniqueImports.length) {
            let newCode = code;
            importLines.forEach((oldImport, index) => {
              if (index < uniqueImports.length) {
                newCode = newCode.replace(oldImport, uniqueImports[index]);
              } else {
                // Remove duplicate
                newCode = newCode.replace(oldImport + '\n', '');
              }
            });
            code = newCode;
          }
          
          // Fix incomplete function calls BEFORE counting brackets
          // Look for patterns like "fetch(" without closing on same or next line
          const codeLines = code.split('\n');
          const preFixedLines = codeLines.map((line, index) => {
            // Check for incomplete function calls
            if (line.includes('fetch(') || line.match(/\w+\s*\(\s*$/)) {
              const nextLine = index < codeLines.length - 1 ? codeLines[index + 1] : '';
              // If next line is just closing characters (like }})) or doesn't continue the function call, complete it
              if (nextLine && (nextLine.trim().match(/^[\s\}]*\)?\}*\s*$/) || (!nextLine.trim().match(/^['"`\w\s,{[]/) && !nextLine.trim().startsWith(')')))) {
                // Complete the function call
                if (line.includes('fetch(')) {
                  return line.replace(/fetch\s*\(\s*$/, 'fetch("");');
                } else {
                  return line.replace(/(\w+)\s*\(\s*$/, '$1();');
                }
              }
            }
            return line;
          });
          code = preFixedLines.join('\n');
          
          // Remove orphaned closing characters BEFORE counting
          code = code.replace(/^\s*\}\s*\}\s*\)\s*$/gm, ''); // Remove lines with just }})
          code = code.replace(/^\s*\}\s*\)\s*$/gm, ''); // Remove lines with just })
          code = code.replace(/^\s*\}\s*\}\s*$/gm, ''); // Remove lines with just }}
          
          // Basic syntax validation - check for common incomplete patterns
          const openBraces = (code.match(/{/g) || []).length;
          const closeBraces = (code.match(/}/g) || []).length;
          const openParens = (code.match(/\(/g) || []).length;
          const closeParens = (code.match(/\)/g) || []).length;
          const openBrackets = (code.match(/\[/g) || []).length;
          const closeBrackets = (code.match(/\]/g) || []).length;
          
          // Check for incomplete ternary operators
          const ternaryCount = (code.match(/\?/g) || []).length;
          const colonCount = (code.match(/:/g) || []).length;
          // In a ternary, we need at least one colon for each question mark (but colons can be in objects too)
          // More accurate: check if there's a ? without a : after it on the same line or nearby
          let incompleteTernary = false;
          if (ternaryCount > 0) {
            const lines = code.split('\n');
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.includes('?')) {
                // Check if there's a : after this ? in the current line or next few lines
                const lineIndex = code.indexOf(line);
                const afterQuestionMark = code.substring(lineIndex + line.indexOf('?'));
                // Look for : in the next 500 characters (should be on same line or very close)
                const next500Chars = afterQuestionMark.substring(0, 500);
                if (!next500Chars.includes(':')) {
                  incompleteTernary = true;
                  break;
                }
              }
            }
          }
          
          // Check for incomplete function calls or expressions
          const incompleteExpression = (openParens !== closeParens) || 
                                      (openBraces !== closeBraces) || 
                                      (openBrackets !== closeBrackets);
          
          if (incompleteExpression || incompleteTernary) {
            console.warn(`File ${filePath} may have incomplete code. Attempting to fix...`);
            toast.error(`Generated code may be incomplete. Attempting to fix automatically...`, { duration: 5000 });
            // Try to fix incomplete ternary operators
            let fixedCode = code;
            if (incompleteTernary) {
              // Fix incomplete ternary operators by finding ? without : and adding the missing part
              const lines = fixedCode.split('\n');
              const fixedLines = lines.map((line, index) => {
                // Check if this line has a ? that might be incomplete
                if (line.includes('?')) {
                  const questionIndex = line.lastIndexOf('?');
                  const afterQuestion = line.substring(questionIndex + 1);
                  // If there's no : in the rest of this line, check next lines
                  if (!afterQuestion.includes(':')) {
                    const remainingLines = lines.slice(index + 1);
                    const nextFewLines = remainingLines.slice(0, 3).join('\n');
                    // If no : found in next few lines, this ternary is incomplete
                    if (!nextFewLines.includes(':')) {
                      // Try to complete the ternary - add : and the else part
                      // Look for the pattern: condition ? { ...todo
                      if (line.includes('{') && line.includes('...')) {
                        // It's likely: todo.id === id ? { ...todo,
                        // Complete it: todo.id === id ? { ...todo, done: !todo.done } : todo
                        return line.replace(/(\{[^}]*)$/, '$1 } : todo');
                      } else {
                        // Generic fix: add : todo
                        return line.trim() + ' : todo';
                      }
                    }
                  }
                }
                return line;
              });
              fixedCode = fixedLines.join('\n');
            }
            
            // Try to close unclosed structures
            if (openBraces > closeBraces) {
              fixedCode += '\n' + '}'.repeat(openBraces - closeBraces);
            }
            if (openParens > closeParens) {
              fixedCode += ')'.repeat(openParens - closeParens);
            }
            if (openBrackets > closeBrackets) {
              fixedCode += ']'.repeat(openBrackets - closeBrackets);
            }
            
            // Recalculate counts after initial fixes
            const fixedOpenBraces = (fixedCode.match(/{/g) || []).length;
            const fixedCloseBraces = (fixedCode.match(/}/g) || []).length;
            const fixedOpenParens = (fixedCode.match(/\(/g) || []).length;
            const fixedCloseParens = (fixedCode.match(/\)/g) || []).length;
            
            // Fix extra closing characters (like }})
            // Remove standalone }} or }) that don't match opening characters
            if (fixedCloseBraces > fixedOpenBraces) {
              const extraBraces = fixedCloseBraces - fixedOpenBraces;
              // Remove extra closing braces from the end
              fixedCode = fixedCode.replace(/\}\s*\}/g, (match, offset) => {
                // Only remove if we're near the end of the code or it's clearly orphaned
                if (offset > fixedCode.length - 100) {
                  return '}';
                }
                return match;
              });
            }
            
            // Fix incomplete function calls more aggressively
            const codeLines = fixedCode.split('\n');
            const betterFixedLines = codeLines.map((line, index) => {
              // Check for lines ending with just opening paren (incomplete function call)
              if (line.trim().endsWith('(') && !line.includes(')')) {
                const nextLine = index < codeLines.length - 1 ? codeLines[index + 1] : '';
                // If next line doesn't look like it continues the function call, close it
                if (!nextLine.trim().match(/^['"`\w\s,{[]/)) {
                  return line.trim() + ');';
                }
              }
              // Check for fetch( or similar without closing
              if (line.includes('fetch(') && !line.includes(')')) {
                const nextLine = index < codeLines.length - 1 ? codeLines[index + 1] : '';
                if (!nextLine.trim().startsWith(')') && !nextLine.trim().match(/^['"`]/)) {
                  // Complete the fetch call
                  return line.replace(/fetch\s*\(\s*$/, 'fetch("");');
                }
              }
              return line;
            });
            fixedCode = betterFixedLines.join('\n');
            
            // Final cleanup: remove any remaining orphaned closing characters
            fixedCode = fixedCode.replace(/^\s*\}\s*\}\s*\)\s*$/gm, ''); // Remove lines with just }})
            fixedCode = fixedCode.replace(/^\s*\}\s*\)\s*$/gm, ''); // Remove lines with just })
            fixedCode = fixedCode.replace(/^\s*\}\s*\}\s*$/gm, ''); // Remove lines with just }}
            
            validatedFiles[filePath] = { code: fixedCode };
            console.log(`Fixed incomplete code in ${filePath}`);
          } else {
            validatedFiles[filePath] = fileData;
          }
        } else {
          validatedFiles[filePath] = fileData;
        }
      }
      
      // Check if we had to fix many files - warn user about OpenRouter quality
      const fixedCount = Object.keys(validatedFiles).filter((path) => {
        return validatedFiles[path].code !== aiResp.files[path]?.code;
      }).length;
      
      if (fixedCount > 0 && selectedModel === "openrouter") {
        toast(
          `⚠️ OpenRouter generated incomplete code (${fixedCount} file(s) fixed). Consider using Groq, Gemini, or DeepSeek for more reliable results.`,
          { 
            duration: 8000,
            icon: '⚠️',
            style: {
              background: '#f59e0b',
              color: '#fff',
            }
          }
        );
      }
      
      const mergedFiles = { ...Lookup.DEFAULT_FILE, ...validatedFiles };

      setFiles(mergedFiles);
      await UpdateFiles({
        workspaceId: id,
        files: aiResp?.files,
      });

      const token = Number(userDetail?.token) - Number(countToken(JSON.stringify(aiResp)));
      await UpdateTokens({
        userId: userDetail?._id,
        token: token,
      });
      setUserDetail((prev) => ({
        ...prev,
        token: token,
      }));

      toast.success("Code generated successfully! Click 'Run' to preview.");
      setActiveTab("code");
    } catch (error) {
      console.error("Error generating AI code:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      
      let errorMessage = "Failed to generate code, please try again.";
      
      if (error.response?.status === 402) {
        errorMessage = error.response.data?.error || "Account has insufficient balance. Please add credits or try a different model.";
      } else if (error.response?.status === 429) {
        const retryAfter = error.response.data?.retryAfter;
        errorMessage = retryAfter 
          ? `${error.response.data?.error || "Rate limit exceeded"}. Please retry in ${retryAfter} seconds.`
          : error.response.data?.error || "Rate limit exceeded. Please wait a moment.";
      } else if (error.response?.status === 401) {
        errorMessage = error.response.data?.error || "Invalid API key. Please check your API key configuration.";
      } else if (error.response?.status === 500) {
        errorMessage = error.response.data?.error || error.response.data?.details || "Server error occurred. Please try again.";
        if (error.response.data?.details) {
          console.error("Server error details:", error.response.data.details);
        }
      } else if (error.message && error.message.includes("timed out") || error.message === "Request timed out") {
        errorMessage = "Request timed out. The AI model is taking too long to respond. Please try again or use a different model.";
      } else if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        errorMessage = "Request timed out. Please try again or use a faster model like Groq.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    if (loading) {
      toast.error("Please wait for the code to generate.");
      return;
    }
    setActiveTab(tab);
  };

  const tabVariants = {
    active: {
      backgroundColor: "rgba(59, 130, 246, 0.25)",
      color: "rgb(59, 130, 246)",
      scale: 1.1,
      transition: { type: "spring", stiffness: 300, damping: 20 },
    },
    inactive: {
      backgroundColor: "rgba(0,0,0,0)",
      color: "rgb(156, 163, 175)",
      scale: 1,
    },
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <div className="relative h-full flex flex-col">
      <div className="bg-[#181818] w-full p-2 border-b border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3 bg-gray-800 p-1 rounded-full border border-gray-700/50">
          <motion.h2
            onClick={() => handleTabChange("code")}
            className="text-sm cursor-pointer p-1 px-3 rounded-full font-medium"
            animate={activeTab === "code" ? "active" : "inactive"}
            variants={tabVariants}
          >
            Code
          </motion.h2>
          <motion.h2
            onClick={() => handleTabChange("preview")}
            className="text-sm cursor-pointer p-1 px-3 rounded-full font-medium"
            animate={activeTab === "preview" ? "active" : "inactive"}
            variants={tabVariants}
          >
            Preview
          </motion.h2>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => handleTabChange("preview")}
            className="flex items-center gap-2 text-blue-500 font-medium px-4 py-2 rounded-full border border-blue-500/50 hover:bg-blue-500/20 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <PlayCircle size={18} />
            Run
          </motion.button>
        </div>
      </div>
      
      <SandpackProvider
        template="react"
        theme="dark"
        files={files}
        customSetup={{
          dependencies: {
            ...Lookup.DEPENDANCY,
          },
        }}
        options={{
          externalResources: ["https://unpkg.com/@tailwindcss/browser@4"],
          showConsole: false, // Disable console to reduce noise
          showConsoleButton: false, // Hide console button
          showNavigator: false, // Hide navigator in preview
          bundlerURL: undefined, // Use default bundler
        }}
      >
        <SandpackLayout className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === "code" && (
              <motion.div key="code" className="flex flex-row w-full"
                variants={contentVariants} initial="hidden" animate="visible" exit="hidden">
                <SandpackFileExplorer style={{ height: "calc(100vh - 120px)" }} />
                <SandpackCodeEditor style={{ height: "calc(100vh - 120px)" }} />
              </motion.div>
            )}
            {activeTab === "preview" && (
              <motion.div key="preview" className="w-full"
                variants={contentVariants} initial="hidden" animate="visible" exit="hidden">
                <SandpackPreviewClient />
              </motion.div>
            )}
          </AnimatePresence>
        </SandpackLayout>
      </SandpackProvider>

      <AnimatePresence>
        {loading && (
          <motion.div
            className="p-10 bg-gray-900 opacity-90 absolute inset-0 rounded-lg flex flex-col justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="flex flex-col items-center gap-4 text-center"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Loader2Icon className="animate-spin h-10 w-10 text-blue-500" />
              <h2 className="text-xl font-semibold text-white mt-4">
                Generating your files...
              </h2>
              <p className="text-gray-400">This may take a moment. Please wait.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CodeView;