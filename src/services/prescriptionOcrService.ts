import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Configure PDF.js worker using unpkg or fallback
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface ExtractedMedication {
  id: string; // temporary UI key
  name: string;
  genericName?: string;
  dosage: string;
  form: string;
  frequency: 'daily' | 'twice_daily' | 'three_times_daily' | 'weekly' | 'custom' | 'once';
  times: string[]; // ["08:00", "20:00"]
  instructions: string;
  prescribedBy?: string;
  startDate?: string;
  selected: boolean;
}

export interface PrescriptionExtractionResult {
  doctorName?: string;
  clinicName?: string;
  date?: string;
  medications: ExtractedMedication[];
  rawText: string;
  sourceType?: 'pdf' | 'image';
}

/**
 * Extracts plain text from an uploaded PDF file.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageStrings = textContent.items
      .map((item: any) => item.str || '')
      .filter((s: string) => s.trim().length > 0);
    fullText += pageStrings.join(' ') + '\n';
  }

  return fullText;
}

/**
 * Converts a File to base64 data string.
 */
export async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve({ base64, mimeType: file.type || 'image/jpeg' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extracts plain text from an uploaded image (PNG, JPG, WEBP, etc.) using Tesseract.js.
 */
export async function extractTextFromImage(file: File): Promise<string> {
  const worker = await createWorker('eng');
  const ret = await worker.recognize(file);
  await worker.terminate();
  return ret.data.text;
}

/**
 * Common medication database for fuzzy matching and identification.
 */
const KNOWN_DRUGS = [
  'metformin', 'lisinopril', 'atorvastatin', 'amlodipine', 'omeprazole',
  'losartan', 'metoprolol', 'levothyroxine', 'gabapentin', 'hydrochlorothiazide',
  'sertraline', 'simvastatin', 'montelukast', 'escitalopram', 'rosuvastatin',
  'furosemide', 'pantoprazole', 'doxycycline', 'amoxicillin', 'azithromycin',
  'prednisone', 'ciprofloxacin', 'alprazolam', 'tramadol', 'clonazepam',
  'aspirin', 'paracetamol', 'acetaminophen', 'ibuprofen', 'clopidogrel',
  'eliquis', 'apixaban', 'xarelto', 'rivaroxaban', 'warfarin', 'carvedilol',
  'spironolactone', 'tamsulosin', 'finasteride', 'allopurinol', 'glipizide',
  'glimepiride', 'empagliflozin', 'jardiance', 'sitagliptin', 'januvia',
  'duloxetine', 'pregabalin', 'donepezil', 'memantine', 'insulin',
  'albuterol', 'fluticasone', 'probiotic', 'omega 3', 'vitamin d', 'calcium',
  'cyanocobalamin', 'b12', 'iron', 'folic acid', 'multivitamin'
];

/**
 * Frequency helper to deduce times array and standardized frequency.
 */
function parseFrequencyAndTimes(text: string): { frequency: ExtractedMedication['frequency']; times: string[] } {
  const lower = text.toLowerCase();

  // 1-0-1 pattern
  if (/1\s*-\s*0\s*-\s*1/.test(lower) || /twice\s*daily/i.test(lower) || /\bbid\b/i.test(lower) || /\bb\.i\.d\b/i.test(lower)) {
    return { frequency: 'twice_daily', times: ['09:00', '21:00'] };
  }

  // 1-1-1 pattern
  if (/1\s*-\s*1\s*-\s*1/.test(lower) || /three\s*times\s*daily/i.test(lower) || /\btid\b/i.test(lower) || /\bt\.i\.d\b/i.test(lower)) {
    return { frequency: 'three_times_daily', times: ['08:00', '14:00', '20:00'] };
  }

  // 1-0-0 or 0-0-1 or once daily
  if (/1\s*-\s*0\s*-\s*0/.test(lower) || /morning/i.test(lower)) {
    return { frequency: 'daily', times: ['09:00'] };
  }
  if (/0\s*-\s*0\s*-\s*1/.test(lower) || /bedtime/i.test(lower) || /night/i.test(lower) || /\bhs\b/i.test(lower)) {
    return { frequency: 'daily', times: ['21:00'] };
  }

  if (/once\s*daily/i.test(lower) || /\bod\b/i.test(lower) || /\bqd\b/i.test(lower) || /every\s*day/i.test(lower)) {
    return { frequency: 'daily', times: ['09:00'] };
  }

  if (/weekly/i.test(lower) || /once\s*a\s*week/i.test(lower)) {
    return { frequency: 'weekly', times: ['09:00'] };
  }

  return { frequency: 'daily', times: ['09:00'] };
}

/**
 * Standardize form (tablet, capsule, etc.)
 */
function parseForm(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(cap|capsule|capsules)\b/.test(lower)) return 'capsule';
  if (/\b(tab|tablet|tablets|pill|pills)\b/.test(lower)) return 'tablet';
  if (/\b(liquid|syrup|solution|suspension)\b/.test(lower)) return 'liquid';
  if (/\b(inj|injection|vial|pen)\b/.test(lower)) return 'injection';
  if (/\b(drops?|eye\s*drops?)\b/.test(lower)) return 'drops';
  if (/\b(inhaler|puff|puffs)\b/.test(lower)) return 'inhaler';
  if (/\b(cream|ointment|gel)\b/.test(lower)) return 'cream';
  if (/\b(patch|patches)\b/.test(lower)) return 'patch';
  return 'tablet';
}

/**
 * Clinical regex-based parser that scans prescription text for medications.
 */
export function parsePrescriptionText(rawText: string): PrescriptionExtractionResult {
  const lines = rawText
    .split(/\r?\n|;|\band\b/i)
    .map((l) => l.trim())
    .filter((l) => l.length > 3);

  // 1. Detect Doctor name
  let doctorName = '';
  const drMatch = rawText.match(/(?:Dr\.|Doctor|Physician:?)\s*([A-Za-z\s.]+?)(?:\r?\n|,|$)/i);
  if (drMatch && drMatch[1]) {
    doctorName = 'Dr. ' + drMatch[1].trim().replace(/^dr\.?\s*/i, '');
  }

  // 2. Detect Clinic / Hospital name
  let clinicName = '';
  const clinicMatch = rawText.match(/([A-Z][a-zA-Z\s]+?(?:Hospital|Clinic|Healthcare(?:\s*Center)?|Medical Center|Health Center))/i);
  if (clinicMatch && clinicMatch[1]) {
    clinicName = clinicMatch[1].trim().replace(/^.*?\r?\n/, '').trim();
  }

  // 3. Scan line by line for medications
  const medications: ExtractedMedication[] = [];
  const foundNames = new Set<string>();

  const dosageRegex = /\b(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?|tablets?|capsules?|drops?))\b/i;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const lowerLine = line.toLowerCase();

    let matchedDrug = KNOWN_DRUGS.find((d) => lowerLine.includes(d));
    let dosage = '';

    const doseMatch = line.match(dosageRegex);
    if (doseMatch) {
      dosage = doseMatch[1].toLowerCase().replace(/\s+/g, '');
    }

    if (!matchedDrug && (lowerLine.startsWith('tab') || lowerLine.startsWith('cap') || lowerLine.startsWith('rx') || /^\d+\.?\s+[A-Z]/.test(line))) {
      const parts = line.replace(/^(?:\d+\.|\bRx:?|\bTab\.?|\bCap\.?)\s*/i, '').trim().split(/\s+/);
      if (parts[0] && parts[0].length >= 3 && !/^(take|after|before|daily|every|with|mg|mcg)$/i.test(parts[0])) {
        matchedDrug = parts[0].toLowerCase();
      }
    }

    if (matchedDrug && !foundNames.has(matchedDrug)) {
      foundNames.add(matchedDrug);

      const capitalizedName = matchedDrug.charAt(0).toUpperCase() + matchedDrug.slice(1);
      const form = parseForm(line);
      const { frequency, times } = parseFrequencyAndTimes(line);

      let instructions = '';
      if (/after\s*(?:food|meals?|eating|breakfast|dinner)/i.test(line)) {
        instructions = 'Take after food';
      } else if (/before\s*(?:food|meals?|eating|breakfast|dinner)/i.test(line)) {
        instructions = 'Take before meals';
      } else if (/with\s*(?:food|meals?|water)/i.test(line)) {
        instructions = 'Take with food/water';
      } else if (/bedtime|at\s*night/i.test(line)) {
        instructions = 'Take at bedtime';
      } else {
        instructions = 'As directed by physician';
      }

      medications.push({
        id: `extracted_${Date.now()}_${idx}`,
        name: capitalizedName,
        genericName: capitalizedName,
        dosage: dosage || '500mg',
        form,
        frequency,
        times,
        instructions,
        prescribedBy: doctorName || undefined,
        startDate: new Date().toISOString().split('T')[0],
        selected: true,
      });
    }
  }

  // Fallback scan
  if (medications.length === 0) {
    lines.forEach((line, idx) => {
      const doseMatch = line.match(dosageRegex);
      if (doseMatch) {
        const words = line.replace(/^\d+\.?\s*/, '').split(/\s+/);
        const nameCandidate = words[0];
        if (nameCandidate && nameCandidate.length > 2 && !foundNames.has(nameCandidate.toLowerCase())) {
          foundNames.add(nameCandidate.toLowerCase());
          const { frequency, times } = parseFrequencyAndTimes(line);
          medications.push({
            id: `extracted_${Date.now()}_${idx}`,
            name: nameCandidate.charAt(0).toUpperCase() + nameCandidate.slice(1),
            dosage: doseMatch[1],
            form: parseForm(line),
            frequency,
            times,
            instructions: 'As directed on prescription',
            prescribedBy: doctorName || undefined,
            startDate: new Date().toISOString().split('T')[0],
            selected: true,
          });
        }
      }
    });
  }

  return {
    doctorName,
    clinicName,
    date: new Date().toLocaleDateString(),
    medications,
    rawText,
  };
}

/**
 * Text extraction with Gemini AI
 */
export async function extractWithGeminiAI(
  rawText: string,
  apiKey?: string
): Promise<PrescriptionExtractionResult | null> {
  const key = apiKey || import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) return null;

  try {
    const prompt = `You are a clinical pharmacologist. Analyze the prescription text below and extract all prescribed medications, doctor name, and clinic name into a valid JSON object.
Format:
{
  "doctorName": "Dr. Full Name",
  "clinicName": "Clinic Name",
  "medications": [
    {
      "name": "Medicine Brand or Chemical Name",
      "genericName": "Generic name",
      "dosage": "e.g. 500mg",
      "form": "tablet | capsule | liquid | injection | drops | inhaler | cream | patch",
      "frequency": "daily | twice_daily | three_times_daily | weekly | custom | once",
      "times": ["09:00"] or ["09:00", "21:00"],
      "instructions": "intake directions like 'after meals'"
    }
  ]
}

Prescription Text:
${rawText}

Respond ONLY with valid JSON. Do not wrap in markdown or backticks.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) return null;

    const json = await response.json();
    const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return null;

    const cleaned = candidateText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      doctorName: parsed.doctorName,
      clinicName: parsed.clinicName,
      date: new Date().toLocaleDateString(),
      rawText,
      medications: (parsed.medications || []).map((m: any, idx: number) => ({
        id: `gemini_${Date.now()}_${idx}`,
        name: m.name || 'Medication',
        genericName: m.genericName || m.name,
        dosage: m.dosage || '500mg',
        form: m.form || 'tablet',
        frequency: m.frequency || 'daily',
        times: Array.isArray(m.times) && m.times.length > 0 ? m.times : ['09:00'],
        instructions: m.instructions || 'As prescribed',
        prescribedBy: parsed.doctorName || undefined,
        startDate: new Date().toISOString().split('T')[0],
        selected: true,
      })),
    };
  } catch (err) {
    console.warn('Gemini extraction parsing failed, falling back to local engine:', err);
    return null;
  }
}

/**
 * Direct Gemini Vision extraction from image file (JPG, PNG, WEBP)
 */
export async function extractFromImageWithGemini(
  file: File,
  apiKey?: string
): Promise<PrescriptionExtractionResult | null> {
  const key = apiKey || import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) return null;

  try {
    const { base64, mimeType } = await fileToBase64(file);
    const prompt = `You are an expert clinical pharmacologist. Inspect this medical prescription photo/image and accurately extract all prescribed medications, doctor name, and clinic name into a clean JSON object.
Format:
{
  "doctorName": "Dr. Full Name",
  "clinicName": "Clinic Name",
  "medications": [
    {
      "name": "Medicine Brand or Chemical Name",
      "genericName": "Generic name",
      "dosage": "e.g. 500mg",
      "form": "tablet | capsule | liquid | injection | drops | inhaler | cream | patch",
      "frequency": "daily | twice_daily | three_times_daily | weekly | custom | once",
      "times": ["09:00"] or ["09:00", "21:00"],
      "instructions": "intake directions like 'after meals'"
    }
  ]
}

Respond ONLY with valid JSON. Do not wrap in markdown or backticks.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) return null;

    const json = await response.json();
    const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return null;

    const cleaned = candidateText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      doctorName: parsed.doctorName,
      clinicName: parsed.clinicName,
      date: new Date().toLocaleDateString(),
      rawText: candidateText,
      sourceType: 'image',
      medications: (parsed.medications || []).map((m: any, idx: number) => ({
        id: `gemini_img_${Date.now()}_${idx}`,
        name: m.name || 'Medication',
        genericName: m.genericName || m.name,
        dosage: m.dosage || '500mg',
        form: m.form || 'tablet',
        frequency: m.frequency || 'daily',
        times: Array.isArray(m.times) && m.times.length > 0 ? m.times : ['09:00'],
        instructions: m.instructions || 'As prescribed',
        prescribedBy: parsed.doctorName || undefined,
        startDate: new Date().toISOString().split('T')[0],
        selected: true,
      })),
    };
  } catch (err) {
    console.warn('Gemini vision extraction failed, falling back to local OCR:', err);
    return null;
  }
}

/**
 * Universal document processor (supports both PDF and Images).
 */
export async function processPrescriptionDocument(
  file: File,
  geminiApiKey?: string,
  onStatusUpdate?: (status: string) => void
): Promise<PrescriptionExtractionResult> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name);

  if (!isPdf && !isImage) {
    throw new Error('Unsupported file type. Please upload a PDF (.pdf) or image (.png, .jpg, .jpeg, .webp).');
  }

  // 1. Image flow
  if (isImage) {
    onStatusUpdate?.('Analyzing prescription image...');

    // Try Gemini Vision first if key provided
    const geminiResult = await extractFromImageWithGemini(file, geminiApiKey);
    if (geminiResult && geminiResult.medications.length > 0) {
      return geminiResult;
    }

    // Fallback to local OCR with Tesseract.js
    onStatusUpdate?.('Scanning image with local OCR engine...');
    const rawText = await extractTextFromImage(file);

    if (!rawText.trim()) {
      throw new Error('Could not recognize any legible text from this image. Please ensure the photo is clear and well-lit.');
    }

    onStatusUpdate?.('Parsing medical entities...');
    const parsed = parsePrescriptionText(rawText);
    parsed.sourceType = 'image';
    return parsed;
  }

  // 2. PDF flow
  onStatusUpdate?.('Extracting text from PDF document...');
  const rawText = await extractTextFromPdf(file);

  if (!rawText.trim()) {
    throw new Error('No readable text found in this PDF document.');
  }

  onStatusUpdate?.('Analyzing medical prescriptions...');
  let result = await extractWithGeminiAI(rawText, geminiApiKey);
  if (!result || result.medications.length === 0) {
    result = parsePrescriptionText(rawText);
  }
  result.sourceType = 'pdf';
  return result;
}
