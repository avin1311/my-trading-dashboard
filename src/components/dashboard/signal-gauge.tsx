'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { StrategySignal, SignalType } from '@/lib/types';

const SIGNAL_SCORE: Record<SignalType, number> = {
  STRONG_BUY: 95,
  BUY: 79,
  HOLD: 55,
  SELL: 30,
  STRONG_SELL: 10,
};

const SIGNAL_LABEL: Record<SignalType, string> = {
  STRONG_BUY: 'Strong Buy',
  BUY: 'Buy',
  HOLD: 'Hold',
  SELL: 'Sell',
  STRONG_SELL: 'Strong Sell',
};

const SIGNAL_SUMMARY: Record<SignalType, string> = {
  STRONG_BUY: 'All indicators aligned bullishly — high confidence entry',
  BUY: 'Most indicators bullish — favorable risk-reward setup',
  HOLD: 'Mixed signals — wait for clearer direction',
  SELL: 'Most indicators bearish — consider reducing exposure',
  STRONG_SELL: 'All indicators aligned bearishly — high risk of decline',
};

function getScoreColor(score: number): string {
  if (score >= 90) return '#059669'; // deep green
  if (score >= 70) return '#22c55e'; // green
  if (score >= 40) return '#f59e0b'; // amber
  if (score >= 20) return '#f97316'; // orange
  return '#ef4444'; // red
}

function getScoreBg(score: number): string {
  if (score >= 90) return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400';
  if (score >= 70) return 'bg-green-500/20 border-green-500/30 text-green-400';
  if (score >= 40) return 'bg-amber-500/20 border-amber-500/30 text-amber-400';
  if (score >= 20) return 'bg-orange-500/20 border-orange-500/30 text-orange-400';
  return 'bg-red-500/20 border-red-500/30 text-red-400';
}

export function SignalGauge({ signal }: { signal: StrategySignal }) {
  const score = SIGNAL_SCORE[signal.signal];
  const angle = (score / 100) * 180; // 0-180 degree arc
  const color = getScoreColor(score);

  // SVG center and radius
  const cx = 100;
  const cy = 100;
  const r = 80;

  // Tick marks
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * 180;
    const rad = ((180 - a) * Math.PI) / 180;
    const isMajor = i % 5 === 0;
    const innerR = isMajor ? r - 14 : r - 8;
    const x1 = cx - innerR * Math.cos(rad);
    const y1 = cy - innerR * Math.sin(rad);
    const x2 = cx - r * Math.cos(rad);
    const y2 = cy - r * Math.sin(rad);

    let tickColor = '#334155';
    if (i <= 2) tickColor = '#ef444480';
    else if (i <= 4) tickColor = '#f9731680';
    else if (i <= 6) tickColor = '#f59e0b80';
    else if (i <= 8) tickColor = '#22c55e80';
    else tickColor = '#05966980';

    ticks.push(
      <line
        key={i}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={tickColor}
        strokeWidth={isMajor ? 2.5 : 1}
        strokeLinecap="round"
      />
    );
  }

  // Needle pointer
  const needleAngle = ((180 - angle) * Math.PI) / 180;
  const needleLen = r - 18;
  const needleX = cx - needleLen * Math.cos(needleAngle);
  const needleY = cy - needleLen * Math.sin(needleAngle);

  // Arc endpoint for background arc
  const bgArcPath = describeArc(cx, cy, r, 0, 180);
  // Score arc
  const scoreArcPath = describeArc(cx, cy, r - 3, 0, angle);

  return (
    <div className="flex flex-col items-center">
      {/* Gauge SVG */}
      <div className="relative w-[200px] h-[120px]">
        <svg viewBox="0 0 200 115" className="w-full h-full">
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="15%" stopColor="#f97316" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="55%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background arc track */}
          <path
            d={bgArcPath}
            fill="none"
            stroke="#1e293b"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Colored arc showing score */}
          <path
            d={scoreArcPath}
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            filter="url(#glow)"
          />

          {/* Tick marks */}
          {ticks}

          {/* Needle */}
          <line
            x1={cx} y1={cy}
            x2={needleX} y2={needleY}
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r="5" fill={color} opacity="0.9" />
          <circle cx={cx} cy={cy} r="2.5" fill="#0f172a" />
        </svg>

        {/* Score text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-3xl font-black font-mono" style={{ color }}>
            {score}
          </span>
          <span className="text-[9px] text-slate-500 -mt-0.5">/ 100</span>
        </div>
      </div>

      {/* Signal label */}
      <div className={cn('mt-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border', getScoreBg(score))}>
        {SIGNAL_LABEL[signal.signal]}
      </div>

      {/* Summary line */}
      <p className="text-[10px] text-slate-500 text-center mt-2 max-w-[200px] leading-relaxed">
        {SIGNAL_SUMMARY[signal.signal]}
      </p>

      {/* Sub-scores */}
      <div className="flex gap-3 mt-3">
        <SubScore label="RSI" value={signal.rsi} good={signal.rsi < 70 && signal.rsi > 30} />
        <SubScore label="ST" value={signal.supertrendDir === 1 ? 1 : 0} good={signal.supertrendDir === 1} isBool />
        <SubScore label="MACD" value={(signal.macd || 0) > (signal.macdSignal || 0) ? 1 : 0} good={(signal.macd || 0) > (signal.macdSignal || 0)} isBool />
      </div>
    </div>
  );
}

function SubScore({ label, value, good, isBool }: { label: string; value: number; good: boolean; isBool?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={cn(
        'w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold font-mono',
        good ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'
      )}>
        {isBool ? (good ? '↑' : '↓') : value.toFixed(0)}
      </div>
      <span className="text-[8px] text-slate-600 font-medium">{label}</span>
    </div>
  );
}

/** Creates an SVG arc path for a semicircle from startAngle to endAngle (in degrees, 0=left, 180=right) */
function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((180 - angleDeg) * Math.PI) / 180;
  return {
    x: cx - r * Math.cos(rad),
    y: cy - r * Math.sin(rad),
  };
}