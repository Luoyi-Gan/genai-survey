import express from 'express'
import cors from 'cors'
import initSqlJs from 'sql.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001
const IS_PROD = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true'

const DATA_DIR = IS_PROD ? '/data' : join(__dirname, 'data')
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
const DB_PATH = join(DATA_DIR, 'surveys.db')

// ─── 数据库（sql.js 纯 JS，无需编译） ────────────────────────────────────────

let db

async function initDb() {
  const SQL = await initSqlJs()

  // 加载已有数据或创建新数据库
  if (existsSync(DB_PATH)) {
    const buf = readFileSync(DB_PATH)
    db = new SQL.Database(buf)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submitted_at TEXT DEFAULT (datetime('now')),
      gender TEXT,
      age TEXT,
      gpa TEXT,
      programming_grade TEXT,
      ai_ratio TEXT,
      rq1_autonomy INTEGER,
      rq1_independence INTEGER,
      rq1_competence INTEGER,
      rq1_belonging INTEGER,
      rq2_review INTEGER,
      rq2_detection INTEGER,
      rq2_debug INTEGER,
      rq2_understanding INTEGER,
      rq3_depth INTEGER,
      rq3_mastery INTEGER,
      rq3_reproduce INTEGER,
      rq3_evaluate INTEGER,
      rq_total_score INTEGER,
      rq_avg_score REAL,
      raw_json TEXT
    )
  `)

  // 迁移旧数据库（已有表但缺字段）
  try {
    const cols = db.exec("PRAGMA table_info(surveys)")
    const colNames = cols.length > 0 ? cols[0].values.map(v => v[1]) : []
    if (!colNames.includes('gender')) db.run("ALTER TABLE surveys ADD COLUMN gender TEXT")
    if (!colNames.includes('age')) db.run("ALTER TABLE surveys ADD COLUMN age TEXT")
  } catch (_) {}

  saveDb()
  console.log(`📦 Database ready at ${DB_PATH}`)
}

function saveDb() {
  if (!db) return
  const data = db.export()
  const buf = Buffer.from(data)
  writeFileSync(DB_PATH, buf)
}

function run(sql, params = []) {
  db.run(sql, params)
  saveDb()
  return { lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] ?? 0 }
}

function all(sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length) stmt.bind(params)
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

function one(sql, params = []) {
  const rows = all(sql, params)
  return rows[0] || null
}

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express()
app.use(cors({
  origin: [
    'https://genai-survey.3253634996.workers.dev',
    'https://genai-survey.pages.dev',
    'http://localhost:5173',
  ],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
}))
app.use(express.json({ limit: '1mb' }))

// ─── API 路由 ────────────────────────────────────────────────────────────────

app.post('/api/survey', (req, res) => {
  const { answers } = req.body
  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Invalid data' })
  }

  const rqEntries = Object.entries(answers).filter(([k]) => k.startsWith('rq'))
  const rqTotal = rqEntries.reduce((s, [, v]) => s + (Number(v) || 0), 0)
  const rqAvg = rqEntries.length > 0 ? +(rqTotal / rqEntries.length).toFixed(3) : 0

  const result = run(`
    INSERT INTO surveys (
      gender, age, gpa, programming_grade, ai_ratio,
      rq1_autonomy, rq1_independence, rq1_competence, rq1_belonging,
      rq2_review, rq2_detection, rq2_debug, rq2_understanding,
      rq3_depth, rq3_mastery, rq3_reproduce, rq3_evaluate,
      rq_total_score, rq_avg_score, raw_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    String(answers.gender || ''),
    String(answers.age || ''),
    String(answers.gpa || ''),
    String(answers.programming_grade || ''),
    String(answers.ai_ratio || ''),
    answers.rq1_autonomy ?? null,
    answers.rq1_independence ?? null,
    answers.rq1_competence ?? null,
    answers.rq1_belonging ?? null,
    answers.rq2_review ?? null,
    answers.rq2_detection ?? null,
    answers.rq2_debug ?? null,
    answers.rq2_understanding ?? null,
    answers.rq3_depth ?? null,
    answers.rq3_mastery ?? null,
    answers.rq3_reproduce ?? null,
    answers.rq3_evaluate ?? null,
    rqTotal,
    rqAvg,
    JSON.stringify(answers),
  ])

  res.json({ success: true, id: result.lastInsertRowid, rq_total_score: rqTotal, rq_avg_score: rqAvg })
})

app.get('/api/stats', (req, res) => {
  const total = one('SELECT COUNT(*) as count FROM surveys') || { count: 0 }
  const rqAvg = one('SELECT AVG(rq_avg_score) as avg, AVG(rq_total_score) as total_avg FROM surveys') || {}
  const rq1Avg = one("SELECT AVG((rq1_autonomy + rq1_independence + rq1_competence + rq1_belonging) / 4.0) as avg FROM surveys WHERE rq1_autonomy IS NOT NULL") || {}
  const rq2Avg = one("SELECT AVG((rq2_review + rq2_detection + rq2_debug + rq2_understanding) / 4.0) as avg FROM surveys WHERE rq2_review IS NOT NULL") || {}
  const rq3Avg = one("SELECT AVG((rq3_depth + rq3_mastery + rq3_reproduce + rq3_evaluate) / 4.0) as avg FROM surveys WHERE rq3_depth IS NOT NULL") || {}
  const gpaDist = all("SELECT gpa as gpa, COUNT(*) as count FROM surveys WHERE gpa != '' GROUP BY gpa")
  const aiDist = all("SELECT ai_ratio as ai_ratio, COUNT(*) as count FROM surveys WHERE ai_ratio != '' GROUP BY ai_ratio")
  const genderDist = all("SELECT gender as gender, COUNT(*) as count FROM surveys WHERE gender != '' GROUP BY gender")
  const ageDist = all("SELECT age as age, COUNT(*) as count FROM surveys WHERE age != '' GROUP BY age")

  res.json({
    totalResponses: total.count,
    rqOverallAvg: rqAvg.avg ?? 0,
    rqTotalAvg: rqAvg.total_avg ?? 0,
    rq1Avg: rq1Avg.avg ?? 0,
    rq2Avg: rq2Avg.avg ?? 0,
    rq3Avg: rq3Avg.avg ?? 0,
    gpaDistribution: gpaDist,
    aiDistribution: aiDist,
    genderDistribution: genderDist,
    ageDistribution: ageDist,
  })
})

app.get('/api/surveys', (req, res) => {
  const rows = all('SELECT * FROM surveys ORDER BY id DESC')
  res.json({ surveys: rows })
})

app.delete('/api/survey/:id', (req, res) => {
  run('DELETE FROM surveys WHERE id = ?', [Number(req.params.id)])
  res.json({ success: true })
})

// ─── AI 个性化建议 ────────────────────────────────────────────────────────────

app.post('/api/ai-tip', async (req, res) => {
  const { answers } = req.body
  if (!answers) return res.status(400).json({ error: 'Missing answers' })

  const genderMap = { M: '男', F: '女', O: '其他', P: '不便透露' }
  const gpaMap = { A: '3.5–4.0（优秀）', B: '3.0–3.49（良好）', C: '2.5–2.99（中等）', D: '2.5 以下' }
  const codeMap = { A: 'A 等（90–100）', 'A-': 'A-（85–89）', 'B+': 'B+（80–84）', B: 'B（75–79）', 'B-': 'B-（70–74）', C: 'C 或以下' }
  const aiMap = { A: '0–25%（极少）', B: '26–50%（部分辅助）', C: '51–75%（超过半数）', D: '76–100%（高度依赖）' }
  const ageMap = { '18-22': '18–22岁', '23-26': '23–26岁', '27-30': '27–30岁', '30+': '30岁以上' }

  const background = `背景：性别=${genderMap[answers.gender]||answers.gender||'未知'}，年龄=${ageMap[answers.age]||answers.age||'未知'}，GPA=${gpaMap[answers.gpa]||answers.gpa||'未知'}，编程成绩=${codeMap[answers.programming_grade]||answers.programming_grade||'未知'}，AI代码占比=${aiMap[answers.ai_ratio]||answers.ai_ratio||'未知'}`

  const rq1Avg = (() => {
    const vals = ['rq1_autonomy','rq1_independence','rq1_competence','rq1_belonging'].map(k => Number(answers[k])).filter(v => v > 0)
    return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : null
  })()
  const rq2Avg = (() => {
    const vals = ['rq2_review','rq2_detection','rq2_debug','rq2_understanding'].map(k => Number(answers[k])).filter(v => v > 0)
    return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : null
  })()
  const rq3Avg = (() => {
    const vals = ['rq3_depth','rq3_mastery','rq3_reproduce','rq3_evaluate'].map(k => Number(answers[k])).filter(v => v > 0)
    return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : null
  })()

  const scores = `RQ1自主性均分=${rq1Avg||'未知'}，RQ2逻辑审查均分=${rq2Avg||'未知'}，RQ3学习留存均分=${rq3Avg||'未知'}`

  const prompt = `你是问卷结束页的AI小助手，负责生成一句幽默、温馨、带有善意提示的个人化建议。

${background}
${scores}

要求：
1. 根据以上背景和得分，用中文生成一句幽默温馨的建议（30-60字）
2. 要有调侃感但不能冒犯，温馨但不鸡汤
3. 可以根据具体数值给一点实用小建议（比如AI依赖度高就提醒不要太懒，RQ3低就提醒要多复习）
4. 风格：轻松、有趣、像朋友聊天，带一点点暗示性提醒
5. 绝对不要列出分数或数据，只要一句话建议
6. 结尾可以加一个可爱emoji

示例风格：
- "代码让AI写得飞起，但别忘了自己也得多敲敲键盘，不然面试官问你代码逻辑时可就尴尬了 😅"
- "GPA挺高，编程成绩也不赖，就是RQ3得分像股市K线——波动有点大，建议复习别只靠AI聊天记录 😂"
- "看得出来你是AI的深度用户，但也别让AI成为你的第二大脑，留点空间给自己成长嘛 🤖💪"

直接输出这一句话，不要加引号，不要加"以下是建议"之类的开头。`

  const apiKey = process.env.MINIMAX_API_KEY || ''
  if (!apiKey) {
    return res.status(500).json({ error: 'MINIMAX_API_KEY not configured' })
  }

  try {
    const resp = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7-highspeed',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.85,
      }),
    })
    if (!resp.ok) {
      const errText = await resp.text()
      console.error('MiniMax API error:', resp.status, errText)
      return res.status(502).json({ error: 'AI API error' })
    }
    const data = await resp.json()
    const msg = data.choices?.[0]?.message ?? {}
    let tip = (msg.content || '').trim()
    if (!tip) {
      const rc = msg.reasoning_content || ''
      // 推理模型：tip 通常在末尾"Thus produce: X"或独立成句
      // 策略：找最后一段连续中文（可能夹杂英文标点）
      const lastCnBlock = rc.match(/[\u4e00-\u9fff][\s\S]{5,200}?([。！？.!?]\s*[\p{Emoji_Presentation}\u2600-\u26FF]?\s*$)/u)
      if (lastCnBlock) {
        tip = lastCnBlock[0].replace(/\s+/g, ' ').trim()
      } else {
        // 兜底：取最后一个含中文的行
        const cnLines = rc.split('\n').filter(l => /[\u4e00-\u9fff]/.test(l))
        if (cnLines.length) {
          tip = cnLines[cnLines.length - 1].replace(/\s{2,}/g, ' ').trim()
        }
      }
    }
    res.json({ tip: tip || '感谢你的参与，祝学习顺利！🎉' })
  } catch (err) {
    console.error('AI tip error:', err)
    res.status(500).json({ error: 'Failed to generate tip' })
  }
})

app.get('/api/export/csv', (req, res) => {
  const rows = all('SELECT * FROM surveys ORDER BY id DESC')
  const keys = rows.length ? Object.keys(rows[0]) : []
  const headers = ['ID', 'Time', ...keys]
  const csv = [
    headers.join(','),
    ...rows.map(r => Object.values(r).map(v => `"${v ?? ''}"`).join(','))
  ].join('\n')
  res.setHeader('Content-Type', 'text/csv;charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=surveys_${new Date().toISOString().slice(0,10)}.csv`)
  res.send(csv)
})

app.get('/api/export/json', (req, res) => {
  const rows = all('SELECT * FROM surveys ORDER BY id DESC')
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename=surveys_${new Date().toISOString().slice(0,10)}.json`)
  res.json({ surveys: rows, exported_at: new Date().toISOString() })
})

app.get('/admin', (_, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(`<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Survey Admin</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#050508;color:#f0f4ff;min-height:100vh;padding:32px 24px}
h1{font-size:24px;font-weight:900;background:linear-gradient(135deg,#2563eb,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
.sub{color:rgba(240,244,255,.4);font-size:14px;margin-bottom:32px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:28px}
.card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:18px;text-align:center}
.card .v{font-size:32px;font-weight:900;background:linear-gradient(135deg,#2563eb,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.card .l{font-size:11px;color:rgba(240,244,255,.4);margin-top:4px}
.exp{display:flex;gap:10px;margin-bottom:24px;flex-wrap:wrap}
.btn{background:linear-gradient(135deg,#2563eb,#06b6d4);border:none;border-radius:12px;padding:10px 18px;color:#fff;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
.btn:hover{opacity:.85}
.btn2{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(240,244,255,.7)}
.res{display:flex;flex-direction:column;gap:10px}
.row{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;gap:12px}
.row .id{font-size:11px;color:rgba(240,244,255,.25);min-width:28px}
.row .m{font-size:12px;color:rgba(240,244,255,.5);margin-bottom:6px}
.pbar{flex:1;height:5px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden}
.pfill{height:100%;background:linear-gradient(90deg,#2563eb,#06b6d4);border-radius:99px}
.score{font-size:13px;font-weight:700;color:#60a5fa;min-width:30px;text-align:right}
.del{background:rgba(244,63,94,.1);border:1px solid rgba(244,63,94,.2);border-radius:8px;padding:5px 10px;color:#f87171;cursor:pointer;font-size:11px}
.del:hover{background:rgba(244,63,94,.2)}
.empty{text-align:center;padding:60px;color:rgba(240,244,255,.3)}
</style></head>
<body>
<h1>Survey Admin</h1><p class="sub">编程学习与 GenAI 使用情况调研</p>
<div class="stats" id="s"></div>
<div class="exp">
<a href="/api/export/csv" class="btn" download>📥 CSV</a>
<a href="/api/export/json" class="btn btn2" download>📋 JSON</a>
</div>
<p style="font-size:13px;color:rgba(240,244,255,.5);margin-bottom:12px">Responses · <span id="c">0</span></p>
<div class="res" id="r"></div>
<script>
const A=window.location.origin
async function l(){
  const[s,ss]=await Promise.all([fetch(A+'/api/stats'),fetch(A+'/api/surveys')])
  const st=await s.json(),{surveys}=await ss.json()
  document.getElementById('c').textContent=st.totalResponses
  document.getElementById('s').innerHTML=[
    ['Total · 总人数',st.totalResponses],['RQ Avg · 均分',st.rqOverallAvg?.toFixed(2)??'—'],
    ['RQ1 Avg',st.rq1Avg?.toFixed(2)??'—'],['RQ2 Avg',st.rq2Avg?.toFixed(2)??'—'],['RQ3 Avg',st.rq3Avg?.toFixed(2)??'—']
  ].map(([l,v])=>'<div class="card"><div class="v">'+v+'</div><div class="l">'+l+'</div></div>').join('')
  if(!surveys.length){document.getElementById('r').innerHTML='<div class=empty>No data yet</div>';return}
  document.getElementById('r').innerHTML=surveys.map(r=>{
    const d=new Date(r.submitted_at).toLocaleString('zh-CN',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})
    const k=['rq1_autonomy','rq1_independence','rq1_competence','rq1_belonging','rq2_review','rq2_detection','rq2_debug','rq2_understanding','rq3_depth','rq3_mastery','rq3_reproduce','rq3_evaluate']
    const sc=k.map(x=>r[x]).filter(v=>v!=null)
    const avg=sc.length?(sc.reduce((a,b)=>a+b,0)/sc.length).toFixed(2):'—'
    return'<div class=row><div class=id>#'+r.id+'</div><div style="flex:1"><div class=m>'+d+' · '+r.gender+' · '+r.age+' · GPA '+r.gpa+' · Code '+r.programming_grade+' · AI '+r.ai_ratio+'</div><div class=pbar><div class=pfill style=width:'+(parseFloat(avg)/5*100)+'%></div></div></div><div class=score>'+avg+'</div><button class=del onclick="del('+r.id+')">×</button></div>'
  }).join('')
}
async function del(id){if(!confirm('Delete #'+id+'?'))return;await fetch(A+'/api/survey/'+id,{method:'DELETE'});l()}
l()
</script></body></html>`)
})

// ─── 静态文件（前端） ──────────────────────────────────────────────────────────

const distPath = join(__dirname, 'dist')
app.use(express.static(distPath))
app.get('/', (_, res) => res.sendFile(join(distPath, 'index.html')))

// ─── 启动 ──────────────────────────────────────────────────────────────────

await initDb()
app.listen(PORT, () => {
  console.log(`\n🚀 Survey Server running on http://localhost:${PORT}`)
  console.log(`📊 Admin panel:  http://localhost:${PORT}/admin`)
  console.log(`📝 Submit API:   POST http://localhost:${PORT}/api/survey\n`)
})
