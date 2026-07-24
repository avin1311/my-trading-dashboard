'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Trash2, Sparkles, ShieldCheck, ClipboardList, Calculator, BarChart3, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const WORKFLOWS = [
  {
    id: 'review',
    label: 'Trade Review',
    icon: ShieldCheck,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20',
    prompt: (ctx: string) => `You are a senior technical analyst reviewing my proposed trade. Here is my setup:
${ctx}

1. Identify any weaknesses in this setup
2. What conditions would make this setup invalid?
3. What is the biggest risk I'm not considering?
4. Is there a better entry or exit level based on what I've described?
5. Give me a clear GO / NO-GO recommendation with your reasoning.`
  },
  {
    id: 'systematic',
    label: 'Build Strategy',
    icon: ClipboardList,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20',
    prompt: (ctx: string) => `Help me turn this trading idea into a complete, systematic strategy.

Idea: I want to buy ${ctx} when it has pulled back to a key level after a strong upward move, and the RSI shows it's oversold.

For each part of this idea, help me define:
- Exact entry condition (specific indicator values and levels)
- Stop loss rule
- Take profit rule
- Trade management (what I do if the trade goes 50% toward target)
- When this setup is invalid (what would make me NOT take the trade)

Give me the rules in a simple IF-THEN format I can follow without thinking during the trade.`
  },
  {
    id: 'position',
    label: 'Position Sizing',
    icon: Calculator,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20',
    prompt: (ctx: string) => `I am a trader. Calculate my position size for this trade.
${ctx}

What is:
1. The maximum amount I can risk
2. The exact number of shares/lots to buy
3. The total position value
4. My risk/reward ratio

Show me the calculation step by step so I understand it.`
  },
  {
    id: 'postmortem',
    label: 'Trade Post-Mortem',
    icon: BarChart3,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20',
    prompt: (ctx: string) => `Review this completed trade and tell me what I did wrong.
${ctx}

Please analyse:
1. Was my entry valid based on my stated rules?
2. What signals should I have seen that the trade was risky?
3. Was this a strategy failure or an execution failure?
4. What would a more experienced trader have done differently?
5. What is the one thing I should focus on improving for next time?`
  },
  {
    id: 'journal',
    label: 'Journal Analysis',
    icon: BookOpen,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10 border-teal-500/20 hover:bg-teal-500/20',
    prompt: (_ctx: string) => `Here is my trading journal. Analyse it and find my patterns.

Tell me:
1. What type of setups am I winning on most?
2. What type of setups am I losing on most?
3. What times of day am I making my worst decisions?
4. Am I following my stated rules or improvising?
5. What is the single biggest pattern in my losses that I probably haven't noticed?

Be specific. Use examples from my actual trades.`
  },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIProps {
  symbol: string;
  price: number;
  changePct: number;
  rsi: number | null;
  signal: string;
  supertrendDir: number;
  macdHistogram: number | null;
  sector: string;
  name: string;
}

export function AIStrategyPanel(props: AIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const buildContext = () => {
    return `Asset: ${props.symbol} (${props.name})\nSector: ${props.sector}\nCurrent Price: ₹${props.price.toFixed(2)}\nChange: ${props.changePct >= 0 ? '+' : ''}${props.changePct.toFixed(2)}%\nRSI: ${props.rsi ?? 'N/A'}\nSignal: ${props.signal || 'N/A'}\nSupertrend: ${props.supertrendDir === 1 ? 'Bullish' : props.supertrendDir === -1 ? 'Bearish' : 'Neutral'}\nMACD Histogram: ${props.macdHistogram ?? 'N/A'}\nEntry: ₹${props.price.toFixed(2)}`;
  };

  const handleWorkflow = (wf: typeof WORKFLOWS[0]) => {
    setActiveWorkflow(wf.id);
    const userMsg = wf.prompt(buildContext());
    setMessages(prev => [...prev, { role: 'user', content: `[${wf.label}]\n${userMsg}` }]);
    sendMessage(userMsg);
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    sendMessage(msg);
  };

  const sendMessage = async (userMsg: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: messages,
          stockContext: {
            symbol: props.symbol,
            name: props.name,
            sector: props.sector,
            price: props.price,
            changePct: props.changePct,
            rsi: props.rsi,
            signal: props.signal,
            supertrendDir: props.supertrendDir,
            macdHistogram: props.macdHistogram,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error || 'Unknown error'}` }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to connect to AI. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex flex-wrap gap-1.5">
        {WORKFLOWS.map(wf => (
          <button
            key={wf.id}
            onClick={() => handleWorkflow(wf)}
            disabled={loading}
            type="button"
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-all',
              wf.bg,
              activeWorkflow === wf.id && 'ring-1 ring-current',
              loading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <wf.icon className={cn('w-3 h-3', wf.color)} />
            {wf.label}
          </button>
        ))}
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] text-slate-500 hover:text-red-400 ml-auto"
            onClick={() => { setMessages([]); setActiveWorkflow(null); }}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 rounded-xl border border-slate-800/60 bg-[#0a0e1a]/90 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300 mb-1">AI Trading Advisor</h3>
            <p className="text-[11px] text-slate-500 max-w-sm">
              Select a workflow above or type your own question.
              Analysis is auto-contextualized with {props.symbol}&apos;s live data.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
              <Badge variant="outline" className="text-[9px] bg-slate-800/50 border-slate-700 text-slate-400">
                By Vrushal Bhilpawar&apos;s Framework
              </Badge>
              <Badge variant="outline" className="text-[9px] bg-emerald-500/5 border-emerald-500/20 text-emerald-400">
                <Sparkles className="w-2.5 h-2.5 mr-0.5" /> 5 Workflows
              </Badge>
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                )}
                <div className={cn(
                  'rounded-xl px-3 py-2.5 max-w-[85%] text-[11px] leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-blue-500/10 border border-blue-500/20 text-blue-100'
                    : 'bg-slate-800/40 border border-slate-800/60 text-slate-300'
                )}>
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                </div>
                <div className="rounded-xl px-4 py-3 bg-slate-800/40 border border-slate-800/60">
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your trade setup..."
          rows={1}
          className="flex-1 h-9 resize-none rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
        />
        <Button
          size="sm"
          className="h-9 w-9 p-0 bg-emerald-600 hover:bg-emerald-500 shrink-0"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
