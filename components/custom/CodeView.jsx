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
    // Timeout for fetching
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), 60000)
    );

    try {
      const PROMPT = JSON.stringify(messages) + " " + Prompt.CODE_GEN_PROMPT;
      const requestPromise = axios.post(
        "/api/gen-ai-code",
        { prompt: PROMPT },
        { timeout: 60000 } // Extended timeout
      );

      const result = await Promise.race([requestPromise, timeoutPromise]);
      const aiResp = result.data;
      const mergedFiles = { ...Lookup.DEFAULT_FILE, ...aiResp?.files };

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
      toast.error("Failed to generate code, please try again.");
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