'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Database, Shield, Cloud, ArrowRight, CheckCircle2 } from 'lucide-react';

const features = [
  { icon: Cloud, text: 'Store files directly in Microsoft Fabric OneLake' },
  { icon: Shield, text: 'Enterprise-grade security via Microsoft Entra ID' },
  { icon: Database, text: 'Metadata tracked in Lakehouse Delta tables' },
];

const MicrosoftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="10" height="10" fill="#F25022" />
    <rect x="11" width="10" height="10" fill="#7FBA00" />
    <rect y="11" width="10" height="10" fill="#00A4EF" />
    <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
  </svg>
);

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signIn('azure-ad', { callbackUrl: '/dashboard' });
    } catch {
      setIsSigningIn(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={32} className="text-blue-500 spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Branding Panel ───────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col flex-1 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 relative overflow-hidden p-12">
        {/* Abstract background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-20 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-blue-500/5 blur-2xl" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `radial-gradient(circle, #4f8ef7 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-auto">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Database size={20} className="text-white" />
          </div>
          <div>
            <span className="text-white font-semibold text-base leading-none block">
              Fabric File Manager
            </span>
            <span className="text-white/40 text-xs">Powered by Microsoft Fabric</span>
          </div>
        </div>

        {/* Main headline */}
        <div className="mb-auto">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Enterprise File
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Management
            </span>
            <br />
            in OneLake
          </h1>
          <p className="text-white/60 text-lg leading-relaxed max-w-sm">
            Securely upload, manage, and share files directly in your Microsoft Fabric Lakehouse.
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-4 mb-12">
          {features.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-blue-400" />
              </div>
              <span className="text-white/70 text-sm">{text}</span>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="text-white/30 text-xs">
          © {new Date().getFullYear()} Fabric File Manager. Internal enterprise tool.
        </p>
      </div>

      {/* ── Right: Login Card ──────────────────────────────────────────── */}
      <div className="flex-1 lg:max-w-lg flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Database size={18} className="text-white" />
            </div>
            <span className="text-slate-800 font-semibold">Fabric File Manager</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome back</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Sign in with your Microsoft account to access the Fabric File Manager.
            </p>
          </div>

          {/* Sign-in card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7 space-y-5">
            {/* Microsoft sign-in button */}
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="btn btn-microsoft w-full"
              aria-label="Sign in with Microsoft"
            >
              {isSigningIn ? (
                <Loader2 size={18} className="spin text-slate-500" />
              ) : (
                <MicrosoftIcon />
              )}
              {isSigningIn ? 'Signing in...' : 'Sign in with Microsoft'}
              {!isSigningIn && <ArrowRight size={16} className="ml-auto text-slate-400" />}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400 font-medium">Secured by</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* Trust indicators */}
            <div className="space-y-2.5">
              {[
                'Microsoft Entra ID (Azure Active Directory)',
                'OAuth 2.0 / OpenID Connect',
                'No passwords stored locally',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-xs text-slate-500">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6 leading-relaxed">
            By signing in, you agree to your organization&apos;s policies.
            <br />
            This is an internal enterprise application.
          </p>
        </div>
      </div>
    </div>
  );
}
