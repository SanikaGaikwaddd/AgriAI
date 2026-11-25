import { useEffect, useRef, useState } from 'react'
import {
  Sprout, ScanLine, LayoutDashboard, MessageCircle, CloudSun, Leaf,
  Upload, Camera, CheckCircle2, AlertTriangle, ShieldCheck, History,
  ArrowRight, LoaderCircle, X, Image as ImageIcon, Menu, Search, MapPin, Droplets, Wind, Thermometer, Trash2
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

function App() {
  const [activeTab, setActiveTab] = useState('scanner')
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [apiStatus, setApiStatus] = useState('checking')
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('agricare_history') || '[]') } catch { return [] }
  })
  const [chatAi, setChatAi] = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Namaste! I am your farming assistant. Ask me about crop diseases, watering, fertilizer, soil or pests. You can write in English, Hindi or Marathi.' }])
  const [mobileMenu, setMobileMenu] = useState(false)
  const fileInput = useRef(null)
  const cameraInput = useRef(null)
  const resultRef = useRef(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setApiStatus(data.model_ready ? 'model' : 'demo'); setChatAi(!!data.chat_ai) })
      .catch(() => setApiStatus('offline'))
  }, [])

  useEffect(() => {
    try { localStorage.setItem('agricare_history', JSON.stringify(history)) } catch { /* storage unavailable */ }
  }, [history])

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  function chooseFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose a JPG, PNG, or WEBP image.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image must be smaller than 8 MB.')
      return
    }
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
    setResult(null)
    setError('')
  }

  async function scanCrop() {
    if (!selectedFile) {
      setError('Upload or capture a crop leaf image first.')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    const body = new FormData()
    body.append('file', selectedFile)
    try {
      const response = await fetch(`${API_BASE}/api/predict`, { method: 'POST', body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Prediction failed. Check that the backend is running.')
      setResult(data)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
      setHistory(old => [{ id: Date.now(), crop: data.crop, disease: data.disease, date: new Date().toLocaleString(), mode: data.mode }, ...old].slice(0, 30))
    } catch (e) {
      setError(e.message || 'Cannot connect to the backend. Start FastAPI on port 8000.')
    } finally {
      setLoading(false)
    }
  }

  const navItems = [
    { id: 'scanner', label: 'Disease Scanner', icon: ScanLine },
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'chatbot', label: 'AI Assistant', icon: MessageCircle },
    { id: 'weather', label: 'Weather', icon: CloudSun },
    { id: 'history', label: 'Scan History', icon: History },
  ]

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-icon"><Sprout size={23} /></div>
          <div><strong>AgriCare<span> AI</span></strong><small>SMART FARMING PLATFORM</small></div>
          <button className="mobile-close icon-button" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X /></button>
        </div>
        <div className="farm-label">WORKSPACE</div>
        <nav>
          {navItems.map(item => {
            const Icon = item.icon
            return <button key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.id); setMobileMenu(false) }}>
              <Icon size={19} /><span>{item.label}</span>{item.id === 'chatbot' && <span className="nav-new">AI</span>}
            </button>
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><Leaf size={19} /></div>
            <strong>Grow healthier crops</strong>
            <p>Identify possible leaf diseases and learn practical prevention steps.</p>
            <button onClick={() => setActiveTab('scanner')}>Scan a crop <ArrowRight size={15} /></button>
          </div>
          <div className="profile">
            <div className="avatar">F</div>
            <div><strong>Farmer workspace</strong><small>Local demo account</small></div>
            <span className={`status-dot ${apiStatus === 'offline' ? 'offline' : ''}`} title={`API: ${apiStatus}`} />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu /></button>
          <div className="breadcrumb">Workspace <span>/</span> <strong>{navItems.find(n => n.id === activeTab)?.label || 'Disease Scanner'}</strong></div>
          <div className="topbar-right"><span className={`connection ${apiStatus}`}><i />{apiStatus === 'model' ? 'AI model connected' : apiStatus === 'demo' ? 'Demo mode' : apiStatus === 'offline' ? 'API offline' : 'Connecting...'}</span><div className="top-avatar">F</div></div>
        </header>

        <div className="page-content">
          {activeTab === 'scanner' && <ScannerPage
            resultRef={resultRef} fileInput={fileInput} cameraInput={cameraInput} preview={preview} selectedFile={selectedFile}
            chooseFile={chooseFile} scanCrop={scanCrop} loading={loading} error={error}
            result={result} clear={() => { setSelectedFile(null); setPreview(''); setResult(null); setError('') }}
            onOpenHistory={() => setActiveTab('history')}
          />}
          {activeTab === 'dashboard' && <Dashboard history={history} setActiveTab={setActiveTab} apiStatus={apiStatus} />}
          {activeTab === 'chatbot' && <ChatPage messages={messages} setMessages={setMessages} chatAi={chatAi} result={result} />}
          {activeTab === 'weather' && <WeatherPage />}
          {activeTab === 'history' && <HistoryPage history={history} onScan={() => setActiveTab('scanner')} onClear={() => setHistory([])} />}
          <footer className="footer"><span>© 2026 AgriCare AI</span><span><ShieldCheck size={14} /> Built for informed, safer farming</span></footer>
        </div>
      </main>
      {mobileMenu && <button className="mobile-scrim" onClick={() => setMobileMenu(false)} aria-label="Close navigation" />}
    </div>
  )
}

function PageHeading({ eyebrow, title, subtitle, children }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{children}</div>
}

function ScannerPage({ resultRef, fileInput, cameraInput, preview, selectedFile, chooseFile, scanCrop, loading, error, result, clear, onOpenHistory }) {
  return <>
    <PageHeading eyebrow="CROP HEALTH INTELLIGENCE" title="Crop disease scanner" subtitle="Upload a clear leaf photo to get a possible disease prediction and crop-care guidance.">
      <button className="button button-secondary history-button" onClick={onOpenHistory}><History size={17} /> View history</button>
    </PageHeading>

    <div className="notice"><div className="notice-icon"><ShieldCheck size={19} /></div><div><strong>For better results</strong><p>Use a well-lit, in-focus photo of one leaf. Include the affected area and avoid strong shadows.</p></div></div>

    <div className="scanner-grid">
      <section className="panel upload-panel">
        <div className="panel-title"><div><h2><ScanLine size={19} /> Scan a crop leaf</h2><p>JPG, PNG or WEBP · Maximum 8 MB</p></div><span className="step-tag">STEP 01</span></div>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={e => chooseFile(e.target.files?.[0])} />
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={e => chooseFile(e.target.files?.[0])} />
        {preview ? <div className="preview-wrap"><img src={preview} alt="Selected crop leaf preview" /><button className="remove-image" onClick={clear} aria-label="Remove image"><X size={17} /></button><div className="preview-label"><ImageIcon size={15} /> {selectedFile?.name}</div></div> :
          <button className="dropzone" onClick={() => fileInput.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); chooseFile(e.dataTransfer.files?.[0]) }}>
            <div className="upload-icon"><Upload size={24} /></div><strong>Drop your leaf image here</strong><span>or click to browse files</span><small>For accurate results, use a clear close-up photo</small>
          </button>}
        <div className="upload-actions">
          <button className="button button-secondary" onClick={() => fileInput.current?.click()}><Upload size={17} /> Upload image</button>
          <button className="button button-secondary" onClick={() => cameraInput.current?.click()}><Camera size={17} /> Use camera</button>
        </div>
        {error && <div className="error-message"><AlertTriangle size={17} />{error}</div>}
        <button className="button button-primary scan-button" onClick={scanCrop} disabled={!selectedFile || loading}>{loading ? <><LoaderCircle className="spin" size={18} /> Analyzing image...</> : <><ScanLine size={18} /> Analyze crop image</>}</button>
        <p className="privacy-note"><ShieldCheck size={14} /> Image is sent to your local backend for processing.</p>
      </section>

      <section className="panel result-panel" ref={resultRef}>
        <div className="panel-title"><div><h2><Leaf size={19} /> Analysis result</h2><p>Prediction and recommended next steps</p></div><span className="step-tag">STEP 02</span></div>
        {!result ? <div className="empty-result"><div className="empty-illustration"><Sprout size={48} /><span><ScanLine size={22} /></span></div><h3>Your crop report will appear here</h3><p>Upload a leaf image and select <b>Analyze crop image</b> to see the result.</p><div className="result-checklist"><span><CheckCircle2 size={16} /> Possible disease identification</span><span><CheckCircle2 size={16} /> Symptoms and prevention tips</span><span><CheckCircle2 size={16} /> Crop-care guidance</span></div></div> :
          <div className="result-content">
            {result.mode === 'demo' && <div className="demo-warning"><AlertTriangle size={17} /><span>{result.warning}</span></div>}
            {result.mode === 'model' && <div className="result-warning"><AlertTriangle size={17} /><span>{result.warning}</span></div>}
            <div className="result-crop">{result.crop}</div><h3>{result.disease}</h3>
            <div className="result-metrics">
              <div><span>Model confidence</span><strong>{result.confidence == null ? 'Unavailable' : `${result.confidence}%`}</strong></div>
              <div><span>Severity</span><strong>{result.severity || 'Not assessed'}</strong></div>
            </div>
            <h4>Common symptoms</h4><ul>{result.symptoms?.map((x, i) => <li key={i}>{x}</li>)}</ul>
            <h4>Prevention steps</h4><ul>{result.prevention?.map((x, i) => <li key={i}>{x}</li>)}</ul>
            <div className="care-box"><strong><ShieldCheck size={17} /> Treatment guidance</strong><p>{result.care}</p></div>
          </div>}
      </section>
    </div>

    <section className="tips-section">
      <div className="section-heading"><div><h2>Healthy crop checklist</h2><p>Small habits that help protect your plants</p></div><span className="subtle-label">FIELD TIPS</span></div>
      <div className="tips-grid">
        <Tip icon={<DropletIcon />} title="Water wisely" text="Water near the soil and avoid keeping leaves wet for long periods." />
        <Tip icon={<Leaf size={20} />} title="Inspect regularly" text="Check both sides of leaves weekly for spots, pests, or yellowing." />
        <Tip icon={<ShieldCheck size={20} />} title="Confirm before treating" text="Compare symptoms and ask an agricultural expert if unsure." />
      </div>
    </section>
  </>
}

function DropletIcon() { return <span className="droplet-symbol">◉</span> }
function Tip({ icon, title, text }) { return <div className="tip-card"><div className="tip-icon">{icon}</div><div><strong>{title}</strong><p>{text}</p></div></div> }

function Dashboard({ history, setActiveTab, apiStatus }) {
  return <>
    <PageHeading eyebrow="YOUR FARM AT A GLANCE" title="Overview" subtitle="A quick view of crop health tools and your recent activity." />
    <div className="stats-grid">
      <Stat icon={<ScanLine />} label="Total scans" value={history.length} note="Saved in this browser" />
      <Stat icon={<Leaf />} label="Crop types" value="2+" note="Tomato and potato sample classes" />
      <Stat icon={<ShieldCheck />} label="AI service" value={apiStatus === 'model' ? 'Ready' : apiStatus === 'offline' ? 'Offline' : 'Demo'} note={apiStatus === 'model' ? 'Trained model detected' : 'Connect a trained model for real inference'} />
    </div>
    <div className="panel dashboard-cta"><div className="cta-art"><Sprout size={52} /></div><div><div className="eyebrow">START WITH A LEAF PHOTO</div><h2>Check your crop health</h2><p>Upload a clear crop image to begin a scan and get prevention guidance.</p><button className="button button-primary" onClick={() => setActiveTab('scanner')}>Open disease scanner <ArrowRight size={17} /></button></div></div>
    <HistoryList history={history} />
  </>
}
function Stat({ icon, label, value, note }) { return <div className="stat-card"><div className="stat-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></div> }

function HistoryList({ history }) {
  return <section className="panel history-panel"><div className="section-heading"><div><h2>Recent scans</h2><p>Your latest crop image results</p></div></div>{history.length ? <div className="history-table">{history.slice(0, 5).map(item => <div className="history-row" key={item.id}><div className="history-leaf"><Leaf size={18} /></div><div className="history-main"><strong>{item.disease}</strong><span>{item.crop} · {item.date}</span></div><span className={`pill ${item.mode === 'demo' ? 'pill-demo' : ''}`}>{item.mode === 'demo' ? 'Demo' : 'Analyzed'}</span></div>)}</div> : <div className="history-empty">No scans yet. Your results will appear here after the first scan.</div>}</section>
}

function HistoryPage({ history, onScan, onClear }) {
  return <>
    <PageHeading eyebrow="YOUR ACTIVITY" title="Scan history" subtitle="Your previous scan results, saved in this browser.">
      <div className="heading-actions">{history.length > 0 && <button className="button button-secondary" onClick={() => { if (window.confirm('Delete all saved scans?')) onClear() }}><Trash2 size={16} /> Clear</button>}<button className="button button-primary" onClick={onScan}><ScanLine size={17} /> New scan</button></div>
    </PageHeading>
    <section className="panel history-panel"><div className="section-heading"><div><h2>Recent scans</h2><p>Saved on this device. Clearing browser data will remove it.</p></div></div>
      {history.length ? <div className="history-table">{history.map(item => <div className="history-row" key={item.id}><div className="history-leaf"><Leaf size={18} /></div><div className="history-main"><strong>{item.disease}</strong><span>{item.crop} · {item.date}</span></div><span className={`pill ${item.mode === 'demo' ? 'pill-demo' : ''}`}>{item.mode === 'demo' ? 'Demo result' : 'Model result'}</span></div>)}</div> : <div className="history-empty"><History size={32} /><strong>No scans saved yet</strong><p>Analyze a leaf image to see your session history.</p><button className="button button-primary" onClick={onScan}>Scan first crop</button></div>}
    </section>
  </>
}

const SUGGESTIONS = ['How do I control early blight on tomato?', 'When should I water my crops?', 'Which fertilizer is best for potato?', 'टोमॅटोच्या पानांवर डाग का पडतात?']

function ChatPage({ messages, setMessages, chatAi, result }) {
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [note, setNote] = useState('')
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, sending])

  async function send(text) {
    const content = (text ?? question).trim()
    if (!content || sending) return
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setQuestion('')
    setNote('')
    setSending(true)
    try {
      const scan_context = result ? `${result.crop} - ${result.disease}${result.mode === 'demo' ? ' (demo result)' : ''}` : ''
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })), scan_context })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Chat request failed.')
      setMessages(old => [...old, { role: 'assistant', content: data.reply }])
      if (data.note) setNote(data.note)
    } catch (e) {
      setMessages(old => [...old, { role: 'assistant', content: 'Sorry, I could not reach the backend. Make sure it is running on port 8000.' }])
    } finally {
      setSending(false)
    }
  }

  return <>
    <PageHeading eyebrow="FARMING KNOWLEDGE" title="AI agriculture assistant" subtitle="Ask about crops, soil, irrigation, pests and plant diseases." />
    <div className="chat-layout">
      <section className="panel chat-panel">
        <div className="chat-top"><div className="chat-avatar"><Sprout /></div><div><strong>AgriCare assistant</strong><span><i /> {chatAi ? 'Claude AI connected' : 'Built-in knowledge base'}</span></div></div>
        <div className="chat-messages">
          {messages.map((m, i) => <div key={i} className={`chat-bubble ${m.role}`}>{m.content}</div>)}
          {sending && <div className="chat-bubble assistant typing"><LoaderCircle className="spin" size={14} /> Thinking...</div>}
          <div ref={endRef} />
        </div>
        {note && <div className="chat-note">{note}</div>}
        <form className="chat-form" onSubmit={e => { e.preventDefault(); send() }}>
          <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask about crop care..." aria-label="Ask agriculture question" disabled={sending} />
          <button className="button button-primary" type="submit" disabled={sending || !question.trim()}>Send <ArrowRight size={16} /></button>
        </form>
      </section>
      <aside className="panel chat-info">
        <h3>Try asking</h3>
        <div className="suggestions">{SUGGESTIONS.map(s => <button key={s} className="suggestion" onClick={() => send(s)} disabled={sending}>{s}</button>)}</div>
        <p className="small-note">{chatAi ? 'Answers are generated by AI. ' : 'Answers come from a built-in guide. Add an ANTHROPIC_API_KEY in backend/.env for full AI answers. '}For pesticide use or serious crop problems, confirm with a local agricultural officer.</p>
        <button className="button button-secondary reset-chat" onClick={() => setMessages(old => old.slice(0, 1))}><Trash2 size={15} /> New chat</button>
      </aside>
    </div>
  </>
}

const DEFAULT_PLACE = { name: 'Pune', region: 'Maharashtra', lat: 18.5204, lon: 73.8567 }

function WeatherPage() {
  const [place, setPlace] = useState(() => {
    try { return JSON.parse(localStorage.getItem('agricare_place')) || DEFAULT_PLACE } catch { return DEFAULT_PLACE }
  })
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState([])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetch(`${API_BASE}/api/weather?lat=${place.lat}&lon=${place.lon}`)
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.detail || 'Weather request failed.'); return d })
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) { setData(null); setError(e.message || 'Could not load weather.') } })
      .finally(() => { if (!cancelled) setLoading(false) })
    try { localStorage.setItem('agricare_place', JSON.stringify(place)) } catch { /* ignore */ }
    return () => { cancelled = true }
  }, [place])

  async function searchPlace(e) {
    e.preventDefault()
    if (query.trim().length < 2) return
    setError('')
    try {
      const r = await fetch(`${API_BASE}/api/geocode?q=${encodeURIComponent(query.trim())}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Search failed.')
      setMatches(d.results)
      if (!d.results.length) setError('No matching place found.')
    } catch (err) { setError(err.message) }
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setError('Location is not supported in this browser.'); return }
    navigator.geolocation.getCurrentPosition(
      pos => setPlace({ name: 'My location', region: '', lat: +pos.coords.latitude.toFixed(4), lon: +pos.coords.longitude.toFixed(4) }),
      () => setError('Location permission was denied. Search for your place instead.')
    )
  }

  const cur = data?.current
  return <>
    <PageHeading eyebrow="FIELD CONDITIONS" title="Weather insights" subtitle="Live forecast and farming advice for your location.">
      <button className="button button-secondary" onClick={useMyLocation}><MapPin size={16} /> Use my location</button>
    </PageHeading>

    <form className="panel place-search" onSubmit={searchPlace}>
      <Search size={17} />
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your village or city (e.g. Nashik)" aria-label="Search place" />
      <button className="button button-primary" type="submit">Search</button>
    </form>
    {matches.length > 0 && <div className="place-results">{matches.map((m, i) => <button key={i} className="place-option" onClick={() => { setPlace({ name: m.name, region: m.region || '', lat: m.lat, lon: m.lon }); setMatches([]); setQuery('') }}><MapPin size={14} /> {m.name}{m.region ? `, ${m.region}` : ''}{m.country ? `, ${m.country}` : ''}</button>)}</div>}
    {error && <div className="error-message"><AlertTriangle size={17} />{error}</div>}

    {loading && !data && <div className="panel wx-loading"><LoaderCircle className="spin" size={22} /> Loading weather...</div>}
    {cur && <>
      <div className="panel wx-now">
        <div><div className="eyebrow">{place.name}{place.region ? `, ${place.region}` : ''}</div><div className="wx-temp">{Math.round(cur.temp)}°C</div><div className="wx-summary">{cur.summary} · feels like {Math.round(cur.feels_like)}°C</div></div>
        <div className="wx-stats">
          <div><Droplets size={17} /><strong>{cur.humidity}%</strong><span>Humidity</span></div>
          <div><Wind size={17} /><strong>{cur.wind} km/h</strong><span>Wind</span></div>
          <div><Thermometer size={17} /><strong>{cur.rain_mm} mm</strong><span>Rain now</span></div>
        </div>
      </div>
      <div className="care-box wx-advice"><strong><ShieldCheck size={17} /> Farming advice for today</strong><ul>{data.advisory.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
      <div className="wx-days">{data.days.map(d => <div key={d.date} className="panel wx-day"><strong>{new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</strong><span>{d.summary}</span><b>{Math.round(d.max)}° / {Math.round(d.min)}°</b><small>Rain {d.rain_prob ?? 0}% · {d.rain_mm ?? 0} mm</small></div>)}</div>
    </>}
  </>
}

export default App