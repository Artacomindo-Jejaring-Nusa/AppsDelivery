import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;

    const result = await login(username, password);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col overflow-x-hidden">
      {/* TopAppBar Fragment */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-margin h-16 bg-surface border-b border-outline-variant">
        <div className="font-headline-md text-headline-md font-bold text-primary flex items-center gap-xs">
          Logistics<span className="text-primary-container">Pro</span>
        </div>
        <div className="flex items-center gap-md">
          <button className="flex items-center gap-xs text-secondary hover:bg-surface-container-high transition-colors px-sm py-xs rounded">
            <span className="material-symbols-outlined text-[18px]">language</span>
            <span className="font-label-md text-label-md">EN</span>
          </button>
          <button className="flex items-center gap-xs text-secondary hover:bg-surface-container-high transition-colors px-sm py-xs rounded">
            <span className="material-symbols-outlined text-[18px]">help_outline</span>
            <span className="font-label-md text-label-md">Support</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex pt-16 h-screen">
        <section className="w-full flex items-center justify-center bg-background p-margin">
          <div className="w-full max-w-md animate-in fade-in slide-in-from-right-4 duration-700">
            {/* Header Identity */}
            <div className="mb-xl">
              <div className="font-headline-sm text-headline-sm text-secondary tracking-tight mb-xs">
                AKS X ARTACOM
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">
                Employee Login
              </h2>
              <p className="font-body-md text-body-md text-secondary mt-xs">
                Welcome back. Enter your credentials to continue.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-lg p-md bg-error-container text-on-error-container rounded-lg border border-error/30 flex items-center justify-between text-body-sm animate-in fade-in duration-300">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-error">error</span>
                  <span>{error}</span>
                </div>
                <button onClick={clearError} className="text-secondary hover:text-on-surface">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}

            {/* Form */}
            <form className="space-y-lg" onSubmit={handleSubmit}>
              {/* Employee ID / Username Field */}
              <div className="space-y-xs">
                <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="employee-id">
                  Employee ID / Username
                </label>
                <div className="relative group">
                  <input
                    id="employee-id"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="E.g. EMP-9921 or admin"
                    className="w-full h-12 bg-surface px-md border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md rounded-lg"
                  />
                  <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                    person
                  </span>
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-xs">
                <div className="flex justify-between items-center">
                  <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="password">
                    Password
                  </label>
                  <a href="#" onClick={(e) => e.preventDefault()} className="font-label-sm text-label-sm text-primary hover:underline transition-all">
                    Forgot Password?
                  </a>
                </div>
                <div className="relative group">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 bg-surface px-md border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-md top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-sm cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-xs border-outline-variant text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="font-label-md text-label-md text-secondary group-hover:text-on-surface transition-colors">
                    Remember me
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary text-on-primary font-label-md text-label-md uppercase tracking-widest rounded-lg shadow-sm hover:bg-primary-container active:opacity-80 transition-all transform active:scale-[0.98] flex items-center justify-center gap-md disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    Authenticating...
                  </>
                ) : (
                  <>
                    Login to Dashboard
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer Fragment for Internal Compliance */}
            <div className="mt-xl pt-lg border-t border-outline-variant">
              <p className="font-label-sm text-label-sm text-outline mb-md leading-relaxed">
                Authorized personnel only. All access and activity is logged in accordance with Corporate Security Policy ISO 27001.
              </p>
              <div className="flex flex-wrap gap-md">
                <a href="#" onClick={(e) => e.preventDefault()} className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors underline">
                  Security Policy
                </a>
                <a href="#" onClick={(e) => e.preventDefault()} className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors underline">
                  System Status
                </a>
                <a href="#" onClick={(e) => e.preventDefault()} className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors underline">
                  Contact IT Support
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Global Footer */}
      <footer className="w-full py-lg px-margin flex flex-col md:flex-row justify-between items-center gap-md bg-surface-container-lowest border-t border-outline-variant">
        <div className="font-label-md text-label-md font-semibold text-on-surface">
          AKS X ARTACOM <span className="font-normal text-secondary ml-xs">LogisticsPro</span>
        </div>
        <div className="text-secondary font-body-sm text-body-sm">
          © 2026 Logistics Pro Enterprise Solutions. All rights reserved.
        </div>
        <nav className="flex gap-md">
          <a href="#" onClick={(e) => e.preventDefault()} className="font-body-sm text-body-sm text-secondary hover:text-primary underline transition-all">
            Privacy Policy
          </a>
          <a href="#" onClick={(e) => e.preventDefault()} className="font-body-sm text-body-sm text-secondary hover:text-primary underline transition-all">
            Terms of Service
          </a>
        </nav>
      </footer>
    </div>
  );
}
