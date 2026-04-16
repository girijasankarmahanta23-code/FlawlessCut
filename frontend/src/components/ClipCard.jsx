// frontend/src/components/ClipCard.jsx
import { useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const IconGrab  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
const IconTrash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
const IconLink  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>

function fmtDur(s) {
  if (!s) return '--:--'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

export default function ClipCard({
  item, onChange, onDelete,
  globalAudio, isGrouped,
  onDotMouseDown,
  isDotTarget,
  readOnlyOverlay = false
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const dotRef        = useRef(null)
  const style         = { transform: CSS.Transform.toString(transform), transition }
  const videoUrl      = useMemo(() => URL.createObjectURL(item.file), [item.file])
  const audioDisabled = !globalAudio

  const dotStyle = isGrouped
    ? { background:'rgba(255,255,255,0.85)', border:'2px solid rgba(255,255,255,0.85)', boxShadow:'0 0 8px rgba(255,255,255,0.3)' }
    : isDotTarget
      ? { background:'rgba(255,255,255,0.95)', border:'2px solid rgba(255,255,255,0.95)', boxShadow:'0 0 16px rgba(255,255,255,0.7)', transform:'scale(1.6)' }
      : {}

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity:0, y:10 }}
      animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, scale:0.95 }}
      transition={{ duration:0.2 }}
      className={`clip-card-wrap${isDragging ? ' dragging' : ''}`}
    >
      <div style={{ display:'flex', alignItems:'stretch', gap:0 }}>

        {/* Connect dot — data-dot-id here for position tracking */}
        <div className="connect-dot-col">
          <div
            ref={dotRef}
            data-dot-id={item.id}
            className={`connect-dot${isGrouped ? ' grouped' : ''}${isDotTarget ? ' target' : ''}`}
            style={dotStyle}
            onMouseDown={e => {
              e.preventDefault()
              e.stopPropagation()
              onDotMouseDown?.(item.id, dotRef.current)
            }}
            title={isGrouped ? 'Drag to regroup or connect to another clip' : 'Drag to another clip to group them'}
          />
        </div>

        {/* Card body */}
        <div
          className="clip-card-body"
          style={isGrouped ? {
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)'
          } : {}}
        >
          {/* Drag handle */}
          <div {...attributes} {...listeners} className="clip-drag-handle">
            <IconGrab />
          </div>

          {/* Thumbnail */}
          <div className="clip-thumb">
            <video src={videoUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>

          {/* Name + duration */}
          <div className="clip-meta">
            <span className="clip-filename">{item.file.name}</span>
            <span className="clip-duration-badge">{fmtDur(item.duration)}</span>
          </div>

          {/* Subject */}
          <div className="clip-field">
            <span className="clip-field-label">Subject</span>
            <input
              value={item.subject}
              onChange={e => onChange(item.id, 'subject', e.target.value)}
              placeholder="DSA"
              readOnly={readOnlyOverlay}
              className={`clip-input${readOnlyOverlay ? ' readonly' : ''}`}
              style={{ width:110 }}
            />
          </div>

          {/* Time */}
          <div className="clip-field">
            <span className="clip-field-label">Time</span>
            <input
              value={item.time}
              onChange={e => onChange(item.id, 'time', e.target.value)}
              placeholder="9:00 AM"
              readOnly={readOnlyOverlay}
              className={`clip-input${readOnlyOverlay ? ' readonly' : ''}`}
              style={{ width:90 }}
            />
          </div>

          {/* Trim start */}
          <div className="clip-field">
            <span className="clip-field-label">Trim Start</span>
            <input
              value={item.trimStart}
              onChange={e => onChange(item.id, 'trimStart', e.target.value)}
              placeholder="00:00"
              className="clip-input"
              style={{ width:72 }}
            />
          </div>

          {/* Trim end */}
          <div className="clip-field">
            <span className="clip-field-label">Trim End</span>
            <input
              value={item.trimEnd}
              onChange={e => onChange(item.id, 'trimEnd', e.target.value)}
              placeholder={fmtDur(item.duration)}
              className="clip-input"
              style={{ width:72 }}
            />
          </div>

          {/* Audio toggle */}
          <div className="clip-field" style={{ alignItems:'center' }}>
            <span className="clip-field-label">Audio</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={audioDisabled ? false : item.audio}
                disabled={audioDisabled}
                onChange={e => onChange(item.id, 'audio', e.target.checked)}
              />
              <span className="slider" />
            </label>
          </div>

          {/* Group badge */}
          {isGrouped && (
            <div className="clip-group-badge" style={{ color:'rgba(255,255,255,0.5)' }}>
              <IconLink /> Grouped
            </div>
          )}

          {/* Delete */}
          <button type="button" onClick={() => onDelete(item.id)} className="clip-delete-btn">
            <IconTrash />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
