import { motion } from 'framer-motion';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-50 via-gray-50 to-blue-50 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-400/30 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-400/30 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md p-8 rounded-2xl bg-white border border-gray-200 shadow-xl relative z-10 mx-4"
            >
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <img
                            src="/src/assets/logo.png"
                            alt="ORBIT"
                            className="h-16 w-auto object-contain"
                        />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2 text-gray-900">{title}</h2>
                    <p className="text-gray-600">{subtitle}</p>
                </div>
                {children}
            </motion.div>
        </div>
    );
}
