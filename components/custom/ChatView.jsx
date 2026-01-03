"use client";
import { MessagesContext } from "@/context/MessagesContext";
import { UserDetailContext } from "@/context/UserDetailContext";
import { ModelSelectionContext } from "@/context/ModelSelectionContext";
import { api } from "@/convex/_generated/api";
import Colors from "@/data/Colors";
import { useConvex, useMutation } from "convex/react";
import Image from "next/image";
import { useParams } from "next/navigation";
import React, { useContext, useEffect, useRef } from "react";
import Lookup from "@/data/Lookup";
import { useState } from "react";
import { Link, ArrowRight, Loader2Icon } from "lucide-react";
import Prompt from "@/data/Prompt";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { useSidebar } from "../ui/sidebar";
import { toast } from "sonner";
import { motion } from "framer-motion"; // Import Framer Motion

export const countToken = (inputText) => {
  return inputText.trim().split(/\s+/).filter((word) => word).length;
};

function ChatView() {
  const { id } = useParams();
  const convex = useConvex();
  const { messages, setMessages } = useContext(MessagesContext);
  const { selectedModel } = useContext(ModelSelectionContext);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const UpdateMessages = useMutation(api.workspace.UpdateMessages);
  const { toggleSidebar } = useSidebar();
  const UpdateTokens = useMutation(api.users.UpdateToken);
  const { userDetail, setUserDetail } = useContext(UserDetailContext);

  const messagesEndRef = useRef(null); // Ref to scroll to the bottom

  // Ensure messages initializes as an array
  useEffect(() => {
    if (!messages) setMessages([]);
  }, [messages, setMessages]);

  useEffect(() => {
    if (id) GetWorkspaceData();
  }, [id]);

  const GetWorkspaceData = async () => {
    try {
      const result = await convex.query(api.workspace.GetWorkspace, {
        workspaceId: id,
      });
      setMessages(result?.messages || []);
    } catch (error) {
      console.error("Error fetching workspace data:", error);
    }
  };

  useEffect(() => {
    if (messages?.length > 0) {
      const role = messages[messages.length - 1]?.role;
      if (role === "user") {
        GetAiResponse();
      }
    }
    // Scroll to the bottom of the chat view whenever messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const GetAiResponse = async () => {
    try {
      setLoading(true);
      const PROMPT = JSON.stringify(messages || []) + Prompt.CHAT_PROMPT;
      const result = await axios.post("/api/ai-chat", {
        prompt: PROMPT,
        model: selectedModel || "groq",
      });

      const aiResp = {
        role: "ai",
        content: result.data.result,
      };
      setMessages((prev) => [...(prev || []), aiResp]);

      await UpdateMessages({
        messages: [...(messages || []), aiResp],
        workspaceId: id,
      });

      const token = Number(userDetail?.token) - Number(countToken(JSON.stringify(aiResp)));
      setUserDetail((prev) => ({
        ...prev,
        token: token,
      }));

      await UpdateTokens({
        userId: userDetail?._id,
        token: token,
      });

      setLoading(false);
    } catch (error) {
      console.error("Error getting AI response:", error);
      
      // Show user-friendly error message
      let errorMessage = "Failed to get AI response. Please try again.";
      
      if (error.response?.status === 402) {
        errorMessage = error.response.data?.error || "Account has insufficient balance. Please add credits or try a different model.";
      } else if (error.response?.status === 429) {
        errorMessage = error.response.data?.error || "Rate limit exceeded. Please wait a moment.";
      } else if (error.response?.status === 401) {
        errorMessage = error.response.data?.error || "Invalid API key. Please check your API key configuration.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const onGenerate = (input) => {
    if (userDetail?.token < 10) {
      toast.error("You don't have enough tokens!");
      return;
    }
    setMessages((prev) => [
      ...(prev || []),
      {
        role: "user",
        content: input,
      },
    ]);
    setUserInput("");
  };

  // Framer Motion variants for chat messages
  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <div className="relative h-[85vh] flex flex-col p-4">
      {/* Messages container */}
      <div className="flex-1 overflow-y-scroll scrollbar-hide px-5 mb-4">
        {messages?.length > 0 &&
          messages?.map((msg, index) => (
            <motion.div
              key={index}
              className={`p-4 rounded-xl mb-4 flex gap-4 transition-all duration-300 ${
                msg.role === "user" ? "bg-gray-800 text-white" : "bg-gray-700 text-gray-200"
              }`}
              style={{
                backgroundColor: msg.role === "user" ? Colors.CHAT_BACKGROUND : "rgba(55, 65, 81, 0.7)",
              }}
              initial="hidden"
              animate="visible"
              variants={messageVariants}
            >
              <Image
                src={msg.role === "user" ? userDetail?.picture || "/default-user.png" : "/logo.png"}
                alt={msg.role === "user" ? "userImage" : "aiImage"}
                width={35}
                height={35}
                className="rounded-full flex-shrink-0 self-start"
              />
              <ReactMarkdown className="prose prose-invert max-w-none text-white leading-relaxed">
                {msg.content || ""}
              </ReactMarkdown>
            </motion.div>
          ))}
        {loading && (
          <div
            className="p-4 rounded-xl mb-4 flex gap-4 items-center"
            style={{
              backgroundColor: "rgba(55, 65, 81, 0.7)",
            }}
          >
            <Loader2Icon className="animate-spin text-blue-500" />
            <h2 className="text-gray-300">Generating Content...</h2>
          </div>
        )}
        <div ref={messagesEndRef} /> {/* For auto-scrolling */}
      </div>

      {/* Input area */}
      <div className="flex gap-4 items-end px-5 py-3 rounded-xl border border-gray-600/50 backdrop-blur-sm bg-gray-800/50">
        <motion.div
          onClick={toggleSidebar}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0 cursor-pointer"
        >
          {userDetail && (
            <Image
              src={userDetail?.picture}
              className="rounded-full"
              alt="user"
              width={35}
              height={35}
              style={{ width: 'auto', height: 'auto' }}
            />
          )}
        </motion.div>

        <div className="flex flex-grow items-end bg-gray-700/60 rounded-xl p-3 border border-gray-600/50 shadow-lg">
          <textarea
            value={userInput}
            placeholder={Lookup.INPUT_PLACEHOLDER || "Type your message..."}
            onChange={(event) => setUserInput(event.target.value)}
            className="outline-none bg-transparent w-full h-auto max-h-40 resize-none text-white placeholder-gray-400 p-2 custom-scrollbar"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (userInput.trim()) {
                  onGenerate(userInput);
                }
              }
            }}
          />
          <motion.button
            onClick={() => onGenerate(userInput)}
            className={`flex-shrink-0 ml-2 p-2 h-10 w-10 rounded-full flex items-center justify-center transition-colors duration-300 ${
              userInput.trim()
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
            disabled={!userInput.trim()}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowRight className="h-5 w-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export default ChatView;