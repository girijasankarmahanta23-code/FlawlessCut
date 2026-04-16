// frontend/src/components/GroupingComponent.jsx
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import ClipCard from './ClipCard'

const API = 'http://localhost:8000'

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadDuration(file) {
  return new Promise(resolve => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration) }
    v.onerror = () => resolve(0)
    v.src = URL.createObjectURL(file)
  })
}

function uploadWithProgress(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const fd  = new FormData()
    fd.append('files', file)
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100))
    }
    xhr.onload  = () => xhr.status >= 200 && xhr.status < 300
      ? (onProgress(100), resolve())
      : reject(new Error(`Upload failed: ${xhr.status}`))
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.open('POST', `${API}/upload-clips`)
    xhr.send(fd)
  })
}

// ── Upload progress row ───────────────────────────────────────────────────────
function UploadProgressRow({ name, pct, done, error }) {
  return (
    <motion.div
      initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
      exit={{ opacity:0, height:0 }} style={{ overflow:'hidden' }}
    >
      <div style={{
        display:'flex', alignItems:'center', gap:10,
        padding:'7px 12px', borderRadius:7, marginBottom:5,
        background: error ? 'rgba(239,68,68,0.07)' : done ? 'rgba(16,185,129,0.07)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${error ? 'rgba(239,68,68,0.18)' : done ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.06)'}`
      }}>
        <span style={{ flex:1, fontSize:'0.78rem', color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {name}
        </span>
        {error
          ? <span style={{ fontSize:'0.72rem', color:'#ef4444' }}>Failed</span>
          : done
            ? <span style={{ fontSize:'0.72rem', color:'#10b981' }}>✓</span>
            : <div style={{ width:60, height:3, background:'rgba(255,255,255,0.08)', borderRadius:2, overflow:'hidden' }}>
                <motion.div style={{ height:'100%', background:'var(--accent)', borderRadius:2 }} animate={{ width:`${pct}%` }} transition={{ duration:0.3 }} />
              </div>
        }
      </div>
    </motion.div>
  )
}

function UploadSpinner() {
  return (
    <motion.svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round"
      animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:'linear' }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </motion.svg>
  )
}

// ── Group block ───────────────────────────────────────────────────────────────
function GroupBlock({
  group, groupIndex, allItems,
  onDissolveGroup, onRemoveClipFromGroup, onAddNewClipsToGroup,
  globalAudio, onClipChange, onDeleteClip,
  unassignedItems, onDotMouseDown, dotTargetId
}) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading]   = useState(false)
  const [fileStates, setFileStates] = useState([])
  const [addMode, setAddMode]       = useState(null) // null | 'uploaded'

  const parentItem = allItems.find(c => c.id === group.clips[0])
  const childItems = group.clips.slice(1).map(id => allItems.find(c => c.id === id)).filter(Boolean)

  function handleParentChange(id, key, val) {
    onClipChange(id, key, val)
    if (key === 'subject' || key === 'time') {
      group.clips.slice(1).forEach(cid => onClipChange(cid, key, val))
    }
  }

  function addFromUploaded(clipId) {
    const parent = allItems.find(c => c.id === group.clips[0])
    onClipChange(clipId, 'subject', parent?.subject || '')
    onClipChange(clipId, 'time',    parent?.time    || '')
    onAddNewClipsToGroup(group.id, [allItems.find(c => c.id === clipId)])
    setAddMode(null)
  }

  async function handleFilesPicked(e) {
    const files = [...e.target.files]
    if (!files.length) return
    setUploading(true)
    setAddMode(null)
    setFileStates(files.map(f => ({ name:f.name, pct:0, done:false, error:false })))

    const parent   = allItems.find(c => c.id === group.clips[0])
    const newItems = []

    for (let i = 0; i < files.length; i++) {
      try {
        await uploadWithProgress(files[i], pct =>
          setFileStates(prev => prev.map((s, idx) => idx === i ? { ...s, pct } : s))
        )
        const duration = await loadDuration(files[i])
        newItems.push({
          id: `${files[i].name}-${Date.now()}-${i}`,
          file: files[i], duration,
          subject: parent?.subject || '',
          time:    parent?.time    || '',
          trimStart:'', trimEnd:'', audio:true
        })
        setFileStates(prev => prev.map((s, idx) => idx === i ? { ...s, pct:100, done:true } : s))
      } catch {
        setFileStates(prev => prev.map((s, idx) => idx === i ? { ...s, error:true } : s))
      }
    }

    if (newItems.length) onAddNewClipsToGroup(group.id, newItems)
    setTimeout(() => { setUploading(false); setFileStates([]) }, 2000)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (!parentItem) return null

  return (
    <motion.div
      layout
      initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, scale:0.97 }}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius:16, padding:'16px 16px 14px', marginBottom:12
      }}
    >
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <motion.div
          animate={{ boxShadow:['0 0 4px rgba(255,255,255,0.3)','0 0 10px rgba(255,255,255,0.6)','0 0 4px rgba(255,255,255,0.3)'] }}
          transition={{ duration:2.5, repeat:Infinity }}
          style={{ width:8, height:8, borderRadius:'50%', background:'rgba(255,255,255,0.8)', flexShrink:0 }}
        />
        <span style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.65)', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase' }}>
          Group {groupIndex + 1}
        </span>
        <span style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>
          {group.clips.length} clip{group.clips.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button" onClick={() => onDissolveGroup(group.id)}
          style={{ marginLeft:'auto', background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, color:'var(--text-muted)', fontSize:'0.68rem', padding:'3px 10px', cursor:'pointer', transition:'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(239,68,68,0.5)'; e.currentTarget.style.color='#ef4444' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; e.currentTarget.style.color='var(--text-muted)' }}
        >
          Dissolve
        </button>
      </div>

      {/* Parent */}
      <ClipCard
        item={parentItem} onChange={handleParentChange} onDelete={onDeleteClip}
        globalAudio={globalAudio} isGrouped={true}
        onDotMouseDown={onDotMouseDown} isDotTarget={dotTargetId === parentItem.id}
        readOnlyOverlay={false}
      />

      {/* Children */}
      <AnimatePresence>
        {childItems.map(item => (
          <motion.div
            key={item.id} layout
            initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-8 }}
            style={{ marginTop:8, paddingLeft:20, position:'relative' }}
          >
            <motion.div
              initial={{ scaleY:0 }} animate={{ scaleY:1 }}
              style={{ position:'absolute', left:9, top:0, bottom:0, width:1, background:'rgba(255,255,255,0.15)', borderRadius:1, transformOrigin:'top' }}
            />
            <ClipCard
              item={item}
              onChange={(id, key, val) => { if (key !== 'subject' && key !== 'time') onClipChange(id, key, val) }}
              onDelete={id => onRemoveClipFromGroup(group.id, id)}
              globalAudio={globalAudio} isGrouped={true}
              onDotMouseDown={onDotMouseDown} isDotTarget={dotTargetId === item.id}
              readOnlyOverlay={true}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Upload progress */}
      <AnimatePresence>
        {fileStates.length > 0 && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} style={{ marginTop:8, paddingLeft:20 }}>
            {fileStates.map((fs, i) => <UploadProgressRow key={i} {...fs} />)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add more clips */}
      <div style={{ marginTop:12, paddingLeft:20 }}>
        <input ref={fileInputRef} type="file" accept="video/*" multiple style={{ display:'none' }} onChange={handleFilesPicked} />

        {!addMode && !uploading && (
          <div style={{ display:'flex', gap:8 }}>
            <motion.button
              type="button" whileHover={{ scale:1.01 }} whileTap={{ scale:0.98 }}
              onClick={() => setAddMode('uploaded')}
              disabled={unassignedItems.length === 0}
              style={{
                flex:1, background:'transparent', border:'1px dashed rgba(255,255,255,0.15)', borderRadius:8,
                color: unassignedItems.length === 0 ? 'var(--text-muted)' : 'rgba(255,255,255,0.5)',
                fontSize:'0.75rem', padding:'7px 10px',
                cursor: unassignedItems.length === 0 ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              From uploaded {unassignedItems.length > 0 && `(${unassignedItems.length})`}
            </motion.button>

            <motion.button
              type="button" whileHover={{ scale:1.01 }} whileTap={{ scale:0.98 }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                flex:1, background:'transparent', border:'1px dashed rgba(255,255,255,0.15)', borderRadius:8,
                color:'rgba(255,255,255,0.5)', fontSize:'0.75rem', padding:'7px 10px', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              From local folder
            </motion.button>
          </div>
        )}

        {uploading && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', fontSize:'0.75rem', color:'var(--text-muted)' }}>
            <UploadSpinner /> Uploading...
          </div>
        )}

        <AnimatePresence>
          {addMode === 'uploaded' && (
            <motion.div
              initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
              style={{ marginTop:6, background:'rgba(0,0,0,0.7)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, overflow:'hidden', backdropFilter:'blur(16px)' }}
            >
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize:'0.68rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Select clip to add</span>
                <button type="button" onClick={() => setAddMode(null)} style={{ background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'1.1rem', lineHeight:1, padding:'0 2px' }}>×</button>
              </div>
              {unassignedItems.map(clip => (
                <div
                  key={clip.id} onClick={() => addFromUploaded(clip.id)}
                  style={{ padding:'9px 14px', fontSize:'0.82rem', color:'rgba(255,255,255,0.75)', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.04)', transition:'background 0.15s', display:'flex', alignItems:'center', gap:10 }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                >
                  <div style={{ width:36, height:20, borderRadius:3, overflow:'hidden', background:'#000', flexShrink:0 }}>
                    <video src={URL.createObjectURL(clip.file)} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  </div>
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{clip.file.name}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ── Main GroupingComponent ────────────────────────────────────────────────────
export default function GroupingComponent({
  clipItems, setClipItems,
  groups, setGroups,
  globalAudio, onDeleteClip
}) {
  const sensors = useSensors(useSensor(PointerSensor))

  // Use refs for drag state so closures always see latest values
  const dragLineState  = useRef(null)
  const [dragLine, setDragLine]       = useState(null)
  const [dotTargetId, setDotTargetId] = useState(null)

  // Always-fresh refs to avoid stale closures in mouse event handlers
  const groupsRef    = useRef(groups)
  const clipItemsRef = useRef(clipItems)
  useEffect(() => { groupsRef.current    = groups    }, [groups])
  useEffect(() => { clipItemsRef.current = clipItems }, [clipItems])

  const groupedIds      = new Set(groups.flatMap(g => g.clips))
  const unassignedItems = clipItems.filter(c => !groupedIds.has(c.id))

  function onClipChange(id, key, val) {
    setClipItems(prev => prev.map(c => c.id === id ? { ...c, [key]: val } : c))
  }

  function onDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    setClipItems(prev => {
      const oi = prev.findIndex(c => c.id === active.id)
      const ni = prev.findIndex(c => c.id === over.id)
      return arrayMove(prev, oi, ni)
    })
  }

  // Collect dot positions from DOM — called on demand during drag
  function getDotPositions() {
    const positions = {}
    document.querySelectorAll('[data-dot-id]').forEach(el => {
      const id   = el.getAttribute('data-dot-id')
      const rect = el.getBoundingClientRect()
      positions[id] = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    })
    return positions
  }

  function handleDotMouseDown(fromId, dotEl) {
    if (!dotEl) return
    const rect = dotEl.getBoundingClientRect()
    const x1   = rect.left + rect.width  / 2
    const y1   = rect.top  + rect.height / 2

    dragLineState.current = { fromId, x1, y1, x2:x1, y2:y1 }
    setDragLine({ fromId, x1, y1, x2:x1, y2:y1 })
    setDotTargetId(null)

    // Snapshot dot positions at drag start
    const dotPos = getDotPositions()

    function onMouseMove(e) {
      const line = { ...dragLineState.current, x2:e.clientX, y2:e.clientY }
      dragLineState.current = line
      setDragLine({ ...line })

      // Find nearest dot within 28px
      let nearest = null, minDist = 28
      Object.entries(dotPos).forEach(([id, pos]) => {
        if (id === fromId) return
        const d = Math.hypot(e.clientX - pos.x, e.clientY - pos.y)
        if (d < minDist) { minDist = d; nearest = id }
      })
      setDotTargetId(nearest)
    }

    function onMouseUp(e) {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup',   onMouseUp)
      setDragLine(null)
      setDotTargetId(null)
      dragLineState.current = null

      // Find target using fresh dot positions
      const freshPos = getDotPositions()
      let targetId = null, minDist = 32
      Object.entries(freshPos).forEach(([id, pos]) => {
        if (id === fromId) return
        const d = Math.hypot(e.clientX - pos.x, e.clientY - pos.y)
        if (d < minDist) { minDist = d; targetId = id }
      })

      if (targetId) connectClips(fromId, targetId)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup',   onMouseUp)
  }

  // Uses refs so always has fresh groups/clipItems — no stale closure
  function connectClips(idA, idB) {
    const currentGroups    = groupsRef.current
    const currentClipItems = clipItemsRef.current

    const groupA = currentGroups.find(g => g.clips.includes(idA))
    const groupB = currentGroups.find(g => g.clips.includes(idB))

    if (groupA && groupB) {
      if (groupA.id === groupB.id) return
      // Merge B into A
      const merged = { ...groupA, clips: [...groupA.clips, ...groupB.clips.filter(id => !groupA.clips.includes(id))] }
      setGroups(prev => prev.filter(g => g.id !== groupA.id && g.id !== groupB.id).concat(merged))
      return
    }
    if (groupA && !groupB) {
      const parent = currentClipItems.find(c => c.id === groupA.clips[0])
      setClipItems(prev => prev.map(c => c.id === idB ? { ...c, subject: parent?.subject||'', time: parent?.time||'' } : c))
      setGroups(prev => prev.map(g => g.id === groupA.id ? { ...g, clips:[...g.clips, idB] } : g))
      return
    }
    if (!groupA && groupB) {
      const parent = currentClipItems.find(c => c.id === groupB.clips[0])
      setClipItems(prev => prev.map(c => c.id === idA ? { ...c, subject: parent?.subject||'', time: parent?.time||'' } : c))
      setGroups(prev => prev.map(g => g.id === groupB.id ? { ...g, clips:[idA, ...g.clips] } : g))
      return
    }
    // Both unassigned — create new group
    const parent = currentClipItems.find(c => c.id === idA)
    setClipItems(prev => prev.map(c => c.id === idB ? { ...c, subject: parent?.subject||'', time: parent?.time||'' } : c))
    setGroups(prev => [...prev, { id: Date.now(), clips:[idA, idB] }])
  }

  function dissolveGroup(groupId) {
    setGroups(prev => prev.filter(g => g.id !== groupId))
  }

  function removeClipFromGroup(groupId, clipId) {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      const clips = g.clips.filter(id => id !== clipId)
      return clips.length >= 2 ? { ...g, clips } : null
    }).filter(Boolean))
  }

  function addNewClipsToGroup(groupId, newItems) {
    const existingIds = new Set(clipItems.map(c => c.id))
    const brandNew    = newItems.filter(c => c && !existingIds.has(c.id))
    if (brandNew.length) setClipItems(prev => [...prev, ...brandNew])
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, clips:[...g.clips, ...newItems.filter(Boolean).map(c => c.id)] } : g
    ))
  }

  return (
    <div style={{ marginTop:16, position:'relative' }}>

      {/* Live SVG drag line */}
      {dragLine && (
        <svg style={{ position:'fixed', top:0, left:0, width:'100vw', height:'100vh', pointerEvents:'none', zIndex:9999 }}>
          <line
            x1={dragLine.x1} y1={dragLine.y1}
            x2={dragLine.x2} y2={dragLine.y2}
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
          <circle
            cx={dragLine.x2} cy={dragLine.y2} r={dotTargetId ? 7 : 4}
            fill={dotTargetId ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)'}
            style={{ transition:'r 0.15s, fill 0.15s' }}
          />
        </svg>
      )}

      {/* Drag hint */}
      <AnimatePresence>
        {dragLine && (
          <motion.div
            initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'6px 14px', marginBottom:10, fontSize:'0.78rem', color:'rgba(255,255,255,0.55)' }}
          >
            {dotTargetId ? '● Release to connect clips' : 'Drag to another clip\'s dot to group'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Groups */}
      <AnimatePresence>
        {groups.map((group, idx) => (
          <GroupBlock
            key={group.id}
            group={group} groupIndex={idx} allItems={clipItems}
            onDissolveGroup={dissolveGroup}
            onRemoveClipFromGroup={removeClipFromGroup}
            onAddNewClipsToGroup={addNewClipsToGroup}
            globalAudio={globalAudio}
            onClipChange={onClipChange}
            onDeleteClip={onDeleteClip}
            unassignedItems={unassignedItems}
            onDotMouseDown={handleDotMouseDown}
            dotTargetId={dotTargetId}
          />
        ))}
      </AnimatePresence>

      {/* Unassigned clips */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={unassignedItems.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <AnimatePresence>
              {unassignedItems.map(item => (
                <ClipCard
                  key={item.id}
                  item={item}
                  onChange={onClipChange}
                  onDelete={onDeleteClip}
                  globalAudio={globalAudio}
                  isGrouped={false}
                  onDotMouseDown={handleDotMouseDown}
                  isDotTarget={dotTargetId === item.id}
                  readOnlyOverlay={false}
                />
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
