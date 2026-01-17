import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { adminDb } from '@/lib/firebaseAdmin';

// ⚠️ SECURITY: Must be 'nodejs' to use Firebase Admin
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    // 1. Extract Data
    const { messages, provider, image, userId } = await req.json();

    // 2. SECURITY CHECK (Admin SDK)
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized: No User ID" }), { status: 401 });
    }

    try {
      // ⚡️ Bypass Rules: Admin SDK reads user data directly
      const userSnap = await adminDb.collection('users').doc(userId).get();
      
      if (!userSnap.exists) {
        return new Response(JSON.stringify({ error: "User not found" }), { status: 403 });
      }

      const userData = userSnap.data();
      
      // 🛑 BLOCK if Pending or Banned (and not Admin)
      if (userData?.status !== 'approved' && userData?.role !== 'admin') {
         return new Response(JSON.stringify({ error: "Access Denied: Account not approved." }), { status: 403 });
      }
    } catch (dbError) {
      console.error("🔥 Security Check Failed:", dbError);
      return new Response(JSON.stringify({ error: "Security verification failed" }), { status: 500 });
    }

    // 3. Model Selection
    let model;
    if (provider === 'google') {
      // ✅ Gemini 2.5 Flash: Supports Images
      model = google('gemini-2.5-flash'); 
    } else if (provider === 'groq') {
      // ✅ Llama 3.3 Versatile: Text ONLY (Super fast reasoning)
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

    // 5. Message Formatting (Strict Separation)
    const coreMessages = messages.map((m: any, index: number) => {
      if (index === messages.length - 1 && m.role === 'user') {
        
        // ✅ LOGIC FIX: Only attach image if provider is GOOGLE
        // If provider is Groq, we IGNORE the image to prevent crashes.
        if (image && provider === 'google') {
          return {
            role: 'user',
            content: [
              { type: 'text', text: m.content },
              { type: 'image', image: image } 
            ]
          };
        }
        
        // Default (Text Only) for Llama or Gemini without image
        return { role: 'user', content: m.content };
      }
      return { role: m.role, content: m.content };
    });

    // 6. Stream Response
    const result = await streamText({
      model: model,
      system: systemPrompt,
      messages: coreMessages,
      temperature: 0.1, 
      maxTokens: 1024,
    });

    return result.toTextStreamResponse();

  } catch (error) {
    console.error("🔥 AI Error:", error);
    return new Response(JSON.stringify({ error: "Failed to process request" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}