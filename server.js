import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

// ─── 数据库 ─────────────────────────────────────────────────────────────────

const DATA_DIR = join(__dirname, 'data')
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(join(DATA_DIR, 'surveys.db'))
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submitted_at TEXT DEFAULT (datetime('now')),
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
  );
`)

// ─── 中间件 ─────────────────────────────────────────────────────────────────

app.use(cors())
app.use(express.json({ limit: '1mb' }))

// ─── API 路由 ────────────────────────────────────────────────────────────────

// 提交问卷
app.post('/api/survey', (req, res) => {
  const { answers } = req.body
  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Invalid data' })
  }

  const rqEntries = Object.entries(answers).filter(([k]) => k.startsWith('rq'))
  const rqTotal = rqEntries.reduce((s, [, v]) => s + (Number(v) || 0), 0)
  const rqAvg = rqEntries.length > 0 ? +(rqTotal / rqEntries.length).toFixed(3) : 0

  const stmt = db.prepare(`
    INSERT INTO surveys (
      gpa, programming_grade, ai_ratio,
      rq1_autonomy, rq1_independence, rq1_competence, rq1_belonging,
      rq2_review, rq2_detection, rq2_debug, rq2_understanding,
      rq3_depth, rq3_mastery, rq3_reproduce, rq3_evaluate,
      rq_total_score, rq_avg_score, raw_json
    ) VALUES (
      @gpa, @programming_grade, @ai_ratio,
      @rq1_autonomy, @rq1_independence, @rq1_competence, @rq1_belonging,
      @rq2_review, @rq2_detection, @rq2_debug, @rq2_understanding,
      @rq3_depth, @rq3_mastery, @rq3_reproduce, @rq3_evaluate,
      @rq_total_score, @rq_avg_score, @raw_json
    )
  `)

  const info = stmt.run({
    gpa: String(answers.gpa || ''),
    programming_grade: String(answers.programming_grade || ''),
    ai_ratio: String(answers.ai_ratio || ''),
    rq1_autonomy: answers.rq1_autonomy ?? null,
    rq1_independence: answers.rq1_independence ?? null,
    rq1_competence: answers.rq1_competence ?? null,
    rq1_belonging: answers.rq1_belonging ?? null,
    rq2_review: answers.rq2_review ?? null,
    rq2_detection: answers.rq2_detection ?? null,
    rq2_debug: answers.rq2_debug ?? null,
    rq2_understanding: answers.rq2_understanding ?? null,
    rq3_depth: answers.rq3_depth ?? null,
    rq3_mastery: answers.rq3_mastery ?? null,
    rq3_reproduce: answers.rq3_reproduce ?? null,
    rq3_evaluate: answers.rq3_evaluate ?? null,
    rq_total_score: rqTotal,
    rq_avg_score: rqAvg,
    raw_json: JSON.stringify(answers),
  })

  res.json({ success: true, id: info.lastInsertRowid, rq_total_score: rqTotal, rq_avg_score: rqAvg })
})

// 获取统计摘要
app.get('/api/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM surveys').get()
  const rqAvg = db.prepare('SELECT AVG(rq_avg_score) as avg, AVG(rq_total_score) as total_avg FROM surveys').get()
  const rq1Avg = db.prepare('SELECT AVG((rq1_autonomy + rq1_independence + rq1_competence + rq1_belonging) / 4.0) as avg FROM surveys WHERE rq1_autonomy IS NOT NULL').get()
  const rq2Avg = db.prepare('SELECT AVG((rq2_review + rq2_detection + rq2_debug + rq2_understanding) / 4.0) as avg FROM surveys WHERE rq2_review IS NOT NULL').get()
  const rq3Avg = db.prepare('SELECT AVG((rq3_depth + rq3_mastery + rq3_reproduce + rq3_evaluate) / 4.0) as avg FROM surveys WHERE rq3_depth IS NOT NULL').get()
  const gpaDist = db.prepare("SELECT gpa, COUNT(*) as count FROM surveys WHERE gpa != '' GROUP BY gpa").all()
  const aiDist = db.prepare("SELECT ai_ratio, COUNT(*) as count FROM surveys WHERE ai_ratio != '' GROUP BY ai_ratio").all()

  res.json({
    totalResponses: total.count,
    rqOverallAvg: rqAvg.avg ?? 0,
    rqTotalAvg: rqAvg.total_avg ?? 0,
    rq1Avg: rq1Avg.avg ?? 0,
    rq2Avg: rq2Avg.avg ?? 0,
    rq3Avg: rq3Avg.avg ?? 0,
    gpaDistribution: gpaDist,
    aiDistribution: aiDist,
  })
})

// 获取所有原始数据（admin）
app.get('/api/surveys', (req, res) => {
  const rows = db.prepare('SELECT * FROM surveys ORDER BY id DESC').all()
  res.json({ surveys: rows })
})

// 删除单条数据
app.delete('/api/survey/:id', (req, res) => {
  db.prepare('DELETE FROM surveys WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// 导出 CSV
app.get('/api/export/csv', (req, res) => {
  const rows = db.prepare('SELECT * FROM surveys ORDER BY id DESC').all()
  const headers = ['ID', '提交时间', ...Object.keys(rows[0] || {}).filter(k => k !== 'raw_json')]
  const csv = [
    headers.join(','),
    ...rows.map(r => Object.values(r).join(','))
  ].join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename=surveys_${new Date().toISOString().slice(0,10)}.csv`)
  res.send(csv)
})

// 导出 JSON
app.get('/api/export/json', (req, res) => {
  const rows = db.prepare('SELECT * FROM surveys ORDER BY id DESC').all()
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename=surveys_${new Date().toISOString().slice(0,10)}.json`)
  res.json({ surveys: rows, exported_at: new Date().toISOString() })
})

// ─── admin 页面 ──────────────────────────────────────────────────────────────

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
    return'<div class=row><div class=id>#'+r.id+'</div><div style="flex:1"><div class=m>'+d+' · GPA '+r.gpa+' · Code '+r.programming_grade+' · AI '+r.ai_ratio+'</div><div class=pbar><div class=pfill style=width:'+(parseFloat(avg)/5*100)+'%></div></div></div><div class=score>'+avg+'</div><button class=del onclick="del('+r.id+')">×</button></div>'
  }).join('')
}
async function del(id){if(!confirm('Delete #'+id+'?'))return;await fetch(A+'/api/survey/'+id,{method:'DELETE'});l()}
l()
</script></body></html>`)
})

// ─── 静态文件（生产环境） ───────────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, 'dist')
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) res.sendFile(join(distPath, 'index.html'))
    else res.status(404).json({ error: 'Not found' })
  })
}

// ─── 启动 ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 Survey Server running on http://localhost:${PORT}`)
  console.log(`📊 Admin panel:  http://localhost:${PORT}/admin`)
  console.log(`📝 Submit API:   POST http://localhost:${PORT}/api/survey\n`)
})
