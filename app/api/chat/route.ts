import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const systemMessage = {
      role: 'system',
      content: 'You are a helpful AI assistant in a voice conversation. Keep your responses concise and natural, as they will be spoken aloud. Be friendly and conversational.'
    };

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { message: "I'm a demo AI agent. You said: " + messages[messages.length - 1].content + ". In production, I would use OpenAI to generate intelligent responses." },
        { status: 200 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [systemMessage, ...messages],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API error');
    }

    const data = await response.json();
    const message = data.choices[0].message.content;

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { message: "I'm here to help. What would you like to talk about?" },
      { status: 200 }
    );
  }
}
