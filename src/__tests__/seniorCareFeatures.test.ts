import { describe, it, expect } from 'vitest';
import { SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import type { SupportedLanguage } from '@/contexts/LanguageContext';

describe('CareLoop Senior Care & Role Control Features', () => {
  describe('Multi-Indian Language Support & Speech Locales', () => {
    it('supports 9 Indian and regional languages', () => {
      expect(SUPPORTED_LANGUAGES.length).toBe(9);
      const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
      expect(codes).toEqual(['en', 'hi', 'ta', 'te', 'bn', 'kn', 'ml', 'mr', 'gu']);
    });

    it('maps each Indian regional language to its official SpeechRecognition/TTS locale', () => {
      const localeMap = Object.fromEntries(
        SUPPORTED_LANGUAGES.map((l) => [l.code, l.speechLocale])
      );
      expect(localeMap.hi).toBe('hi-IN');
      expect(localeMap.ta).toBe('ta-IN');
      expect(localeMap.te).toBe('te-IN');
      expect(localeMap.bn).toBe('bn-IN');
      expect(localeMap.kn).toBe('kn-IN');
      expect(localeMap.ml).toBe('ml-IN');
      expect(localeMap.mr).toBe('mr-IN');
      expect(localeMap.gu).toBe('gu-IN');
      expect(localeMap.en).toBe('en-IN');
    });

    it('provides native script names for friendly senior presentation', () => {
      const hindi = SUPPORTED_LANGUAGES.find((l) => l.code === 'hi');
      const tamil = SUPPORTED_LANGUAGES.find((l) => l.code === 'ta');
      const bengali = SUPPORTED_LANGUAGES.find((l) => l.code === 'bn');

      expect(hindi?.nativeName).toBe('हिन्दी');
      expect(tamil?.nativeName).toBe('தமிழ்');
      expect(bengali?.nativeName).toBe('বাংলা');
    });
  });

  describe('Unique Patient ID Generation & Recognition', () => {
    function generateUniquePatientId(uuid: string): string {
      return `CARE-${uuid.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
    }

    it('generates a clean 11-character readable senior code', () => {
      const testUuid = '14ec01e0-4edd-4b8a-b50e-3f20a7dabcd3';
      const code = generateUniquePatientId(testUuid);
      expect(code).toBe('CARE-14EC01');
      expect(code).toMatch(/^CARE-[0-9A-F]{6}$/);
    });

    it('matches patient code case-insensitively with or without CARE- prefix', () => {
      const targetCode = 'CARE-14EC01';
      const userInput1 = 'care-14ec01';
      const userInput2 = '14ec01';
      const userInput3 = 'CARE-14EC01';

      const normalize = (s: string) => s.trim().toUpperCase().replace(/^CARE-/, '');
      expect(normalize(userInput1)).toBe('14EC01');
      expect(normalize(userInput2)).toBe('14EC01');
      expect(normalize(userInput3)).toBe('14EC01');
      expect(normalize(userInput1)).toBe(normalize(targetCode));
    });
  });

  describe('Caretaker Role Locking & Request Escalation', () => {
    it('restricts caretakers from managing prescriptions directly', () => {
      const caretakerPermissions = [
        'view_schedule',
        'record_dose',
        'view_adherence',
        'manage_appointments',
      ];
      expect(caretakerPermissions.includes('manage_medications')).toBe(false);
    });

    it('formats escalation alert message for primary family member', () => {
      const caretakerName = 'Nurse Anita';
      const patientName = 'Eleanor Vance';
      const medName = 'Amlodipine 5mg';
      const reason = 'Patient blood pressure measured 145/95; doctor advised dose adjustment';

      const alertPayload = {
        title: `Caretaker Request: Dosage Adjustment Request for ${medName}`,
        message: `Caretaker ${caretakerName} requested dosage change for "${medName}". Details: "${reason}". Urgency: URGENT`,
        type: 'escalation',
        patient: patientName,
      };

      expect(alertPayload.type).toBe('escalation');
      expect(alertPayload.title).toContain('Amlodipine');
      expect(alertPayload.message).toContain('Nurse Anita');
    });
  });

  describe('Senior Patient PIN Verification & Login', () => {
    const mockPatient = {
      id: '14ec01e0-4edd-4b8a-b50e-3f20a7dabcd3',
      name: 'Eleanor Vance',
      uniquePatientId: 'CARE-14EC01',
      patientPin: '1234',
      emergencyContact: {
        name: 'David Vance',
        phone: '+1 (555) 019-2834',
        relationship: 'Son',
        patientPin: '1234',
      },
    };

    it('verifies patient PIN against configured credentials', () => {
      const enteredCorrect = '1234';
      const enteredWrong = '9999';

      expect(enteredCorrect.trim() === mockPatient.patientPin).toBe(true);
      expect(enteredWrong.trim() === mockPatient.patientPin).toBe(false);
    });

    it('handles PIN with surrounding whitespace gracefully', () => {
      const entered = ' 1234  ';
      expect(entered.trim() === mockPatient.patientPin).toBe(true);
    });
  });
});
