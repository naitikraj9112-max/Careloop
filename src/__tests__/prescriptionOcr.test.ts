import { describe, it, expect } from 'vitest';
import { parsePrescriptionText } from '../services/prescriptionOcrService';

describe('Prescription OCR and Clinical Extraction', () => {
  it('extracts medications, dosages, and frequencies from prescription text', () => {
    const sampleText = `
Dr. Sarah Jenkins, MD
Hope Valley Healthcare Center
Date: 2026-11-15
Patient: Eleanor Vance

Rx:
1. Tab Metformin 500mg twice daily after meals (1-0-1)
2. Tab Lisinopril 10mg once daily in morning
3. Cap Omeprazole 20mg once daily before breakfast
4. Tab Atorvastatin 20mg at bedtime (0-0-1)
    `;

    const result = parsePrescriptionText(sampleText);

    expect(result.doctorName).toContain('Dr. Sarah Jenkins');
    expect(result.clinicName).toContain('Hope Valley Healthcare Center');
    expect(result.medications.length).toBe(4);

    const metformin = result.medications.find((m) => m.name.toLowerCase() === 'metformin');
    expect(metformin).toBeDefined();
    expect(metformin?.dosage).toBe('500mg');
    expect(metformin?.frequency).toBe('twice_daily');
    expect(metformin?.form).toBe('tablet');

    const lisinopril = result.medications.find((m) => m.name.toLowerCase() === 'lisinopril');
    expect(lisinopril).toBeDefined();
    expect(lisinopril?.dosage).toBe('10mg');
    expect(lisinopril?.frequency).toBe('daily');

    const omeprazole = result.medications.find((m) => m.name.toLowerCase() === 'omeprazole');
    expect(omeprazole).toBeDefined();
    expect(omeprazole?.dosage).toBe('20mg');
    expect(omeprazole?.form).toBe('capsule');

    const atorvastatin = result.medications.find((m) => m.name.toLowerCase() === 'atorvastatin');
    expect(atorvastatin).toBeDefined();
    expect(atorvastatin?.dosage).toBe('20mg');
    expect(atorvastatin?.instructions).toContain('bedtime');
  });

  it('handles general dosage formats and falls back gracefully', () => {
    const rawText = `
1. Amlodipine 5mg tab daily
2. Multivitamin 1 tablet with food
    `;

    const result = parsePrescriptionText(rawText);
    expect(result.medications.length).toBeGreaterThanOrEqual(1);
    const amlodipine = result.medications.find((m) => m.name.toLowerCase() === 'amlodipine');
    expect(amlodipine).toBeDefined();
    expect(amlodipine?.dosage).toBe('5mg');
  });
});
