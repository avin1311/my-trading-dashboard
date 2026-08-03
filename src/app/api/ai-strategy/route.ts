import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are an expert Indian stock market technical analyst and trading mentor (NSE/BSE). You specialize in:
- Technical analysis (EMA, RSI, MACD, Supertrend, Volume Profile, Support/Resistance)
- Risk management and position sizing
- Trade review and journal analysis
- Systematic strategy building

Rules:
- Always reference specific indicator values, price levels, and ratios
- Give clear GO / NO-GO when asked
- Use INR (₹) for Indian stocks
- Be concise but thorough — use numbered lists
- For position sizing, show step-by-step math
- Never give financial advice disclaimers — just analyze technically
- Adapt your analysis for the selected NSE stock or index
- When data context is provided, use those actual values in your analysis`;

export async function POST(req: NextRequest) {
  try {
    const { message, history, stockContext } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let contextPrompt = SYSTEM_PROMPT;
    if (stockContext) {
      const c = stockContext;
      contextPrompt += `\n\nCurrent stock context:\n` +
        `- Symbol: ${c.symbol ?? 'N/A'}\n` +
        `- Name: ${c.name ?? 'N/A'}\n` +
        `- Sector: ${c.sector ?? 'N/A'}\n` +
        `- Current Price: ₹${c.price ?? 0}\n` +
        `- Change: ${(c.changePct ?? 0) >= 0 ? '+' : ''}${(c.changePct ?? 0).toFixed(2)}%\n` +
        `- RSI: ${c.rsi ?? 'N/A'}\n` +
        `- Signal: ${c.signal ?? 'N/A'}\n` +
        `- Supertrend: ${c.supertrendDir === 1 ? 'Bullish' : c.supertrendDir === -1 ? 'Bearish' : 'Neutral'}\n` +
        `- MACD Histogram: ${c.macdHistogram ?? 'N/A'}`;
    }

    const messages: { role: string; content: string }[] = [
      { role: 'assistant', content: contextPrompt }
    ];

    if (Array.isArray(history) && history.length > 0) {
      const recent = history.slice(-10);
      for (const msg of recent) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: 'user', content: message });

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      thinking: { type: 'disabled' }
    });

    const response = completion.choices[0]?.message?.content || 'No response generated.';

    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    console.error('[ai-strategy]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
