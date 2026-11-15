import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, Lock, User } from 'lucide-react';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!displayName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, displayName);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAF7] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <span className="font-serif text-3xl font-bold tracking-tight text-neutral-900">
              CareLoop
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Create Your Account</h1>
          <p className="text-neutral-500 mt-1 text-sm">Join CareLoop to manage health and medication</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-7 sm:p-9 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs font-medium" role="alert">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="bg-[#EBF7EE] border border-[#22C55E]/30 text-[#1E3A2F] rounded-2xl p-4 text-xs font-medium" role="alert">
                {successMsg}
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              icon={User}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Sarah Vance"
              required
              autoComplete="name"
            />

            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              icon={Lock}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              autoComplete="new-password"
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" fullWidth loading={loading} size="lg">
                Create Account
              </Button>
            </div>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-neutral-500">
          Already have an account?{' '}
          <Link to="/login" className="text-neutral-900 font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
