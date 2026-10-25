// src/pages/Messagerie.tsx
import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/useStore'
import { useNotificationStore } from '@/store/useStore'
import { messagerieService, Conversation, Message, RechercheUtilisateurResult } from '@/services/messagerieService'
import { getToken, clearSession, API_ORIGIN, getCandidatPhotoByUserUrl, getEntrepriseLogoByUserUrl, getFileUrl } from '@/services/api'
import api from '@/services/api'
import GlassCard from '@/components/GlassCard'
import { 
  Search, Send, MessageCircle, Paperclip, Mic, X, Loader2, FileText, Square,
  Users, ArrowLeft, MoreVertical, Play, Pause, Download, Image as ImageIcon,
  File as FileIcon, Video, Check, CheckCheck, Eye
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Constantes
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 3000
const HEARTBEAT_INTERVAL = 30000

// ⭐ CORRECTION : Utiliser API_ORIGIN (backend Render) au lieu du frontend
const getApiOrigin = () => {
  return API_ORIGIN
}

// ⭐⭐ COMPOSANT AVATAR AVEC PHOTO (TON DESIGN, CORRIGÉ) ⭐⭐
const UserAvatar = ({ 
  userId, 
  displayName, 
  email, 
  profilePhotoUrl,
  size = 'w-12 h-12',
  isOnline = false,
  className = ''
}: { 
  userId: number
  displayName?: string
  email?: string
  profilePhotoUrl?: string
  size?: string
  isOnline?: boolean
  className?: string
}) => {
  const [photoError, setPhotoError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  
  useEffect(() => {
    if (!userId || userId === 0) {
      setPhotoError(true)
      setLoading(false)
      return
    }

    let isMounted = true
    let objectUrl: string | null = null
    
    const fetchPhoto = async () => {
      // ⭐ CORRECTION : On essaie d'abord la photo candidat, puis le logo entreprise
      // sans token (car les routes sont publiques maintenant)
      const candidatUrl = getCandidatPhotoByUserUrl(userId)
      
      try {
        let response = await fetch(candidatUrl)
        
        if (response.ok) {
          const blob = await response.blob()
          if (blob.type.startsWith('image/')) {
            objectUrl = URL.createObjectURL(blob)
            setPhotoUrl(objectUrl)
            setPhotoError(false)
          } else {
            setPhotoError(true)
          }
        } else if (response.status === 404) {
          // Si pas de photo candidat, on essaie le logo entreprise
          try {
            const logoUrl = getEntrepriseLogoByUserUrl(userId)
            const logoResponse = await fetch(logoUrl)
            if (logoResponse.ok) {
              const blob = await logoResponse.blob()
              if (blob.type.startsWith('image/')) {
                objectUrl = URL.createObjectURL(blob)
                setPhotoUrl(objectUrl)
                setPhotoError(false)
              } else {
                setPhotoError(true)
              }
            } else {
              setPhotoError(true)
            }
          } catch (e) {
            setPhotoError(true)
          }
        } else {
          setPhotoError(true)
        }
        
        if (isMounted) {
          setLoading(false)
        }
      } catch (error) {
        console.error('❌ Erreur chargement photo:', error)
        if (isMounted) {
          setPhotoError(true)
          setLoading(false)
        }
      }
    }
    
    fetchPhoto()
    
    return () => {
      isMounted = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl)
      }
    }
  }, [userId, profilePhotoUrl])
  
  const displayNameForInitial = displayName || email || 'Utilisateur'
  const initial = displayNameForInitial.charAt(0).toUpperCase()
  
  if (loading) {
    return (
      <div className={`${size} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 animate-pulse ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    )
  }
  
  if (photoError || !photoUrl) {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-green-500 to-green-600',
      'bg-gradient-to-br from-pink-500 to-pink-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-600',
      'bg-gradient-to-br from-red-500 to-red-600',
      'bg-gradient-to-br from-yellow-500 to-yellow-600',
      'bg-gradient-to-br from-teal-500 to-teal-600'
    ]
    const colorIndex = userId && userId > 0 ? userId % colors.length : 0
    
    return (
      <div className="relative flex-shrink-0">
        <div className={`${size} rounded-full ${colors[colorIndex]} flex items-center justify-center text-white font-bold text-lg shadow-inner ${className}`}>
          {initial}
        </div>
        {isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white dark:border-slate-800" />
        )}
      </div>
    )
  }
  
  return (
    <div className="relative flex-shrink-0">
      <img
        src={photoUrl}
        alt={displayName || email}
        className={`${size} rounded-full object-cover border-2 border-primary-500/30 ${className}`}
        loading="lazy"
        onError={() => {
          setPhotoError(true)
          if (photoUrl) {
            URL.revokeObjectURL(photoUrl)
          }
        }}
      />
      {isOnline && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white dark:border-slate-800" />
      )}
    </div>
  )
}

// ⭐⭐ COMPOSANT LECTEUR AUDIO (TON DESIGN, CORRIGÉ) ⭐⭐
const AudioPlayer = ({ src, fileName }: { src: string; fileName?: string }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!src || src === 'undefined' || src === 'null' || src === '') {
      setError('URL invalide')
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    setError(null)
    let objectUrl: string | null = null
    let cancelled = false

    const loadAudio = async () => {
      try {
        const response = await fetch(src)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const blob = await response.blob()
        if (!blob.size) throw new Error('Fichier audio vide')
        objectUrl = URL.createObjectURL(blob)
        if (cancelled) return
        const audio = new Audio(objectUrl)
        audioRef.current = audio
      
        audio.addEventListener('loadedmetadata', () => {
          setDuration(audio.duration)
          setIsLoading(false)
        })
        
        audio.addEventListener('timeupdate', () => {
          setCurrentTime(audio.currentTime)
          if (audio.duration) {
            setProgress((audio.currentTime / audio.duration) * 100)
          }
        })
        
        audio.addEventListener('ended', () => {
          setIsPlaying(false)
          setProgress(0)
          setCurrentTime(0)
        })
        
        audio.addEventListener('error', () => {
          setError('Impossible de lire l\'audio')
          setIsLoading(false)
        })
        
        audio.addEventListener('canplay', () => {
          setIsLoading(false)
        })

        audio.load()
      } catch (err) {
        setError('Impossible de charger l\'audio')
        setIsLoading(false)
      }
    }

    loadAudio()
    return () => {
      cancelled = true
      audioRef.current?.pause()
      audioRef.current = null
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])
  
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        if (audioRef.current.currentTime === audioRef.current.duration) {
          audioRef.current.currentTime = 0
        }
        audioRef.current.play().catch(e => {
          setError('Impossible de lire l\'audio')
        })
        setIsPlaying(true)
      }
    }
  }
  
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const newTime = x * duration
      audioRef.current.currentTime = newTime
      setProgress(x * 100)
    }
  }
  
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  if (error) {
    return (
      <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 rounded-2xl p-2.5 min-w-[180px] max-w-[280px] border border-red-200 dark:border-red-800">
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
          <X className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          <p className="text-xs text-gray-400 truncate">{fileName || 'Audio'}</p>
        </div>
      </div>
    )
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 rounded-2xl p-2.5 min-w-[180px] max-w-[280px]">
        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse" />
        <div className="flex-1">
          <div className="w-full h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse" />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0:00</span>
            <span>0:00</span>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 rounded-2xl p-2.5 min-w-[180px] max-w-[300px]">
      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-colors flex-shrink-0 shadow-md"
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>
      
      <div className="flex-1 min-w-0">
        <div 
          ref={progressBarRef}
          className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden cursor-pointer relative group"
          onClick={handleSeek}
        >
          <div 
            className="h-full bg-primary-500 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span className="truncate ml-2 max-w-[60px]">{fileName?.replace(/\.[^.]+$/, '') || 'Audio'}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}

// ⭐⭐ COMPOSANT MESSAGE IMAGE (TON DESIGN, CORRIGÉ) ⭐⭐
const MessageImage = ({ src, alt, onClick }: { src: string; alt: string; onClick: () => void }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    const loadImage = async () => {
      try {
        const response = await fetch(src)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const blob = await response.blob()
        if (!blob.type.startsWith('image/') || !blob.size) throw new Error('Image invalide')
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) setImageUrl(objectUrl)
      } catch (error) {
        if (!cancelled) setFailed(true)
      }
    }
    loadImage()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  if (failed) return <p className="text-xs text-red-500">Image impossible à charger</p>
  if (!imageUrl) return <div className="h-40 w-56 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
  return <img src={imageUrl} alt={alt} className="max-h-[300px] w-full object-cover cursor-pointer hover:opacity-95 transition" onClick={onClick} />
}

// ⭐⭐ COMPOSANT PHOTO EN PLEIN ÉCRAN (TON DESIGN, CORRIGÉ) ⭐⭐
const PhotoViewer = ({ src, onClose }: { src: string; onClose: () => void }) => {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    fetch(src)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.blob()
      })
      .then(blob => {
        if (!blob.type.startsWith('image/') || !blob.size) throw new Error('Image invalide')
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) setDisplaySrc(objectUrl)
      })
      .catch(error => console.error('Erreur chargement photo agrandie:', error))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])
  
  const handleDownload = async () => {
    try {
      const response = await fetch(src)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'photo.jpg'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      window.open(src, '_blank')
    }
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="relative max-w-5xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={displaySrc || src} 
          alt="Photo" 
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
        />
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={handleDownload}
            className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-full transition backdrop-blur-sm"
            title="Télécharger"
          >
            <Download className="w-6 h-6" />
          </button>
          <button
            onClick={onClose}
            className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-full transition backdrop-blur-sm"
            title="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
          Cliquez sur l'image ou appuyez sur Échap pour fermer
        </div>
      </motion.div>
    </motion.div>
  )
}

// ⭐⭐ COMPOSANT PRINCIPAL (TON DESIGN INTACT) ⭐⭐
const Messagerie = () => {
  const { utilisateur, estConnecte } = useAuthStore()
  const { afficherNotification } = useNotificationStore()
  
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RechercheUtilisateurResult[]>([])
  const [suggestedContacts, setSuggestedContacts] = useState<RechercheUtilisateurResult[]>([])
  const [searching, setSearching] = useState(false)
  
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set())
  const [isWsConnected, setIsWsConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true)
  
  const [photoViewerSrc, setPhotoViewerSrc] = useState<string | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)
  const notificationSound = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    try {
      notificationSound.current = new Audio('/notification.mp3')
      notificationSound.current.volume = 0.5
    } catch (e) {}
  }, [])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const connectWebSocket = useCallback(() => {
    if (!estConnecte) return

    const token = getToken()
    if (!token) return

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // ⭐ CORRECTION : Utiliser API_ORIGIN pour cibler le backend Render
    const wsBase = API_ORIGIN.replace('https://', 'wss://').replace('http://', 'ws://')
    const wsUrl = `${wsBase}/api/messagerie/ws?token=${encodeURIComponent(token)}`
    
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setIsWsConnected(true)
        setReconnectAttempts(0)
        ws.send(JSON.stringify({ action: 'get_online_users' }))
        
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping', timestamp: new Date().toISOString() }))
          }
        }, HEARTBEAT_INTERVAL)
      }

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          
          switch (msg.action) {
            case 'pong':
              break
            case 'ping':
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: 'ping', timestamp: new Date().toISOString() }))
              }
              break
            case 'online_users':
              if (msg.users && Array.isArray(msg.users)) {
                setOnlineUsers(new Set(msg.users))
              }
              break
            case 'presence':
              setOnlineUsers(prev => {
                const newSet = new Set(prev)
                if (msg.status === 'online') {
                  newSet.add(msg.user_id)
                } else {
                  newSet.delete(msg.user_id)
                }
                return newSet
              })
              break
            case 'message':
              if (msg.message) {
                setMessages(prev => {
                  if (prev.some(m => m.id === msg.message.id)) return prev
                  
                  if (msg.message.expediteur_id !== utilisateur?.id) {
                    if (notificationSound.current) {
                      notificationSound.current.play().catch(e => {})
                    }
                    if ('Notification' in window && Notification.permission === 'granted') {
                      try {
                        const sender = msg.message.expediteur?.display_name || 'Quelqu\'un'
                        new Notification('📩 Nouveau message', {
                          body: `${sender}: ${msg.message.contenu || 'Message'}`,
                          icon: '/logo.png'
                        })
                      } catch (e) {}
                    }
                  }
                  return [...prev, msg.message]
                })
                fetchConversations()
              }
              break
            case 'error':
              setSending(false)
              afficherNotification(msg.message || 'Impossible d\'envoyer le message', 'error')
              if (msg.message?.includes('token')) {
                clearSession()
                window.location.href = '/connexion'
              }
              break
          }
        } catch (e) {}
      }

      ws.onclose = () => {
        setIsWsConnected(false)
        wsRef.current = null
        
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
          heartbeatIntervalRef.current = null
        }

        if (estConnecte && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAY * (reconnectAttempts + 1)
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1)
            connectWebSocket()
          }, delay)
        }
      }

      ws.onerror = () => {}

    } catch (error) {}
  }, [estConnecte, reconnectAttempts, afficherNotification, utilisateur])

  useEffect(() => {
    if (estConnecte) {
      connectWebSocket()
      fetchConversations()
      fetchSuggestedContacts()
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
    }
  }, [estConnecte, connectWebSocket])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (!selectedConversation || !estConnecte) return

    const refreshMessages = async () => {
      try {
        const latestMessages = await messagerieService.getMessages(selectedConversation.id)
        setMessages(previous => {
          const previousIds = new Set(previous.map(message => message.id))
          const merged = [...previous, ...latestMessages.filter(message => !previousIds.has(message.id))]
          return merged.sort((a, b) => new Date(a.date_envoi).getTime() - new Date(b.date_envoi).getTime())
        })
      } catch (error) {}
    }

    const refreshTimer = window.setInterval(refreshMessages, 5000)
    return () => window.clearInterval(refreshTimer)
  }, [selectedConversation, estConnecte])

  const isUserOnline = (userId: number): boolean => {
    return onlineUsers.has(userId)
  }

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const data = await messagerieService.getConversations()
      setConversations(data)
    } catch (error: any) {
      if (error.response?.status === 401) {
        clearSession()
        window.location.href = '/connexion'
        return
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchSuggestedContacts = async () => {
    try {
      const response = await api.get('/messagerie/utilisateurs/contacts')
      setSuggestedContacts(response.data)
    } catch (error: any) {
      if (error.response?.status === 401) {
        clearSession()
        window.location.href = '/connexion'
        return
      }
    }
  }

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setIsMobileSidebarOpen(false)
    try {
      const msgs = await messagerieService.getMessages(conversation.id)
      setMessages(msgs)
      
      const unreadMessages = msgs.filter(m => 
        m.expediteur_id !== utilisateur?.id && 
        !m.lu_par?.some(lu => lu.utilisateur_id === utilisateur?.id)
      )
      
      for (const msg of unreadMessages) {
        try {
          await messagerieService.markMessageRead(msg.id)
        } catch (e) {}
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        clearSession()
        window.location.href = '/connexion'
        return
      }
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const response = await api.get(`/messagerie/utilisateurs/recherche?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchResults(response.data)
    } catch (error: any) {
      if (error.response?.status === 401) {
        clearSession()
        window.location.href = '/connexion'
        return
      }
    } finally {
      setSearching(false)
    }
  }

  const handleStartConversation = async (user: RechercheUtilisateurResult) => {
    try {
      const conversation = await messagerieService.createConversation({
        type_conversation: 'individuel',
        participant_ids: [user.id]
      })
      setSearchQuery('')
      setSearchResults([])
      await fetchConversations()
      await selectConversation(conversation)
      afficherNotification(`Conversation démarrée avec ${user.display_name || user.email}`, 'success')
    } catch (error: any) {
      if (error.response?.status === 401) {
        clearSession()
        window.location.href = '/connexion'
        return
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.size > 25 * 1024 * 1024) {
      afficherNotification('Fichier trop volumineux (max 25MB)', 'error')
      return
    }
    
    setSelectedFile(file)
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }
  }

  const clearAttachment = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const startRecording = async () => {
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        afficherNotification("Le microphone du téléphone nécessite HTTPS. Utilisez le bouton pièce jointe pour envoyer un fichier audio.", 'error')
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4'
      ]
      const mimeType = typeof MediaRecorder.isTypeSupported === 'function'
        ? supportedTypes.find(type => MediaRecorder.isTypeSupported(type)) || ''
        : ''
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const recordingMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm'
        const extension = recordingMimeType.includes('ogg') ? 'ogg' : recordingMimeType.includes('mp4') ? 'mp4' : 'webm'
        const audioBlob = new Blob(audioChunksRef.current, { type: recordingMimeType })
        const file = new File([audioBlob], `vocal_${Date.now()}.${extension}`, { type: recordingMimeType })
        sendVoiceMessage(file)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.onerror = () => {
        stream.getTracks().forEach(track => track.stop())
        setIsRecording(false)
        afficherNotification("Impossible d'enregistrer le vocal", 'error')
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = window.setInterval(() => setRecordingTime(prev => prev + 1), 1000)
    } catch (err) {
      afficherNotification("Impossible d'accéder au microphone", 'error')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    }
  }

  const sendVoiceMessage = async (audioFile: File) => {
    if (!selectedConversation) return
    setSending(true)
    try {
      const uploadRes = await messagerieService.uploadMessageFile(audioFile)
      
      const payload = {
        conversation_id: selectedConversation.id,
        type_message: 'voice' as const,
        piece_jointe_id: uploadRes.id,
        file_name: audioFile.name,
        file_size: audioFile.size,
        mime_type: audioFile.type,
        duration: recordingTime
      }

      const newMessage = await messagerieService.sendMessage(payload)
      setMessages(prev => prev.some(message => message.id === newMessage.id) ? prev : [...prev, newMessage])
      fetchConversations()
    } catch (error: any) {
      afficherNotification("Erreur d'envoi du message vocal", 'error')
    } finally {
      setSending(false)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedConversation || (!messageText.trim() && !selectedFile)) return

    setSending(true)
    try {
      let piece_jointe_id = undefined
      let file_name = undefined
      let file_size = undefined
      let mime_type = undefined
      let type_message: 'text' | 'image' | 'document' | 'video' | 'audio' = 'text'

      if (selectedFile) {
        const uploadRes = await messagerieService.uploadMessageFile(selectedFile)
        piece_jointe_id = uploadRes.id
        file_name = selectedFile.name
        file_size = selectedFile.size
        mime_type = selectedFile.type
        if (mime_type.startsWith('image/')) type_message = 'image'
        else if (mime_type.startsWith('video/')) type_message = 'video'
        else if (mime_type.startsWith('audio/')) type_message = 'audio'
        else type_message = 'document'
      }

      const payload = {
        conversation_id: selectedConversation.id,
        type_message,
        contenu: messageText.trim() || undefined,
        piece_jointe_id,
        file_name,
        file_size,
        mime_type
      }

      const newMessage = await messagerieService.sendMessage(payload)
      setMessages(prev => prev.some(message => message.id === newMessage.id) ? prev : [...prev, newMessage])
      setMessageText('')
      clearAttachment()
      fetchConversations()
    } catch (error: any) {
      if (error.response?.status === 401) {
        clearSession()
        window.location.href = '/connexion'
        return
      }
      afficherNotification('Impossible d\'envoyer le message', 'error')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // ⭐⭐ RENDU DES MESSAGES (TON DESIGN, CORRIGÉ) ⭐⭐
  const renderMessageContent = (message: Message) => {
    const isMe = message.expediteur_id === utilisateur?.id

    const getInlineUrl = (fileUrl?: string, downloadUrl?: string) => {
      const raw = fileUrl || downloadUrl || ''
      if (!raw) return null
      return getFileUrl(raw.replace('/download', '/view'))
    }

    const getAttachmentUrl = (fileUrl?: string, downloadUrl?: string) => {
      const raw = fileUrl || downloadUrl || ''
      if (!raw) return null
      return getFileUrl(raw)
    }

    const senderName = message.expediteur?.display_name ||
                       message.expediteur?.email ||
                       'Utilisateur'
    
    return (
      <div className={`flex flex-col gap-1 max-w-[85%] ${isMe ? 'items-end ml-auto' : 'items-start'}`}>
        {!isMe && (
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 ml-1 flex items-center gap-1.5">
            <UserAvatar 
              userId={message.expediteur_id}
              displayName={senderName}
              email={message.expediteur?.email}
              profilePhotoUrl={message.expediteur?.photo_profil_url}
              size="w-4 h-4"
            />
            {senderName}
          </span>
        )}
        <div className={`px-4 py-2.5 rounded-2xl shadow-sm ${
          isMe 
            ? 'bg-primary-500 text-white rounded-tr-sm' 
            : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-tl-sm border border-gray-100 dark:border-slate-700'
        }`}>
          
          {/* PHOTO */}
          {message.piece_jointe_id && message.type_message === 'image' && (
            <div className="mb-2 relative group">
              <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <MessageImage
                  src={getInlineUrl(message.file_url, message.download_url) || ''}
                  alt={message.file_name || 'Photo'}
                  onClick={() => {
                    const fullUrl = getInlineUrl(message.file_url, message.download_url)
                    if (fullUrl) setPhotoViewerSrc(fullUrl)
                  }}
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition flex items-center justify-center opacity-0 hover:opacity-100">
                  <div className="bg-black/50 text-white p-2 rounded-full">
                    <Eye className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="text-xs opacity-60 mt-1 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                {message.file_name || 'Photo'}
              </div>
            </div>
          )}

          {/* AUDIO */}
          {message.piece_jointe_id && (message.type_message === 'voice' || message.type_message === 'audio') && (
            <div className="mb-1">
              <AudioPlayer 
                src={getInlineUrl(message.file_url, message.download_url) || ''}
                fileName={message.file_name}
              />
            </div>
          )}

          {/* DOCUMENT */}
          {message.piece_jointe_id && message.type_message === 'document' && (
            <div className="mb-2">
              <a 
                href={getAttachmentUrl(message.download_url, message.file_url) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-black/5 dark:bg-white/5 p-3 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition group border border-gray-200 dark:border-gray-700"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">
                    {message.file_name || 'Document'}
                  </span>
                  <span className="text-xs opacity-70">
                    {message.file_size ? (message.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'Fichier'}
                  </span>
                </div>
                <div className="p-2 rounded-full bg-primary-500/20 group-hover:bg-primary-500/40 transition">
                  <Download className="w-4 h-4 text-primary-500" />
                </div>
              </a>
            </div>
          )}

          {/* VIDEO */}
          {message.piece_jointe_id && message.type_message === 'video' && (
            <div className="mb-2">
              <video 
                src={getInlineUrl(message.file_url, message.download_url) || ''}
                controls
                className="rounded-xl max-h-[300px] w-full"
                preload="metadata"
              />
            </div>
          )}

          {/* TEXTE */}
          {message.contenu && <p className="text-[15px] whitespace-pre-wrap leading-snug">{message.contenu}</p>}
          
          {/* DATE ET STATUT */}
          <div className={`text-[10px] mt-1 flex items-center gap-1 ${isMe ? 'text-primary-100' : 'text-gray-400'}`}>
            <span>{new Date(message.date_envoi).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            {message.est_modifie && <span className="opacity-60">(modifié)</span>}
            {isMe && (
              <span className="ml-1">
                {message.lu_par && message.lu_par.length > 0 ? (
                  <CheckCheck className="w-3 h-3 text-primary-200" />
                ) : (
                  <Check className="w-3 h-3 opacity-60" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const getConversationPartner = (conv: Conversation) => {
    return conv.participants.find((p) => p.id !== utilisateur?.id)
  }

  const getContactList = () => {
    const contacts: (RechercheUtilisateurResult & { conversationId?: number; lastMessage?: any })[] = []
    const seenUserIds = new Set<number>()

    conversations.forEach(conv => {
      const partner = getConversationPartner(conv)
      if (partner && partner.id && partner.id > 0) {
        seenUserIds.add(partner.id)
        contacts.push({
          ...partner,
          conversationId: conv.id,
          lastMessage: conv.dernier_message
        })
      }
    })

    suggestedContacts.forEach(contact => {
      if (contact.id && contact.id > 0 && !seenUserIds.has(contact.id)) {
        contacts.push(contact)
      }
    })

    return contacts
  }

  if (!estConnecte) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <GlassCard className="p-10 text-center max-w-md">
          <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-700 dark:text-gray-200 text-lg">Veuillez vous connecter pour accéder à la messagerie.</p>
          <button onClick={() => window.location.href = '/connexion'} className="mt-4 glass-button">
            Se connecter
          </button>
        </GlassCard>
      </div>
    )
  }

  const contactList = getContactList()

  return (
    <>
      {/* PHOTO VIEWER */}
      {photoViewerSrc && (
        <PhotoViewer 
          src={photoViewerSrc} 
          onClose={() => setPhotoViewerSrc(null)} 
        />
      )}

      <div className="h-[calc(100vh-80px)] flex gap-4">
        {/* Sidebar */}
        <div className={`
          ${isMobileSidebarOpen ? 'flex' : 'hidden'} 
          lg:flex flex-col w-full lg:w-[380px] min-w-[280px] 
          bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 
          overflow-hidden flex-shrink-0
        `}>
          <div className="p-4 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary-500" />
                Messages
              </h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-400">{isWsConnected ? 'En ligne' : 'Hors ligne'}</span>
              </div>
            </div>
            
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm"
                placeholder="Rechercher un contact..."
              />
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              {searchQuery && (
                <button 
                  onClick={() => {setSearchQuery(''); setSearchResults([])}} 
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {searching ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Résultats</div>
                {searchResults
                  .filter(result => result.id && result.id > 0)
                  .map((result) => {
                    const isOnline = isUserOnline(result.id)
                    return (
                      <button
                        key={`search-${result.id}`}
                        onClick={() => handleStartConversation(result)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition group"
                      >
                        <UserAvatar 
                          userId={result.id}
                          displayName={result.display_name}
                          email={result.email}
                          profilePhotoUrl={result.photo_profil_url}
                          size="w-10 h-10"
                          isOnline={isOnline}
                        />
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                            {result.display_name || result.email}
                          </p>
                          <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                            {result.email}
                            <span className={`text-[10px] ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                              • {isOnline ? 'En ligne' : 'Hors ligne'}
                            </span>
                          </p>
                        </div>
                      </button>
                    )
                  })}
              </>
            ) : loading ? (
              <div className="space-y-2 p-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : contactList.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>Aucun contact</p>
                <p className="text-xs mt-1">Recherchez pour trouver des personnes</p>
              </div>
            ) : (
              <div>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  Contacts ({contactList.length})
                </div>
                {contactList.map((contact) => {
                  const isOnline = isUserOnline(contact.id)
                  const isSelected = selectedConversation?.id === contact.conversationId
                  const lastMsg = contact.lastMessage
                  
                  return (
                    <button
                      key={`contact-${contact.id}`}
                      onClick={() => {
                        if (contact.conversationId) {
                          const conv = conversations.find(c => c.id === contact.conversationId)
                          if (conv) selectConversation(conv)
                        } else {
                          handleStartConversation(contact)
                        }
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${
                        isSelected 
                          ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800/30' 
                          : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <UserAvatar 
                        userId={contact.id}
                        displayName={contact.display_name}
                        email={contact.email}
                        profilePhotoUrl={contact.photo_profil_url}
                        size="w-12 h-12"
                        isOnline={isOnline}
                      />
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex justify-between items-baseline">
                          <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {contact.display_name || contact.email}
                          </p>
                          {lastMsg && (
                            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                              {new Date(lastMsg.date_envoi).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm truncate ${
                          isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500'
                        }`}>
                          {lastMsg?.type_message === 'image' ? '📷 Photo' : 
                           lastMsg?.type_message === 'voice' ? '🎙️ Vocal' :
                           lastMsg?.type_message === 'document' ? '📎 Document' :
                           lastMsg?.type_message === 'video' ? '🎬 Vidéo' :
                           lastMsg?.contenu || 'Nouvelle conversation'}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ZONE DE DISCUSSION */}
        <GlassCard className="flex-1 flex flex-col overflow-hidden shadow-xl border-white/50">
          {selectedConversation ? (
            <>
              {/* Header Chat */}
              <div className="h-16 px-4 border-b border-gray-100 dark:border-slate-700/50 flex items-center gap-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-10 shrink-0">
                <button
                  onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                  className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <Users className="w-5 h-5" />
                </button>
                
                {(() => {
                  const partner = getConversationPartner(selectedConversation)
                  const isOnline = isUserOnline(partner?.id || 0)
                  const partnerName = partner?.display_name || partner?.email || 'Utilisateur'
                  return (
                    <>
                      <UserAvatar 
                        userId={partner?.id || 0}
                        displayName={partnerName}
                        email={partner?.email}
                        profilePhotoUrl={partner?.photo_profil_url}
                        size="w-10 h-10"
                        isOnline={isOnline}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 dark:text-gray-200 truncate">
                          {partnerName}
                        </p>
                        <p className={`text-xs ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                          {isOnline ? '🟢 En ligne' : '⚪ Hors ligne'}
                        </p>
                      </div>
                    </>
                  )
                })()}
                
                <div className="flex items-center gap-1 ml-auto">
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition">
                    <MoreVertical className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div 
                key={`messages-container-${selectedConversation.id}`}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50/50 to-gray-100/50 dark:from-slate-900/30 dark:to-slate-800/30"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                      <MessageCircle className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">Aucun message</p>
                    <p className="text-sm text-gray-400">Envoyez un message pour commencer</p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div 
                      key={`msg-${message.id}-${index}`} 
                      className={`flex ${message.expediteur_id === utilisateur?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      {renderMessageContent(message)}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shrink-0">
                <AnimatePresence>
                  {selectedFile && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mb-2 p-3 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center gap-3 relative"
                    >
                      <button onClick={clearAttachment} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-sm">
                        <X className="w-3 h-3" />
                      </button>
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded-lg shadow-sm" />
                      ) : (
                        <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-sm">
                          <FileText className="w-6 h-6 text-primary-500" />
                        </div>
                      )}
                      <div className="flex-1 truncate">
                        <p className="font-medium text-sm truncate dark:text-gray-200">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-2">
                  {isRecording ? (
                    <div className="flex-1 flex items-center gap-3 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-full border border-red-200 dark:border-red-900/30">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                      <span className="font-mono text-red-600 dark:text-red-400 font-medium text-sm">{formatTime(recordingTime)}</span>
                      <span className="text-sm text-red-500 flex-1">Enregistrement...</span>
                      <button onClick={stopRecording} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition">
                        <Square className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.zip"
                        className="hidden"
                      />
                      
                      <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="p-2.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-slate-800 rounded-full transition"
                        title="Joindre un fichier"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                      
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                        placeholder="Tapez un message..."
                        className="flex-1 max-h-32 min-h-[42px] resize-none bg-gray-100 dark:bg-slate-800 border-transparent rounded-2xl px-4 py-2.5 focus:bg-white dark:focus:bg-slate-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all text-sm"
                        rows={1}
                      />

                      {messageText.trim() || selectedFile ? (
                        <button
                          onClick={handleSendMessage}
                          disabled={sending}
                          className="p-3 bg-primary-500 hover:bg-primary-600 text-white rounded-full transition-all shadow-md shadow-primary-500/30 disabled:opacity-50 flex items-center justify-center"
                          title="Envoyer"
                        >
                          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                      ) : (
                        <button
                          onClick={startRecording}
                          disabled={sending}
                          className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-all shadow-md shadow-blue-500/30 flex items-center justify-center disabled:opacity-50"
                          title="Vocal"
                        >
                          <Mic className="w-5 h-5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-6 shadow-sm">
                <MessageCircle className="w-14 h-14 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Messagerie</h3>
              <p className="max-w-sm text-center text-gray-500 dark:text-gray-400">
                Sélectionnez un contact pour commencer à discuter
              </p>
              
              {contactList.length === 0 && (
                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl max-w-sm">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 text-center">
                    💡 Utilisez la barre de recherche pour trouver des contacts
                  </p>
                </div>
              )}

              <div className="mt-6 flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-gray-400">{isWsConnected ? 'Connecté' : 'Connexion...'}</span>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </>
  )
}

export default Messagerie