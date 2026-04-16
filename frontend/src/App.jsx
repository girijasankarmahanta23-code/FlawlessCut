// frontend/src/App.jsx
import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './App.css'
import GroupingComponent from './components/GroupingComponent'
import ContributionGraph from './components/ContributionGraph'

const API = 'http://localhost:8000'
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

function formatDate(val) {
  if (!val) return ''
  const [y, m, d] = val.split('-')
  return `${parseInt(d)} ${MONTHS[parseInt(m)-1]} ${y}`
}

const IconVideo    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>
const IconAudio    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
const IconMusic    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
const IconSettings = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>

function ProgressBar({ pct, step }) {
  return (
    <div className="progress-wrap">
      <p className="progress-label">{step}</p>
      <div className="progress-track">
        <motion.div
          className="progress-bar"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState('dark')

  // Cycle: dark → light (Apple glass) → white → dark
  const THEMES = ['dark', 'light', 'white']
  const THEME_ICONS = {
    dark:  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
    light: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    white: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
  }
  const THEME_LABELS = { dark: 'Dark', light: 'Glass', white: 'Light' }
  const [clipItems, setClipItems] = useState([])
  const [groups, setGroups]       = useState([])
  const [music, setMusic]         = useState(null)
  const [libraryTracks, setLibraryTracks] = useState([])
  const [selectedLibraryMusic, setSelectedLibraryMusic] = useState('')
  const [musicMode, setMusicMode] = useState('library') // 'library' or 'custom'
  const [globalAudio, setGlobalAudio] = useState(true)

  // Voiceover Features
  const [voices, setVoices] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const recordingTimerRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  const [form, setForm] = useState({ title:'', author:'', date:'', volume:0.15, clipVolume:1.0, fade:1.0 })
  const [status, setStatus]       = useState('')
  const [statusType, setStatusType] = useState('')
  const [loading, setLoading]     = useState(false)
  const [ready, setReady]         = useState(false)
  const [output, setOutput]       = useState('final_vlog.mp4')
  const [progress, setProgress]   = useState({ pct:0, step:'' })
  const pollRef = useRef(null)

  const [activityData, setActivityData] = useState([])
  const [thumbTitle, setThumbTitle] = useState('PLACEMENT PREP')
  const [thumbDay, setThumbDay]     = useState('1')
  const [thumbBg, setThumbBg]       = useState(null)
  const [thumbPreview, setThumbPreview] = useState(null)
  const [thumbLoading, setThumbLoading] = useState(false)

  // YouTube integration state
  const [youtubeAuth, setYoutubeAuth] = useState(null)
  const [youtubeUpload, setYoutubeUpload] = useState(false)
  const [youtubePrivacy, setYoutubePrivacy] = useState('private')
  const [youtubeTitle, setYoutubeTitle] = useState('')
  const [youtubeDescription, setYoutubeDescription] = useState('')
  const [youtubeTags, setYoutubeTags] = useState([])
  const [youtubeTagInput, setYoutubeTagInput] = useState('')

  useEffect(() => {
    document.body.className = `theme-${theme}`
  }, [theme])

  // Check YouTube authentication on load
  useEffect(() => {
    checkYoutubeAuth()

    // Fetch activity data
    fetch(`${API}/activity`)
      .then(res => res.json())
      .then(data => setActivityData(Array.isArray(data) ? data : []))
      .catch(() => {})

    // Fetch Curated Music
    fetch(`${API}/api/music/list`)
      .then(res => res.json())
      .then(data => {
        const tracks = Array.isArray(data) ? data : []
        setLibraryTracks(tracks)
        if (tracks.length > 0) setSelectedLibraryMusic(tracks[0])
      })
      .catch(err => console.error("Could not fetch music library:", err))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // YouTube functions
  async function checkYoutubeAuth() {
    try {
      const r = await fetch(`${API}/youtube/auth`)
      const d = await r.json()
      setYoutubeAuth(d)
    } catch (err) {
      console.error('YouTube auth check failed:', err)
    }
  }

  async function authenticateYouTube() {
    try {
      const r = await fetch(`${API}/youtube/authenticate`, { method: 'POST' })
      const d = await r.json()
      if (d.success) {
        setYoutubeAuth(d)
        alert('YouTube authentication successful!')
      } else {
        alert(`YouTube authentication failed: ${d.error}`)
      }
    } catch (err) {
      alert(`YouTube authentication error: ${err.message}`)
    }
  }

  function addYouTubeTag() {
    if (youtubeTagInput.trim() && !youtubeTags.includes(youtubeTagInput.trim())) {
      setYoutubeTags([...youtubeTags, youtubeTagInput.trim()])
      setYoutubeTagInput('')
    }
  }

  function removeYouTubeTag(tag) {
    setYoutubeTags(youtubeTags.filter(t => t !== tag))
  }

  // Load clip duration via video element
  function loadDuration(file) {
    return new Promise(resolve => {
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration) }
      v.onerror = () => resolve(0)
      v.src = URL.createObjectURL(file)
    })
  }

  async function onFilesChange(e) {
    const files = [...e.target.files]
    const newItems = await Promise.all(files.map(async (file, i) => {
      const duration = await loadDuration(file)
      return {
        id: `${file.name}-${Date.now()}-${i}`,
        file, duration,
        subject: '', time: '',
        trimStart: '', trimEnd: '',
        audio: true
      }
    }))
    setClipItems(prev => [...prev, ...newItems])
  }

  function onDeleteClip(id) {
    setClipItems(prev => prev.filter(c => c.id !== id))
    // Remove from any group
    setGroups(prev => prev.map(g => ({
      ...g, clips: g.clips.filter(cid => cid !== id)
    })).filter(g => g.clips.length >= 2))
  }

  function startPolling() {
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API}/progress`)
        const d = await r.json()
        setProgress({ pct: d.pct, step: d.step })
        if (d.done) {
          stopPolling()
          setProgress({ pct:100, step:'Render Completed' })
          setStatus('Project export finished successfully.')
          setStatusType('success')
          setOutput(d.output)
          setReady(true)
          setLoading(false)
          // Refresh contribution graph
          fetch(`${API}/activity`)
            .then(res => res.json())
            .then(data => setActivityData(Array.isArray(data) ? data : []))
            .catch(() => {})
        } else if (d.error) {
          stopPolling()
          const lines = d.error.trim().split('\n').filter(Boolean)
          setStatus(`Error: ${lines[lines.length-1]}`)
          setStatusType('error')
          setProgress({ pct:0, step:'' })
          setLoading(false)
        }
      } catch (_) {}
    }, 800)
  }

  function stopPolling() { clearInterval(pollRef.current) }
  useEffect(() => () => stopPolling(), [])

  // Voiceover Recording Logic
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Fallback mime checks
      let mimeType = 'audio/webm'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/ogg'
          if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = ''
      }
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' })
        setVoices(prev => [...prev, { 
          id: Date.now(),
          file: audioBlob, 
          start: 0,
          volume: 1.0,
          trimStart: 0,
          trimEnd: 0
        }])
        // Turn off mic tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingSeconds(0)
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch (err) {
      console.error("Mic access denied:", err)
      alert("Microphone access denied. Please allow mic usage in your browser.")
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(recordingTimerRef.current)
      setRecordingSeconds(0)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!clipItems.length) {
      setStatus('No media located. Please import video files.')
      setStatusType('error')
      return
    }

    setReady(false)
    setLoading(true)
    setProgress({ pct:0, step:'Preparing Assets...' })
    setStatus('')
    setStatusType('loading')

    const data = new FormData()
    clipItems.forEach(c => data.append('clips', c.file))
    
    // Append voiceover recordings
    voices.forEach(v => data.append('voices', new File([v.file], `voice_${v.id}.webm`, { type: v.file.type || 'audio/webm' })))
    data.append('voice_data', JSON.stringify(voices.map(v => ({
      start: v.start, volume: v.volume, trimStart: v.trimStart, trimEnd: v.trimEnd
    }))))
    
    if (musicMode === 'custom' && music) {
      data.append('music', music)
    } else if (musicMode === 'library' && selectedLibraryMusic) {
      data.append('selected_music', selectedLibraryMusic)
    }

    data.append('title',        form.title)
    data.append('author',       form.author)
    data.append('date',         formatDate(form.date))
    data.append('volume',       form.volume)
    data.append('clip_volume',  form.clipVolume)
    data.append('fade',         form.fade)
    data.append('global_audio', globalAudio)

    // Per-clip data with trim
    const clipDataArr = clipItems.map(c => ({
      clip:       c.file.name,
      subject:    c.subject,
      time:       c.time,
      audio:      globalAudio ? c.audio : false,
      trim_start: c.trimStart || '',
      trim_end:   c.trimEnd   || ''
    }))
    data.append('clip_data',  JSON.stringify(clipDataArr))
    data.append('clip_order', JSON.stringify(clipItems.map(c => c.file.name)))

    // Groups data
    const groupsData = groups.map((g, i) => ({
      group_id: g.id,
      subject:  clipItems.find(c => c.id === g.clips[0])?.subject || '',
      time:     clipItems.find(c => c.id === g.clips[0])?.time    || '',
      clips:    g.clips.map(id => clipItems.find(c => c.id === id)?.file.name).filter(Boolean)
    }))
    data.append('groups', JSON.stringify(groupsData))

    // YouTube upload data
    data.append('upload_to_youtube', youtubeUpload)
    data.append('youtube_privacy', youtubePrivacy)
    data.append('youtube_title', youtubeTitle)
    data.append('youtube_description', youtubeDescription)
    data.append('youtube_tags', JSON.stringify(youtubeTags))

    try {
      const res  = await fetch(`${API}/generate`, { method:'POST', body:data })
      const json = await res.json()

      if (!res.ok || json.status === 'error') {
        const msg   = json.message || 'Engine initialize failed.'
        const lines = msg.trim().split('\n').filter(Boolean)
        setStatus(lines[lines.length-1])
        setStatusType('error')
        setProgress({ pct:0, step:'' })
        setLoading(false)
        return
      }

      setProgress({ pct:0, step:'Rendering Timeline...' })
      startPolling()
    } catch (err) {
      setStatus(`Network issue: ${err.message}`)
      setStatusType('error')
      setProgress({ pct:0, step:'' })
      setLoading(false)
    }
  }

  async function generateThumbnail() {
    setThumbLoading(true)
    try {
      const fd = new FormData()
      fd.append('title', thumbTitle)
      fd.append('day', thumbDay)
      if (thumbBg) fd.append('background', thumbBg)
      const res = await fetch(`${API}/generate-thumbnail`, { method:'POST', body:fd })
      if (!res.ok) throw new Error('Thumbnail generation failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      if (thumbPreview) URL.revokeObjectURL(thumbPreview)
      setThumbPreview(url)
    } catch (err) {
      alert(err.message)
    } finally {
      setThumbLoading(false)
    }
  }

  return (
    <>
      {/* Animated background */}
      <div className="timeline-bg">
        <div className="ambient-blobs">
          <div className="blob b-blue" /><div className="blob b-purple" /><div className="blob b-indigo" />
          <div className="blob b-teal" /><div className="blob b-magenta" /><div className="blob b-orange" />
          <div className="blob b-green" /><div className="blob b-pink" /><div className="blob b-cyan" />
        </div>
        <div className="depth-frames">
          <div className="frame f-1" /><div className="frame f-2" /><div className="frame f-3" /><div className="frame f-4" />
          <div className="frame f-5" /><div className="frame f-6" /><div className="frame f-7" /><div className="frame f-8" />
          <div className="frame f-9" /><div className="frame f-10" />
        </div>
        <div className="tracks-container">
          <div className="timeline-track track-1" style={{top:'8%'}}><div className="bg-clip fade-1" style={{width:'15vw',left:'5%'}}/><div className="cut-indicator" style={{left:'22%'}}/><div className="bg-clip glow-red" style={{width:'25vw',left:'25%'}}/><div className="bg-clip" style={{width:'10vw',left:'55%'}}/><div className="cut-indicator" style={{left:'67%'}}/><div className="bg-clip" style={{width:'30vw',left:'70%'}}/></div>
          <div className="timeline-track track-2" style={{top:'22%'}}><div className="bg-clip" style={{width:'20vw',left:'-5%'}}/><div className="bg-clip fade-2" style={{width:'15vw',left:'20%'}}/><div className="cut-indicator" style={{left:'37%'}}/><div className="bg-clip glow-blue" style={{width:'35vw',left:'40%'}}/></div>
          <div className="timeline-track track-3" style={{top:'36%'}}><div className="bg-clip glow-purple fade-1" style={{width:'10vw',left:'10%'}}/><div className="bg-clip" style={{width:'40vw',left:'25%'}}/><div className="cut-indicator" style={{left:'67%'}}/></div>
          <div className="timeline-track track-4" style={{top:'48%'}}><div className="bg-clip fade-2" style={{width:'25vw',left:'0%'}}/><div className="bg-clip glow-red" style={{width:'20vw',left:'50%'}}/></div>
          <div className="timeline-track track-1" style={{top:'62%'}}><div className="bg-clip glow-yellow" style={{width:'15vw',left:'10%'}}/><div className="cut-indicator" style={{left:'27%'}}/><div className="bg-clip fade-1" style={{width:'30vw',left:'30%'}}/><div className="bg-clip" style={{width:'25vw',left:'65%'}}/></div>
          <div className="timeline-track track-2" style={{top:'75%'}}><div className="bg-clip fade-2" style={{width:'25vw',left:'5%'}}/><div className="bg-clip glow-teal" style={{width:'20vw',left:'35%'}}/><div className="cut-indicator" style={{left:'57%'}}/><div className="bg-clip" style={{width:'30vw',left:'60%'}}/></div>
          <div className="timeline-track track-3" style={{top:'88%'}}><div className="bg-clip" style={{width:'15vw',left:'-5%'}}/><div className="bg-clip glow-red fade-1" style={{width:'40vw',left:'15%'}}/><div className="cut-indicator" style={{left:'60%'}}/><div className="bg-clip" style={{width:'25vw',left:'70%'}}/></div>
          <div className="timeline-track track-4" style={{top:'100%'}}><div className="bg-clip glow-blue" style={{width:'20vw',left:'10%'}}/><div className="bg-clip fade-2" style={{width:'35vw',left:'35%'}}/><div className="cut-indicator" style={{left:'73%'}}/><div className="bg-clip" style={{width:'15vw',left:'80%'}}/></div>
          <div className="timeline-track track-1" style={{top:'115%'}}><div className="bg-clip glow-purple" style={{width:'18vw',left:'6%'}}/><div className="cut-indicator" style={{left:'25%'}}/><div className="bg-clip fade-1" style={{width:'35vw',left:'28%'}}/><div className="bg-clip" style={{width:'15vw',left:'75%'}}/></div>
          <div className="timeline-track track-2" style={{top:'130%'}}><div className="bg-clip fade-2" style={{width:'22vw',left:'12%'}}/><div className="bg-clip glow-teal" style={{width:'15vw',left:'45%'}}/><div className="cut-indicator" style={{left:'62%'}}/><div className="bg-clip" style={{width:'20vw',left:'65%'}}/></div>
          <div className="timeline-track track-3" style={{top:'145%'}}><div className="bg-clip glow-yellow" style={{width:'25vw',left:'2%'}}/><div className="bg-clip" style={{width:'30vw',left:'32%'}}/><div className="cut-indicator" style={{left:'65%'}}/><div className="bg-clip fade-2" style={{width:'25vw',left:'72%'}}/></div>
          <div className="timeline-track track-4" style={{top:'160%'}}><div className="bg-clip" style={{width:'15vw',left:'-2%'}}/><div className="bg-clip glow-red fade-1" style={{width:'45vw',left:'18%'}}/><div className="cut-indicator" style={{left:'66%'}}/><div className="bg-clip" style={{width:'18vw',left:'75%'}}/></div>
          <div className="timeline-track track-1" style={{top:'175%'}}><div className="bg-clip glow-blue" style={{width:'22vw',left:'8%'}}/><div className="cut-indicator" style={{left:'32%'}}/><div className="bg-clip fade-1" style={{width:'25vw',left:'35%'}}/><div className="bg-clip" style={{width:'28vw',left:'65%'}}/></div>
          <div className="timeline-track track-2" style={{top:'190%'}}><div className="bg-clip fade-2" style={{width:'30vw',left:'5%'}}/><div className="bg-clip glow-purple" style={{width:'18vw',left:'40%'}}/><div className="cut-indicator" style={{left:'60%'}}/><div className="bg-clip" style={{width:'25vw',left:'65%'}}/></div>
          <div className="timeline-track track-3" style={{top:'205%'}}><div className="bg-clip" style={{width:'12vw',left:'-8%'}}/><div className="bg-clip glow-teal fade-1" style={{width:'38vw',left:'10%'}}/><div className="cut-indicator" style={{left:'52%'}}/><div className="bg-clip" style={{width:'20vw',left:'60%'}}/></div>
          <div className="timeline-track track-4" style={{top:'220%'}}><div className="bg-clip glow-yellow" style={{width:'24vw',left:'15%'}}/><div className="bg-clip fade-2" style={{width:'30vw',left:'42%'}}/><div className="cut-indicator" style={{left:'76%'}}/><div className="bg-clip" style={{width:'12vw',left:'82%'}}/></div>
          <div className="timeline-track track-1" style={{top:'235%'}}><div className="bg-clip glow-red" style={{width:'20vw',left:'4%'}}/><div className="cut-indicator" style={{left:'26%'}}/><div className="bg-clip fade-1" style={{width:'30vw',left:'30%'}}/><div className="bg-clip" style={{width:'20vw',left:'70%'}}/></div>
          <div className="timeline-track track-2" style={{top:'250%'}}><div className="bg-clip fade-2" style={{width:'25vw',left:'18%'}}/><div className="bg-clip glow-blue" style={{width:'22vw',left:'45%'}}/><div className="cut-indicator" style={{left:'69%'}}/></div>
          <div className="timeline-track track-3" style={{top:'265%'}}><div className="bg-clip glow-yellow fade-1" style={{width:'15vw',left:'5%'}}/><div className="bg-clip" style={{width:'40vw',left:'25%'}}/><div className="cut-indicator" style={{left:'68%'}}/><div className="bg-clip fade-2" style={{width:'20vw',left:'72%'}}/></div>
          <div className="timeline-track track-4" style={{top:'280%'}}><div className="bg-clip fade-2" style={{width:'22vw',left:'-4%'}}/><div className="cut-indicator" style={{left:'20%'}}/><div className="bg-clip" style={{width:'18vw',left:'25%'}}/><div className="bg-clip glow-teal" style={{width:'25vw',left:'48%'}}/><div className="bg-clip" style={{width:'15vw',left:'80%'}}/></div>
          
          <div className="fixed-playhead" style={{top:'4%',height:'300%'}}><div className="playhead-top"/><div className="playhead-line"/></div>
        </div>
      </div>

      <div className="container">
        {/* Header */}
        <div className="title-container" style={{position:'relative'}}>
          <button
            type="button"
            onClick={() => setTheme(t => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length])}
            className="theme-toggle"
            title={`Current: ${THEME_LABELS[theme]} — click to switch`}
            style={{position:'absolute',right:0,top:'50%',transform:'translateY(-50%)',background:'transparent',border:'none',cursor:'pointer',color:'var(--text-primary)',opacity:0.7,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}
          >
            {THEME_ICONS[theme]}
            <span style={{fontSize:'0.6rem',letterSpacing:'0.05em',textTransform:'uppercase',opacity:0.6}}>{THEME_LABELS[theme]}</span>
          </button>
          <h1>
            <span className="h1-icon">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z" stroke="rgba(230,57,70,0.4)" strokeWidth="1" strokeDasharray="4 2"/>
                <circle cx="7" cy="8" r="2.5"/><circle cx="7" cy="16" r="2.5"/>
                <path d="M19 6L9.5 14M19 18L13 13M9.5 10L11 11.5"/>
                <path d="M21 3L21 5 M20 4L22 4" stroke="var(--accent)" strokeLinecap="round"/>
              </svg>
            </span>
            FlawlessCut
          </h1>
          <p className="subtitle">Edit nothing. Get everything.</p>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Clips ── */}
          <section>
            <div className="section-header">
              <span className="section-icon"><IconVideo /></span>
              <h2>Project Library</h2>
            </div>
            <input type="file" accept="video/*" multiple onChange={onFilesChange} />
            {clipItems.length > 0 && (
              <>
                <p style={{fontSize:'0.75rem',color:'var(--text-muted)',marginTop:10,marginBottom:4}}>
                  Drag a clip's dot to another clip to group them together.
                </p>
                <GroupingComponent
                  clipItems={clipItems}
                  setClipItems={setClipItems}
                  groups={groups}
                  setGroups={setGroups}
                  globalAudio={globalAudio}
                  onDeleteClip={onDeleteClip}
                />
                <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--border-muted)' }}>
                  <label className="toggle-label big" style={{cursor:'default', marginBottom: globalAudio ? '15px' : '0'}}>
                    Keep original audio from clips
                    <label className="switch">
                      <input type="checkbox" checked={globalAudio} onChange={e => setGlobalAudio(e.target.checked)} />
                      <span className="slider" />
                    </label>
                  </label>
                  {globalAudio && (
                    <label>
                      Source Audio Gain (0.0 — 1.0)
                      <input type="number" step="0.05" min="0" max="1" value={form.clipVolume} onChange={e => set('clipVolume', e.target.value)} style={{ marginTop: '8px' }} />
                    </label>
                  )}
                </div>
              </>
            )}
          </section>

          {/* ── Music ── */}
          <section>
            <div className="section-header">
              <span className="section-icon"><IconMusic /></span>
              <h2>Background Soundtrack <span className="optional">(Optional)</span></h2>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input type="radio" name="musicMode" checked={musicMode === 'library'} onChange={() => setMusicMode('library')} />
                Curated Library
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input type="radio" name="musicMode" checked={musicMode === 'custom'} onChange={() => setMusicMode('custom')} />
                Upload Custom
              </label>
            </div>

            {musicMode === 'library' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <select 
                  value={selectedLibraryMusic} 
                  onChange={e => setSelectedLibraryMusic(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-muted)', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="">-- No Background Music --</option>
                  {libraryTracks.map(track => (
                    <option key={track} value={track}>{track.split('/').pop().replace(/\.[^/.]+$/, "")}</option>
                  ))}
                </select>

                {selectedLibraryMusic && (
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                    <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px'}}>Audio Preview</p>
                    <audio controls src={`${API}/api/music/files/${selectedLibraryMusic.split('/').map(encodeURIComponent).join('/')}`} style={{ width: '100%', height: '36px' }} />
                  </div>
                )}
              </div>
            ) : (
              <input type="file" accept="audio/*,video/*" onChange={e => setMusic(e.target.files[0] || null)} />
            )}

            {((musicMode === 'custom' && music) || (musicMode === 'library' && selectedLibraryMusic)) && (
              <label style={{marginTop:20}}>
                Soundtrack Gain (0.0 — 1.0)
                <input type="number" step="0.01" min="0" max="1" value={form.volume} onChange={e => set('volume', e.target.value)} />
              </label>
            )}
          </section>

          {/* ── Voiceover Recording ── */}
          <section>
            <div className="section-header">
              <span className="section-icon">🎙️</span>
              <h2>Voiceover <span className="optional">(Drag to Sync)</span></h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {!isRecording ? (
                  <button type="button" onClick={handleStartRecording} style={{ background: '#e74c3c', color: 'white', flex: 1, padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    ● Start Recording
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={handleStopRecording} style={{ background: 'var(--bg-layer-2)', color: 'white', flex: 1, border: '1px solid #e74c3c', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ■ Stop Recording
                    </button>
                    <span style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '1rem', minWidth: '50px' }}>
                      {String(Math.floor(recordingSeconds / 60)).padStart(2,'0')}:{String(recordingSeconds % 60).padStart(2,'0')}
                    </span>
                  </>
                )}
              </div>

              {(() => {
                const introSec = 5;
                const projectDuration = introSec + clipItems.reduce((acc, c) => acc + (c.duration || 0), 0);
                const timelineMax = Math.max(projectDuration, 10);

                return (
                  <div style={{ marginTop: '10px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-muted)' }}>
                    <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px'}}>Master Project Timeline ({timelineMax.toFixed(1)}s)</p>
                    
                    {/* Visual Master Timeline */}
                    <div style={{ position: 'relative', width: '100%', height: '30px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${(introSec / timelineMax) * 100}%`, background: 'rgba(41, 128, 185, 0.7)', borderRight: '1px solid rgba(255,255,255,0.2)', padding: '4px', fontSize: '10px', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden' }}>Intro (5s)</div>
                      {clipItems.map(c => (
                         <div key={c.id} style={{ width: `${((c.duration || 0) / timelineMax) * 100}%`, background: 'rgba(142, 68, 173, 0.5)', borderRight: '1px solid rgba(255,255,255,0.2)', padding: '4px', fontSize: '10px', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                            {c.file?.name}
                         </div>
                      ))}
                    </div>

                    {/* Draggable Voice Tracks Base */}
                    <div 
                      style={{ position: 'relative', width: '100%', height: '40px', background: 'rgba(255,255,255,0.02)', marginTop: '5px', borderRadius: '4px' }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        const vId = e.dataTransfer.getData('voiceId');
                        const rect = e.currentTarget.getBoundingClientRect();
                        const dropX = e.clientX - rect.left;
                        let newStart = (dropX / rect.width) * timelineMax;
                        newStart = Math.max(0, Math.min(newStart, timelineMax));
                        setVoices(prev => prev.map(v => v.id.toString() === vId ? { ...v, start: Number(newStart.toFixed(1)) } : v))
                      }}
                    >
                      {voices.map((voice, idx) => (
                        <div 
                          key={voice.id}
                          draggable
                          onDragStart={e => e.dataTransfer.setData('voiceId', voice.id.toString())}
                          style={{ 
                            position: 'absolute', 
                            left: `${(voice.start / timelineMax) * 100}%`, 
                            top: '5px', 
                            height: '30px',
                            minWidth: '30px',
                            padding: '0 8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: '#e74c3c', 
                            borderRadius: '4px',
                            boxShadow: '0 0 8px rgba(231,76,60,0.5)',
                            cursor: 'grab',
                            fontSize: '12px', color: 'white', fontWeight: 'bold'
                          }}
                          title={`Drag to sync. Start: ${voice.start}s`}
                        >
                          🎙️ #{idx + 1}
                        </div>
                      ))}
                    </div>

                    {/* Audio Controls List (Volume & Trim) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '25px', background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: '8px' }}>
                      {voices.map((voice, idx) => (
                        <div key={voice.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '10px', borderBottom: idx < voices.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ color: 'var(--accent)', fontWeight: 'bold', minWidth: '45px' }}>#{idx + 1}</span>
                            <audio controls src={URL.createObjectURL(voice.file)} style={{ height: '30px', flex: 1 }} />
                            <button 
                              type="button" 
                              onClick={() => setVoices(prev => prev.filter(v => v.id !== voice.id))}
                              style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: 0, fontSize: '16px' }}
                              title="Delete Sequence"
                            >✕</button>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '15px', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              Vol ({voice.volume}): 
                              <input type="range" min="0" max="1" step="0.05" value={voice.volume} onChange={e => setVoices(prev => prev.map(v => v.id === voice.id ? { ...v, volume: Number(e.target.value) } : v))} style={{width:'80px'}} />
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              Trim Start (s): 
                              <input type="number" min="0" step="0.1" value={voice.trimStart} onChange={e => setVoices(prev => prev.map(v => v.id === voice.id ? { ...v, trimStart: Number(e.target.value) } : v))} style={{width:'60px', background:'var(--bg-layer-2)', color:'white', border:'1px solid var(--border-muted)', padding:'2px 5px', borderRadius:'4px'}} />
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              Trim End (s): 
                              <input type="number" min="0" step="0.1" value={voice.trimEnd} onChange={e => setVoices(prev => prev.map(v => v.id === voice.id ? { ...v, trimEnd: Number(e.target.value) } : v))} style={{width:'60px', background:'var(--bg-layer-2)', color:'white', border:'1px solid var(--border-muted)', padding:'2px 5px', borderRadius:'4px'}} />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                );
              })()}
            </div>
          </section>

          {/* ── Settings ── */}
          <section>
            <div className="section-header">
              <span className="section-icon"><IconSettings /></span>
              <h2>Sequence Data</h2>
            </div>
            <div className="grid">
              <label>
                Project Name
                <input value={form.title} onChange={e => set('title', e.target.value)} required placeholder="Untitled Project" />
              </label>
              <label>
                Director
                <input value={form.author} onChange={e => set('author', e.target.value)} required placeholder="Your Name" />
              </label>
              <label>
                Creation Date
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
              </label>
              <label>
                Crossfade Length <span className="optional">(sec)</span>
                <input type="number" step="0.1" min="0" value={form.fade} onChange={e => set('fade', e.target.value)} />
              </label>
            </div>
          </section>

          {/* ── YouTube Upload ── */}
          <section>
            <div className="section-header">
              <span className="section-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
                </svg>
              </span>
              <h2>YouTube Upload <span className="optional">(Optional)</span></h2>
            </div>

            {!youtubeAuth?.authenticated ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ marginBottom: '15px', color: 'var(--text-muted)' }}>
                  Connect your YouTube channel to automatically upload your vlogs
                </p>
                <button
                  type="button"
                  onClick={authenticateYouTube}
                  style={{
                    background: '#ff0000',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '0 auto'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
                  </svg>
                  Connect YouTube Channel
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ff0000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
                      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                      {youtubeAuth.channel_title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Connected • {youtubeAuth.subscriber_count} subscribers
                    </div>
                  </div>
                </div>

                <label className="toggle-label" style={{ marginBottom: '20px' }}>
                  Upload to YouTube after processing
                  <label className="switch">
                    <input type="checkbox" checked={youtubeUpload} onChange={e => setYoutubeUpload(e.target.checked)} />
                    <span className="slider" />
                  </label>
                </label>

                {youtubeUpload && (
                  <div className="grid" style={{ marginTop: '20px' }}>
                    <label>
                      Video Privacy
                      <select value={youtubePrivacy} onChange={e => setYoutubePrivacy(e.target.value)}>
                        <option value="private">Private</option>
                        <option value="unlisted">Unlisted</option>
                        <option value="public">Public</option>
                      </select>
                    </label>

                    <label>
                      YouTube Title <span className="optional">(Auto-generated if empty)</span>
                      <input
                        value={youtubeTitle}
                        onChange={e => setYoutubeTitle(e.target.value)}
                        placeholder="Leave empty for auto-generation"
                      />
                    </label>

                    <label style={{ gridColumn: '1 / -1' }}>
                      YouTube Description <span className="optional">(Auto-generated if empty)</span>
                      <textarea
                        value={youtubeDescription}
                        onChange={e => setYoutubeDescription(e.target.value)}
                        placeholder="Leave empty for auto-generation"
                        rows="4"
                        style={{ resize: 'vertical', minHeight: '80px' }}
                      />
                    </label>

                    <label style={{ gridColumn: '1 / -1' }}>
                      Tags <span className="optional">(Auto-generated if empty)</span>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                          value={youtubeTagInput}
                          onChange={e => setYoutubeTagInput(e.target.value)}
                          onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addYouTubeTag())}
                          placeholder="Add tag and press Enter"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={addYouTubeTag}
                          style={{
                            padding: '8px 12px',
                            background: 'var(--accent)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Add
                        </button>
                      </div>
                      {youtubeTags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {youtubeTags.map(tag => (
                            <span
                              key={tag}
                              style={{
                                background: 'rgba(255,255,255,0.1)',
                                color: 'var(--text-primary)',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeYouTubeTag(tag)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'inherit',
                                  cursor: 'pointer',
                                  fontSize: '1.2em',
                                  lineHeight: 1,
                                  padding: 0,
                                  marginLeft: '2px'
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </label>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Contribution Graph Demo ── */}
          <section>
            <div className="section-header">
              <span className="section-icon">📊</span>
              <h2>Contribution Graph</h2>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px' }}>
              <ContributionGraph
                data={activityData}
                year={new Date().getFullYear()}
                showLegend={true}
                showTooltips={true}
              />
            </div>
          </section>

          <button type="submit" disabled={loading}>
            {loading ? 'Processing Frames...' : 'Render Project'}
          </button>
        </form>

        {loading && progress.step && <ProgressBar pct={progress.pct} step={progress.step} />}

        <AnimatePresence>
          {status && (
            <motion.p
              key={status}
              initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              className={`status ${statusType}`}
            >
              {status}
            </motion.p>
          )}
        </AnimatePresence>

        {ready && (
          <motion.a
            initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
            className="download-btn" href={`${API}/download`} download={output}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Save to Files ({output})
          </motion.a>
        )}

        {ready && progress.youtube_url && (
          <motion.a
            initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.2}}
            className="download-btn"
            href={progress.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: '#ff0000', marginTop: '10px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
              <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
            </svg>
            View on YouTube
          </motion.a>
        )}

        {ready && progress.youtube_error && (
          <motion.div
            initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.2}}
            style={{
              marginTop: '10px',
              padding: '12px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '0.9rem'
            }}
          >
            YouTube Upload Error: {progress.youtube_error}
          </motion.div>
        )}

        {/* ── Thumbnail Generator ── */}
        <section style={{marginTop:40}}>
          <div className="section-header">
            <span className="section-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M20.4 14.5L16 10 4 20"/></svg>
            </span>
            <h2>Thumbnail Generator</h2>
          </div>
          <div className="grid">
            <label>Title Text<input value={thumbTitle} onChange={e => setThumbTitle(e.target.value)} required /></label>
            <label>Day Number<input type="number" min="1" value={thumbDay} onChange={e => setThumbDay(e.target.value)} required /></label>
            <label style={{gridColumn:'1 / -1'}}>
              Custom Background <span className="optional">(Optional)</span>
              <input type="file" accept="image/*" onChange={e => setThumbBg(e.target.files[0] || null)} />
            </label>
          </div>
          <button type="button" className="action-btn" disabled={thumbLoading} onClick={generateThumbnail} style={{marginTop:20}}>
            {thumbLoading ? 'Generating...' : 'Generate Thumbnail'}
          </button>
          {thumbPreview && (
            <div style={{marginTop:20,display:'flex',flexDirection:'column',gap:15,alignItems:'flex-start'}}>
              <img src={thumbPreview} alt="Thumbnail" style={{width:'100%',maxWidth:600,borderRadius:12,boxShadow:'0 10px 30px rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.1)'}} />
              <a className="download-btn" href={thumbPreview} download="thumbnail.jpg" style={{width:'100%',maxWidth:600}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Thumbnail
              </a>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
