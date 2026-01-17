import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages, provider, image } = await req.json();

  let model;
  if (provider === 'google') {
    model = google('gemini-2.5-flash');
  } else if (provider === 'groq') {
    model = groq('llama-3.3-70b-versatile');
  } else {
    return new Response('Invalid provider', { status: 400 });
  }

  // SYSTEM PROMPT
  const systemPrompt = `
    You are TurboLearn AI, an expert academic tutor.
    1. Tone: Professional, direct, and encouraging.
    2. Format: Use Markdown. Bold key terms.
    3. Context: If an image is provided, analyze it in detail (only applies to Gemini).
  `;

  // CONSTRUCT MESSAGES
  // We need to convert the frontend message format to Vercel AI SDK CoreMessage format
  const coreMessages = messages.map((m: any) => {
    if (m.role === 'user' && image && m === messages[messages.length - 1]) {
      // If this is the latest message and contains an image:
      if (provider === 'google') {
        // Send Text + Image to Gemini
        return {
          role: 'user',
          content: [
            { type: 'text', text: m.content },
            { type: 'image', image: image } // Base64 image
          ]
        };
      } else {
        // Send Text + Context Note to Groq (Llama 3 is text-only)
        return {
          role: 'user',
          content: m.content + "\n\n[System Note: The user also uploaded an image, but you cannot see it. Answer based on the text provided.]"
        };
      }
    }
    // Standard text message
    return { role: m.role, content: m.content };
  });

  try {
    const result = await streamText({
      model: model,
      system: systemPrompt,
      messages: coreMessages,
    });

    return new Response(result.textStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error(error);
    return new Response("Error processing request", { status: 500 });
  }
}