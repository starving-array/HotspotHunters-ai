import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authenticate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#0a0f1e' }}
    >
      {/* Grid backdrop */}
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(76,215,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(76,215,246,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-surface-container/80 backdrop-blur-xl border border-outline-variant/50 rounded-xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h1 className="text-center text-[24px] font-semibold text-on-surface mb-1 tracking-tight">
            KSP Intelligence Portal
          </h1>
          <p className="text-center text-[12px] uppercase tracking-widest text-outline mb-8 font-semibold">
            Secure Access Required
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
              <input
                type="text"
                autoFocus
                placeholder={t('username')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-md pl-10 pr-3 py-3 text-on-surface placeholder:text-outline focus:border-primary focus:outline-none transition-colors text-sm"
                disabled={loading}
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
              <input
                type="password"
                placeholder="Password"
                value=""
                className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-md pl-10 pr-3 py-3 text-on-surface placeholder:text-outline focus:border-primary focus:outline-none transition-colors text-sm cursor-not-allowed opacity-60"
                disabled
                readOnly
              />
              <p className="text-[10px] text-outline mt-1 ml-1 font-mono">
                NOTE: out-of-scope for this UI phase — auth flow preserved as-is
              </p>
            </div>

            {error && (
              <div className="bg-error-container/20 border border-error/40 rounded-md px-3 py-2 text-error text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full bg-primary text-on-primary border border-primary rounded-md py-3 font-semibold text-[11px] uppercase tracking-widest hover:bg-primary-fixed-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(76,215,246,0.18)]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('signingIn')}
                </>
              ) : (
                t('signIn')
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
