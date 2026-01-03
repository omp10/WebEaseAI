"use client";
import { createContext, useState, useEffect } from "react";

export const ModelSelectionContext = createContext();

export const ModelSelectionProvider = ({ children }) => {
  const [selectedModel, setSelectedModel] = useState("groq");

  // Load saved model preference from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedModel = localStorage.getItem("selectedAiModel");
      if (savedModel) {
        setSelectedModel(savedModel);
      }
    }
  }, []);

  // Save model preference to localStorage when it changes
  const updateSelectedModel = (model) => {
    setSelectedModel(model);
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedAiModel", model);
    }
  };

  return (
    <ModelSelectionContext.Provider
      value={{
        selectedModel,
        setSelectedModel: updateSelectedModel,
      }}
    >
      {children}
    </ModelSelectionContext.Provider>
  );
};
