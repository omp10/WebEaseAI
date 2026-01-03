"use client";
import React, { useContext } from "react";
import { ModelSelectionContext } from "@/context/ModelSelectionContext";
import { Settings, Zap, Sparkles, Code, Network } from "lucide-react";
import { motion } from "framer-motion";

const models = [
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
];

function ModelSelector() {
  const { selectedModel, setSelectedModel } = useContext(ModelSelectionContext);

  return (
    <div className="p-2 mb-4 border-t border-gray-800 pt-4">
      <div className="flex items-center gap-2 mb-3 px-2">
        <Settings size={16} className="text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          AI Model
        </h3>
      </div>
      
      <div className="space-y-2">
        {models.map((model) => {
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
  );
}

export default ModelSelector;
