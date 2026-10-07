import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("API Key found:", !!apiKey);
  
  const ai = new GoogleGenAI({ apiKey });
  
  // 1x1 transparent pixel base64
  const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Data,
              },
            },
            {
              text: 'test',
            },
          ],
        },
      ],
    });
    console.log("Success");
  } catch (err: any) {
    console.log("ERROR MESSAGE START");
    const msg = err.message || err.toString();
    console.log(msg.substring(0, 300) + (msg.length > 300 ? "..." : ""));
    console.log("ERROR MESSAGE END");
  }
}

test();
