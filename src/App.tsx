import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Loader2, RotateCcw, CheckCircle2 } from 'lucide-react'

// ─── 配置 ───────────────────────────────────────────────────────────────────

//  Railway 部署后替换为你的后端地址，或设置环境变量 VITE_API_URL
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// 蓝色主题
const THEME = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#3b82f6',
  primaryGlow: 'rgba(37, 99, 235, 0.35)',
  accent: '#06b6d4',       // 青色点缀
  text: '#f0f4ff',
  textSecondary: 'rgba(240, 244, 255, 0.55)',
  glassBg: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.08)',
  gradient: 'linear-gradient(135deg, #2563eb, #06b6d4)',
  gradientHover: 'linear-gradient(135deg, #1d4ed8, #0891b2)',
}

// ─── 数据 ───────────────────────────────────────────────────────────────────

const QUESTIONS = [
  { id: 'notice', type: 'notice', section: 'Notice / 须知', icon: '📋',
    question: 'Welcome / 欢迎参与调研',
    noticeText: '本调研旨在了解编程学习与生成式 AI 的使用情况，大约需要 3–5 分钟。所有问题均匿名处理，数据仅用于学术研究。请根据你的真实情况作答。\n\nThis survey takes ~3–5 minutes. All responses are anonymous and used solely for academic research. Please answer based on your actual experience.',
  },
  { id: 'gender', type: 'single-choice', section: 'Background / 学业背景', icon: '👤',
    question: 'What is your gender? / 你的性别是？',
    subtext: 'This helps us understand demographic differences in AI learning patterns',
    options: [
      { label: 'M', value: 'M', text: 'Male / 男', sub: '' },
      { label: 'F', value: 'F', text: 'Female / 女', sub: '' },
      { label: 'O', value: 'O', text: 'Other / 其他', sub: '' },
      { label: 'P', value: 'P', text: 'Prefer not to say / 不方便透露', sub: '' },
  ]},
  { id: 'age', type: 'single-choice', section: 'Background / 学业背景', icon: '🎂',
    question: 'What is your age range? / 你的年龄区间是？',
    subtext: '',
    options: [
      { label: '1', value: '18-22', text: '18 – 22', sub: 'Undergraduate / 本科在读' },
      { label: '2', value: '23-26', text: '23 – 26', sub: 'Graduate / 硕士在读' },
      { label: '3', value: '27-30', text: '27 – 30', sub: 'Early career / 职场新人' },
      { label: '4', value: '30+', text: '30+', sub: '30 岁以上' },
  ]},
  { id: 'gpa', type: 'single-choice', section: 'Background / 学业背景', icon: '🎓',
    question: 'What is your GPA range? / 你的 GPA 区间是？',
    subtext: 'Select your overall GPA for the most recent academic year',
    options: [
      { label: 'A', value: 'A', text: '3.5 – 4.0', sub: 'Excellent / 优秀' },
      { label: 'B', value: 'B', text: '3.0 – 3.49', sub: 'Good / 良好' },
      { label: 'C', value: 'C', text: '2.5 – 2.99', sub: 'Average / 中等' },
      { label: 'D', value: 'D', text: 'Below 2.5', sub: '2.5 以下' },
  ]},
  { id: 'programming_grade', type: 'single-choice', section: 'Background / 学业背景', icon: '💻',
    question: 'What is your average grade in programming courses? / 编程课平均成绩等级是？',
    subtext: 'If you\'re not sure, select the range that best describes your performance',
    options: [
      { label: 'A', value: 'A', text: 'A / 90-100', sub: 'Excellent / 优秀' },
      { label: 'A-', value: 'A-', text: 'A- / 85-89', sub: 'Very Good / 良好偏上' },
      { label: 'B+', value: 'B+', text: 'B+ / 80-84', sub: 'Good / 良好' },
      { label: 'B', value: 'B', text: 'B / 75-79', sub: 'Above Average / 中上' },
      { label: 'B-', value: 'B-', text: 'B- / 70-74', sub: 'Average / 中等' },
      { label: 'C', value: 'C', text: 'C or below / C 或以下', sub: '' },
  ]},
  { id: 'ai_ratio', type: 'single-choice', section: 'Background / 学业背景', icon: '🤖',
    question: 'What proportion of your code is AI-generated? / AI 生成代码占总代码的比例？',
    subtext: 'AI = ChatGPT / Copilot / Tongyi / etc.',
    options: [
      { label: 'A', value: 'A', text: '0 – 25%', sub: 'Minimal / 极少' },
      { label: 'B', value: 'B', text: '26 – 50%', sub: 'Partial / 部分辅助' },
      { label: 'C', value: 'C', text: '51 – 75%', sub: 'Majority / 超过半数' },
      { label: 'D', value: 'D', text: '76 – 100%', sub: 'Heavy reliance / 高度依赖' },
  ]},
  { id: 'rq1_autonomy', type: 'likert', section: 'RQ1 · Agency & Autonomy', icon: '🧭',
    question: 'I usually have a clear logical plan first, then let AI handle implementation details — not the other way around.\n\n我通常先有明确的逻辑思路，再让 AI 辅助实现细节，而非让 AI 决定解题方案。',
    dimension: 'Autonomy / 自主性' },
  { id: 'rq1_independence', type: 'likert', section: 'RQ1 · Agency & Autonomy', icon: '⚡',
    question: 'If I had to take an exam without internet access (no AI), I am confident I could complete tasks equivalent to my assignments.\n\n断网（无 AI）环境下，我有信心独立完成与作业难度相当的编程任务。',
    dimension: 'Independence / 独立性' },
  { id: 'rq1_competence', type: 'likert', section: 'RQ1 · Agency & Autonomy', icon: '💪',
    question: 'After using AI assistance, my confidence in solving complex programming problems has substantially improved.\n\n使用 AI 辅助后，我解决复杂编程问题的自信心得到了实质性提升。',
    dimension: 'Competence / 胜任感' },
  { id: 'rq1_belonging', type: 'likert', section: 'RQ1 · Agency & Autonomy', icon: '🏠',
    question: 'Even when using AI, I believe the core logic and final work belong to me — not the AI.\n\n即使使用了 AI，我依然认为程序的核心逻辑和最终成果属于我个人，而非 AI。',
    dimension: 'Ownership / 归属感' },
  { id: 'rq2_review', type: 'likert', section: 'RQ2 · Logic & Error Detection', icon: '🔍',
    question: 'Before running AI-generated code, I read through it line by line to check loops, branches, and logic structures.\n\n运行 AI 代码前，我会逐行阅读并检查循环、分支等逻辑结构。',
    dimension: 'Code Review / 逻辑审查' },
  { id: 'rq2_detection', type: 'likert', section: 'RQ2 · Logic & Error Detection', icon: '🐛',
    question: 'When AI code contains logical bugs (not runtime errors), I can quickly spot them by reading the code.\n\n当 AI 代码存在逻辑漏洞（而非运行报错）时，我能通过阅读代码迅速察觉。',
    dimension: 'Bug Detection / 错误察觉' },
  { id: 'rq2_debug', type: 'likert', section: 'RQ2 · Logic & Error Detection', icon: '🔧',
    question: 'When facing a bug, I prefer to manually fix it based on my own logic rather than throwing the error back at the AI.\n\n面对 Bug，我倾向于根据自己的逻辑判断手动修改，而非直接丢回给 AI 重写。',
    dimension: 'Debugging / 调试模式' },
  { id: 'rq2_understanding', type: 'likert', section: 'RQ2 · Logic & Error Detection', icon: '🧠',
    question: 'I can accurately explain what each line of AI-generated code does in the overall program logic.\n\n我能准确解释 AI 生成的每一行代码在程序整体逻辑中的作用。',
    dimension: 'Deep Understanding / 深度理解' },
  { id: 'rq3_depth', type: 'likert', section: 'RQ3 · Usage Pattern & Retention', icon: '📖',
    question: 'I often ask AI to explain specific algorithm principles or function usage — not just request code.\n\n我会经常要求 AI 解释特定的算法原理或函数用法，而不仅仅是索要代码。',
    dimension: 'Interaction Depth / 交互深度' },
  { id: 'rq3_mastery', type: 'likert', section: 'RQ3 · Usage Pattern & Retention', icon: '📚',
    question: 'One week after completing an assignment, I can still clearly explain the core programming concepts involved.\n\n完成作业一周后，我依然能清晰向他人复述该作业涉及的核心编程概念。',
    dimension: 'Concept Retention / 概念掌握' },
  { id: 'rq3_reproduce', type: 'likert', section: 'RQ3 · Usage Pattern & Retention', icon: '🔄',
    question: 'Without referencing AI chat history, I can independently reproduce the core logic of previously AI-assisted work.\n\n不参考 AI 历史记录的情况下，我可以独立复现之前通过 AI 辅助完成的核心逻辑。',
    dimension: 'Reproduction / 复现能力' },
  { id: 'rq3_evaluate', type: 'likert', section: 'RQ3 · Usage Pattern & Retention', icon: '⚖️',
    question: 'I actively compare AI solutions against textbook / lecture "best practices" to check for deviations.\n\n我会主动对比 AI 给出的方案与课本/讲义中的"最佳实践"是否有偏差。',
    dimension: 'Critical Evaluation / 批判评估' },
]

const LIKERT_COLORS = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#2563eb']
const LIKERT_ICONS = ['😟', '🤔', '😐', '🙂', '🤩']
const LIKERT_LABELS = ['', 'Never / 从不', 'Rarely / 偶尔', 'Sometimes / 有时', 'Often / 经常', 'Always / 总是']

// ─── 鼠标拖尾粒子 ──────────────────────────────────────────────────────
function MouseSparkle() {
  const [sparks, setSparks] = useState<{ x: number; y: number; id: number }[]>([])
  const trailRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (trailRef.current) {
        const dx = e.clientX - trailRef.current.x
        const dy = e.clientY - trailRef.current.y
        if (Math.hypot(dx, dy) > 20) {
          setSparks((s) => [...s.slice(-18), { x: e.clientX, y: e.clientY, id: Date.now() + Math.random() }])
          trailRef.current = { x: e.clientX, y: e.clientY }
        }
      } else {
        trailRef.current = { x: e.clientX, y: e.clientY }
      }
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  return (
    <>
      {sparks.map((s) => (
        <motion.div
          key={s.id}
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            position: 'fixed', left: s.x, top: s.y, zIndex: 9999,
            width: 6, height: 6, borderRadius: '50%',
            background: ['#2563eb', '#06b6d4', '#f59e0b', '#a855f7', '#22c55e'][Math.floor(Math.random() * 5)],
            pointerEvents: 'none', marginLeft: -3, marginTop: -3,
            boxShadow: '0 0 8px currentColor',
          }}
        />
      ))}
    </>
  )
}

// ─── 背景光球 ──────────────────────────────────────────────────────────────
function AmbientOrbs() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <motion.div
        animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)', top: '-20%', right: '-15%' }}
      />
      <motion.div
        animate={{ x: [0, -50, 0], y: [0, 50, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)', bottom: '-10%', left: '-10%' }}
      />
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)', top: '40%', left: '55%' }}
      />
      <motion.div
        animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)', bottom: '30%', right: '10%' }}
      />
    </div>
  )
}

// ─── 圆形进度环 ──────────────────────────────────────────────────────────
function CircularProgress({ pct }: { pct: number }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const fill = (pct / 100) * circ
  return (
    <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
      <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <motion.circle
          cx="30" cy="30" r={r} fill="none"
          stroke="url(#progressGrad)" strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={circ}
          animate={{ strokeDashoffset: circ - fill }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          style={{ filter: 'drop-shadow(0 0 6px rgba(37,99,235,0.6))' }}
        />
        <defs>
          <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: '800', color: 'rgba(240,244,255,0.8)',
      }}>
        {Math.round(pct)}%
      </div>
    </div>
  )
}

// ─── Milestone 消息 ───────────────────────────────────────────────────────
const MILESTONES = [
  { pct: 20, emoji: '🎯', text: 'Good start!', sub: '不错的开始!' },
  { pct: 40, emoji: '🔥', text: 'Keep going!', sub: '继续加油!' },
  { pct: 60, emoji: '⚡', text: 'Halfway!', sub: '过了一半!' },
  { pct: 80, emoji: '🚀', text: 'Almost there!', sub: '快完成了!' },
  { pct: 100, emoji: '🎉', text: 'You made it!', sub: '完成!' },
]

// ─── 彩色纸屑 ──────────────────────────────────────────────────────────────
function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 80 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 1.2,
    duration: 1.5 + Math.random() * 1.5,
    color: ['#2563eb', '#06b6d4', '#f59e0b', '#ef4444', '#22c55e', '#a855f7', '#f43f5e'][i % 7],
    size: 5 + Math.random() * 10,
    drift: (Math.random() - 0.5) * 250,
    shape: i % 3,
  })), [])
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -30, x: `${p.x}vw`, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            y: '105vh',
            x: `${p.x + p.drift}vw`,
            opacity: [1, 1, 0],
            rotate: (Math.random() - 0.5) * 1080,
            scale: [1, 1.2, 0.8],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: p.size, height: p.size,
            background: p.color,
            borderRadius: p.shape === 0 ? '50%' : p.shape === 1 ? '2px' : '4px',
            boxShadow: `0 0 ${p.size}px ${p.color}88`,
          }}
        />
      ))}
    </div>
  )
}

// ─── 里程碑气泡 ─────────────────────────────────────────────────────────────
function MilestoneBubble({ pct }: { pct: number }) {
  const m = MILESTONES.find(m => m.pct === pct)
  if (!m) return null
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0, y: -30 }}
      transition={{ type: 'spring', stiffness: 280, damping: 18 }}
      style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 9998, textAlign: 'center',
        background: 'rgba(10,10,20,0.95)',
        border: '1px solid rgba(37,99,235,0.4)',
        borderRadius: '28px', padding: '28px 40px',
        boxShadow: '0 0 80px rgba(37,99,235,0.4), 0 30px 80px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(30px)',
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 0.6, delay: 0.1 }}
        style={{ fontSize: '56px', marginBottom: '12px' }}
      >
        {m.emoji}
      </motion.div>
      <p style={{ fontSize: '20px', fontWeight: '900', color: '#fff', marginBottom: '4px' }}>{m.text}</p>
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>{m.sub}</p>
      <p style={{ fontSize: '11px', color: 'rgba(37,99,235,0.7)', marginTop: '10px', letterSpacing: '0.1em' }}>{pct}% ✓</p>
    </motion.div>
  )
}

// ─── 工具函数 ───────────────────────────────────────────────────────────────

function getSectionIdx(q: (typeof QUESTIONS)[0]) {
  if (['gpa', 'programming_grade', 'ai_ratio'].includes(q.id)) return 0
  if (q.id.startsWith('rq1')) return 1
  if (q.id.startsWith('rq2')) return 2
  return 3
}

// ─── 按钮 ───────────────────────────────────────────────────────────────────

function NavButton({ onClick, disabled, children, isPrimary, pulseEnabled }: {
  onClick?: () => void; disabled?: boolean; children: React.ReactNode; isPrimary?: boolean; pulseEnabled?: boolean
}) {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    const rect = e.currentTarget.getBoundingClientRect()
    setRipples((r) => [...r, { x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() }])
    setTimeout(() => setRipples((r) => r.slice(1)), 600)
    onClick?.()
  }

  return (
    <button onClick={handleClick} disabled={disabled}
      style={{
        position: 'relative',
        opacity: disabled ? (isPrimary ? 0.35 : 0.2) : 1,
        cursor: disabled ? 'default' : 'pointer',
        padding: isPrimary ? '14px 28px' : '12px 18px',
        borderRadius: '16px',
        border: isPrimary ? 'none' : '1px solid rgba(255,255,255,0.08)',
        background: isPrimary ? THEME.gradient : 'rgba(255,255,255,0.03)',
        color: isPrimary ? '#fff' : 'rgba(240,244,255,0.6)',
        fontSize: isPrimary ? 'clamp(14px, 1.5vw, 17px)' : 'clamp(13px, 1.3vw, 15px)', fontWeight: '700',
        display: 'flex', alignItems: 'center', gap: '6px',
        boxShadow: isPrimary && !disabled ? `0 8px 32px ${THEME.primaryGlow}` : 'none',
        backdropFilter: 'blur(12px)',
        touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none',
        animation: pulseEnabled && !disabled && isPrimary ? 'pulse-blue 1.8s ease-in-out infinite' : 'none',
        transition: 'background 0.25s, box-shadow 0.25s',
      }}
    >
      {ripples.map((rp) => (
        <span key={rp.id} style={{
          position: 'absolute', borderRadius: '50%', width: 10, height: 10,
          background: 'rgba(255,255,255,0.25)', left: rp.x - 5, top: rp.y - 5,
          pointerEvents: 'none', animation: 'ripple-out 0.6s ease-out forwards',
        }} />
      ))}
      {children}
    </button>
  )
}

// ─── 单选卡片 ───────────────────────────────────────────────────────────────

function OptionCard({ option, selected, onSelect, index }: {
  option: { label: string; value: string; text: string; sub: string }
  selected: boolean; onSelect: () => void; index: number
}) {
  return (
    <motion.button
      key={option.value + String(selected)}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 320, damping: 28 }}
      onClick={onSelect}
      style={{
        width: '100%', minHeight: 'clamp(60px, 8vw, 72px)', display: 'flex', alignItems: 'center', gap: 'clamp(12px, 2vw, 18px)',
        padding: '16px 18px', borderRadius: '18px',
        border: `1.5px solid ${selected ? `${THEME.primary}88` : 'rgba(255,255,255,0.07)'}`,
        background: selected ? `linear-gradient(135deg, rgba(37,99,235,0.18), rgba(6,182,212,0.06))` : 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(16px)', cursor: 'pointer', textAlign: 'left',
        boxShadow: selected ? `0 0 30px ${THEME.primaryGlow}` : '0 4px 24px rgba(0,0,0,0.2)',
        touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none',
        transition: 'border-color 0.25s, background 0.25s, box-shadow 0.25s',
      }}
    >
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
        background: selected ? THEME.gradient : 'rgba(255,255,255,0.05)',
        border: selected ? 'none' : '1px solid rgba(255,255,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: '800', fontSize: '14px', color: selected ? '#fff' : 'rgba(255,255,255,0.45)',
        transition: 'all 0.25s',
      }}>
        {selected ? '✓' : option.label}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'clamp(14px, 1.8vw, 17px)', fontWeight: '600', color: selected ? '#f0f4ff' : 'rgba(240,244,255,0.75)' }}>
          {option.text}
        </div>
        {option.sub && (
          <div style={{ fontSize: '12px', color: selected ? THEME.accent : 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
            {option.sub}
          </div>
        )}
      </div>
    </motion.button>
  )
}

// ─── 五档评分 ───────────────────────────────────────────────────────────────

function LikertScale({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  const [bounce, setBounce] = useState<number | null>(null)

  const handleSelect = (n: number) => {
    onChange(n)
    setBounce(n)
    setTimeout(() => setBounce(null), 350)
  }

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const isSelected = value === n
        const isActive = (value ?? 0) >= n
        const isBouncing = bounce === n
        const color = LIKERT_COLORS[n - 1]

        return (
          <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <motion.div
              animate={{ y: isSelected ? -8 : 0, scale: isSelected ? 1.25 : 1 }}
              transition={{ type: 'spring', stiffness: 450, damping: 18 }}
              style={{ fontSize: '20px', height: '26px', display: 'flex', alignItems: 'center', lineHeight: 1 }}
            >
              {LIKERT_ICONS[n - 1]}
            </motion.div>

            <button
              onClick={() => handleSelect(n)}
              style={{
                width: 'clamp(56px, 8vw, 72px)', height: 'clamp(56px, 8vw, 72px)', borderRadius: '16px', border: '1.5px solid',
                borderColor: isActive ? `${color}88` : 'rgba(255,255,255,0.1)',
                background: isActive ? `linear-gradient(135deg, ${color}dd, ${color}88)` : 'rgba(255,255,255,0.04)',
                boxShadow: isSelected ? `0 0 36px ${color}55, 0 0 16px ${color}33` : isActive ? `0 0 14px ${color}33` : '0 4px 20px rgba(0,0,0,0.3)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none',
                transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
                animation: isBouncing ? 'btn-bounce 0.35s ease' : 'none',
              }}
            >
              <span style={{ fontSize: '20px', fontWeight: '800', color: isActive ? '#ffffff' : 'rgba(255,255,255,0.28)', lineHeight: 1 }}>
                {n}
              </span>
            </button>

            <span style={{ fontSize: '9px', color: isActive ? color : 'rgba(255,255,255,0.28)', textAlign: 'center', maxWidth: '64px', lineHeight: 1.3 }}>
              {LIKERT_LABELS[n]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── 文本输入 ───────────────────────────────────────────────────────────────

function TextInputQuestion({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { const t = setTimeout(() => ref.current?.focus(), 600); return () => clearTimeout(t) }, [])

  return (
    <div style={{ width: '100%', maxWidth: '260px' }}>
      <input ref={ref} type="number" inputMode="numeric" pattern="[0-9]*" min="0" max="100"
        value={value} onChange={(e) => onChange(e.target.value)} placeholder="0–100"
        style={{
          width: '100%', padding: '20px 24px', fontSize: '32px', fontWeight: '800',
          textAlign: 'center', background: 'rgba(37,99,235,0.07)',
          border: `1.5px solid ${THEME.primary}44`, borderRadius: '20px',
          color: '#f0f4ff', outline: 'none', userSelect: 'text',
          boxShadow: `0 0 20px ${THEME.primary}18`,
          transition: 'border-color 0.25s, box-shadow 0.25s',
          touchAction: 'manipulation', WebkitAppearance: 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = `${THEME.primary}99`
          e.currentTarget.style.boxShadow = `0 0 40px ${THEME.primary}38`
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = `${THEME.primary}44`
          e.currentTarget.style.boxShadow = `0 0 20px ${THEME.primary}18`
        }}
      />
      <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', color: 'rgba(240,244,255,0.3)' }}>
        Out of 100 / 满分 100
      </p>
    </div>
  )
}

// ─── 简化结果页 ─────────────────────────────────────────────────────────────

function ThankYouScreen({ onReset }: {
  onReset: () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#050508',
      padding: '32px 24px', overflow: 'hidden',
    }}>
      {/* 背景 */}
      <AmbientOrbs />

      {/* 成功图标 */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        style={{
          width: '96px', height: '96px', borderRadius: '50%',
          background: THEME.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 60px ${THEME.primaryGlow}, 0 0 120px ${THEME.primaryGlow}`,
          marginBottom: '32px',
        }}
      >
        <CheckCircle2 size={48} color="#fff" strokeWidth={1.5} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{ fontSize: '28px', fontWeight: '900', color: '#f0f4ff', textAlign: 'center', marginBottom: '8px' }}
      >
        感谢你的参与
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        style={{ fontSize: '16px', color: 'rgba(240,244,255,0.5)', textAlign: 'center', marginBottom: '48px' }}
      >
        Thank you for your time!
      </motion.p>

      <p style={{ fontSize: '13px', color: 'rgba(240,244,255,0.25)', textAlign: 'center', marginBottom: '40px', lineHeight: 1.8 }}>
        数据已匿名采集，仅用于学术研究<br />
        Data is collected anonymously · Academic research only
      </p>

      {/* 重填按钮 */}
      <NavButton onClick={onReset}>
        <RotateCcw size={15} />重新填写 / Start Over
      </NavButton>
    </div>
  )
}

// ─── 主应用 ─────────────────────────────────────────────────────────────────

export default function App() {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [direction, setDirection] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [milestone, setMilestone] = useState<number | null>(null)
  const touchStartX = useRef(0)
  const isScrolling = useRef(false)
  const lastMilestone = useRef<number>(0)

  const q = QUESTIONS[current]
  const progress = (current / (QUESTIONS.length - 1)) * 100
  const sectionIdx = getSectionIdx(q)

  const goNext = useCallback(() => {
    if (!isAnswered) return  // 防止跳过必答题
    if (current < QUESTIONS.length - 1) {
      setDirection(1)
      const nextProgress = ((current + 1) / (QUESTIONS.length - 1)) * 100
      // 检测里程碑
      const crossed = MILESTONES.find(m => m.pct <= nextProgress && m.pct > lastMilestone.current)
      if (crossed) {
        lastMilestone.current = crossed.pct
        setMilestone(crossed.pct)
        setTimeout(() => setMilestone(null), 2000)
      }
      setCurrent((c) => c + 1)
    } else {
      handleSubmit()
    }
  }, [current])

  const goPrev = useCallback(() => {
    if (current > 0) { setDirection(-1); setCurrent((c) => c - 1) }
  }, [current])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setShowConfetti(true)
    try {
      await fetch(`${API_BASE}/api/survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      setShowThankYou(true)
    } catch (err) {
      console.error('Submit failed:', err)
      // 网络错误时仍显示结果
      setShowThankYou(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setAnswers({}); setCurrent(0); setShowThankYou(false); setDirection(1)
  }

  const isAnswered = (() => {
    if (q.type === 'notice') return true
    if (q.type === 'likert' || q.type === 'single-choice') return answers[q.id] !== undefined
    if (q.type === 'text-input') return !!answers[q.id] && String(answers[q.id]).trim() !== ''
    return false
  })()

  // 键盘
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showThankYou || isSubmitting) return
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev, showThankYou, isSubmitting])

  // 触控滑动
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; isScrolling.current = false }
  const handleTouchMove = () => { isScrolling.current = true }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isScrolling.current) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta < -60) goNext()
    if (delta > 60) goPrev()
  }

  const variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir * 50 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir * -50 }),
  }

  if (showThankYou) {
    return <ThankYouScreen onReset={handleReset} />
  }

  const selectedScore = Number(answers[q.id]) || 0
  const sections = ['Background / 背景', 'RQ1 · Agency', 'RQ2 · Logic', 'RQ3 · Retention']

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#050508', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}
    >
      {/* 背景 */}
      <AmbientOrbs />
      <MouseSparkle />
      <div className="bg-grid" style={{ position: 'fixed', inset: 0, zIndex: 0 }} />

      {/* 彩屑 */}
      <AnimatePresence>
        {showConfetti && <Confetti />}
      </AnimatePresence>

      {/* 里程碑气泡 */}
      <AnimatePresence>
        {milestone !== null && <MilestoneBubble pct={milestone} />}
      </AnimatePresence>

      {/* 顶部进度 */}
      <div style={{ position: 'relative', zIndex: 10, padding: '20px 24px 0', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* 圆形进度环 */}
          <CircularProgress pct={progress} />

          {/* 进度文字 */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <span style={{ fontSize: 'clamp(14px, 2vw, 18px)', fontWeight: '800', color: '#f0f4ff' }}>
                Question {current + 1}
              </span>
              <span style={{ fontSize: '13px', color: 'rgba(240,244,255,0.4)' }}>
                of {QUESTIONS.length}
              </span>
            </div>
            {/* 细进度条 */}
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
              <motion.div animate={{ width: `${progress}%` }} transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                style={{ height: '100%', background: THEME.gradient, borderRadius: '99px' }} />
            </div>
          </div>
        </div>

        {/* 区块进度 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          {sections.map((_, i) => (
            <motion.div key={i}
              animate={{ width: sectionIdx === i ? 32 : 8, background: sectionIdx >= i ? THEME.primary : 'rgba(255,255,255,0.1)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ height: '5px', borderRadius: '99px' }}
            />
          ))}
        </div>
      </div>

      {/* 区块标签 */}
      <motion.div key={`sec-${current}`} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
        style={{
          position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '8px', margin: '16px auto 0', padding: '6px 16px', borderRadius: '99px', fontSize: 'clamp(11px, 1.2vw, 13px)', fontWeight: '600',
          letterSpacing: '0.04em', color: THEME.accent, background: `${THEME.primary}14`,
          border: `1px solid ${THEME.primary}33`, backdropFilter: 'blur(8px)', width: 'fit-content',
        }}>
        <span>{q.icon}</span>
        <span>{q.section}</span>
      </motion.div>

      {/* 问题区 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', zIndex: 5 }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: '100%', maxWidth: '560px' }}
          >
            <motion.h2
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.35 }}
              style={{ fontSize: 'clamp(16px, 2.5vw, 26px)', fontWeight: '800', lineHeight: 1.6, color: '#f0f4ff', textAlign: 'center', marginBottom: '10px' }}>
              {q.question.split('\n').map((line, i) => (
                <span key={i} style={{ display: i === 0 ? 'block' : 'block', fontSize: i === 0 ? 'inherit' : 'clamp(13px, 3.5vw, 17px)', color: i === 0 ? '#f0f4ff' : 'rgba(240,244,255,0.6)', fontWeight: i === 0 ? '800' : '600' }}>
                  {line}
                </span>
              ))}
            </motion.h2>

            {q.subtext && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                style={{ fontSize: 'clamp(12px, 1.5vw, 15px)', color: 'rgba(240,244,255,0.4)', textAlign: 'center', marginBottom: '24px', lineHeight: 1.7 }}>
                {q.subtext}
              </motion.p>
            )}

            {q.type === 'notice' && q.noticeText && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{
                  background: 'rgba(37,99,235,0.08)',
                  border: '1px solid rgba(37,99,235,0.25)',
                  borderRadius: '20px',
                  padding: '20px 24px',
                  marginTop: '8px',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {(q.noticeText as string).split('\n').map((line, i) => (
                  <p key={i} style={{
                    fontSize: '14px',
                    lineHeight: 1.8,
                    color: i === 0 ? 'rgba(240,244,255,0.7)' : 'rgba(240,244,255,0.5)',
                    marginBottom: i === 0 ? '12px' : '0',
                    textAlign: 'center',
                  }}>
                    {line}
                  </p>
                ))}
              </motion.div>
            )}

            {q.type === 'single-choice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {q.options?.map((opt, i) => (
                  <OptionCard key={opt.value} option={opt} selected={answers[q.id] === opt.value}
                    onSelect={() => setAnswers((a) => ({ ...a, [q.id]: opt.value }))} index={i} />
                ))}
              </div>
            )}

            {q.type === 'text-input' && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <TextInputQuestion value={(answers[q.id] as string) || ''} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
              </div>
            )}

            {q.type === 'likert' && (
              <div>
                <LikertScale value={(answers[q.id] as number) ?? null} onChange={(n) => setAnswers((a) => ({ ...a, [q.id]: n }))} />
                <AnimatePresence>
                  {answers[q.id] !== undefined && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ textAlign: 'center', marginTop: '16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 16px', borderRadius: '99px', fontSize: '13px',
                        background: `linear-gradient(135deg, ${LIKERT_COLORS[selectedScore - 1]}33, ${LIKERT_COLORS[selectedScore - 1]}11)`,
                        border: `1px solid ${LIKERT_COLORS[selectedScore - 1]}44`,
                        color: LIKERT_COLORS[selectedScore - 1],
                      }}>
                        {LIKERT_ICONS[selectedScore - 1]} {LIKERT_LABELS[selectedScore]} · {selectedScore}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 底部导航 */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 36px', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
        <NavButton onClick={goPrev} disabled={current === 0}>
          <ChevronLeft size={18} /><span>Back</span>
        </NavButton>

        <NavButton onClick={goNext} disabled={!isAnswered} isPrimary pulseEnabled={isAnswered && !isSubmitting}>
          {isSubmitting ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Loader2 size={18} />
            </motion.div>
          ) : (
            <>{current === QUESTIONS.length - 1 ? 'Submit' : 'Next'}<ChevronRight size={18} /></>
          )}
        </NavButton>
      </div>

      <div style={{ position: 'absolute', bottom: '6px', left: 0, right: 0, textAlign: 'center', fontSize: '11px', color: 'rgba(240,244,255,0.18)', zIndex: 1, pointerEvents: 'none' }}>
        Swipe to navigate · Enter to continue
      </div>
    </div>
  )
}
