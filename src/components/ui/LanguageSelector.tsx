import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';

export default function LanguageSelector({ variant = 'pill' }: { variant?: 'pill' | 'compact' }) {
  const { language, setLanguage, currentLangInfo } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-2 border border-neutral-200/90 bg-white hover:bg-neutral-50 transition-colors shadow-2xs font-semibold text-neutral-800 ${
          variant === 'pill'
            ? 'px-3.5 py-1.5 rounded-full text-xs'
            : 'px-2.5 py-1 rounded-xl text-xs'
        }`}
        aria-label="Select Language"
      >
        <Globe className="w-3.5 h-3.5 text-[#22C55E]" />
        <span>{currentLangInfo.nativeName}</span>
        <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-2xl shadow-xl bg-white border border-neutral-200/90 py-1.5 z-50 focus:outline-hidden max-h-72 overflow-y-auto">
          <div className="px-3 py-1 border-b border-neutral-100 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
            Select Language
          </div>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-[#EBF7EE] text-[#1e6f39] font-bold'
                    : 'text-neutral-700 hover:bg-neutral-50 font-medium'
                }`}
              >
                <div>
                  <span className="block font-bold">{lang.nativeName}</span>
                  <span className="block text-[10px] text-neutral-400">{lang.name}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#22C55E]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
