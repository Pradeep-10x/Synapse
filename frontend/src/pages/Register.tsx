import { useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/auth/AuthLayout';
import { Upload } from 'lucide-react';

export default function RegisterPage() {
    const [formData, setFormData] = useState({ fullName: '', username: '', email: '', password: '', bio: '' });
    const [avatar, setAvatar] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const { register, isLoading } = useAuthStore();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Use FormData for file upload
        const data = new FormData();
        data.append('fullName', formData.fullName);
        data.append('username', formData.username);
        data.append('email', formData.email);
        data.append('password', formData.password);
        data.append('bio', formData.bio);
        if (avatar) {
            data.append('avatar', avatar);
        }

        try {
            await register(data);
            navigate('/');
        } catch (error) {
            // handled in store
        }
    };

    return (
        <AuthLayout title="Create Account" subtitle="Join the Orbit community">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Avatar Upload */}
                <div className="flex justify-center mb-6">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-24 h-24 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-blue-500 overflow-hidden relative group transition-colors"
                    >
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center text-muted-foreground group-hover:text-blue-500">
                                <Upload size={24} />
                                <span className="text-[10px] mt-1">Upload</span>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                </div>

                <Input
                    label="Full Name"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    disabled={isLoading}
                />

                <Input
                    label="Username"
                    placeholder="johndoe"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={isLoading}
                />

                <Input
                    label="Email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={isLoading}
                />

                <Input
                    label="Password"
                    type="password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={isLoading}
                />

                <div className="space-y-1">
                    <label className="text-sm font-medium">Bio (Optional)</label>
                    <textarea
                        className="w-full bg-muted/50 border border-input rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
                        placeholder="Tell us about yourself..."
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        disabled={isLoading}
                    />
                </div>

                <Button type="submit" className="w-full mt-2" isLoading={isLoading} size="lg">
                    Create Account
                </Button>

                <div className="text-center text-sm text-muted-foreground mt-4">
                    Already have an account? {' '}
                    <Link to="/login" className="text-blue-500 hover:underline font-semibold">
                        Sign in
                    </Link>
                </div>
            </form>
        </AuthLayout>
    );
}
