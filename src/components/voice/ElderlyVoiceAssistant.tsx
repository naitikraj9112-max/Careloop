import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import * as deepseekService from '@/services/deepseekService';
import type { ChatMessage } from '@/services/deepseekService';
import { Button } from '@/components/ui/Button';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, Send, MessageCircleHeart, X } from 'lucide-react';

interface ElderlyVoiceAssistantProps {
  patientName: string;
  activeMedications: Array<{ name: string; dosage: string; form: string; instructions?: string }>;
}

export default function ElderlyVoiceAssistant({
  patientName,
  activeMedications,
}: ElderlyVoiceAssistantProps) {
  const { t, currentLangInfo } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [inputText, setInputText] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Web Speech API support
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
          setTranscript(text);
          handleSendQuery(text);
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
      alert('Voice microphone is not supported in this browser. You can type in the box below.');
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
        console.warn('Recognition already started:', e);
      }
    }
  };

  const handleSendQuery = async (queryText: string) => {
    const textToSend = queryText.trim() || inputText.trim();
    if (!textToSend) return;

    setInputText('');
    setTranscript('');
    setLoading(true);

    const newHistory: ChatMessage[] = [...history, { role: 'user', content: textToSend }];
    setHistory(newHistory);

    try {
      const response = await deepseekService.askElderlyAssistant({
        userPrompt: textToSend,
        patientName,
        languageName: currentLangInfo.name,
        nativeLanguageName: currentLangInfo.nativeName,
        activeMedications,
        history,
      });

      setHistory([...newHistory, { role: 'assistant', content: response }]);

      // Speak response aloud via Web Speech
      setIsSpeaking(true);
      deepseekService.speakText(response, currentLangInfo.speechLocale);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStopSpeech = () => {
    deepseekService.stopSpeaking();
    setIsSpeaking(false);
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-neutral-200/90 shadow-[0_2px_14px_rgba(0,0,0,0.03)] space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#EBF7EE] text-[#22C55E] flex items-center justify-center">
            <MessageCircleHeart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-neutral-900 text-sm tracking-tight flex items-center gap-1.5">
              <span>{t('voiceAssistant')}</span>
              <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-semibold">
                DeepSeek AI
              </span>
            </h3>
            <p className="text-xs text-neutral-500 font-medium">
              Speaking in: <strong className="text-[#22C55E]">{currentLangInfo.nativeName} ({currentLangInfo.name})</strong>
            </p>
          </div>
        </div>

        {isSpeaking && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStopSpeech}
            className="text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-full"
          >
            <VolumeX className="w-3.5 h-3.5 mr-1" />
            Stop Audio
          </Button>
        )}
      </div>

      {/* Main Microphone Action Card */}
      <div className="bg-[#F9FAF7] rounded-2xl p-4 text-center border border-neutral-200/80 flex flex-col items-center justify-center space-y-3">
        <button
          type="button"
          onClick={toggleListen}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
            isListening
              ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200'
              : 'bg-neutral-900 text-white hover:bg-neutral-800'
          }`}
          aria-label={isListening ? 'Stop listening' : 'Start speaking'}
        >
          {isListening ? <Mic className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
        </button>

        <p className="text-xs font-bold text-neutral-800">
          {isListening ? t('listening') : t('tapToSpeak')}
        </p>
        <p className="text-[11px] text-neutral-500 max-w-xs">
          {t('askVoiceHelp')}
        </p>
      </div>

      {/* Chat History & Recent Response */}
      {history.length > 0 && (
        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 text-xs">
          {history.slice(-4).map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold ml-6 text-right'
                  : 'bg-[#EBF7EE] text-[#1e6f39] mr-4 text-left border border-[#22C55E]/30 leading-relaxed font-medium'
              }`}
            >
              {msg.content}
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="py-2 text-center text-xs text-neutral-500 font-medium animate-pulse">
          Thinking with DeepSeek AI...
        </div>
      )}

      {/* Manual Input Fallback */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendQuery(inputText);
        }}
        className="flex items-center gap-2 pt-1"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Type a question in ${currentLangInfo.nativeName}...`}
          className="flex-1 bg-neutral-50 border border-neutral-200 rounded-full px-4 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#22C55E]"
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!inputText.trim() || loading}
          className="rounded-full px-4 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>
    </div>
  );
}
