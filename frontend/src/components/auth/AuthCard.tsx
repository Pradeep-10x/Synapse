import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

// Custom input component with hover effect
interface AppInputProps {
  label?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  id?: string;
}

export const AppInput = (props: AppInputProps) => {
  const { label, placeholder, icon, type = 'text', ...rest } = props;
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div className="w-full min-w-[200px] relative">
      {label && (
        <label className="block mb-2 text-sm text-[#e5e7eb]">{label}</label>
      )}
      <div className="relative w-full">
        <input
          type={type}
          className="peer relative z-10 border-2 border-[rgba(168,85,247,0.15)] h-13 w-full rounded-md bg-[rgba(13,17,23,0.4)] px-4 font-thin outline-none drop-shadow-sm transition-all duration-200 ease-in-out focus:bg-[#0a0a12] placeholder:font-medium text-[#e5e7eb] placeholder-[#9ca3af]"
          placeholder={placeholder}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          {...rest}
        />
        {isHovering && (
          <>
            <div
              className="absolute pointer-events-none top-0 left-0 right-0 h-[2px] z-20 rounded-t-md overflow-hidden"
              style={{
                background: `radial-gradient(30px circle at ${mousePosition.x}px 0px, #a855f7 0%, transparent 70%)`,
              }}
            />
            <div
              className="absolute pointer-events-none bottom-0 left-0 right-0 h-[2px] z-20 rounded-b-md overflow-hidden"
              style={{
                background: `radial-gradient(30px circle at ${mousePosition.x}px 2px, #a855f7 0%, transparent 70%)`,
              }}
            />
          </>
        )}
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default function AuthCard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
    location.pathname === '/register' ? 'register' : 'login'
  );

  useEffect(() => {
    if (location.pathname === '/register') {
      setActiveTab('register');
    } else {
      setActiveTab('login');
    }
  }, [location.pathname]);

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    navigate(tab === 'login' ? '/login' : '/register', { replace: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-[#27272A] border border-[rgba(17, 16, 17, 0.15)] rounded-sm w-full max-w-4xl flex overflow-hidden "
    >
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 px-6 sm:px-10 lg:px-12 py-8 sm:py-10 relative overflow-hidden">
        <div className="relative z-10">
          {/* Card Title */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#e5e7eb] text-center mb-6">
            {activeTab === 'login' ? 'Sign In' : 'Create Account'}
          </h2>

         

         

          {/* Tabs */}
          <div className="flex gap-2 mb-6 p-1 glass-card rounded-sm">
            <button
              onClick={() => handleTabChange('login')}
              className={`flex-1 py-2.5 px-4 rounded-sm text-sm font-semibold transition-all duration-200 ${
                activeTab === 'login'
                  ? 'bg-[#2B2A33] text-white'
                  : 'text-[#9ca3af] hover:text-[#e5e7eb]'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => handleTabChange('register')}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-semibold transition-all duration-200 ${
                activeTab === 'register'
                  ? 'bg-[#2B2A33] text-white'
                  : 'text-[#9ca3af] hover:text-[#e5e7eb]'
              }`}
            >
              Register
            </button>
          </div>

          {/* Form Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'login' ? <LoginForm /> : <RegisterForm />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block w-1/2 relative overflow-hidden border-l border-[rgba(168,85,247,0.15)]">
        <img
          src="https://images.pexels.com/photos/7102037/pexels-photo-7102037.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          alt="Auth background"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0a0a12]/80" />
      </div>
    </motion.div>
  );
}

