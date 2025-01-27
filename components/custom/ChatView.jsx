"use client";
import { MessagesContext } from "@/context/MessagesContext";
import { UserDetailContext } from "@/context/UserDetailContext";
import { api } from "@/convex/_generated/api";
import Colors from "@/data/Colors";
import { useConvex, useMutation } from "convex/react";
import Image from "next/image";
import { useParams } from "next/navigation";
import React, { useContext, useEffect } from "react";
import Lookup from "@/data/Lookup";
import { useState } from "react";
import { Link, ArrowRight, Loader2Icon } from "lucide-react";
import Prompt from "@/data/Prompt";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { useSidebar } from "../ui/sidebar";
import { toast } from "sonner";

export const countToken=(inputText)=>{
  return inputText.trim().split(/\s+/).filter(word=>word).length; 
};

function ChatView() {
  const { id } = useParams();
  const convex = useConvex();
  const { messages, setMessages } = useContext(MessagesContext);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const UpdateMessages = useMutation(api.workspace.UpdateMessages);
  const {toggleSidebar}=useSidebar();
  const UpdateTokens=useMutation(api.users.UpdateToken);
    const { userDetail, setUserDetail } = useContext(UserDetailContext);
  

    // Ensure messages initializes as an array
  useEffect(() => {
    console.log("Initial messages:", messages); // Debugging log
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
      console.log("Workspace data:", result); // Debugging log
      setMessages(result?.messages || []); // Fallback to an empty array
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
  }, [messages]);

  const GetAiResponse = async () => {
    try {
      setLoading(true);
      const PROMPT = JSON.stringify(messages || []) + Prompt.CHAT_PROMPT;
      const result = await axios.post("/api/ai-chat", {
        prompt: PROMPT,
      });
      console.log("AI response:", result.data.result); // Debugging log
      const aiResp = {
        role: "ai",
        content: result.data.result,
      };
      setMessages((prev) => [...(prev || []), aiResp]);


      await UpdateMessages({
        messages: [...(messages || []), aiResp],
        workspaceId: id,
      });
      
      const token=Number(userDetail?.token)-Number(countToken(JSON.stringify(aiResp)));
      setUserDetail(prev=>({
        ...prev,
        token:token
      }))
      await UpdateTokens({
        userId:userDetail?._id,
        token:token
      })

      setLoading(false);
    } catch (error) {
      console.error("Error getting AI response:", error);
      setLoading(false);
    }
  };

  const onGenerate = (input) => {
      if(userDetail?.token<10){
        toast('You dont have enough tokens!');
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

  return (
    <div className="relative h-[85vh] flex flex-col">
      <div className="flex-1 overflow-y-scroll scrollbar-hide px-5">
        {/* Ensure messages is valid before mapping */}
        {messages?.length>0&&
          messages?.map((msg, index) => (
            <div
              key={index}
              className="p-3 rounded-lg mb-2 flex gap-2 items-center"
              style={{
                backgroundColor: Colors.CHAT_BACKGROUND,
              }}
            >
              {msg?.role === "user" && (
                <Image
                  src={userDetail?.picture || "/default-user.png"} // Fallback for user picture
                  alt="userImage"
                  width={35}
                  height={35}
                  className="rounded-full"
                />
              )}
              <ReactMarkdown className="flex flex-col">
                {msg?.content || ""}
              </ReactMarkdown>
            </div>
          ))}
        {loading && (
          <div
            className="p-3 rounded-lg mb-2 flex gap-2 items-center leading-7"
            style={{
              backgroundColor: Colors.CHAT_BACKGROUND,
            }}
          >
            <Loader2Icon className="animate-spin" />
            <h2>Generating Content...</h2>
          </div>
        )}
      </div>
      {/* {INPUT} */}
      <div className="flex gap-2 items-end">
        {userDetail&&<Image src={userDetail?.picture}
        onClick={toggleSidebar}  className="rounded-full cursor-pointer" alt='user' width={30} height={30}/>}
      <div
        className="p-5 border rounded-xl max-w-xl w-full mt-3"
        style={{
          backgroundColor: Colors.BACKGROUND,
        }}
      >
        <div className="flex gap-2">
          <textarea
            value={userInput}
            placeholder={Lookup.INPUT_PLACEHOLDER || "Type your message..."} // Fallback for placeholder
            onChange={(event) => setUserInput(event.target.value)}
            className="outline-none bg-transparent w-full h-32 max-h-56 resize-none"
          />
          {userInput && (
            <ArrowRight
              onClick={() => onGenerate(userInput)}
              className="bg-blue-500 p-2 h-8 w-10 rounded-md cursor-pointer"
            />
          )}
        </div>
        <div>
          <Link className="h-5 w-5" />
        </div>
      </div>
    </div>
    </div>
  );
}

export default ChatView;
