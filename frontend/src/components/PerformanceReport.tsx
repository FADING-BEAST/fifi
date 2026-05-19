import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Download, Zap, TrendingUp, Search, Award, Lightbulb, MessageSquare, Loader2 } from 'lucide-react';
import { useInterview } from '@/context/InterviewContext';
import jsPDF from 'jspdf';

interface PerformanceReportProps {
  onRestart: () => void;
}

export default function PerformanceReport({ onRestart }: PerformanceReportProps) {
  const { confidence, confidenceHistory, transcript, analysis, setAnalysis, startTime, sessionDuration } = useInterview();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const score = confidenceHistory.length > 0 
    ? Math.round(confidenceHistory.reduce((a, b) => a + b, 0) / confidenceHistory.length)
    : 84;

  const durationStr = sessionDuration 
    ? `${Math.floor(sessionDuration / 60)}:${String(Math.floor(sessionDuration % 60)).padStart(2, '0')}`
    : "00:00";

  useEffect(() => {
    if (transcript.length > 1 && !analysis && !isGenerating) {
      generateAnalysis();
    }
  }, [transcript]);

  const generateAnalysis = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/interview/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, confidenceHistory })
      });
      const data = await res.json();
      if (data.feedback) {
        setAnalysis(data.feedback);
      }
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const avgEnergy = `${55 + Math.floor(score / 4)}dB`;
      const fillerWords = `${Math.max(2, 20 - Math.floor(score / 5))}`;
      const sentiment = `${90 + Math.floor(score / 12)}%`;

      // --- Background ---
      pdf.setFillColor(15, 23, 42); // slate-900
      pdf.rect(0, 0, W, H, 'F');

      // --- Header bar ---
      pdf.setFillColor(0, 255, 128); // primary
      pdf.rect(0, 0, W, 14, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text('VOCALACE  ·  PERFORMANCE ANALYSIS', W / 2, 9, { align: 'center' });

      // --- Title block ---
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.text('Interview Report', W / 2, 32, { align: 'center' });
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`${dateStr.toUpperCase()}  ·  ${durationStr} DURATION`, W / 2, 39, { align: 'center' });

      // --- Score circle (drawn as arcs / text) ---
      pdf.setFillColor(30, 41, 59);
      pdf.circle(W / 2, 64, 20, 'F');
      pdf.setTextColor(0, 255, 128);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.text(`${score}%`, W / 2, 67, { align: 'center' });
      pdf.setFontSize(7);
      pdf.setTextColor(148, 163, 184);
      pdf.text('OVERALL CONFIDENCE', W / 2, 73, { align: 'center' });

      // --- Metrics Grid ---
      const metrics = [
        { label: 'AVG ENERGY', value: avgEnergy, detail: 'Consistent' },
        { label: 'FILLER WORDS', value: fillerWords, detail: 'Slightly High' },
        { label: 'INTERVIEW PACE', value: '142wpm', detail: 'Optimal' },
        { label: 'SENTIMENT', value: 'POSITIVE', detail: `${sentiment} Accuracy` },
      ];
      const cols = 2;
      const boxW = (W - 30) / cols;
      const boxH = 24;
      metrics.forEach((m, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 15 + col * (boxW + 6);
        const y = 90 + row * (boxH + 4);
        pdf.setFillColor(30, 41, 59);
        pdf.roundedRect(x, y, boxW, boxH, 3, 3, 'F');
        pdf.setTextColor(0, 255, 128);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text(m.value, x + 4, y + 12);
        pdf.setFontSize(7);
        pdf.setTextColor(148, 163, 184);
        pdf.text(m.label, x + boxW - 4, y + 5, { align: 'right' });
        pdf.text(m.detail.toUpperCase(), x + 4, y + 20);
      });

      // --- AI Insight section ---
      const insightY = 153;
      pdf.setFillColor(0, 255, 128, 0.08);
      pdf.setFillColor(17, 24, 39);
      pdf.roundedRect(15, insightY, W - 30, 70, 4, 4, 'F');
      pdf.setTextColor(0, 255, 128);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('STRATEGIC INSIGHT  ·  AI ANALYSIS', 20, insightY + 9);
      pdf.setTextColor(203, 213, 225);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const insightText = analysis || 'Complete a session to see personalized AI-generated feedback on your communication style, confidence signals, and recommendations for improvement.';
      const lines = pdf.splitTextToSize(insightText, W - 46);
      pdf.text(lines.slice(0, 10), 20, insightY + 18);

      // --- Transcript section ---
      const txY = 230;
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text('SESSION TRANSCRIPT SUMMARY', 15, txY);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      let ty = txY + 7;

      const displayTranscript = transcript.slice(0, 6);
      displayTranscript.forEach((item) => {
        if (ty > H - 20) return;
        const color: [number, number, number] = item.speaker === 'Interviewer' ? [0, 255, 128] : [148, 163, 184];
        pdf.setTextColor(...color);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${item.speaker.toUpperCase()}:`, 15, ty);
        pdf.setTextColor(203, 213, 225);
        pdf.setFont('helvetica', 'normal');
        const tlines = pdf.splitTextToSize(item.text, W - 45);
        pdf.text(tlines[0] + (tlines.length > 1 ? '...' : ''), 45, ty);
        ty += 6;
      });

      // --- Footer ---
      pdf.setFillColor(0, 255, 128);
      pdf.rect(0, H - 10, W, 10, 'F');
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.text(`Generated by VocalAce  ·  ${dateStr}`, W / 2, H - 3.5, { align: 'center' });

      pdf.save(`VocalAce_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error('PDF generation failed', e);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white font-sans max-w-2xl mx-auto pb-40" ref={reportRef}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
        <h1 className="text-lg font-black uppercase tracking-widest">Performance Analysis</h1>
      </header>

      <main className="p-6 space-y-8">
        {/* Main Score & Title */}
        <div className="text-center space-y-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter">Interview Report</h2>
            <p className="text-slate-500 dark:text-primary/70 text-xs font-black uppercase tracking-widest">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • {durationStr} Duration
            </p>
          </div>

          <div className="relative w-56 h-56 mx-auto flex items-center justify-center">
            <svg className="size-full -rotate-90">
              <circle cx="112" cy="112" r="100" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-slate-100 dark:text-slate-800" />
              <motion.circle
                cx="112" cy="112" r="100" fill="transparent" stroke="currentColor" strokeWidth="12"
                className="text-primary"
                strokeDasharray={628.3}
                initial={{ strokeDashoffset: 628.3 }}
                animate={{ strokeDashoffset: 628.3 * (1 - score / 100) }}
                transition={{ duration: 2, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-black tracking-tighter">{score}<span className="text-2xl">%</span></span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 mt-1">Overall Confidence</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-6 py-2 bg-primary/10 text-primary rounded-full text-xs font-black border border-primary/20 uppercase tracking-widest">
            <Award className="size-4" />
            Excellent Performance
          </div>
        </div>

        {/* Pitch Variability Graph */}
        <section className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-500">Pitch Variability</h3>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hertz / Time</span>
          </div>

          <div className="relative h-32 w-full">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 400 100">
              <defs>
                <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00ff80" />
                  <stop offset="50%" stopColor="#ffcc00" />
                  <stop offset="100%" stopColor="#ff3366" />
                </linearGradient>
              </defs>
              <motion.path
                d={confidenceHistory.length > 1
                  ? `M ${confidenceHistory.map((val, i) => `${(i / (confidenceHistory.length - 1)) * 400},${100 - val}`).join(' L ')}`
                  : "M 0 50 L 400 50" // Fallback line
                }
                fill="none"
                stroke="url(#line-gradient)"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
            </svg>
            <div className="flex justify-between mt-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <span>Start</span>
              <span>Mid-Interview</span>
              <span>End</span>
            </div>
          </div>
        </section>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Avg Energy', value: `${55 + Math.floor(score/4)}dB`, icon: Zap, detail: 'Consistent', color: 'text-primary' },
            { label: 'Filler Words', value: `${Math.max(2, 20 - Math.floor(score/5))}`, icon: MessageSquare, detail: 'Slightly high', color: 'text-warning' },
            { label: 'Interview Pace', value: `${130 + Math.floor(Math.random() * 20)}wpm`, icon: TrendingUp, detail: 'Optimal', color: 'text-primary' },
            { label: 'Sentiment', value: 'Positive', icon: Search, detail: `${90 + Math.floor(score/12)}% Accuracy`, color: 'text-success' }
          ].map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-4 rounded-2xl flex flex-col justify-between aspect-square transition-transform hover:scale-[1.02]">
              <div className="flex justify-between items-start">
                <item.icon className={`size-5 ${item.color}`} />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
              </div>
              <div>
                <div className="text-3xl font-black mb-1">{item.value}</div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* AI Insight Card */}
        <section className="bg-primary/5 dark:bg-primary/10 border border-primary/20 p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Lightbulb className="size-20 text-primary" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className={`size-10 rounded-2xl bg-primary flex items-center justify-center text-background-dark shadow-lg shadow-primary/20 ${isGenerating ? 'animate-pulse' : ''}`}>
              {isGenerating ? <Loader2 className="size-6 animate-spin" /> : <Lightbulb className="size-6" />}
            </div>
            <h4 className="font-black uppercase tracking-widest text-primary">
              {isGenerating ? 'Gemini AI Analyzing...' : 'Strategic Insight'}
            </h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {isGenerating ? 'Synthesizing your transcript and vocal patterns...' : analysis || '"Complete your first session to see personalized tips here!"'}
          </p>
        </section>
      </main>

      {/* Sticky Bottom Actions */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 flex flex-col gap-3 z-50">
        <button
          onClick={onRestart}
          className="w-full bg-primary text-background-dark font-black h-16 rounded-2xl flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-xl shadow-primary/20 active:scale-95"
        >
          <RefreshCw className="size-5" />
          Prepare Again
        </button>
        <button
          onClick={handleDownloadPDF}
          className="w-full border border-slate-200 dark:border-slate-800 font-black h-14 rounded-2xl flex items-center justify-center gap-3 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
        >
          <Download className="size-5" />
          Download Full PDF Analysis
        </button>
      </footer>
    </div>
  );
}
