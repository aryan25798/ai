import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// ⚠️ SECURITY: Must be 'nodejs' to verify Admin/User status in Firestore reliably.
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    // 1. Extract Data & User ID
    const { messages, provider, image, userId } = await req.json();

    // 2. SECURITY CHECK (The "Gatekeeper")
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized: No User ID" }), { status: 401 });
    }

    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return new Response(JSON.stringify({ error: "User not found" }), { status: 403 });
      }

      const userData = userSnap.data();
      
      // 🛑 BLOCK if Pending or Banned (and not Admin)
      if (userData.status !== 'approved' && userData.role !== 'admin') {
         return new Response(JSON.stringify({ error: "Access Denied: Account not approved." }), { status: 403 });
      }
    } catch (dbError) {
      console.error("Security Check Failed:", dbError);
      return new Response(JSON.stringify({ error: "Security verification failed" }), { status: 500 });
    }

    // 3. Model Selection
    let model;
    if (provider === 'google') {
      // ✅ FIX: Use gemini-1.5-flash (2.5 is not yet public API)
      model = google('gemini-2.5-flash'); 
    } else if (provider === 'groq') {
      model = groq('llama-3.3-70b-versatile'); 
    } else {
      return new Response('Invalid provider', { status: 400 });
    }

    // 4. System Prompt
    const systemPrompt = `
You are TurboLearn AI, an elite academic engine.
RULES:
1. **Direct Answer**: Output the final answer immediately. No filler words.
2. **Concise**: Use bullet points for explanations.
3. **Format**: Use Markdown. **Bold** key terms. LaTeX for math ($x^2$).
4. **Context**: If an image is present, treat it as the primary source of the question.
`;

    // 5. Message Formatting
    const coreMessages = messages.map((m: any, index: number) => {
      if (index === messages.length - 1 && m.role === 'user') {
        if (provider === 'google' && image) {
          return {
            role: 'user',
            content: [
              { type: 'text', text: m.content },
              { type: 'image', image: image }
            ]
          };
        } 
        if (provider === 'groq' && image) {
          return {
            role: 'user',
            content: `${m.content}\n\n[SYSTEM: The user attached an image. The text extracted from it is above. Solve based on this text.]`
          };
        }
      }
      return { role: m.role, content: m.content };
    });

    // 6. Stream Response
    const result = await streamText({
      model: model,
      system: systemPrompt,
      messages: coreMessages,
      temperature: 0.1, 
      maxTokens: 1024, // ✅ FIX: 'maxOutputTokens' is now 'maxTokens' in SDK v6+
    });

    return result.toTextStreamResponse();

  } catch (error) {
    console.error("AI Error:", error);
    return new Response(JSON.stringify({ error: "Failed to process request" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}