// Multi-provider AI configuration
// Supports: Groq (recommended), Gemini, Cerebras, DeepSeek, OpenRouter

const AI_PROVIDER = process.env.NEXT_PUBLIC_AI_PROVIDER || "groq"; // groq, gemini, cerebras, deepseek, openrouter

// Groq Configuration (Recommended - Best free tier)
const getGroqConfig = () => {
  const Groq = require("groq-sdk");
  const groq = new Groq({
    apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
  });

  return {
    chatModel: groq.chat.completions.create.bind(groq.chat.completions),
    codeModel: groq.chat.completions.create.bind(groq.chat.completions),
    chatConfig: {
      model: "llama-3.3-70b-versatile", // or "mixtral-8x7b-32768" for code
      temperature: 0.8,
      max_tokens: 1024,
      stream: false,
    },
    codeConfig: {
      model: "llama-3.3-70b-versatile", // or "mixtral-8x7b-32768" for better code
      temperature: 0.5,
      max_tokens: 8192,
      stream: false,
      response_format: { type: "json_object" },
    },
  };
};

// Gemini Configuration (Current)
const getGeminiConfig = () => {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
  });

  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 1024,
    responseMimeType: "text/plain",
  };

  const CodeGenerationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
  };

  return {
    chatModel: model.startChat({
      generationConfig,
      history: [],
    }),
    codeModel: model.startChat({
      generationConfig: CodeGenerationConfig,
      history: [],
    }),
    chatConfig: generationConfig,
    codeConfig: CodeGenerationConfig,
  };
};

// Cerebras Configuration
const getCerebrasConfig = () => {
  // Cerebras uses OpenAI-compatible API
  const OpenAI = require("openai");
  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_CEREBRAS_API_KEY,
    baseURL: "https://api.cerebras.ai/v1",
  });

  return {
    chatModel: openai.chat.completions.create.bind(openai.chat.completions),
    codeModel: openai.chat.completions.create.bind(openai.chat.completions),
    chatConfig: {
      model: "llama-3.1-70b-instruct",
      temperature: 0.8,
      max_tokens: 1024,
    },
    codeConfig: {
      model: "llama-3.1-70b-instruct",
      temperature: 0.5,
      max_tokens: 8192,
      response_format: { type: "json_object" },
    },
  };
};

// DeepSeek Configuration
const getDeepSeekConfig = () => {
  const OpenAI = require("openai");
  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com/v1",
  });

  return {
    chatModel: openai.chat.completions.create.bind(openai.chat.completions),
    codeModel: openai.chat.completions.create.bind(openai.chat.completions),
    chatConfig: {
      model: "deepseek-chat",
      temperature: 0.8,
      max_tokens: 1024,
    },
    codeConfig: {
      model: "deepseek-chat",
      temperature: 0.5,
      max_tokens: 8192,
      response_format: { type: "json_object" },
    },
  };
};

// OpenRouter Configuration
const getOpenRouterConfig = () => {
  const OpenAI = require("openai");
  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Web Ease AI",
    },
  });

  return {
    chatModel: openai.chat.completions.create.bind(openai.chat.completions),
    codeModel: openai.chat.completions.create.bind(openai.chat.completions),
    chatConfig: {
      model: "google/gemini-flash-1.5",
      temperature: 0.8,
      max_tokens: 1024,
    },
    codeConfig: {
      model: "google/gemini-flash-1.5",
      temperature: 0.5,
      max_tokens: 8192,
      response_format: { type: "json_object" },
    },
  };
};

// Get configuration based on provider
const getProviderConfig = () => {
  switch (AI_PROVIDER.toLowerCase()) {
    case "groq":
      return getGroqConfig();
    case "gemini":
      return getGeminiConfig();
    case "cerebras":
      return getCerebrasConfig();
    case "deepseek":
      return getDeepSeekConfig();
    case "openrouter":
      return getOpenRouterConfig();
    default:
      console.warn(`Unknown provider: ${AI_PROVIDER}, falling back to Groq`);
      return getGroqConfig();
  }
};

const config = getProviderConfig();

// Export chat and code generation functions
export const sendChatMessage = async (prompt, history = []) => {
  if (AI_PROVIDER === "gemini") {
    // Gemini uses sendMessage
    const messages = history.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content || msg.text }],
    }));
    const session = config.chatModel;
    const result = await session.sendMessage(prompt);
    return result.response.text();
  } else {
    // OpenAI-compatible (Groq, Cerebras, DeepSeek, OpenRouter)
    const messages = history.map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content || msg.text,
    }));
    messages.push({ role: "user", content: prompt });

    const response = await config.chatModel({
      ...config.chatConfig,
      messages,
    });
    return response.choices[0].message.content;
  }
};

export const sendCodeGenerationMessage = async (prompt, history = []) => {
  if (AI_PROVIDER === "gemini") {
    // Gemini uses sendMessage
    const session = config.codeModel;
    const result = await session.sendMessage(prompt);
    return result.response.text();
  } else {
    // OpenAI-compatible (Groq, Cerebras, DeepSeek, OpenRouter)
    const messages = history.map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content || msg.text,
    }));
    messages.push({ role: "user", content: prompt });

    const response = await config.codeModel({
      ...config.codeConfig,
      messages,
    });
    return response.choices[0].message.content;
  }
};

export const chatSession = {
  sendMessage: async (prompt) => {
    const text = await sendChatMessage(prompt);
    return {
      response: {
        text: () => text,
      },
    };
  },
};

export const GenAiCode = {
  sendMessage: async (prompt) => {
    const text = await sendCodeGenerationMessage(prompt);
    return {
      response: {
        text: () => text,
      },
    };
  },
};

export default { chatSession, GenAiCode, AI_PROVIDER };

