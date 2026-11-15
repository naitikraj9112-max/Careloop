import { Link } from 'react-router-dom';
import { Pill, Users, Bell, Calendar, ArrowRight, Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const features = [
  {
    icon: Pill,
    title: 'Medication Management',
    description: 'Smart scheduling with multi-dose tracking and status reporting. Never second guess whether a dose was taken or missed.',
    badgeBg: 'bg-[#EBF7EE] text-[#22C55E]',
  },
  {
    icon: Users,
    title: 'CareCircle Coordination',
    description: 'Connect family members and professional caretakers with role-based access. Everyone sees what they need with total clarity.',
    badgeBg: 'bg-neutral-100 text-neutral-800',
  },
  {
    icon: Bell,
    title: 'Automated Escalation',
    description: 'Configurable grace periods and automatic escalation alerts. If a dose goes unacknowledged, family is immediately notified.',
    badgeBg: 'bg-amber-50 text-amber-700',
  },
  {
    icon: Calendar,
    title: 'Appointment Tracking',
    description: 'Never miss an important clinic or specialist visit. Schedule, track, and receive timely alerts for medical consultations.',
    badgeBg: 'bg-neutral-100 text-neutral-800',
  },
];

const steps = [
  {
    number: '01',
    title: 'Create Care Profile',
    description: 'Set up a dedicated profile for your loved one with health details, prescriptions, and emergency contacts.',
  },
  {
    number: '02',
    title: 'Invite CareCircle',
    description: 'Add family members and caretakers with custom permissions to view or log daily care activities.',
  },
  {
    number: '03',
    title: 'Track & Protect',
    description: 'Monitor daily dose adherence, receive real-time updates, and ensure comprehensive peace of mind.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F9FAF7] text-neutral-900 flex flex-col selection:bg-[#22C55E]/20">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="font-serif text-3xl font-bold tracking-tight text-neutral-900">
              CareLoop
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/login" className="inline-flex">
              <Button variant="ghost" size="sm" className="font-semibold text-neutral-700">
                Sign In
              </Button>
            </Link>
            <Link to="/register" className="inline-flex">
              <Button variant="primary" size="sm" className="font-semibold px-5">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-28 px-4 sm:px-6 flex-1">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white border border-neutral-200 px-4 py-1.5 rounded-full text-xs font-semibold text-neutral-800 shadow-xs mb-8">
            <Shield className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>Intelligent Elderly Care &amp; Medication Platform</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl font-bold text-neutral-900 tracking-tight leading-[1.12] mb-6">
            Beyond Reminders.<br />
            <span className="text-[#22C55E]">Connected Health.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-neutral-600 max-w-xl mx-auto leading-relaxed mb-10">
            CareLoop connects seniors, families, and caretakers through a shared healthcare profile — complete with dose verification, multi-tier schedules, and automated caregiver escalation.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto inline-flex">
              <Button variant="primary" size="lg" className="w-full sm:w-auto px-8 gap-2">
                <span>Start Free Care Profile</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto inline-flex">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-8">
                Sign In to Account
              </Button>
            </Link>
          </div>

          {/* Trust points */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" /> 9 Status Semantics
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" /> Automated Escalation
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" /> Role-Based CareCircles
            </span>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="py-24 bg-white border-t border-b border-neutral-200/70 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight mb-3">
              Designed for Simplicity and Safety
            </h2>
            <p className="text-sm text-neutral-500 leading-relaxed">
              High-contrast controls, clear daily views, and automated peace of mind for every family member.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="bg-[#F9FAF7] rounded-3xl p-7 border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between"
              >
                <div>
                  <div className={`w-12 h-12 rounded-2xl ${feature.badgeBg} flex items-center justify-center mb-5`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-neutral-900 tracking-tight mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works / 3 Step Section */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight mb-3">
              How CareLoop Works
            </h2>
            <p className="text-sm text-neutral-500">
              Three effortless steps to connected, transparent family care.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div
                key={step.number}
                className="bg-white rounded-3xl p-8 border border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] text-left"
              >
                <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white font-mono font-bold flex items-center justify-center text-sm mb-6">
                  {step.number}
                </div>
                <h3 className="font-bold text-lg text-neutral-900 tracking-tight mb-2">
                  {step.title}
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="pb-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto bg-neutral-900 text-white rounded-3xl p-8 sm:p-12 text-center shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-4">
            Start Caring with Total Clarity Today
          </h2>
          <p className="text-sm sm:text-base text-neutral-400 max-w-lg mx-auto mb-8">
            Join families who rely on CareLoop for daily medication adherence and connected loved-one care.
          </p>
          <Link to="/register" className="inline-flex">
            <Button variant="green" size="lg" className="px-8 font-bold">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200/80 py-8 px-4 text-center text-xs text-neutral-500 font-medium">
        <p>© {new Date().getFullYear()} CareLoop. Intelligent Elderly Care &amp; Medication Platform.</p>
      </footer>
    </div>
  );
}
