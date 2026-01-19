import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/auth/AuthLayout';

export default function LoginPage() {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const { login, isLoading } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(formData);
            navigate('/');
        } catch (error) {
            // Error handled in store via toast
        }
    };

    return (
        <AuthLayout title="Welcome Back" subtitle="Sign in to your account">
            <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                    label="Username / Email"
                    placeholder="Enter your username or email"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={isLoading}
                />

                <Input
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={isLoading}
                />

                <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
                    Sign In
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                    Don't have an account? {' '}
                    <Link to="/register" className="text-blue-500 hover:underline font-semibold">
                        Sign up
                    </Link>
                </div>
            </form>
        </AuthLayout>
    );
}
