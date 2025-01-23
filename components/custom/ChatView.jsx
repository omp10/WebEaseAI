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
import { Link,ArrowRight, Loader2Icon } from "lucide-react";
import Prompt from "@/data/Prompt";
import axios from "axios";
function ChatView() {
  const { id } = useParams();
  const convex = useConvex();
  const { messages, setMessages } = useContext(MessagesContext);
  const {userDetail,setUserDetail}=useContext(UserDetailContext);
    const [userInput, setUserInput] = useState();
    const [loading,setLoading]=useState(false);
  const UpdateMessages=useMutation(api.workspace.UpdateMessages)
  useEffect(() => {
    id && GetWorkspaceData();
  }, [id]);
  const GetWorkspaceData = async () => {
    const result = await convex.query(api.workspace.GetWorkspace, {
      workspaceId: id,
    });
    setMessages(result?.messages);
    console.log(result);
  };
  
  useEffect(()=>{
    if(messages?.length>0){
      const role=messages[messages?.length-1].role;
      if(role=='user'){
        GetAiResponse();
      }
    }
  },[messages]);
  const GetAiResponse=async()=>{
    setLoading(true);
    const PROMPT=JSON.stringify(messages)+Prompt.CHAT_PROMPT;
    const result=await axios.post('/api/ai-chat',{
      prompt:PROMPT
    });
    console.log(result.data.result);
    const aiResp={
      role:'ai',
      content:result.data.result

    }
    setMessages(prev=>[...prev,aiResp]);
    await UpdateMessages({
      messages:[...messages,aiResp],
      workspaceId:id
    })
    setLoading(false);

  }

  const onGenerate=(input)=>{
    setMessages(prev=>[...prev,{
      role:'user',
      content:input
    }])
  }


  return (
    <div className="relative h-[85vh] flex flex-col">
      <div className="flex-1 overflow-y-scroll scrollbar-hide">
        {messages?.map((msg, index) => (
          <div key={index}
          className="p-3 rounded-lg mb-2 flex gap-2 items-center"
          style={{
            backgroundColor:Colors.CHAT_BACKGROUND
          }}>
            {msg?.role=='user'&&<Image src={userDetail?.picture} alt="userImage"
            width={35} height={35} className="rounded-full"/>}
            <h2>{msg.content}</h2>
          </div>
        ))}
        {loading && <div className="p-3 rounded-lg mb-2 flex gap-2 items-center leading-7"
        style={{
          backgroundColor:Colors.CHAT_BACKGROUND
        }}>
              <Loader2Icon className="animate-spin"/>
              <h2>Generating Content...</h2>
            </div>}
      </div>
      {/* {INPUT} */}
      <div
        className="p-5 border rounded-xl max-w-xl w-full mt-3"
        style={{
          backgroundColor: Colors.BACKGROUND,
        }}
      >
        <div className="flex gap-2">
          <textarea
            placeholder={Lookup.INPUT_PLACEHOLDER}
            onChange={(event) => setUserInput(event.target.value)}
            className="outline-none bg-transparent w-full h-32 max-h-56 resize-none"
          />
          {userInput && (
            <ArrowRight
              onClick={() => onGenerate(userInput)}
              className="bg-blue-500 p-2 h-8 w-10 rounded-md cursor-pointer"
            />
          )}{" "}
        </div>
        <div>
          <Link className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default ChatView;
