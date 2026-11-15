import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import * as membershipService from '@/services/membershipService';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'login_required'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing invitation link.');
      return;
    }

    if (!user) {
      setStatus('login_required');
      return;
    }

    const accept = async () => {
      try {
        await membershipService.acceptInvitation(token, user.id);
        setStatus('success');
        setMessage('You have been successfully added to the CareCircle!');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Failed to accept invitation. The link may have expired or was already used.');
      }
    };

    accept();
  }, [token, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAF7] px-4 py-12">
      <div className="w-full max-w-md text-center">
        {/* Brand Header */}
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <span className="font-serif text-3xl font-bold tracking-tight text-neutral-900">
            CareLoop
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
        </Link>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-8 sm:p-9 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          {status === 'loading' && (
            <div className="py-6">
              <LoadingSpinner size="lg" text="Verifying and accepting invitation..." />
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-[#EBF7EE] text-[#22C55E] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Welcome to the Team!</h2>
              <p className="text-sm text-neutral-500 max-w-xs mx-auto leading-relaxed">{message}</p>
              <div className="pt-3">
                <Button variant="primary" fullWidth size="lg" onClick={() => navigate('/dashboard')}>
                  <span>Go to My Dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Invitation Error</h2>
              <p className="text-sm text-neutral-500 max-w-xs mx-auto leading-relaxed">{message}</p>
              <div className="pt-3">
                <Button variant="outline" fullWidth size="lg" onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}

          {status === 'login_required' && (
            <div className="space-y-4 py-2">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Sign In Required</h2>
              <p className="text-sm text-neutral-500 max-w-xs mx-auto leading-relaxed">
                Please sign in or create an account to accept this invitation and access the care circle.
              </p>
              <div className="space-y-2.5 pt-3">
                <Link to={`/login?redirect=/invite/${token}`} className="block">
                  <Button variant="primary" fullWidth size="lg">Sign In</Button>
                </Link>
                <Link to={`/register?redirect=/invite/${token}`} className="block">
                  <Button variant="outline" fullWidth size="lg">Create Account</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
