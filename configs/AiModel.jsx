const Groq = require("groq-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

// ========== GROQ CONFIGURATION ==========
let groq = null;

function getGroqClient() {
  if (!groq) {
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    
    if (!apiKey) {
      throw new Error("NEXT_PUBLIC_GROQ_API_KEY environment variable is required");
    }
    
    groq = new Groq({
      apiKey: apiKey,
    });
  }
  return groq;
}

// Groq chat configuration
const groqChatConfig = {
  model: "llama-3.3-70b-versatile",
  temperature: 1,
  top_p: 0.95,
  max_tokens: 8192,
  stream: false,
};

// Groq code generation configuration
const groqCodeConfig = {
  model: "llama-3.3-70b-versatile",
  temperature: 0.8,
  top_p: 0.95,
  max_tokens: 16384,
  stream: false,
};

// ========== GEMINI CONFIGURATION ==========
let geminiModel = null;

function getGeminiModel() {
  if (!geminiModel) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("NEXT_PUBLIC_GEMINI_API_KEY environment variable is required");
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    geminiModel = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
    });
  }
  return geminiModel;
}

// Gemini chat configuration
const geminiChatConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

// Gemini code generation configuration
const geminiCodeConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

// ========== DEEPSEEK CONFIGURATION ==========
let deepseekClient = null;

function getDeepSeekClient() {
  if (!deepseekClient) {
    const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error("NEXT_PUBLIC_DEEPSEEK_API_KEY environment variable is required");
    }
    
    deepseekClient = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://api.deepseek.com/v1",
    });
  }
  return deepseekClient;
}

// DeepSeek chat configuration
const deepseekChatConfig = {
  model: "deepseek-chat",
  temperature: 1,
  top_p: 0.95,
  max_tokens: 8192,
  stream: false,
};

// DeepSeek code generation configuration
const deepseekCodeConfig = {
  model: "deepseek-chat",
  temperature: 0.8,
  top_p: 0.95,
  max_tokens: 16384,
  stream: false,
};

// ========== OPENROUTER CONFIGURATION ==========
let openrouterClient = null;

function getOpenRouterClient() {
  if (!openrouterClient) {
    const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    
    if (!apiKey) {
      throw new Error("NEXT_PUBLIC_OPENROUTER_API_KEY environment variable is required");
    }
    
    openrouterClient = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Web Ease AI",
      },
    });
  }
  return openrouterClient;
}

// OpenRouter chat configuration
const openrouterChatConfig = {
  model: "meta-llama/llama-3.2-3b-instruct:free",
  temperature: 1,
  top_p: 0.95,
  max_tokens: 8192,
  stream: false,
};

// OpenRouter code generation configuration
// Using a smaller, faster model for code generation to improve speed
const openrouterCodeConfig = {
  model: "meta-llama/llama-3.2-3b-instruct:free",
  temperature: 0.7, // Slightly lower for more consistent JSON
  top_p: 0.9,
  max_tokens: 8192, // Reduced further to ensure complete responses
  stream: false,
};

// ========== UNIFIED API FUNCTIONS ==========

// Helper function to create chat completion
export const getChatResponse = async (messages, modelType = "groq") => {
  try {
    if (modelType === "groq") {
      const client = getGroqClient();
      const completion = await client.chat.completions.create({
        ...groqChatConfig,
        messages: messages,
      });
      return completion.choices[0]?.message?.content || "";
    } else if (modelType === "gemini") {
      const model = getGeminiModel();
      // Convert messages format for Gemini
      const lastMessage = messages[messages.length - 1];
      const prompt = lastMessage?.content || messages.map(m => m.content).join("\n");
      
      const chatSession = model.startChat({
        generationConfig: geminiChatConfig,
        history: [],
      });
      
      const result = await chatSession.sendMessage(prompt);
      const response = await result.response;
      return response.text() || "";
    } else if (modelType === "deepseek") {
      const client = getDeepSeekClient();
      const completion = await client.chat.completions.create({
        ...deepseekChatConfig,
        messages: messages,
      });
      return completion.choices[0]?.message?.content || "";
    } else if (modelType === "openrouter") {
      const client = getOpenRouterClient();
      const completion = await client.chat.completions.create({
        ...openrouterChatConfig,
        messages: messages,
      });
      return completion.choices[0]?.message?.content || "";
    } else {
      throw new Error(`Unsupported model type: ${modelType}`);
    }
  } catch (error) {
    console.error(`${modelType} chat error:`, error);
    throw error;
  }
};

// Helper function to create chat completion for code generation
export const getCodeGenerationResponse = async (messages, modelType = "groq") => {
  try {
    if (modelType === "groq") {
      const client = getGroqClient();
      const completion = await client.chat.completions.create({
        ...groqCodeConfig,
        messages: messages,
      });
      return completion.choices[0]?.message?.content || "";
    } else if (modelType === "gemini") {
      const model = getGeminiModel();
      // Convert messages format for Gemini
      const lastMessage = messages[messages.length - 1];
      const prompt = lastMessage?.content || messages.map(m => m.content).join("\n");
      
      const chatSession = model.startChat({
        generationConfig: geminiCodeConfig,
        history: [],
      });
      
      const result = await chatSession.sendMessage(prompt);
      const response = await result.response;
      return response.text() || "";
    } else if (modelType === "deepseek") {
      const client = getDeepSeekClient();
      const completion = await client.chat.completions.create({
        ...deepseekCodeConfig,
        messages: messages,
      });
      return completion.choices[0]?.message?.content || "";
    } else if (modelType === "openrouter") {
      const client = getOpenRouterClient();
      const completion = await client.chat.completions.create({
        ...openrouterCodeConfig,
        messages: messages,
      });
      return completion.choices[0]?.message?.content || "";
    } else {
      throw new Error(`Unsupported model type: ${modelType}`);
    }
  } catch (error) {
    console.error(`${modelType} code generation error:`, error);
    throw error;
  }
};
