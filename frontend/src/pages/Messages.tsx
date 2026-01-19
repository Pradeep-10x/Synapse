import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { io, Socket } from 'socket.io-client';
import { Send, MoreVertical, Phone, Video, Search, ChevronLeft, MessageCircle, X } from 'lucide-react';
import { cn } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

import { api } from '@/lib/axios';

interface Message {
    _id: string;
    sender: string | { _id: string };
    content: string;
    createdAt: string;
}

interface Conversation {
    _id: string;
    id?: string;
    participants?: Array<{
        _id: string;
        username: string;
        avatar?: string;
        fullName?: string;
    }>;
    user: {
        _id: string;
        username: string;
        avatar: string;
        fullName: string;
        isOnline: boolean;
    };
    otherUser?: any;
    lastMessage?: string;
    unreadCount: number;
}

export default function MessagesPage() {
    const { user } = useAuthStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial socket connection
    // Initial socket connection
    useEffect(() => {
        if (!user) return;

        const socketUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';
        console.log("Connecting to socket at:", socketUrl);

        const newSocket = io(socketUrl, {
            query: { userId: user._id },
            transports: ['websocket', 'polling'] // Explicitly prefer websocket
        });

        newSocket.on("connect", () => {
            console.log("Socket connected:", newSocket.id);
        });

        newSocket.on("connect_error", (err) => {
            console.error("Socket connection error:", err);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect(); // Use disconnect() which is an alias for close()
        };
    }, [user]);

    // Socket message and status listener
    useEffect(() => {
        if (!socket || !user) return;

        const handleNewMessage = (message: any) => {
            console.log("New message received:", message);
            // Transform the message
            const senderId = typeof message.sender === 'string' ? message.sender : message.sender?._id;
            const transformedMessage = {
                _id: message._id,
                senderId: senderId || message.sender,
                text: message.content,
                content: message.content,
                createdAt: message.createdAt
            };

            // Add message if it belongs to the active conversation
            if (activeConversation) {
                const conversationUserId = activeConversation.user?._id || activeConversation.otherUser?._id;
                // Check if message is from the other user in this conversation
                if (senderId && conversationUserId && senderId === conversationUserId) {
                    setMessages(prev => {
                        // Avoid duplicates
                        if (prev.some(m => m._id === transformedMessage._id)) {
                            return prev;
                        }
                        return [...prev, transformedMessage];
                    });
                }
                // Also add if it's from current user (sent to this conversation - though usually handled optimistically)
                else if (senderId === user._id && message.receiver === conversationUserId) {
                    setMessages(prev => {
                        if (prev.some(m => m._id === transformedMessage._id)) {
                            return prev;
                        }
                        return [...prev, transformedMessage];
                    });
                }
            }

            // Re-fetch conversations to update last message/unread count
            fetchConversations();
        };

        const handleUserStatus = ({ userId, status }: { userId: string, status: 'online' | 'offline' }) => {
            console.log("User status update:", userId, status);
            const isOnline = status === 'online';

            // Update conversations
            setConversations(prev => prev.map(conv => {
                if (conv.user._id === userId) {
                    return {
                        ...conv,
                        user: { ...conv.user, isOnline }
                    };
                }
                return conv;
            }));

            // Update active conversation if it matches
            if (activeConversation?.user._id === userId) {
                setActiveConversation(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        user: { ...prev.user, isOnline }
                    }
                });
            }
        };

        socket.on('message:new', handleNewMessage);
        socket.on('user:status', handleUserStatus);

        return () => {
            socket.off('message:new', handleNewMessage);
            socket.off('user:status', handleUserStatus);
        };
    }, [socket, activeConversation, user]);

    const fetchConversations = async () => {
        try {
            const { data } = await api.get('/message/conversations');
            const conversations = data.data || [];
            // Transform conversations to match frontend interface
            const transformed = conversations.map((conv: any) => {
                const otherUser = conv.participants.find((p: any) => p._id !== user?._id) || conv.participants[0];
                return {
                    _id: conv._id,
                    id: conv._id,
                    user: {
                        _id: otherUser._id,
                        username: otherUser.username,
                        avatar: otherUser.avatar || `https://ui-avatars.com/api/?name=${otherUser.username}`,
                        fullName: otherUser.fullName || otherUser.username,
                        isOnline: false // TODO: This is still false initially, would need an API or socket event to get initial status
                    },
                    otherUser,
                    lastMessage: conv.lastMessage || '',
                    unreadCount: conv.unreadCount || 0
                };
            });

            // Preserve online status from existing state if possible
            setConversations(prev => {
                if (prev.length === 0) return transformed;

                // Map of userId -> isOnline from previous state
                const onlineStatusMap = new Map();
                prev.forEach(c => {
                    if (c.user.isOnline) onlineStatusMap.set(c.user._id, true);
                });

                return transformed.map((t: any) => {
                    // Update isOnline if we knew it was true
                    if (onlineStatusMap.has(t.user._id)) {
                        t.user.isOnline = true;
                    }
                    return t;
                });
            });

        } catch (error: any) {
            console.error("Failed to fetch conversations", error);
            if (error.response?.status !== 401) {
                // toast.error('Failed to load conversations'); // Suppress to avoid spamming
            }
        }
    };

    const handleStartChat = async (userId: string, username: string, avatar?: string, fullName?: string) => {
        try {
            // Check if conversation already exists
            const existingConv = conversations.find(c => c.user._id === userId);
            if (existingConv) {
                setActiveConversation(existingConv);
                setShowUserSearch(false);
                return;
            }

            // Create a new conversation object (conversation will be created when first message is sent)
            const newConversation: Conversation = {
                _id: `temp-${Date.now()}`,
                id: `temp-${Date.now()}`,
                user: {
                    _id: userId,
                    username,
                    avatar: avatar || `https://ui-avatars.com/api/?name=${username}`,
                    fullName: fullName || username,
                    isOnline: false
                },
                otherUser: { _id: userId, username, avatar, fullName },
                lastMessage: '',
                unreadCount: 0
            };

            setActiveConversation(newConversation);
            setShowUserSearch(false);
            setSearchQuery('');
            setSearchResults([]);

            // Refresh conversations after a delay to see if it was created
            setTimeout(() => {
                fetchConversations();
            }, 500);
        } catch (error) {
            console.error("Failed to start chat", error);
            toast.error('Failed to start conversation');
        }
    };

    useEffect(() => {
        if (user?._id) {
            fetchConversations();
        }
    }, [user?._id]);

    // Handle URL params for starting chat from profile
    useEffect(() => {
        const userId = searchParams.get('userId');
        const username = searchParams.get('username');

        if (userId && username && conversations.length >= 0) {
            // Check if conversation exists
            const existingConv = conversations.find(c => c.user._id === userId);
            if (existingConv) {
                setActiveConversation(existingConv);
                setSearchParams({}); // Clear params
            } else {
                // Create new conversation
                handleStartChat(
                    userId,
                    username,
                    searchParams.get('avatar') || undefined,
                    searchParams.get('fullName') || undefined
                );
                setSearchParams({}); // Clear params
            }
        }
    }, [searchParams, conversations.length]);

    // Update active conversation when a temporary one becomes real
    useEffect(() => {
        if (activeConversation?._id?.toString().startsWith('temp-') && conversations.length > 0) {
            const realConv = conversations.find(c => c.user._id === activeConversation.user._id);
            if (realConv) {
                setActiveConversation(realConv);
            }
        }
    }, [conversations, activeConversation]);

    // Search users for new chat
    useEffect(() => {
        if (!showUserSearch) {
            setSearchQuery('');
            setSearchResults([]);
            return;
        }

        const searchUsers = async () => {
            if (searchQuery.trim().length < 2) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const { data } = await api.get(`/user/search?query=${encodeURIComponent(searchQuery)}`);
                // Filter out current user and users already in conversations
                const existingUserIds = new Set(conversations.map(c => c.user._id));
                const filtered = (data.data || []).filter((u: any) =>
                    u._id !== user?._id && !existingUserIds.has(u._id)
                );
                setSearchResults(filtered.slice(0, 10));
            } catch (error) {
                console.error("Search failed", error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        const debounceTimer = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchQuery, showUserSearch, conversations, user?._id]);

    useEffect(() => {
        if (activeConversation && user) {
            const conversationId = activeConversation._id || activeConversation.id;

            // Skip fetching if it's a temporary conversation (starts with "temp-")
            if (conversationId?.toString().startsWith('temp-')) {
                setMessages([]);
                return;
            }

            const fetchMessages = async () => {
                try {
                    const { data } = await api.get(`/message/conversation/${conversationId}/messages`);
                    const messages = data.data || [];
                    // Transform messages to match frontend interface
                    const transformed = messages.map((msg: any) => {
                        const senderId = typeof msg.sender === 'string' ? msg.sender : (msg.sender?._id || msg.sender);
                        return {
                            _id: msg._id,
                            senderId: senderId,
                            text: msg.content || '',
                            content: msg.content || '',
                            createdAt: msg.createdAt || msg.createdAt
                        };
                    });
                    setMessages(transformed);
                } catch (error: any) {
                    console.error("Failed to fetch messages", error);
                    if (error.response?.status === 403) {
                        toast.error('You are not authorized to view this conversation');
                    } else if (error.response?.status !== 404) {
                        toast.error('Failed to load messages');
                    }
                    setMessages([]);
                }
            };
            fetchMessages();
        } else {
            setMessages([]);
        }
    }, [activeConversation, user]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConversation || !user) return;

        const messageText = newMessage.trim();
        setNewMessage(''); // Clear input immediately for better UX

        try {
            const { data } = await api.post('/message/send', {
                receiverId: activeConversation.user._id,
                content: messageText
            });

            // Transform the response message
            const message = {
                _id: data.data._id || data.data._id,
                senderId: user._id, // Current user is the sender
                text: data.data.content || messageText,
                content: data.data.content || messageText,
                createdAt: data.data.createdAt || new Date().toISOString()
            };

            // Add message immediately to UI
            setMessages(prev => {
                // Avoid duplicates
                if (prev.some(m => m._id === message._id)) {
                    return prev;
                }
                return [...prev, message];
            });

            // If this was a temporary conversation, refresh to get the real conversation ID
            if (activeConversation?._id?.toString().startsWith('temp-')) {
                setTimeout(async () => {
                    await fetchConversations();
                    // The conversations state will be updated, so we need to check it in the next render
                    // We'll handle this in a separate useEffect
                }, 1000);
            } else {
                // Refresh conversations to update last message
                fetchConversations();
            }
        } catch (error: any) {
            console.error("Send failed", error);
            // Restore message on error
            setNewMessage(messageText);
            // Show error toast
            const errorMessage = error.response?.data?.message || 'Failed to send message. Please try again.';
            toast.error(errorMessage);
        }
    };

    return (
        <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-40px)] flex glass-panel md:rounded-2xl overflow-hidden shadow-2xl relative z-0">
            {/* Sidebar / Chat List */}
            <div className={cn(
                "w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-white/10 flex flex-col transition-all duration-300 bg-white/40 backdrop-blur-md",
                activeConversation ? "hidden md:flex" : "flex"
            )}>
                <div className="p-6 border-b border-white/10">
                    <h2 className="text-2xl font-heading font-bold mb-4 text-gray-900 tracking-tight">Messages</h2>
                    <div className="relative group">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            className="w-full bg-white/50 border border-white/20 pl-11 pr-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all shadow-sm placeholder:text-gray-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {conversations.length > 0 ? (
                        conversations.map(conv => (
                            <motion.div
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                key={conv._id || conv.id}
                                onClick={() => setActiveConversation(conv)}
                                className={cn(
                                    "p-4 mx-2 my-1 rounded-2xl flex items-center gap-3 cursor-pointer transition-all duration-200 relative group",
                                    (activeConversation?._id === conv._id || activeConversation?.id === conv.id)
                                        ? "bg-black text-white shadow-lg shadow-black/10"
                                        : "hover:bg-white/60 text-gray-900"
                                )}
                            >
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/50 shadow-sm">
                                        <img src={conv.user.avatar || `https://ui-avatars.com/api/?name=${conv.user.username}`} className="w-full h-full object-cover" alt="avatar" />
                                    </div>
                                    {conv.user.isOnline && (
                                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h4 className="font-bold truncate text-sm">{conv.user.fullName || conv.user.username}</h4>
                                        <span className={cn("text-[10px] uppercase font-bold tracking-tighter opacity-60")}>Today</span>
                                    </div>
                                    <p className={cn("text-xs truncate", (activeConversation?._id === conv._id || activeConversation?.id === conv.id) ? "text-gray-300" : "text-gray-500")}>
                                        {conv.lastMessage || 'No messages yet'}
                                    </p>
                                </div>
                                {conv.unreadCount > 0 && (activeConversation?._id !== conv._id && activeConversation?.id !== conv.id) && (
                                    <div className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg ring-2 ring-white">
                                        {conv.unreadCount}
                                    </div>
                                )}
                            </motion.div>
                        ))
                    ) : (
                        <div className="p-8 text-center opacity-40 italic text-sm">No conversations yet</div>
                    )}
                </div>
            </div>

            {/* Chat Window */}
            {activeConversation ? (
                <div className="flex-1 flex flex-col bg-white/20 backdrop-blur-sm relative overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/60 backdrop-blur-xl z-20 shadow-sm">
                        <div className="flex items-center gap-3">
                            <button className="md:hidden p-2 -ml-2 text-gray-600 hover:text-black hover:bg-black/5 rounded-full transition-all" onClick={() => setActiveConversation(null)}>
                                <ChevronLeft size={24} />
                            </button>
                            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-md">
                                <img src={activeConversation.user.avatar || `https://ui-avatars.com/api/?name=${activeConversation.user.username}`} className="w-full h-full object-cover" alt="avatar" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 leading-tight">{activeConversation.user.fullName || activeConversation.user.username}</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className={cn("w-1.5 h-1.5 rounded-full", activeConversation.user.isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
                                    <p className={cn("text-[10px] font-bold uppercase tracking-wider", activeConversation.user.isOnline ? "text-green-600" : "text-gray-500")}>
                                        {activeConversation.user.isOnline ? "Active Now" : "Offline"}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2">
                            <button className="p-2.5 hover:bg-black/5 rounded-full transition-all text-gray-600 hover:text-black">
                                <Phone size={20} />
                            </button>
                            <button className="p-2.5 hover:bg-black/5 rounded-full transition-all text-gray-600 hover:text-black">
                                <Video size={20} />
                            </button>
                            <button className="p-2.5 hover:bg-black/5 rounded-full transition-all text-gray-600 hover:text-black">
                                <MoreVertical size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent via-white/5 to-white/10"
                    >
                        <AnimatePresence initial={false}>
                            {messages.map((msg, index) => {
                                const senderId = typeof msg.senderId === 'string' ? msg.senderId : (msg.senderId?._id || msg.senderId);
                                const isOwn = senderId === user?._id;
                                return (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        key={msg._id || `msg-${index}`}
                                        className={cn("flex items-end gap-2", isOwn ? "flex-row-reverse" : "flex-row")}
                                    >
                                        {!isOwn && (
                                            <div className="w-6 h-6 rounded-full overflow-hidden border border-white flex-shrink-0 mb-1">
                                                <img src={activeConversation.user.avatar || `https://ui-avatars.com/api/?name=${activeConversation.user.username}`} className="w-full h-full object-cover" alt="" />
                                            </div>
                                        )}
                                        <div className={cn(
                                            "px-4 py-3 rounded-2xl max-w-[70%] shadow-lg relative group transition-all",
                                            isOwn
                                                ? "bg-black text-white rounded-br-none"
                                                : "bg-white text-gray-900 border border-white/50 rounded-bl-none"
                                        )}>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text || msg.content || ''}</p>
                                            <span className={cn(
                                                "text-[8px] mt-1.5 block font-bold uppercase tracking-tighter opacity-50",
                                                isOwn ? "text-right" : "text-left"
                                            )}>
                                                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                            </span>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                        {messages.length === 0 && (
                            <div className="flex flex-col justify-center items-center h-full text-gray-400 space-y-4 py-20 translate-y-[-10%]">
                                <div className="w-20 h-20 rounded-full bg-white/40 flex items-center justify-center shadow-inner">
                                    <MessageCircle size={36} className="opacity-40" />
                                </div>
                                <div className="text-center">
                                    <p className="font-heading font-bold text-gray-900">No messages yet</p>
                                    <p className="text-xs font-medium">Be the first to say hello!</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-4 md:p-6 bg-white/40 backdrop-blur-xl border-t border-white/20 z-20">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                            <div className="flex-1 flex items-center gap-2 bg-white/80 border border-white/40 px-5 py-1.5 rounded-3xl shadow-lg ring-1 ring-black/5 focus-within:ring-black/10 transition-all">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Write something..."
                                    className="flex-1 bg-transparent py-3 outline-none text-sm text-gray-900 placeholder:text-gray-400 font-medium"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="p-3 bg-black text-white rounded-full hover:bg-gray-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 shadow-xl disabled:scale-100 ring-2 ring-white/20"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center text-gray-900 p-12 text-center bg-white/10 backdrop-blur-sm relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 pointer-events-none" />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", damping: 15 }}
                        className="relative z-10"
                    >
                        <div className="w-32 h-32 bg-white/60 rounded-full flex items-center justify-center mb-10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-4 border-white mx-auto">
                            <Send size={48} className="text-black transform rotate-12 -translate-y-1 ml-2" />
                        </div>
                        <h3 className="text-4xl font-heading font-black mb-4 tracking-tighter">Stay Connected</h3>
                        <p className="text-gray-500 max-w-sm mx-auto leading-relaxed font-medium">
                            Choose a conversation from the sidebar to jump back in. Your security and privacy are our top priority.
                        </p>
                        <button
                            onClick={() => setShowUserSearch(true)}
                            className="mt-10 px-8 py-3.5 bg-black text-white rounded-full font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all"
                        >
                            Start New Chat
                        </button>
                    </motion.div>
                </div>
            )}

            {/* User Search Modal */}
            <AnimatePresence>
                {showUserSearch && (
                    <>
                        <div
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                            onClick={() => setShowUserSearch(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
                                <div className="p-6 border-b border-gray-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-bold text-gray-900">Start New Chat</h3>
                                        <button
                                            onClick={() => setShowUserSearch(false)}
                                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search for a user..."
                                            className="w-full bg-gray-50 border border-gray-200 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">
                                    {isSearching ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        <div className="space-y-2">
                                            {searchResults.map((userResult: any) => (
                                                <button
                                                    key={userResult._id}
                                                    onClick={() => handleStartChat(
                                                        userResult._id,
                                                        userResult.username,
                                                        userResult.avatar,
                                                        userResult.fullName
                                                    )}
                                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                                                >
                                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                                                        <img
                                                            src={userResult.avatar || `https://ui-avatars.com/api/?name=${userResult.username}`}
                                                            alt={userResult.username}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-gray-900 truncate">
                                                            {userResult.fullName || userResult.username}
                                                        </h4>
                                                        <p className="text-sm text-gray-500 truncate">@{userResult.username}</p>
                                                    </div>
                                                    <MessageCircle size={20} className="text-gray-400 flex-shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    ) : searchQuery.trim().length >= 2 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <p>No users found</p>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-400">
                                            <p>Start typing to search for users...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
