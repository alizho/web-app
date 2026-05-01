import { useState, useEffect, useRef } from 'react'
import './App.css'

const API = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

function getInitialTheme() {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function Collapsible({ open, children }) {
  const ref = useRef(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (ref.current) setHeight(ref.current.scrollHeight)
  }, [children, open])

  return (
    <div
      className="collapsible"
      style={{ maxHeight: open ? height + 32 : 0 }}
    >
      <div ref={ref}>{children}</div>
    </div>
  )
}

function EmotionDisplay({ emotion, size = 18 }) {
  if (emotion.image_url) {
    return <img src={`${API}${emotion.image_url}`} alt={emotion.name} className="emotion-img" style={{ width: size, height: size }} />
  }
  return <span className="emotion-word">{emotion.name}</span>
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const [mediaList, setMediaList] = useState([])
  const [emotionsList, setEmotionsList] = useState([])
  const [companionNames, setCompanionNames] = useState([])
  const [loading, setLoading] = useState(true)

  const [entries, setEntries] = useState([])
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)

  // collapsible panels
  const [showMediaTable, setShowMediaTable] = useState(false)
  const [showEmotionsTable, setShowEmotionsTable] = useState(false)
  const [showLogEntry, setShowLogEntry] = useState(false)
  const [showAddMedia, setShowAddMedia] = useState(false)
  const [showAddEmotion, setShowAddEmotion] = useState(false)

  // media add/edit
  const [newMedia, setNewMedia] = useState({ title: '', media_type: 'film', url: '', genre: '', creator: '', release_year: '' })
  const [editingMediaId, setEditingMediaId] = useState(null)
  const [editMedia, setEditMedia] = useState({})

  // emotion add/edit
  const [newEmotion, setNewEmotion] = useState({ name: '', valence: 'positive', image: null })
  const [editingEmotionId, setEditingEmotionId] = useState(null)
  const [editEmotion, setEditEmotion] = useState({})

  // entry form
  const [form, setForm] = useState({
    media_id: '', rating: '3', watched_at: new Date().toISOString().slice(0, 10),
    rewatch: false, emotions: [], companions: [],
  })
  const [newCompanion, setNewCompanion] = useState({ name: '', relationship: 'friend' })

  // filter & report
  const [filters, setFilters] = useState({ rating_min: '', rating_max: '', date_from: '', date_to: '', media_type: '', companion: '', emotion_id: '' })
  const [report, setReport] = useState([])
  const [reportRun, setReportRun] = useState(false)

  const mediaTypes = ['film', 'book', 'song', 'podcast', 'show']
  const relationships = ['friend', 'partner', 'solo', 'family']

  // --- data loading ---

  function loadMedia() {
    return fetch(`${API}/api/media`).then((r) => r.json()).then(setMediaList)
  }
  function loadEmotions() {
    return fetch(`${API}/api/emotions`).then((r) => r.json()).then(setEmotionsList)
  }
  function loadCompanionNames() {
    return fetch(`${API}/api/companions/unique`).then((r) => r.json()).then(setCompanionNames)
  }
  function loadEntries() {
    setEntriesLoading(true)
    fetch(`${API}/api/entries`).then((r) => r.json()).then(setEntries).finally(() => setEntriesLoading(false))
  }

  useEffect(() => {
    Promise.all([loadMedia(), loadEmotions(), loadCompanionNames()])
      .then(() => setLoading(false))
      .catch(() => setLoading(false))
    loadEntries()
  }, [])

  function runReport() {
    const params = new URLSearchParams()
    if (filters.rating_min !== '') params.set('rating_min', filters.rating_min)
    if (filters.rating_max !== '') params.set('rating_max', filters.rating_max)
    if (filters.date_from !== '') params.set('date_from', filters.date_from)
    if (filters.date_to !== '') params.set('date_to', filters.date_to)
    if (filters.media_type !== '') params.set('media_type', filters.media_type)
    if (filters.companion !== '') params.set('companion', filters.companion)
    if (filters.emotion_id !== '') params.set('emotion_id', filters.emotion_id)
    fetch(`${API}/api/entries?${params}`).then((r) => r.json()).then((data) => { setReport(data); setReportRun(true) })
  }

  function clearForm() {
    setForm({ media_id: '', rating: '3', watched_at: new Date().toISOString().slice(0, 10), rewatch: false, emotions: [], companions: [] })
    setEditingId(null)
  }

  // --- media CRUD ---

  function handleAddMedia() {
    if (!newMedia.title.trim()) return
    setError(null)
    fetch(`${API}/api/media`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newMedia, release_year: newMedia.release_year ? Number(newMedia.release_year) : null }),
    })
      .then((r) => { if (!r.ok) return r.json().then((e) => { throw new Error(e.detail || 'failed') }); return r.json() })
      .then((m) => {
        setMediaList((prev) => [...prev, m])
        setForm((f) => ({ ...f, media_id: String(m.id) }))
        setNewMedia({ title: '', media_type: 'film', url: '', genre: '', creator: '', release_year: '' })
        setShowAddMedia(false)
      })
      .catch((e) => { setError(e.message); console.error(e) })
  }

  function startEditMedia(m) {
    setEditingMediaId(m.id)
    setEditMedia({ title: m.title, media_type: m.media_type, url: m.url || '', genre: m.genre || '', creator: m.creator || '', release_year: m.release_year || '' })
  }

  function handleUpdateMedia() {
    if (!editingMediaId) return
    setError(null)
    fetch(`${API}/api/media/${editingMediaId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editMedia, release_year: editMedia.release_year ? Number(editMedia.release_year) : null }),
    })
      .then((r) => { if (!r.ok) return r.json().then((e) => { throw new Error(e.detail || 'failed') }); return r.json() })
      .then((updated) => {
        setMediaList((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
        setEditingMediaId(null)
      })
      .catch((e) => { setError(e.message); console.error(e) })
  }

  function handleDeleteMedia(id) {
    if (!confirm('delete this media?')) return
    fetch(`${API}/api/media/${id}`, { method: 'DELETE' })
      .then(() => { setMediaList((prev) => prev.filter((m) => m.id !== id)); loadEntries() })
      .catch((e) => console.error(e))
  }

  // --- Emotion CRUD ---

  function handleAddEmotion() {
    if (!newEmotion.name.trim()) return
    setError(null)
    const fd = new FormData()
    fd.append('name', newEmotion.name)
    fd.append('valence', newEmotion.valence)
    if (newEmotion.image) fd.append('image', newEmotion.image)
    fetch(`${API}/api/emotions`, { method: 'POST', body: fd })
      .then((r) => { if (!r.ok) return r.json().then((e) => { throw new Error(e.detail || 'failed') }); return r.json() })
      .then((e) => {
        setEmotionsList((prev) => [...prev, e])
        setNewEmotion({ name: '', valence: 'positive', image: null })
        setShowAddEmotion(false)
      })
      .catch((err) => { setError(err.message); console.error(err) })
  }

  function startEditEmotion(e) {
    setEditingEmotionId(e.id)
    setEditEmotion({ name: e.name, valence: e.valence, image: null, removeImage: false })
  }

  function handleUpdateEmotion() {
    if (!editingEmotionId) return
    setError(null)
    const fd = new FormData()
    fd.append('name', editEmotion.name)
    fd.append('valence', editEmotion.valence)
    if (editEmotion.removeImage) fd.append('remove_image', 'true')
    if (editEmotion.image) fd.append('image', editEmotion.image)
    fetch(`${API}/api/emotions/${editingEmotionId}`, { method: 'PUT', body: fd })
      .then((r) => { if (!r.ok) return r.json().then((e) => { throw new Error(e.detail || 'failed') }); return r.json() })
      .then((updated) => {
        setEmotionsList((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
        setEditingEmotionId(null)
        loadEntries()
      })
      .catch((err) => { setError(err.message); console.error(err) })
  }

  function handleDeleteEmotion(id) {
    if (!confirm('delete this emotion?')) return
    fetch(`${API}/api/emotions/${id}`, { method: 'DELETE' })
      .then(() => { setEmotionsList((prev) => prev.filter((e) => e.id !== id)); loadEntries() })
      .catch((e) => console.error(e))
  }

  // --- Entry CRUD ---

  function toggleEmotion(emotionId) {
    setForm((f) => {
      const exists = f.emotions.find((e) => e.emotion_id === emotionId)
      if (exists) return { ...f, emotions: f.emotions.filter((e) => e.emotion_id !== emotionId) }
      return { ...f, emotions: [...f.emotions, { emotion_id: emotionId, intensity: 3 }] }
    })
  }

  function setEmotionIntensity(emotionId, intensity) {
    setForm((f) => ({
      ...f, emotions: f.emotions.map((e) => e.emotion_id === emotionId ? { ...e, intensity: Number(intensity) } : e),
    }))
  }

  function addCompanion() {
    if (!newCompanion.name.trim()) return
    setForm((f) => ({ ...f, companions: [...f.companions, { ...newCompanion, name: newCompanion.name.trim() }] }))
    setNewCompanion({ name: '', relationship: 'friend' })
  }
  function removeCompanion(idx) { setForm((f) => ({ ...f, companions: f.companions.filter((_, i) => i !== idx) })) }
  function updateCompanion(idx, field, value) {
    setForm((f) => ({ ...f, companions: f.companions.map((c, i) => i === idx ? { ...c, [field]: value } : c) }))
  }

  function handleAddEntry() {
    if (!form.media_id || !form.watched_at) return
    setError(null)
    fetch(`${API}/api/entries`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_id: Number(form.media_id), rating: Number(form.rating), watched_at: form.watched_at, rewatch: form.rewatch, emotions: form.emotions, companions: form.companions }),
    })
      .then((r) => { if (!r.ok) return r.json().then((e) => { throw new Error(e.detail || 'failed') }); return r.json() })
      .then(() => { clearForm(); loadEntries(); loadCompanionNames(); runReport(); setShowLogEntry(false) })
      .catch((e) => { setError(e.message); console.error(e) })
  }

  function handleEdit(entry) {
    setEditingId(entry.id)
    setForm({
      media_id: String(entry.media_id), rating: String(entry.rating), watched_at: entry.watched_at,
      rewatch: entry.rewatch,
      emotions: entry.emotions.map((e) => ({ emotion_id: e.emotion_id, intensity: e.intensity })),
      companions: entry.companions.map((c) => ({ name: c.name, relationship: c.relationship })),
    })
    setShowLogEntry(true)
  }

  function handleUpdate() {
    if (!editingId) return
    fetch(`${API}/api/entries/${editingId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: Number(form.rating), watched_at: form.watched_at, rewatch: form.rewatch, emotions: form.emotions, companions: form.companions }),
    })
      .then(() => { clearForm(); loadEntries(); loadCompanionNames(); runReport(); setShowLogEntry(false) })
      .catch((e) => console.error(e))
  }

  function handleDelete(id) {
    if (!confirm('delete this entry?')) return
    fetch(`${API}/api/entries/${id}`, { method: 'DELETE' })
      .then(() => { loadEntries(); loadCompanionNames(); runReport() })
      .catch((e) => console.error(e))
  }

  // --- Render ---

  return (
    <div className="App stage2">
      <button className="theme-toggle" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} aria-label="toggle dark mode" title={theme === 'dark' ? 'switch to light mode' : 'switch to dark mode'}>
        {theme === 'dark' ? '\u2600' : '\u263E'}
      </button>
      <header className="app-header-strip"><h1>media tracker</h1></header>
      {error && <div className="error">{error}</div>}

      {/* --- media table --- */}
      <section className="section">
        <div className="section-header">
          <h2>media library</h2>
          <div className="section-header-buttons">
            <button type="button" className="secondary" onClick={() => setShowAddMedia(!showAddMedia)}>+ add media</button>
            <button type="button" className="secondary" onClick={() => setShowMediaTable(!showMediaTable)}>
              {showMediaTable ? 'hide table' : 'view table'}
            </button>
          </div>
        </div>
        <Collapsible open={showAddMedia}>
          <div className="inline-form">
            <input placeholder="title" value={newMedia.title} onChange={(e) => setNewMedia((m) => ({ ...m, title: e.target.value }))} />
            <select value={newMedia.media_type} onChange={(e) => setNewMedia((m) => ({ ...m, media_type: e.target.value }))}>
              {mediaTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="url" value={newMedia.url} onChange={(e) => setNewMedia((m) => ({ ...m, url: e.target.value }))} />
            <input placeholder="genre" value={newMedia.genre} onChange={(e) => setNewMedia((m) => ({ ...m, genre: e.target.value }))} />
            <input placeholder="creator" value={newMedia.creator} onChange={(e) => setNewMedia((m) => ({ ...m, creator: e.target.value }))} />
            <input type="number" placeholder="year" value={newMedia.release_year} onChange={(e) => setNewMedia((m) => ({ ...m, release_year: e.target.value }))} />
            <button type="button" onClick={handleAddMedia}>add</button>
          </div>
        </Collapsible>
        <Collapsible open={showMediaTable}>
          {loading ? <p>loading...</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>title</th><th>type</th><th>genre</th><th>creator</th><th>year</th><th>actions</th></tr></thead>
                <tbody>
                  {mediaList.map((m) => (
                    <tr key={m.id}>
                      {editingMediaId === m.id ? (
                        <>
                          <td><input value={editMedia.title} onChange={(e) => setEditMedia((x) => ({ ...x, title: e.target.value }))} /></td>
                          <td><select value={editMedia.media_type} onChange={(e) => setEditMedia((x) => ({ ...x, media_type: e.target.value }))}>{mediaTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select></td>
                          <td><input value={editMedia.genre} onChange={(e) => setEditMedia((x) => ({ ...x, genre: e.target.value }))} /></td>
                          <td><input value={editMedia.creator} onChange={(e) => setEditMedia((x) => ({ ...x, creator: e.target.value }))} /></td>
                          <td><input type="number" value={editMedia.release_year} onChange={(e) => setEditMedia((x) => ({ ...x, release_year: e.target.value }))} /></td>
                          <td><button type="button" onClick={handleUpdateMedia}>save</button><button type="button" className="secondary" onClick={() => setEditingMediaId(null)}>cancel</button></td>
                        </>
                      ) : (
                        <>
                          <td>{m.title}</td><td>{m.media_type}</td><td>{m.genre || '—'}</td><td>{m.creator || '—'}</td><td>{m.release_year || '—'}</td>
                          <td><button type="button" onClick={() => startEditMedia(m)}>edit</button><button type="button" onClick={() => handleDeleteMedia(m.id)}>delete</button></td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Collapsible>
      </section>

      {/* --- emotions table --- */}
      <section className="section">
        <div className="section-header">
          <h2>emotions</h2>
          <div className="section-header-buttons">
            <button type="button" className="secondary" onClick={() => setShowAddEmotion(!showAddEmotion)}>+ add emotion</button>
            <button type="button" className="secondary" onClick={() => setShowEmotionsTable(!showEmotionsTable)}>
              {showEmotionsTable ? 'hide table' : 'view table'}
            </button>
          </div>
        </div>
        <Collapsible open={showAddEmotion}>
          <div className="inline-form">
            <input placeholder="emotion name" value={newEmotion.name} onChange={(e) => setNewEmotion((x) => ({ ...x, name: e.target.value }))} />
            <select value={newEmotion.valence} onChange={(e) => setNewEmotion((x) => ({ ...x, valence: e.target.value }))}>
              <option value="positive">positive</option>
              <option value="negative">negative</option>
              <option value="mixed">mixed</option>
            </select>
            <label className="file-label">
              image (png):
              <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={(e) => setNewEmotion((x) => ({ ...x, image: e.target.files[0] || null }))} />
            </label>
            <button type="button" onClick={handleAddEmotion}>add</button>
          </div>
        </Collapsible>
        <Collapsible open={showEmotionsTable}>
          {loading ? <p>loading...</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>name</th><th>valence</th><th>image</th><th>actions</th></tr></thead>
                <tbody>
                  {emotionsList.map((em) => (
                    <tr key={em.id}>
                      {editingEmotionId === em.id ? (
                        <>
                          <td><input value={editEmotion.name} onChange={(e) => setEditEmotion((x) => ({ ...x, name: e.target.value }))} /></td>
                          <td>
                            <select value={editEmotion.valence} onChange={(e) => setEditEmotion((x) => ({ ...x, valence: e.target.value }))}>
                              <option value="positive">positive</option>
                              <option value="negative">negative</option>
                              <option value="mixed">mixed</option>
                            </select>
                          </td>
                          <td>
                            {em.image_url && !editEmotion.removeImage && (
                              <div className="edit-image-preview">
                                <img src={`${API}${em.image_url}`} alt="" className="emotion-img-preview" />
                                <button type="button" className="secondary" onClick={() => setEditEmotion((x) => ({ ...x, removeImage: true }))}>remove</button>
                              </div>
                            )}
                            <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={(e) => setEditEmotion((x) => ({ ...x, image: e.target.files[0] || null, removeImage: false }))} />
                          </td>
                          <td><button type="button" onClick={handleUpdateEmotion}>save</button><button type="button" className="secondary" onClick={() => setEditingEmotionId(null)}>cancel</button></td>
                        </>
                      ) : (
                        <>
                          <td>{em.name}</td>
                          <td>{em.valence}</td>
                          <td>{em.image_url ? <img src={`${API}${em.image_url}`} alt={em.name} className="emotion-img-preview" /> : '—'}</td>
                          <td><button type="button" onClick={() => startEditEmotion(em)}>edit</button><button type="button" onClick={() => handleDeleteEmotion(em.id)}>delete</button></td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Collapsible>
      </section>

      {/* --- entries + log entry button (add) --- */}
      <section className="section">
        <div className="section-header">
          <h2>your entries</h2>
          <button type="button" onClick={() => { if (!showLogEntry) clearForm(); setShowLogEntry(!showLogEntry) }}>
            {showLogEntry ? 'close' : 'log an entry'}
          </button>
        </div>

        <Collapsible open={showLogEntry}>
          <div className="log-entry-form">
            <div className="form">
              <label>
                media:
                <select value={form.media_id} onChange={(e) => setForm((f) => ({ ...f, media_id: e.target.value }))}>
                  <option value="">select media</option>
                  {mediaList.map((m) => <option key={m.id} value={m.id}>{m.title} ({m.media_type})</option>)}
                </select>
              </label>
            </div>
            <div className="form">
              <label>rating (1–5): <input type="number" min="1" max="5" value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))} /></label>
              <label>date: <input type="date" value={form.watched_at} onChange={(e) => setForm((f) => ({ ...f, watched_at: e.target.value }))} /></label>
              <label><input type="checkbox" checked={form.rewatch} onChange={(e) => setForm((f) => ({ ...f, rewatch: e.target.checked }))} /> rewatch</label>
            </div>
            <div className="emotions-section">
              <strong>emotions:</strong>
              <div className="emotion-chips">
                {emotionsList.map((e) => {
                  const selected = form.emotions.find((x) => x.emotion_id === e.id)
                  return (
                    <label key={e.id} className={`chip ${selected ? 'selected' : ''}`}>
                      <input type="checkbox" checked={!!selected} onChange={() => toggleEmotion(e.id)} />
                      <EmotionDisplay emotion={e} size={16} />
                      {!e.image_url && null}
                      {selected && (
                        <select value={selected.intensity} onChange={(ev) => setEmotionIntensity(e.id, ev.target.value)} onClick={(ev) => ev.stopPropagation()}>
                          {[1, 2, 3, 4, 5].map((i) => <option key={i} value={i}>{i}</option>)}
                        </select>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="companions-section">
              <strong>companions:</strong>
              {form.companions.map((c, i) => (
                <span key={i} className="chip">
                  <input value={c.name} onChange={(e) => updateCompanion(i, 'name', e.target.value)} placeholder="name" size={10} />
                  <select value={c.relationship} onChange={(e) => updateCompanion(i, 'relationship', e.target.value)}>
                    {relationships.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button type="button" onClick={() => removeCompanion(i)}>×</button>
                </span>
              ))}
              <div className="form">
                <input placeholder="name" value={newCompanion.name} onChange={(e) => setNewCompanion((c) => ({ ...c, name: e.target.value }))} />
                <select value={newCompanion.relationship} onChange={(e) => setNewCompanion((c) => ({ ...c, relationship: e.target.value }))}>
                  {relationships.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button type="button" onClick={addCompanion}>add companion</button>
              </div>
            </div>
            {editingId ? (
              <div className="form">
                <button type="button" onClick={handleUpdate}>update</button>
                <button type="button" className="secondary" onClick={() => { clearForm(); setShowLogEntry(false) }}>cancel</button>
              </div>
            ) : (
              <button type="button" onClick={handleAddEntry}>log entry</button>
            )}
          </div>
        </Collapsible>

        {entriesLoading ? <p>loading...</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>media</th><th>type</th><th>rating</th><th>date</th><th>emotions</th><th>companions</th><th>actions</th></tr></thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.media_title}</td>
                    <td>{e.media_type}</td>
                    <td>{e.rating}</td>
                    <td>{e.watched_at}</td>
                    <td className="emotions-cell">
                      <span className="emotions-cell-inner">
                        {e.emotions.length > 0 ? e.emotions.map((x) => (
                          <span key={x.emotion_id} className="emotion-entry" title={`${x.name} (${x.intensity})`}>
                            {x.image_url
                              ? <img src={`${API}${x.image_url}`} alt={x.name} className="emotion-img" />
                              : <span className="emotion-word">{x.name}</span>}
                            <sup>{x.intensity}</sup>
                          </span>
                        )) : '—'}
                      </span>
                    </td>
                    <td>{e.companions.map((c) => c.name).join(', ') || '—'}</td>
                    <td><button type="button" onClick={() => handleEdit(e)}>edit</button><button type="button" onClick={() => handleDelete(e.id)}>delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* --- filter & report --- */}
      <section className="section">
        <h2>filter & report</h2>
        <p className="muted">filter by rating, date range, media type, companion, or emotion.</p>
        <div className="form filters">
          <label>rating: <input type="number" min="1" max="5" placeholder="min" value={filters.rating_min} onChange={(e) => setFilters((f) => ({ ...f, rating_min: e.target.value }))} /></label>
          <label> to <input type="number" min="1" max="5" placeholder="max" value={filters.rating_max} onChange={(e) => setFilters((f) => ({ ...f, rating_max: e.target.value }))} /></label>
          <label>from: <input type="date" value={filters.date_from} onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))} /></label>
          <label>to: <input type="date" value={filters.date_to} onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))} /></label>
          <label>type: <select value={filters.media_type} onChange={(e) => setFilters((f) => ({ ...f, media_type: e.target.value }))}><option value="">all</option>{mediaTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
          <label>companion: <select value={filters.companion} onChange={(e) => setFilters((f) => ({ ...f, companion: e.target.value }))}><option value="">all</option>{companionNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
          <label>emotion: <select value={filters.emotion_id} onChange={(e) => setFilters((f) => ({ ...f, emotion_id: e.target.value }))}><option value="">all</option>{emotionsList.map((em) => <option key={em.id} value={em.id}>{em.name}</option>)}</select></label>
          <button type="button" onClick={runReport}>run report</button>
        </div>
        {reportRun && (
          <div className="table-wrap">
            <h3>report ({report.length} entries)</h3>
            <table>
              <thead><tr><th>media</th><th>type</th><th>rating</th><th>date</th><th>emotions</th><th>companions</th></tr></thead>
              <tbody>
                {report.map((e) => (
                  <tr key={e.id}>
                    <td>{e.media_title}</td><td>{e.media_type}</td><td>{e.rating}</td><td>{e.watched_at}</td>
                    <td className="emotions-cell">
                      <span className="emotions-cell-inner">
                        {e.emotions.length > 0 ? e.emotions.map((x) => (
                          <span key={x.emotion_id} className="emotion-entry" title={`${x.name} (${x.intensity})`}>
                            {x.image_url
                              ? <img src={`${API}${x.image_url}`} alt={x.name} className="emotion-img" />
                              : <span className="emotion-word">{x.name}</span>}
                            <sup>{x.intensity}</sup>
                          </span>
                        )) : '—'}
                      </span>
                    </td>
                    <td>{e.companions.map((c) => c.name).join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default App
