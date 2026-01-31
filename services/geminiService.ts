
import { GoogleGenAI } from "@google/genai";
import { Product } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getProductInsight = async (product: Product): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      // Fix: Use correct keys from Product interface ('商品名稱' and '簡單介紹')
      contents: `你是一位專業的健康與美容顧問。請為這款產品寫一句充滿魅力、具說服力且專業的推薦語：${product['商品名稱']} - ${product['簡單介紹']}`,
    });
    // response.text is a property
    return response.text || "給予您最純淨的呵護，成就完美的自己。";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "您的美麗，由我們細心守護。";
  }
};

export const getChatResponse = async (query: string, cart: string[]): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `你是一位「爆紅姑娘」的專業健康小助手。
      客戶詢問： "${query}"。 
      他們目前的購物車中有： ${cart.join(', ')}。 
      請用親切、專業、鼓勵性的口吻簡短回應，推薦合適的產品 or 回答問題。`,
    });
    return response.text || "很高興為您服務！有任何健康或美容問題都可以問我喔！";
  } catch (error) {
    return "抱歉，我現在有點小忙，但您的美麗計畫不能停！";
  }
};
