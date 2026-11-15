import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import * as deepseekService from '@/services/deepseekService';
import type { ChatMessage } from '@/services/deepseekService';
import type { Patient, Medication } from '@/types';
import { Button } from '@/components/ui/Button';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  ShieldAlert,
  FileText,
  Activity,
  Apple,
  Bot,
  User as UserIcon,
} from 'lucide-react';

interface AdminPatientAIAssistantProps {
  patient: Patient | null;
  medications: Medication[];
  unacknowledgedDosesCount?: number;
  upcomingAppointmentsCount?: number;
}

export default function AdminPatientAIAssistant({
  patient,
  medications,
  unacknowledgedDosesCount = 0,
  upcomingAppointmentsCount = 0,
}: AdminPatientAIAssistantProps) {
  const { currentLangInfo } = useLanguage();

  // If no patient is added yet, do not render
  if (!patient) return null;

  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    // Setup Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = currentLangInfo.speechLocale;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const text = event.results[0]?.[0]?.transcript;
        if (text) {
          handleSendMessage(text);
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      deepseekService.stopSpeaking();
    };
  }, [currentLangInfo.speechLocale]);

  const toggleListen = () => {
    if (!recognitionRef.current) {
      alert('Voice microphone is not supported in this browser. You can type in the prompt box.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      deepseekService.stopSpeaking();
      setIsSpeaking(false);
      recognitionRef.current.lang = currentLangInfo.speechLocale;
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Recognition already active:', e);
      }
    }
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || loading) return;

    setInputText('');
    setLoading(true);

    const updatedHistory: ChatMessage[] = [...messages, { role: 'user', content: textToSend }];
    setMessages(updatedHistory);

    const activeMeds = medications
      .filter((m) => m.isActive)
      .map((m) => ({
        name: m.name,
        dosage: m.dosage,
        form: m.form,
        instructions: m.instructions,
      }));

    try {
      const response = await deepseekService.askAdminAssistant({
        userPrompt: textToSend,
        patientName: patient.name,
        gender: patient.gender,
        bloodType: patient.bloodType,
        allergies: patient.allergies,
        activeMedications: activeMeds,
        unacknowledgedDosesCount,
        upcomingAppointmentsCount,
        languageName: currentLangInfo.name,
        nativeLanguageName: currentLangInfo.nativeName,
        history: messages,
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'An error occurred while contacting DeepSeek AI. Please check your network and API key.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = (text: string) => {
    if (isSpeaking) {
      deepseekService.stopSpeaking();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      deepseekService.speakText(text, currentLangInfo.speechLocale);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClearHistory = () => {
    deepseekService.stopSpeaking();
    setIsSpeaking(false);
    setMessages([]);
  };

  const QUICK_PROMPTS = [
    {
      label: 'Check Drug Interactions',
      icon: ShieldAlert,
      prompt: `Please perform a clinical review for ${patient.name}. Check for potential drug-drug interactions, contraindications, or side effects between these active medications.`,
    },
    {
      label: 'Doctor Briefing Note',
      icon: FileText,
      prompt: `Generate a concise clinical summary and doctor briefing note for ${patient.name}'s upcoming appointment, listing current medications, allergies, and adherence status.`,
    },
    {
      label: 'Missed Dose Protocol',
      icon: Activity,
      prompt: `What is the medically recommended protocol if ${patient.name} misses a dose of their scheduled medication?`,
    },
    {
      label: 'Dietary & Lifestyle Advice',
      icon: Apple,
      prompt: `What specific dietary considerations, hydration tips, or foods to avoid apply to ${patient.name} given their active prescriptions and age?`,
    },
  ];

  return (
    <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-[0_2px_16px_rgba(0,0,0,0.03)] overflow-hidden transition-all">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1E3A2F] via-[#2A4E40] to-[#1E3A2F] p-5 sm:p-6 text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-[#22C55E] shadow-sm">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-white">
                DeepSeek AI Clinical Assistant
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#22C55E]/30 text-[#86EFAC] border border-[#22C55E]/40">
                Patient AI
              </span>
            </div>
            <p className="text-xs text-neutral-300 mt-0.5">
              Dedicated clinical intelligence for <strong>{patient.name}</strong> • Powered by DeepSeek R1/V3
            </p>
          </div>
        </div>

        {/* Patient Status Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-neutral-200">
            Meds: <strong className="text-white">{medications.filter((m) => m.isActive).length}</strong>
          </span>
          {patient.bloodType && (
            <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-neutral-200">
              Blood: <strong className="text-white">{patient.bloodType}</strong>
            </span>
          )}
          <span className="px-3 py-1 rounded-full bg-[#22C55E]/20 text-[#86EFAC] font-semibold border border-[#22C55E]/30">
            {currentLangInfo.nativeName} ({currentLangInfo.name})
          </span>
        </div>
      </div>

      {/* Main Assistant Body */}
      <div className="p-5 sm:p-6 space-y-4">
        {/* Quick Action Suggestion Chips */}
        <div>
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
            One-Click Clinical Analysis for {patient.name}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {QUICK_PROMPTS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  disabled={loading}
                  className="flex items-center gap-2.5 p-3 rounded-2xl border border-neutral-200/80 bg-[#F9FAF7] hover:bg-[#F2F7F4] hover:border-[#22C55E]/40 text-left transition-all group disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-xl bg-white border border-neutral-200/60 flex items-center justify-center text-neutral-700 group-hover:text-[#22C55E] group-hover:border-[#22C55E]/40 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-neutral-800 group-hover:text-neutral-900 leading-snug">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversation Box */}
        <div className="bg-[#FAFBF9] rounded-2xl border border-neutral-200/70 p-4 max-h-[360px] min-h-[140px] overflow-y-auto space-y-3.5">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-neutral-400 space-y-2">
              <Bot className="w-8 h-8 text-[#22C55E]/60 mb-1" />
              <p className="text-xs font-medium text-neutral-600">
                Ask any question about <strong>{patient.name}&apos;s</strong> medications, interactions, symptoms, or care schedule.
              </p>
              <p className="text-[11px] text-neutral-400">
                Click any suggestion chip above or type your question below. Responses are provided in {currentLangInfo.name}.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex gap-3 text-xs leading-relaxed ${
                    isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-xl bg-[#1E3A2F] text-[#22C55E] flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl shadow-xs ${
                      isUser
                        ? 'bg-[#1E3A2F] text-white rounded-tr-none'
                        : 'bg-white border border-neutral-200/80 text-neutral-800 rounded-tl-none'
                    }`}
                  >
                    <div className="whitespace-pre-line font-normal">{msg.content}</div>

                    {!isUser && (
                      <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-neutral-100">
                        <button
                          onClick={() => handleSpeak(msg.content)}
                          className="flex items-center gap-1 text-[10px] font-semibold text-neutral-500 hover:text-[#22C55E] transition-colors"
                          title="Read aloud"
                        >
                          {isSpeaking ? (
                            <>
                              <VolumeX className="w-3 h-3 text-red-500" /> Stop
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3" /> Speak
                            </>
                          )}
                        </button>
                        <span className="text-neutral-300">•</span>
                        <button
                          onClick={() => handleCopy(msg.content, index)}
                          className="flex items-center gap-1 text-[10px] font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
                          title="Copy to clipboard"
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="w-3 h-3 text-[#22C55E]" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-xl bg-neutral-200 text-neutral-700 flex items-center justify-center shrink-0 mt-0.5">
                      <UserIcon className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {loading && (
            <div className="flex gap-3 text-xs justify-start items-center">
              <div className="w-7 h-7 rounded-xl bg-[#1E3A2F] text-[#22C55E] flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="bg-white border border-neutral-200/80 p-3 rounded-2xl text-neutral-500 italic flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-ping" />
                DeepSeek is reviewing {patient.name}&apos;s clinical data...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleListen}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-neutral-100 text-neutral-700 hover:bg-[#EBF7EE] hover:text-[#22C55E]'
            }`}
            title={isListening ? 'Stop listening' : 'Dictate question via microphone'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Ask DeepSeek anything about ${patient.name}...`}
              className="w-full h-11 px-4 text-xs bg-white rounded-2xl border border-neutral-200/80 focus:outline-hidden focus:ring-2 focus:ring-[#22C55E] text-neutral-900 placeholder:text-neutral-400"
              disabled={loading}
            />
          </div>

          <Button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={loading || !inputText.trim()}
            variant="primary"
            className="h-11 px-4 rounded-2xl text-xs font-bold"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Send
          </Button>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="p-2.5 rounded-2xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              title="Clear conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
