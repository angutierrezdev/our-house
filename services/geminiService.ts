import { GoogleGenAI, Type } from "@google/genai";

export const generateChoreSuggestions = async (context: string): Promise<{ title: string, frequency: string }[]> => {
  if (!process.env.API_KEY) {
    console.warn("No Gemini API Key found.");
    return [];
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Generate a list of 5 household chores based on this context: "${context}". 
    Return the result as a JSON array of objects with "title" and "frequency" (one-time, daily, weekly, monthly, or yearly).`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              frequency: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating chores:", error);
    return [];
  }
};