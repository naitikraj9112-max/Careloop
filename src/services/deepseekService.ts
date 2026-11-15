const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function askElderlyAssistant(params: {
  userPrompt: string;
  patientName: string;
  languageName: string;
  nativeLanguageName: string;
  activeMedications: Array<{ name: string; dosage: string; form: string; instructions?: string }>;
  history?: ChatMessage[];
}): Promise<string> {
  const apiKey = DEEPSEEK_API_KEY;
  if (!apiKey) {
    return 'DeepSeek API key is missing. Please configure VITE_DEEPSEEK_API_KEY in .env.';
  }

  const medSummary = params.activeMedications.length > 0
    ? params.activeMedications.map((m) => `- ${m.name} (${m.dosage}, ${m.form}): ${m.instructions || 'take as scheduled'}`).join('\n')
    : 'No active medications registered.';

  const systemMessage: ChatMessage = {
    role: 'system',
    content: `You are CareLoop, a loving, respectful, and compassionate voice companion for an elderly senior named ${params.patientName}.
The senior is speaking with you.
IMPORTANT INSTRUCTIONS:
1. Always respond in the senior's preferred language: ${params.languageName} (${params.nativeLanguageName}).
2. Keep your answers concise, reassuring, and gentle (maximum 2-3 short sentences) so it sounds natural when spoken aloud.
3. Be respectful and caring, like a trusted family doctor or nurse.
4. Here is ${params.patientName}'s current medication schedule:
${medSummary}
5. You can remind them about their medicines or answer simple wellness questions. If they report severe pain, chest pain, or an acute emergency, warmly urge them to use the Emergency SOS button or call their family immediately.`,
  };

  const messages: ChatMessage[] = [
    systemMessage,
    ...(params.history || []),
    { role: 'user', content: params.userPrompt },
  ];

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 250,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText);
      return `Sorry, I had trouble connecting. (${response.status})`;
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    return reply || 'I am here for you. How can I assist you today?';
  } catch (error: any) {
    console.error('DeepSeek request failed:', error);
    return 'I could not connect right now. Please check your internet connection.';
  }
}

/**
 * Ask DeepSeek for Admin & Caregiver Insights regarding a specific patient
 */
export async function askAdminAssistant(params: {
  userPrompt: string;
  patientName: string;
  gender?: string;
  bloodType?: string;
  allergies?: string[];
  activeMedications: Array<{ name: string; dosage: string; form: string; instructions?: string; frequency?: string }>;
  unacknowledgedDosesCount?: number;
  upcomingAppointmentsCount?: number;
  languageName?: string;
  nativeLanguageName?: string;
  history?: ChatMessage[];
}): Promise<string> {
  const apiKey = DEEPSEEK_API_KEY;
  if (!apiKey) {
    return 'DeepSeek API key is missing. Please configure VITE_DEEPSEEK_API_KEY in .env.';
  }

  const allergyList = params.allergies && params.allergies.length > 0 ? params.allergies.join(', ') : 'None recorded';
  const medSummary = params.activeMedications.length > 0
    ? params.activeMedications.map((m) => `- ${m.name} (${m.dosage}, ${m.form}) | Frequency: ${m.frequency || 'Daily'} | Notes: ${m.instructions || 'Standard'}`).join('\n')
    : 'No active medications registered.';

  const langInstruction = params.languageName && params.languageName !== 'English'
    ? `Respond in ${params.languageName} (${params.nativeLanguageName || ''}).`
    : 'Respond in clear, professional English.';

  const systemMessage: ChatMessage = {
    role: 'system',
    content: `You are CareLoop AI Clinical & Care Assistant for the primary caregiver and family administrator managing senior patient "${params.patientName}".
Patient Clinical Profile:
- Name: ${params.patientName}
- Gender: ${params.gender || 'Not specified'}
- Blood Type: ${params.bloodType || 'Not specified'}
- Known Allergies: ${allergyList}
- Active Prescriptions:
${medSummary}
- Dose Attention Flags: ${params.unacknowledgedDosesCount ?? 0} doses past due
- Upcoming Appointments: ${params.upcomingAppointmentsCount ?? 0} scheduled

CAPABILITIES:
1. Provide actionable clinical explanations, check potential drug-drug interactions, contraindications, and side-effect risks between their prescribed medicines.
2. Formulate doctor briefing notes or care summaries for clinical appointments.
3. Advise the caregiver on handling missed doses or schedule adjustments safely.
4. Suggest age-appropriate nutrition, hydration, and gentle activity guidelines.
5. ${langInstruction}
6. Keep recommendations structured with clean bullet points and practical steps. Note: this is clinical decision support; acute medical emergencies must be directed to emergency medical services.`,
  };

  const messages: ChatMessage[] = [
    systemMessage,
    ...(params.history || []),
    { role: 'user', content: params.userPrompt },
  ];

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 600,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText);
      return `DeepSeek service responded with error (${response.status}).`;
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    return reply || 'Analysis complete. No additional risks identified.';
  } catch (error: any) {
    console.error('DeepSeek request failed:', error);
    return 'Could not reach DeepSeek AI right now. Please verify internet connection.';
  }
}

/**
 * Web Speech Synthesis (Text-to-Speech)
 */
export function speakText(text: string, locale: string = 'hi-IN'): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser.');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const cleanText = text.replace(/[*#_~`]/g, '');
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = locale;
  utterance.rate = 0.95; // slightly slower, clear for elderly
  utterance.pitch = 1.0;

  // Try to find a matching voice for the locale
  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find((v) => v.lang === locale || v.lang.startsWith(locale.split('-')[0]));
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
