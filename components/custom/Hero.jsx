"use client";
import React, { useContext, useState } from "react";
import Lookup from "@/data/Lookup";
import { ArrowRight, Link, Loader2Icon, Settings, Zap, Sparkles, Code, Network } from "lucide-react"; // Import Loader2Icon
import Colors from "@/data/Colors";
import { MessagesContext } from "@/context/MessagesContext";
import { UserDetailContext } from "@/context/UserDetailContext";
import { ModelSelectionContext } from "@/context/ModelSelectionContext";
import SignInDialog from "./SignInDialog";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

function Hero() {
  const [userInput, setUserInput] = useState("");
  const { setMessages } = useContext(MessagesContext);
  const { userDetail } = useContext(UserDetailContext);
  const { selectedModel, setSelectedModel } = useContext(ModelSelectionContext);
  const [openDialog, setOpenDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // New loading state
  const [loadingSuggestion, setLoadingSuggestion] = useState(null); // Track which suggestion is loading
  const CreateWorkspace = useMutation(api.workspace.CreateWorkspace);
  const router = useRouter();

  const onGenerate = async (input) => {
    if (!userDetail || !userDetail._id) {
      setOpenDialog(true);
      return;
    }

    if (userDetail.token < 10) {
      toast.error("You don't have enough tokens!");
      return;
    }

    const msg = {
      role: "user",
      content: input,
    };

    setMessages(msg);
    setIsLoading(true); // Start loading state

    try {
      const workspaceId = await CreateWorkspace({
        user: userDetail._id,
        messages: [msg],
      });
      // Workspace created successfully
      toast.success("Workspace created successfully!");
      router.push(`/workspace/${workspaceId}`);
    } catch (error) {
      console.error("Error creating workspace:", error);
      toast.error("Failed to create workspace, please try again.");
    } finally {
      setIsLoading(false); // End loading state
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="flex flex-col items-center mt-36 xl:mt-42 gap-2 p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h2
        className="font-extrabold text-5xl text-white text-center leading-tight gradient-text"
        variants={itemVariants}
      >
        {Lookup.HERO_HEADING}
      </motion.h2>
      <motion.p
        className="text-gray-300 font-light text-lg text-center max-w-2xl mt-2"
        variants={itemVariants}
      >
        {Lookup.HERO_DESC}
      </motion.p>

      <motion.div
        className="p-6 border border-blue-600/30 rounded-2xl max-w-xl w-full mt-8 shadow-2xl backdrop-blur-sm"
        style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
        variants={itemVariants}
        whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(59, 130, 246, 0.4)" }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <div className="flex gap-3 items-end">
          <textarea
            placeholder={Lookup.INPUT_PLACEHOLDER}
            onChange={(event) => setUserInput(event.target.value)}
            className="outline-none bg-transparent flex-grow h-36 max-h-64 resize-none text-white text-lg placeholder-gray-500 custom-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          />
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: userInput ? 1 : 0, x: userInput ? 0 : 20 }}
            transition={{ duration: 0.3 }}
          >
            {userInput && (
              <motion.button
                onClick={() => onGenerate(userInput)}
                disabled={isLoading} // Disable while loading
                className="bg-blue-600 hover:bg-blue-700 text-white p-3 h-12 w-12 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-all duration-300 ease-in-out"
                whileHover={{ scale: isLoading ? 1 : 1.1, rotate: isLoading ? 0 : 5 }} // No hover animation when loading
                whileTap={{ scale: isLoading ? 1 : 0.9 }} // No tap animation when loading
              >
                {isLoading ? (
                  <Loader2Icon className="h-6 w-6 animate-spin" />
                ) : (
                  <ArrowRight className="h-6 w-6" />
                )}
              </motion.button>
            )}
          </motion.div>
        </div>
        <div className="mt-4 flex justify-end">
          <Link className="h-5 w-5 text-gray-500 hover:text-blue-400 transition-colors" />
        </div>
      </motion.div>

      {/* Model Selector Section */}
      <motion.div
        className="mt-8 max-w-2xl w-full"
        variants={itemVariants}
      >
        <div className="p-4 border border-gray-600/50 rounded-xl bg-gray-800/30 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Settings size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Select AI Model
            </h3>
          </div>
          <div className="space-y-2">
            {[
              {
                id: "groq",
                name: "Groq",
                description: "Fast inference, 30 RPM, 14.4K RPD",
                icon: Zap,
                color: "text-purple-400",
                bgColor: "bg-purple-500/10",
                borderColor: "border-purple-500/30",
              },
              {
                id: "gemini",
                name: "Gemini 2.0 Flash",
                description: "Google's latest model, high quality",
                icon: Sparkles,
                color: "text-blue-400",
                bgColor: "bg-blue-500/10",
                borderColor: "border-blue-500/30",
              },
              {
                id: "deepseek",
                name: "DeepSeek",
                description: "Excellent for UI code, limited free credits",
                icon: Code,
                color: "text-green-400",
                bgColor: "bg-green-500/10",
                borderColor: "border-green-500/30",
              },
              {
                id: "openrouter",
                name: "OpenRouter",
                description: "50 free requests/day, multiple models",
                icon: Network,
                color: "text-orange-400",
                bgColor: "bg-orange-500/10",
                borderColor: "border-orange-500/30",
              },
            ].map((model) => {
              const Icon = model.icon;
              const isSelected = selectedModel === model.id;
              
              return (
                <motion.button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? `${model.bgColor} ${model.borderColor} border-2`
                      : "bg-gray-800/50 border-gray-700/50 hover:bg-gray-800"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${model.bgColor}`}>
                      <Icon size={18} className={model.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${isSelected ? "text-white" : "text-gray-300"}`}>
                        {model.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {model.description}
                      </div>
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 rounded-full bg-blue-500"
                      />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      <motion.div
        className="flex mt-10 flex-wrap max-w-3xl items-center justify-center gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {Lookup?.SUGGSTIONS.map((suggestion, index) => {
          const isSuggestionLoading = loadingSuggestion === suggestion;
          
          const handleSuggestionClick = async () => {
            if (isLoading || isSuggestionLoading) return;
            setLoadingSuggestion(suggestion);
            try {
              await onGenerate(suggestion);
            } finally {
              setLoadingSuggestion(null);
            }
          };
          
          return (
            <motion.h2
              key={index}
              onClick={handleSuggestionClick}
              className={`p-2 px-4 border border-gray-600 rounded-full text-sm text-gray-400 hover:text-white hover:bg-blue-600 hover:border-blue-600 transition-all duration-300 ease-in-out font-medium flex items-center gap-2 ${
                isLoading || isSuggestionLoading 
                  ? "opacity-50 cursor-not-allowed" 
                  : "cursor-pointer"
              }`}
              variants={itemVariants}
              whileHover={isLoading || isSuggestionLoading ? {} : { scale: 1.05, boxShadow: "0 0 15px rgba(59, 130, 246, 0.3)" }}
              whileTap={isLoading || isSuggestionLoading ? {} : { scale: 0.95 }}
            >
              {isSuggestionLoading && (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              )}
              {suggestion}
            </motion.h2>
          );
        })}
      </motion.div>
      <SignInDialog
        openDialog={openDialog}
        closeDialog={() => setOpenDialog(false)}
      />
    </motion.div>
  );
}

export default Hero;