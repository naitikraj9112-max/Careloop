import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSelector from '@/components/ui/LanguageSelector';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import * as patientService from '@/services/patientService';
import { Mail, Lock, Heart, Shield, KeyRound, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { signIn, seniorSignIn, error } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [loginType, setLoginType] = useState<'family' | 'elderly'>('family');
  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    const input = emailOrId.trim();
    if (!input || !password) {
      setLocalError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      if (loginType === 'elderly') {
        // 1. Direct Zero-Friction Senior Verification by Patient ID or Gmail + PIN
        const verifyResult = await patientService.verifyPatientCredentials(input, password);
        if (verifyResult.success && verifyResult.patient) {
          seniorSignIn(verifyResult.patient);
          navigate('/elderly');
          return;
        }

        // If specific PIN error was returned, show it
        if (verifyResult.error && verifyResult.error.includes('Incorrect PIN')) {
          setLocalError('Incorrect PIN or password. Please verify the PIN set by your family admin.');
          setLoading(false);
          return;
        }
      }

      // Standard email attempt or entered value for Family Admin or seniors with auth accounts
      let loginEmail = input;
      if (!loginEmail.includes('@')) {
        loginEmail = `${loginEmail.toLowerCase()}@careloop.local`;
      }

      await signIn(loginEmail, password);
      navigate(loginType === 'elderly' ? '/elderly' : '/dashboard');
    } catch (err: any) {
      // If candidate failed, try raw input
      try {
        await signIn(input, password);
        navigate(loginType === 'elderly' ? '/elderly' : '/dashboard');
      } catch (directErr: any) {
        setLocalError(
          loginType === 'elderly'
            ? 'Sign in failed. Please verify your Unique Patient ID (e.g. CARE-XXXXXX) or Gmail and your 4-6 digit PIN.'
            : directErr.message || 'Sign in failed. Please check your credentials.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAF7] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Universal Language selector in top corner */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-neutral-400">
            {t('language') || 'Language'}:
          </span>
          <LanguageSelector variant="pill" />
        </div>

        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <span className="font-serif text-3xl font-bold tracking-tight text-neutral-900">
              CareLoop
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            {loginType === 'elderly'
              ? (t('patientDashboard') || 'Senior Patient Login')
              : (t('welcome') ? `${t('welcome')} Back` : 'Welcome Back')}
          </h1>
          <p className="text-neutral-500 mt-1 text-sm">
            {loginType === 'elderly'
              ? 'Access your daily medication schedule & DeepSeek voice assistant'
              : 'Sign in to manage your care circle'}
          </p>
        </div>

        {/* Login Type Selector Tabs */}
        <div className="flex items-center p-1 bg-neutral-200/60 rounded-full mb-6 max-w-xs mx-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setLoginType('family');
              setLocalError('');
            }}
            className={`flex-1 py-2 px-3 rounded-full transition-all flex items-center justify-center gap-1.5 ${
              loginType === 'family'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>Family / Admin</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginType('elderly');
              setLocalError('');
            }}
            className={`flex-1 py-2 px-3 rounded-full transition-all flex items-center justify-center gap-1.5 ${
              loginType === 'elderly'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-red-500" />
            <span>Senior Patient</span>
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-7 sm:p-9 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {(localError || error) && (
              <div
                className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs font-medium"
                role="alert"
              >
                {localError || error}
              </div>
            )}

            {loginType === 'elderly' ? (
              <Input
                label={t('uniquePatientId') || 'Unique Patient ID or Email'}
                type="text"
                icon={KeyRound}
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                placeholder="e.g. CARE-14EC01 or senior@gmail.com"
                helperText="Enter the Unique Patient ID provided by your family admin or your registered Gmail."
                required
              />
            ) : (
              <Input
                label="Email Address"
                type="email"
                icon={Mail}
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            )}

            <Input
              label={loginType === 'elderly' ? 'PIN / Password' : 'Password'}
              type="password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant={loginType === 'elderly' ? 'green' : 'primary'}
              loading={loading}
              fullWidth
              size="lg"
              className="font-bold"
            >
              {loginType === 'elderly'
                ? 'Access Patient Dashboard →'
                : 'Sign In'}
            </Button>
          </form>

          {loginType === 'family' && (
            <div className="mt-6 text-center text-xs text-neutral-500">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-bold text-neutral-900 hover:text-neutral-700 underline underline-offset-4"
              >
                Create Family Profile
              </Link>
            </div>
          )}

          {loginType === 'elderly' && (
            <div className="mt-6 p-3.5 bg-[#F9FAF7] rounded-2xl border border-neutral-200/60 text-center text-xs text-neutral-500">
              Need your Unique Patient ID? Ask your family administrator or check your CareLoop invitation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
