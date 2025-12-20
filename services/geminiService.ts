
import { GoogleGenAI, Type } from "@google/genai";
import { Order, Product } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getDailySummary = async (orders: Order[], expenses: number[]) => {
  const totalRev = orders.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalExp = expenses.reduce((acc, curr) => acc + curr, 0);
  
  const prompt = `Dựa trên số liệu sau của quán cafe: 
    - Tổng doanh thu: ${totalRev.toLocaleString()} VNĐ
    - Tổng chi phí: ${totalExp.toLocaleString()} VNĐ
    - Số lượng đơn hàng: ${orders.length}
    Hãy viết một bản tóm tắt ngắn gọn (khoảng 100 chữ) bằng tiếng Việt về hiệu quả kinh doanh hôm nay và đưa ra 1 lời khuyên kinh doanh.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Không thể tạo bản tóm tắt lúc này.";
  }
};

export const suggestNewDescription = async (product: Product) => {
  const prompt = `Viết một đoạn mô tả ngắn (2 câu) hấp dẫn, mời gọi cho món đồ uống có tên "${product.name}" để đăng lên thực đơn online của quán cafe. Ngôn ngữ thân thiện, hợp giới trẻ Việt Nam.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return product.description || "Món ngon mỗi ngày.";
  }
};
