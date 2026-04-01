import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Loader2, RotateCcw, CheckCircle2 } from 'lucide-react'

// ─── 配置 ───────────────────────────────────────────────────────────────────

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
  { id: 'gpa', type: 'single-choice', section: 'Background / 学业背景', icon: '🎓',
    question: 'What is your GPA range? / 你的 GPA 区间是？',
    subtext: 'Select your overall GPA for the most recent academic year',
    options: [
      { label: 'A', value: 'A', text: '3.5 – 4.0', sub: 'Excellent / 优秀' },
      { label: 'B', value: 'B', text: '3.0 – 3.49', sub: 'Good / 良好' },
      { label: 'C', value: 'C', text: '2.5 – 2.99', sub: 'Average / 中等' },
      { label: 'D', value: 'D', text: 'Below 2.5', sub: '2.5 以下' },
  ]},
  { id: 'programming_grade', type: 'text-input', section: 'Background / 学业背景', icon: '💻',
    question: 'Average grade in programming courses? / 编程课平均成绩？',
    subtext: 'Enter a number from 0 to 100', placeholder: '0–100' },
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
    question: 'I usually have a clear logical plan first, then let AI handle implementation details — not the other way around.',
    dimension: 'Autonomy / 自主性' },
  { id: 'rq1_independence', type: 'likert', section: 'RQ1 · Agency & Autonomy', icon: '⚡',
    question: 'If I had to take an exam without internet access (no AI), I am confident I could complete tasks equivalent to my assignments.',
    dimension: 'Independence / 独立性' },
  { id: 'rq1_competence', type: 'likert', section: 'RQ1 · Agency & Autonomy', icon: '💪',
    question: 'After using AI assistance, my confidence in solving complex programming problems has substantially improved.',
    dimension: 'Competence / 胜任感' },
  { id: 'rq1_belonging', type: 'likert', section: 'RQ1 · Agency & Autonomy', icon: '🏠',
    question: 'Even when using AI, I believe the core logic and final work belong to me — not the AI.',
    dimension: 'Ownership / 归属感' },
  { id: 'rq2_review', type: 'likert', section: 'RQ2 · Logic & Error Detection', icon: '🔍',
    question: 'Before running AI-generated code, I read through it line by line to check loops, branches, and logic structures.',
    dimension: 'Code Review / 逻辑审查' },
  { id: 'rq2_detection', type: 'likert', section: 'RQ2 · Logic & Error Detection', icon: '🐛',
    question: 'When AI code contains logical bugs (not runtime errors), I can quickly spot them by reading the code.',
    dimension: 'Bug Detection / 错误察觉' },
  { id: 'rq2_debug', type: 'likert', section: 'RQ2 · Logic & Error Detection', icon: '🔧',
    question: 'When facing a bug, I prefer to manually fix it based on my own logic rather than throwing the error back at the AI.',
    dimension: 'Debugging / 调试模式' },
  { id: 'rq2_understanding', type: 'likert', section: 'RQ2 · Logic & Error Detection', icon: '🧠',
    question: 'I can accurately explain what each line of AI-generated code does in the overall program logic.',
    dimension: 'Deep Understanding / 深度理解' },
  { id: 'rq3_depth', type: 'likert', section: 'RQ3 · Usage Pattern & Retention', icon: '📖',
    question: 'I often ask AI to explain specific algorithm principles or function usage — not just request code.',
    dimension: 'Interaction Depth / 交互深度' },
  { id: 'rq3_mastery', type: 'likert', section: 'RQ3 · Usage Pattern & Retention', icon: '📚',
    question: 'One week after completing an assignment, I can still clearly explain the core programming concepts involved.',
    dimension: 'Concept Retention / 概念掌握' },
  { id: 'rq3_reproduce', type: 'likert', section: 'RQ3 · Usage Pattern & Retention', icon: '🔄',
    question: 'Without referencing AI chat history, I can independently reproduce the core logic of previously AI-assisted work.',
    dimension: 'Reproduction / 复现能力' },
  { id: 'rq3_evaluate', type: 'likert', section: 'RQ3 · Usage Pattern & Retention', icon: '⚖️',
    question: 'I actively compare AI solutions against textbook / lecture "best practices" to check for deviations.',
    dimension: 'Critical Evaluation / 批判评估' },
]

const LIKERT_COLORS = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#2563eb']
const LIKERT_ICONS = ['😟', '🤔', '😐', '🙂', '🤩']
const LIKERT_LABELS = ['', 'Never / 从不', 'Rarely / 偶尔', 'Sometimes / 有时', 'Often / 经常', 'Always / 总是']

// ─── 工具函数 ───────────────────────────────────────────────────────────────

function getSectionIdx(q: (typeof QUESTIONS)[0]) {
  if (['gpa', 'programming_grade', 'ai_ratio'].includes(q.id)) return 0
  if (q.id.startsWith('rq1')) return 1
  if (q.id.startsWith('rq2')) return 2
  return 3
}

function calcRqScore(answers: Record<string, string | number>) {
  const entries = Object.entries(answers).filter(([k]) => k.startsWith('rq'))
  const total = entries.reduce((s, [, v]) => s + (Number(v) || 0), 0)
  const max = entries.length * 5
  const avg = entries.length > 0 ? +(total / entries.length).toFixed(2) : 0
  const pct = max > 0 ? Math.round((total / max) * 100) : 0
  return { total, max, avg, pct }
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
        fontSize: isPrimary ? '15px' : '14px', fontWeight: '700',
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
        width: '100%', minHeight: '64px', display: 'flex', alignItems: 'center', gap: '14px',
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
        <div style={{ fontSize: '15px', fontWeight: '600', color: selected ? '#f0f4ff' : 'rgba(240,244,255,0.75)' }}>
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
                width: '64px', height: '64px', borderRadius: '16px', border: '1.5px solid',
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
              {LIKERT_LABELS[n].split(' / ')[0]}
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

function ThankYouScreen({ answers, onReset }: {
  answers: Record<string, string | number>; onReset: () => void
}) {
  const score = calcRqScore(answers)
  const rqCount = Object.entries(answers).filter(([k]) => k.startsWith('rq')).length

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#050508',
      padding: '32px 24px', overflow: 'hidden',
    }}>
      {/* 背景 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div className="orb" style={{ width: 600, height: 600, background: '#2563eb18', top: '-20%', right: '-15%', animationDuration: '14s' }} />
        <div className="orb" style={{ width: 400, height: 400, background: '#06b6d418', bottom: '-10%', left: '-10%', animationDuration: '10s', animationDelay: '-3s' }} />
      </div>

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
        Response Submitted!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        style={{ fontSize: '16px', color: 'rgba(240,244,255,0.5)', textAlign: 'center', marginBottom: '36px' }}
      >
        感谢你的参与 · Thank you!
      </motion.p>

      {/* 得分卡片 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          background: THEME.glassBg, border: `1px solid ${THEME.glassBorder}`,
          borderRadius: '28px', padding: '28px 40px', textAlign: 'center',
          backdropFilter: 'blur(24px)', marginBottom: '32px',
          boxShadow: `0 0 60px ${THEME.primaryGlow}`,
        }}
      >
        <p style={{ fontSize: '12px', color: 'rgba(240,244,255,0.4)', marginBottom: '8px', letterSpacing: '0.05em' }}>
          RQ SCORE / RQ 综合得分
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px' }}>
          <span style={{ fontSize: '56px', fontWeight: '900', background: THEME.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {score.total}
          </span>
          <span style={{ fontSize: '22px', color: 'rgba(240,244,255,0.3)' }}>/ {score.max}</span>
        </div>
        <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', marginTop: '16px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: THEME.accent }}>{score.avg}</div>
            <div style={{ fontSize: '11px', color: 'rgba(240,244,255,0.3)' }}>Avg / 均分</div>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: THEME.primary }}>{score.pct}%</div>
            <div style={{ fontSize: '11px', color: 'rgba(240,244,255,0.3)' }}>Percentile / 百分位</div>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'rgba(240,244,255,0.7)' }}>{rqCount}</div>
            <div style={{ fontSize: '11px', color: 'rgba(240,244,255,0.3)' }}>Questions / 题数</div>
          </div>
        </div>
      </motion.div>

      {/* 背景信息 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        style={{
          display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center',
          marginBottom: '40px',
        }}
      >
        {[
          ['GPA', String(answers.gpa || '—')],
          ['Code Grade / 编程课', answers.programming_grade ? `${answers.programming_grade}` : '—'],
          ['AI Ratio / AI 占比', String(answers.ai_ratio || '—')],
        ].map(([k, v]) => (
          <div key={String(k)} style={{
            padding: '6px 14px', borderRadius: '99px', fontSize: '12px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(240,244,255,0.6)',
          }}>
            <span style={{ color: THEME.accent }}>{k}: </span>{v}
          </div>
        ))}
      </motion.div>

      {/* 重填按钮 */}
      <NavButton onClick={onReset}>
        <RotateCcw size={15} />Start Over / 重新填写
      </NavButton>

      <p style={{ position: 'absolute', bottom: '24px', fontSize: '11px', color: 'rgba(240,244,255,0.2)', textAlign: 'center' }}>
        Data is collected anonymously · 数据已匿名采集
      </p>
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
  const touchStartX = useRef(0)
  const isScrolling = useRef(false)

  const q = QUESTIONS[current]
  const progress = (current / (QUESTIONS.length - 1)) * 100
  const sectionIdx = getSectionIdx(q)

  const goNext = useCallback(() => {
    if (current < QUESTIONS.length - 1) {
      setDirection(1)
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
    return <ThankYouScreen answers={answers} onReset={handleReset} />
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
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div className="orb" style={{ width: 600, height: 600, background: '#2563eb18', top: '-20%', right: '-15%', animationDuration: '14s' }} />
        <div className="orb" style={{ width: 400, height: 400, background: '#06b6d418', bottom: '-10%', left: '-10%', animationDuration: '10s', animationDelay: '-3s' }} />
        <div className="bg-grid" style={{ position: 'absolute', inset: 0 }} />
      </div>

      {/* 顶部进度 */}
      <div style={{ position: 'relative', zIndex: 10, padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '640px', margin: '0 auto' }}>
          <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
            <motion.div animate={{ width: `${progress}%` }} transition={{ type: 'spring', stiffness: 120, damping: 22 }}
              style={{ height: '100%', background: THEME.gradient, borderRadius: '99px' }} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(240,244,255,0.45)', flexShrink: 0 }}>
            {current + 1} / {QUESTIONS.length}
          </span>
        </div>
        {/* 区块进度 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '14px' }}>
          {sections.map((_, i) => (
            <motion.div key={i}
              animate={{ width: sectionIdx === i ? 24 : 8, background: sectionIdx >= i ? THEME.primary : 'rgba(255,255,255,0.15)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ height: '6px', borderRadius: '99px' }}
            />
          ))}
        </div>
      </div>

      {/* 区块标签 */}
      <motion.div key={`sec-${current}`} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
        style={{
          position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '8px', margin: '16px auto 0', padding: '6px 16px', borderRadius: '99px', fontSize: '12px', fontWeight: '600',
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
              style={{ fontSize: 'clamp(16px, 4.5vw, 22px)', fontWeight: '800', lineHeight: 1.55, color: '#f0f4ff', textAlign: 'center', marginBottom: '8px' }}>
              {q.question}
            </motion.h2>

            {q.subtext && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                style={{ fontSize: '13px', color: 'rgba(240,244,255,0.38)', textAlign: 'center', marginBottom: '28px', lineHeight: 1.6 }}>
                {q.subtext}
              </motion.p>
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
                        {LIKERT_ICONS[selectedScore - 1]} {LIKERT_LABELS[selectedScore].split(' / ')[0]} · Score {selectedScore}
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
