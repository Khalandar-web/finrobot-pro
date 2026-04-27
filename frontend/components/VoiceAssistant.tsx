'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Loader2, Volume2, X } from 'lucide-react'

// Browser compatibility types
declare global {
    interface Window {
        SpeechRecognition: any
        webkitSpeechRecognition: any
    }
}

export default function VoiceAssistant() {
    const [isOpen, setIsOpen] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [isThinking, setIsThinking] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [aiResponse, setAiResponse] = useState('')

    const recognitionRef = useRef<any>(null)
    const synthRef = useRef<SpeechSynthesis | null>(null)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition()
                recognitionRef.current.continuous = false
                recognitionRef.current.interimResults = true

                recognitionRef.current.onstart = () => {
                    setIsListening(true)
                    setTranscript('')
                    setAiResponse('')
                }

                recognitionRef.current.onresult = (event: any) => {
                    const current = event.resultIndex
                    const transcript = event.results[current][0].transcript
                    setTranscript(transcript)
                }

                recognitionRef.current.onerror = (event: any) => {
                    console.error('Speech recognition error', event.error)
                    setIsListening(false)
                }

                recognitionRef.current.onend = () => {
                    setIsListening(false)
                    // If we have text, send to backend
                }
            } else {
                console.warn("Web Speech API not supported in this browser.")
            }

            synthRef.current = window.speechSynthesis
        }
    }, [])

    // Trigger backend call when listening stops and we have transcript
    useEffect(() => {
        if (!isListening && transcript.trim().length > 0 && !isThinking && !aiResponse) {
            handleVoiceRequest(transcript)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isListening, transcript])

    const handleVoiceRequest = async (query: string) => {
        setIsThinking(true)
        setAiResponse('')
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
            const res = await fetch(`${apiBase}/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            })
            if (!res.ok) throw new Error()
            const data = await res.json()
            const textResponse = data.response
            setAiResponse(textResponse)
            speakResponse(textResponse)
        } catch (err) {
            setAiResponse('Sorry, I encountered an error processing your request.')
        } finally {
            setIsThinking(false)
        }
    }

    const speakResponse = (text: string) => {
        if (!synthRef.current) return
        synthRef.current.cancel() // Cancel any ongoing speech
        const utterance = new SpeechSynthesisUtterance(text)
        
        // Try to pick a good voice
        const voices = synthRef.current.getVoices()
        const preferredVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Female')) || voices[0]
        if (preferredVoice) utterance.voice = preferredVoice

        utterance.rate = 1.0
        utterance.pitch = 1.0

        utterance.onstart = () => setIsSpeaking(true)
        utterance.onend = () => setIsSpeaking(false)
        utterance.onerror = () => setIsSpeaking(false)

        synthRef.current.speak(utterance)
    }

    const toggleListen = () => {
        if (!recognitionRef.current) return

        if (isListening) {
            recognitionRef.current.stop()
        } else {
            if (synthRef.current) synthRef.current.cancel()
            setTranscript('')
            setAiResponse('')
            recognitionRef.current.start()
        }
    }

    const closeAssistant = () => {
        setIsOpen(false)
        if (isListening && recognitionRef.current) recognitionRef.current.stop()
        if (synthRef.current) synthRef.current.cancel()
        setIsSpeaking(false)
    }

    return (
        <>
            {/* Floating Action Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: isOpen ? 0 : 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-[90px] w-[52px] h-[52px] rounded-2xl flex items-center justify-center z-50 shadow-2xl"
                style={{ 
                    background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                    boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                <Mic className="text-white" size={20} />
            </motion.button>

            {/* Expanded Modal Layer */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="fixed bottom-[72px] right-[90px] w-80 rounded-3xl z-50 overflow-hidden"
                        style={{ 
                            background: 'rgba(6, 8, 15, 0.95)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.8), 0 0 40px rgba(139, 92, 246, 0.2)'
                        }}>
                        
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                                    <Volume2 size={16} className="text-purple-400" />
                                </div>
                                <span className="text-sm font-bold text-white">FinRobot Voice</span>
                            </div>
                            <button onClick={closeAssistant} className="text-gray-400 hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="p-6 flex flex-col items-center justify-center min-h-[200px] text-center">
                            
                            {/* Visualizer / State */}
                            <div className="relative mb-6">
                                {isListening && (
                                    <motion.div
                                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        className="absolute inset-0 rounded-full border border-purple-500"
                                    />
                                )}
                                <button
                                    onClick={toggleListen}
                                    className="w-16 h-16 rounded-full flex items-center justify-center relative z-10 transition-all"
                                    style={{ 
                                        background: isListening ? '#EF4444' : isThinking ? '#F59E0B' : '#8B5CF6',
                                        boxShadow: `0 0 20px ${isListening ? 'rgba(239,68,68,0.5)' : isThinking ? 'rgba(245,158,11,0.5)' : 'rgba(139,92,246,0.5)'}`
                                    }}>
                                    {isThinking ? <Loader2 className="animate-spin text-white" /> : isListening ? <MicOff className="text-white" /> : <Mic className="text-white" />}
                                </button>
                            </div>

                            {/* Text display */}
                            <div className="w-full">
                                {isListening ? (
                                    <p className="text-sm text-gray-300 italic">"{transcript || 'Listening...'}"</p>
                                ) : isThinking ? (
                                    <p className="text-sm text-amber-400 animate-pulse">Analyzing with NVIDIA AI...</p>
                                ) : aiResponse ? (
                                    <div className="text-left bg-white/5 rounded-xl p-3 max-h-32 overflow-y-auto custom-scrollbar">
                                        <p className="text-sm text-gray-200">{aiResponse}</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400">Tap the mic and ask me anything about the markets.</p>
                                )}
                            </div>

                            {isSpeaking && (
                                <motion.div 
                                    className="absolute bottom-0 left-0 h-1 bg-purple-500"
                                    animate={{ width: ['0%', '100%', '0%'] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
