// src/pages/Messagerie.tsx
import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/useStore'
import { useNotificationStore } from '@/store/useStore'
import { messagerieService, Conversation, Message, RechercheUtilisateurResult } from '@/services/messagerieService'
import { getToken, clearSession, getCandidatPhotoByUserUrl, getEntrepriseLogoByUserUrl, getFileUrl, API_ORIGIN } from '@/services/api'
import api from '@/services/api'
import GlassCard from '@/components/GlassCard'
import { 
  Search, Send, MessageCircle, Paperclip, Mic, X, Loader2, FileText, Square,
  Users, Play, Pause, Download, Image as ImageIcon, Eye
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 3000
const HEARTBEAT_INTERVAL = 30000

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

    // ⭐ Utiliser API_ORIGIN pour cibler le bon serveur (Render)
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
            case 'pong': break
            case 'ping':
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: 'ping', timestamp: new Date().toISOString() }))
              }
              break
            case 'online_users':
              if (msg.users && Array.isArray(msg.users)) setOnlineUsers(new Set(msg.users))
              break
            case 'presence':
              setOnlineUsers(prev => {
                const newSet = new Set(prev)
                if (msg.status === 'online') newSet.add(msg.user_id)
                else newSet.delete(msg.user_id)
                return newSet
              })
              break
            case 'message':
              if (msg.message) {
                setMessages(prev => {
                  if (prev.some(m => m.id === msg.message.id)) return prev
                  return [...prev, msg.message]
                })
                fetchConversations()
              }
              break
            case 'error':
              setSending(false)
              afficherNotification(msg.message || 'Impossible d\'envoyer le message', 'error')
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
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1)
            connectWebSocket()
          }, delay)
        }
      }

      ws.onerror = () => {}
    } catch (error) {}
  }, [estConnecte, reconnectAttempts, afficherNotification])

  useEffect(() => {
    if (estConnecte) {
      connectWebSocket()
      fetchConversations()
      fetchSuggestedContacts()
    }
    return () => {
      if (wsRef.current) wsRef.current.close()
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current)
    }
  }, [estConnecte, connectWebSocket])

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isUserOnline = (userId: number): boolean => onlineUsers.has(userId)

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const data = await messagerieService.getConversations()
      setConversations(data)
    } catch (error: any) {
      if (error.response?.status === 401) {
        clearSession(); window.location.href = '/connexion'; return
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchSuggestedContacts = async () => {
    try {
      const response = await api.get('/messagerie/utilisateurs/contacts')
      setSuggestedContacts(response.data)
    } catch (error) {}
  }

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setIsMobileSidebarOpen(false)
    try {
      const msgs = await messagerieService.getMessages(conversation.id)
      setMessages(msgs)
    } catch (error) {}
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    setSearching(true)
    try {
      const response = await api.get(`/messagerie/utilisateurs/recherche?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchResults(response.data)
    } catch (error) {}
    finally { setSearching(false) }
  }

  const handleStartConversation = async (user: RechercheUtilisateurResult) => {
    try {
      const conversation = await messagerieService.createConversation({
        type_conversation: 'individuel',
        participant_ids: [user.id]
      })
      setSearchQuery(''); setSearchResults([])
      await fetchConversations()
      await selectConversation(conversation)
    } catch (error) {}
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 25 * 1024 * 1024) {
      afficherNotification('Fichier trop volumineux (max 25MB)', 'error'); return
    }
    setSelectedFile(file)
    if (file.type.startsWith('image/')) setPreviewUrl(URL.createObjectURL(file))
    else setPreviewUrl(null)
  }

  const clearAttachment = () => {
    setSelectedFile(null); setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File([audioBlob], `vocal_${Date.now()}.webm`, { type: 'audio/webm' })
        sendVoiceMessage(file)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true); setRecordingTime(0)
      recordingTimerRef.current = window.setInterval(() => setRecordingTime(prev => prev + 1), 1000)
    } catch (err) {}
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
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
      setMessages(prev => [...prev, newMessage])
      fetchConversations()
    } catch (error) {}
    finally { setSending(false) }
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
      setMessages(prev => [...prev, newMessage])
      setMessageText('')
      clearAttachment()
      fetchConversations()
    } catch (error) {}
    finally { setSending(false) }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
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
        contacts.push({ ...partner, conversationId: conv.id, lastMessage: conv.dernier_message })
      }
    })
    suggestedContacts.forEach(contact => {
      if (contact.id && contact.id > 0 && !seenUserIds.has(contact.id)) contacts.push(contact)
    })
    return contacts
  }

  if (!estConnecte) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <GlassCard className="p-10 text-center max-w-md">
          <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-700 dark:text-gray-200 text-lg">Veuillez vous connecter pour accéder à la messagerie.</p>
          <button onClick={() => window.location.href = '/connexion'} className="mt-4 glass-button">Se connecter</button>
        </GlassCard>
      </div>
    )
  }

  const contactList = getContactList()

  return (
    <>
      <div className="h-[calc(100vh-80px)] flex gap-4">
        {/* Sidebar */}
        <div className={`${isMobileSidebarOpen ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-[380px] min-w-[280px] bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 overflow-hidden flex-shrink-0`}>
          <div className="p-4 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary-500" /> Messages
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
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {searching ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Résultats</div>
                {searchResults.filter(r => r.id > 0).map((result) => (
                  <button
                    key={`search-${result.id}`}
                    onClick={() => handleStartConversation(result)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition group"
                  >
                    <img src={result.role === 'entreprise' ? getEntrepriseLogoByUserUrl(result.id) : getCandidatPhotoByUserUrl(result.id)} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-primary-500/30" />
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{result.display_name || result.email}</p>
                      <p className="text-xs text-gray-500 truncate">{result.email}</p>
                    </div>
                  </button>
                ))}
              </>
            ) : contactList.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p>Aucun contact</p>
              </div>
            ) : (
              <div>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                  <Users className="w-3 h-3" /> Contacts ({contactList.length})
                </div>
                {contactList.map((contact) => {
                  const isSelected = selectedConversation?.id === contact.conversationId
                  return (
                    <button
                      key={`contact-${contact.id}`}
                      onClick={() => {
                        if (contact.conversationId) {
                          const conv = conversations.find(c => c.id === contact.conversationId)
                          if (conv) selectConversation(conv)
                        } else handleStartConversation(contact)
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
                    >
                      <img src={contact.role === 'entreprise' ? getEntrepriseLogoByUserUrl(contact.id) : getCandidatPhotoByUserUrl(contact.id)} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-primary-500/30" />
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{contact.display_name || contact.email}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {contact.lastMessage?.type_message === 'image' ? '📷 Photo' :
                           contact.lastMessage?.type_message === 'voice' ? '🎙️ Vocal' :
                           contact.lastMessage?.type_message === 'document' ? '📎 Document' :
                           contact.lastMessage?.type_message === 'video' ? '🎬 Vidéo' :
                           contact.lastMessage?.contenu || 'Nouvelle conversation'}
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
              <div className="h-16 px-4 border-b border-gray-100 dark:border-slate-700/50 flex items-center gap-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-10 shrink-0">
                {(() => {
                  const partner = getConversationPartner(selectedConversation)
                  const isOnline = isUserOnline(partner?.id || 0)
                  return (
                    <>
                      <img src={partner?.role === 'entreprise' ? getEntrepriseLogoByUserUrl(partner?.id || 0) : getCandidatPhotoByUserUrl(partner?.id || 0)} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-primary-500/30" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 dark:text-gray-200 truncate">{partner?.display_name || partner?.email || 'Utilisateur'}</p>
                        <p className={`text-xs ${isOnline ? 'text-green-600' : 'text-gray-400'}`}>{isOnline ? '🟢 En ligne' : '⚪ Hors ligne'}</p>
                      </div>
                    </>
                  )
                })()}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50/50 to-gray-100/50 dark:from-slate-900/30 dark:to-slate-800/30">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <MessageCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Aucun message</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMe = message.expediteur_id === utilisateur?.id
                    return (
                      <div key={`msg-${message.id}`} className={`flex flex-col gap-1 max-w-[85%] ${isMe ? 'items-end ml-auto' : 'items-start'}`}>
                        {!isMe && (
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 ml-1">
                            {message.expediteur?.display_name || message.expediteur?.email || 'Utilisateur'}
                          </span>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl shadow-sm ${isMe ? 'bg-primary-500 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-tl-sm border border-gray-100 dark:border-slate-700'}`}>
                          {message.piece_jointe_id && message.type_message === 'image' && (
                            <div className="mb-2">
                              <img src={getFileUrl(message.file_url || message.download_url || '')} alt="Photo" className="max-h-[300px] w-full object-cover rounded-xl cursor-pointer" onClick={() => setPhotoViewerSrc(getFileUrl(message.file_url || message.download_url || ''))} />
                            </div>
                          )}
                          {message.piece_jointe_id && (message.type_message === 'voice' || message.type_message === 'audio') && (
                            <div className="mb-2">
                              <audio src={getFileUrl(message.file_url || message.download_url || '')} controls className="w-full max-w-[280px]" />
                            </div>
                          )}
                          {message.piece_jointe_id && message.type_message === 'document' && (
                            <div className="mb-2">
                              <a href={getFileUrl(message.download_url || message.file_url || '')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-black/5 p-3 rounded-xl">
                                <FileText className="w-6 h-6 text-primary-500" /><span className="text-sm truncate">{message.file_name || 'Document'}</span>
                              </a>
                            </div>
                          )}
                          {message.piece_jointe_id && message.type_message === 'video' && (
                            <div className="mb-2">
                              <video src={getFileUrl(message.file_url || message.download_url || '')} controls className="rounded-xl max-h-[300px] w-full" preload="metadata" />
                            </div>
                          )}
                          {message.contenu && <p className="text-[15px] whitespace-pre-wrap leading-snug">{message.contenu}</p>}
                          <div className={`text-[10px] mt-1 ${isMe ? 'text-primary-100' : 'text-gray-400'}`}>
                            {new Date(message.date_envoi).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shrink-0">
                <AnimatePresence>
                  {selectedFile && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mb-2 p-3 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center gap-3 relative">
                      <button onClick={clearAttachment} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"><X className="w-3 h-3" /></button>
                      {previewUrl ? <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded-lg" /> : <FileText className="w-6 h-6 text-primary-500" />}
                      <div className="flex-1 truncate">
                        <p className="font-medium text-sm truncate dark:text-gray-200">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-end gap-2">
                  {isRecording ? (
                    <div className="flex-1 flex items-center gap-3 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-full border border-red-200">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                      <span className="font-mono text-red-600 text-sm">{formatTime(recordingTime)}</span>
                      <span className="text-sm text-red-500 flex-1">Enregistrement...</span>
                      <button onClick={stopRecording} className="p-2 bg-red-500 text-white rounded-full"><Square className="w-4 h-4 fill-current" /></button>
                    </div>
                  ) : (
                    <>
                      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.zip" className="hidden" />
                      <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-400 hover:text-primary-500 rounded-full"><Paperclip className="w-5 h-5" /></button>
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                        placeholder="Tapez un message..."
                        className="flex-1 max-h-32 min-h-[42px] resize-none bg-gray-100 dark:bg-slate-800 border-transparent rounded-2xl px-4 py-2.5 text-sm"
                        rows={1}
                      />
                      {messageText.trim() || selectedFile ? (
                        <button onClick={handleSendMessage} disabled={sending} className="p-3 bg-primary-500 hover:bg-primary-600 text-white rounded-full disabled:opacity-50">
                          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                      ) : (
                        <button onClick={startRecording} disabled={sending} className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full disabled:opacity-50">
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
              <MessageCircle className="w-14 h-14 text-gray-400 dark:text-gray-500 mb-6" />
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Messagerie</h3>
              <p className="max-w-sm text-center text-gray-500 dark:text-gray-400">Sélectionnez un contact pour commencer à discuter</p>
            </div>
          )}
        </GlassCard>
      </div>

      {photoViewerSrc && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={() => setPhotoViewerSrc(null)}>
          <img src={photoViewerSrc} alt="Photo" className="max-w-full max-h-[85vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setPhotoViewerSrc(null)} className="absolute top-4 right-4 p-3 bg-white/20 hover:bg-white/30 text-white rounded-full"><X className="w-6 h-6" /></button>
        </div>
      )}
    </>
  )
}

export default Messagerie