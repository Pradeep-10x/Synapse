import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [formData, setFormData] = useState({
    identifier: '', // email or username
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.identifier || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      // Determine if identifier is email or username
      const isEmail = formData.identifier.includes('@');
      const credentials = isEmail
        ? { email: formData.identifier, password: formData.password }
        : { username: formData.identifier, password: formData.password };

      await login(credentials);
      onSuccess?.();
      navigate('/feed');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="identifier" className="block text-sm font-medium text-[#e5e7eb] mb-2">
          Email or Username
        </label>
        <input
          id="identifier"
          type="text"
          value={formData.identifier}
          onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
          className="w-full px-4 py-3 bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-[var(--radius-sm)] text-[var(--synapse-text)] placeholder-[var(--synapse-text-muted)] focus:outline-none focus:border-[var(--synapse-blue)] focus:ring-1 focus:ring-[var(--synapse-blue)] transition-all duration-200"
          placeholder="Enter your email or username"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-[#e5e7eb] mb-2">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-3 bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-[var(--radius-sm)] text-[var(--synapse-text)] placeholder-[var(--synapse-text-muted)] focus:outline-none focus:border-[var(--synapse-blue)] focus:ring-1 focus:ring-[var(--synapse-blue)] transition-all duration-200 pr-12"
            placeholder="Enter your password"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#e5e7eb] transition-colors"
            disabled={isLoading}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-sm px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="group/button relative w-full inline-flex justify-center items-center overflow-hidden rounded-sm bg-[blue] px-4 py-3 font-semibold text-white transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-sm hover:shadow-[rgba(9,89,238,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Logging in
            </>
          ) : (
            'Login'
          )}
        </span>
        <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
          <div className="relative h-full w-10 bg-white/20" />
        </div>
      </button>

      <div className="text-center">
        <button
          type="button"
          className="text-sm text-[#9ca3af] hover:text-[#e5e7eb] transition-colors"
          disabled={isLoading}
        >
          Forgot password?
        </button>
      </div>
      <div className="text-sm text-center text-[#9ca3af]" style={{ marginTop: '-10px' }}>
        Create an account?{' '}
        <button
          type="button"
          className="text-sm text-[#3b82f6] hover:text-[#60a5fa] transition-colors font-medium"
          onClick={() => navigate('/register')}
          disabled={isLoading}
        >
          Sign up
        </button>
      </div>
    </form>
  );
}

