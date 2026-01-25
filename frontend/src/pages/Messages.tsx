import { useEffect, useState, useRef } from 'react';
import { messageAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import { Send, Phone, Video, Loader2, Circle, Users, MessageCircle, X } from 'lucide-react';

interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
    fullName?: string;
  };
  receiver: string;
  conversation: string;
  createdAt: string;
}

interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    username: string;
    avatar?: string;
  }>;
  lastMessage?: string;
  updatedAt: string;
}

interface CommunityChat {
  _id: string;
  name: string;
  memberCount: number;
  lastMessage?: string;
  updatedAt: string;
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [communityChats, setCommunityChats] = useState<CommunityChat[]>([]);
  void setCommunityChats; // Will be used when community chats API is integrated
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedCommunityChat, setSelectedCommunityChat] = useState<CommunityChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'community'>('direct');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedConversationRef = useRef<Conversation | null>(null);

  // Keep ref in sync with state for socket callbacks
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Listen for new messages from global socket
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      const currentConversation = selectedConversationRef.current;
      if (currentConversation?._id === message.conversation) {
        setMessages((prev) => [...prev, message]);
      }
      // Update conversation list
      updateConversationLastMessage(message.conversation, message.content);
    };

    const handleTyping = (data: { conversationId: string; isTyping: boolean }) => {
      const currentConversation = selectedConversationRef.current;
      if (currentConversation?._id === data.conversationId) {
        setTyping(data.isTyping);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing', handleTyping);
    };
  }, [socket]);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await messageAPI.getConversations();
      setConversations(response.data.data || []);
      // Don't auto-select any conversation
    } catch (error: any) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await messageAPI.getMessages(conversationId);
      setMessages(response.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const updateConversationLastMessage = (conversationId: string, lastMessage: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv._id === conversationId
          ? { ...conv, lastMessage, updatedAt: new Date().toISOString() }
          : conv
      )
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation || !user) return;

    const receiverId = selectedConversation.participants.find(
      (p) => p._id !== user._id
    )?._id;

    if (!receiverId) return;

    setSending(true);
    try {
      const response = await messageAPI.sendMessage({
        receiverId,
        content: messageInput.trim(),
      });

      const newMessage = response.data.data;
      setMessages((prev) => [...prev, newMessage]);
      updateConversationLastMessage(selectedConversation._id, messageInput.trim());
      setMessageInput('');
    } catch (error: any) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (!selectedConversation || !socket) return;

    socket.emit('typing', {
      conversationId: selectedConversation._id,
      isTyping: true,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('typing', {
        conversationId: selectedConversation._id,
        isTyping: false,
      });
    }, 1000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find((p) => p._id !== user?._id);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setSelectedCommunityChat(null);
  };

  const handleSelectCommunityChat = (chat: CommunityChat) => {
    setSelectedCommunityChat(chat);
    setSelectedConversation(null);
    // TODO: Fetch community chat messages
    setMessages([]);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#a855f7]" />
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Conversations List */}
      <div className="w-full md:w-80 border-r border-[rgba(168,85,247,0.15)] glass-panel flex flex-col">
        <div className="p-4 border-b border-[rgba(168,85,247,0.15)]">
          <h2 className="text-xl font-bold text-[#e5e7eb] mb-3">Messages</h2>
          {/* Tabs for Direct vs Community */}
          <div className="flex gap-1 p-1 glass-card rounded-lg">
            <button
              onClick={() => setActiveTab('direct')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'direct'
                  ? 'bg-[#7c3aed] text-white'
                  : 'text-[#9ca3af] hover:text-[#e5e7eb]'
                }`}
            >
              <MessageCircle className="w-4 h-4" />
              Direct
            </button>
            <button
              onClick={() => setActiveTab('community')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'community'
                  ? 'bg-[#7c3aed] text-white'
                  : 'text-[#9ca3af] hover:text-[#e5e7eb]'
                }`}
            >
              <Users className="w-4 h-4" />
              Community
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'direct' ? (
            // Direct Messages List
            conversations.length === 0 ? (
              <div className="p-4 text-center text-[#9ca3af]">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 text-[#374151]" />
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map((conversation) => {
                const otherUser = getOtherParticipant(conversation);
                const isSelected = selectedConversation?._id === conversation._id;
                return (
                  <button
                    key={conversation._id}
                    onClick={() => handleSelectConversation(conversation)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-[rgba(168,85,247,0.1)] transition-colors border-b border-[rgba(168,85,247,0.05)] ${isSelected ? 'bg-[rgba(168,85,247,0.15)]' : ''
                      }`}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-[#a855f7] flex items-center justify-center overflow-hidden">
                        <img
                          src={otherUser?.avatar || "/default-avatar.jpg"}
                          alt={otherUser?.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Circle className="w-3 h-3 absolute bottom-0 right-0 text-green-500 fill-green-500" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-semibold text-[#e5e7eb] truncate">{otherUser?.username}</div>
                      <div className="text-sm text-[#9ca3af] truncate">{conversation.lastMessage || 'No messages'}</div>
                    </div>
                  </button>
                );
              })
            )
          ) : (
            // Community Chats List
            communityChats.length === 0 ? (
              <div className="p-4 text-center text-[#9ca3af]">
                <Users className="w-12 h-12 mx-auto mb-2 text-[#374151]" />
                <p>No community chats</p>
                <p className="text-sm text-[#6b7280] mt-1">Join a community to start chatting</p>
              </div>
            ) : (
              communityChats.map((chat) => {
                const isSelected = selectedCommunityChat?._id === chat._id;
                return (
                  <button
                    key={chat._id}
                    onClick={() => handleSelectCommunityChat(chat)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-[rgba(168,85,247,0.1)] transition-colors border-b border-[rgba(168,85,247,0.05)] ${isSelected ? 'bg-[rgba(168,85,247,0.15)]' : ''
                      }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#7c3aed]/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#a855f7]" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-semibold text-[#e5e7eb] truncate">{chat.name}</div>
                      <div className="text-sm text-[#9ca3af] truncate">{chat.lastMessage || 'No messages yet'}</div>
                      <div className="text-xs text-[#6b7280] mt-0.5">{chat.memberCount.toLocaleString()} members</div>
                    </div>
                  </button>
                );
              })
            )
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header - Direct Message */}
            <div className="p-4 border-b border-[rgba(168,85,247,0.15)] glass-panel flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#a855f7] flex items-center justify-center overflow-hidden">
                  <img
                    src={getOtherParticipant(selectedConversation)?.avatar || "/default-avatar.jpg"}
                    alt={getOtherParticipant(selectedConversation)?.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-semibold text-[#e5e7eb]">
                    {getOtherParticipant(selectedConversation)?.username}
                  </div>
                  <div className="text-xs text-[#9ca3af] flex items-center gap-1">
                    <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                    Online
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 glass-card rounded-lg hover:border-[rgba(168,85,247,0.3)] transition-colors">
                  <Phone className="w-5 h-5 text-[#9ca3af]" />
                </button>
                <button className="p-2 glass-card rounded-lg hover:border-[rgba(168,85,247,0.3)] transition-colors">
                  <Video className="w-5 h-5 text-[#9ca3af]" />
                </button>
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="p-2 glass-card rounded-lg hover:border-[rgba(239,68,68,0.4)] hover:text-red-400 transition-colors"
                >
                  <X className="w-5 h-5 text-[#9ca3af]" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isOwn = message.sender._id === user?._id;
                return (
                  <div
                    key={message._id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isOwn
                        ? 'bg-[#7c3aed] text-white'
                        : 'glass-card text-[#e5e7eb]'
                        }`}
                    >
                      {!isOwn && (
                        <div className="text-xs font-semibold mb-1">{message.sender.username}</div>
                      )}
                      <p>{message.content}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-[#9ca3af]'}`}>
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {typing && (
                <div className="flex justify-start">
                  <div className="glass-card px-4 py-2 rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-[#9ca3af] rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-[#9ca3af] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-[#9ca3af] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-[rgba(168,85,247,0.15)] glass-panel">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 glass-card rounded-lg text-[#e5e7eb] placeholder-[#9ca3af] focus:outline-none focus:border-[rgba(168,85,247,0.5)] focus:ring-2 focus:ring-[rgba(168,85,247,0.2)] transition-all duration-200"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || sending}
                  className="p-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : selectedCommunityChat ? (
          <>
            {/* Chat Header - Community */}
            <div className="p-4 border-b border-[rgba(168,85,247,0.15)] glass-panel flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#a855f7]" />
                </div>
                <div>
                  <div className="font-semibold text-[#e5e7eb]">
                    {selectedCommunityChat.name}
                  </div>
                  <div className="text-xs text-[#9ca3af]">
                    {selectedCommunityChat.memberCount.toLocaleString()} members
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 glass-card rounded-lg hover:border-[rgba(168,85,247,0.3)] transition-colors">
                  <Users className="w-5 h-5 text-[#9ca3af]" />
                </button>
                <button
                  onClick={() => setSelectedCommunityChat(null)}
                  className="p-2 glass-card rounded-lg hover:border-[rgba(239,68,68,0.4)] hover:text-red-400 transition-colors"
                >
                  <X className="w-5 h-5 text-[#9ca3af]" />
                </button>
              </div>
            </div>

            {/* Community Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center h-full">
                  <div className="text-center text-[#9ca3af]">
                    <Users className="w-12 h-12 mx-auto mb-2 text-[#374151]" />
                    <p className="text-lg mb-2">Welcome to {selectedCommunityChat.name}</p>
                    <p className="text-sm">Start chatting with community members!</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.sender._id === user?._id;
                  return (
                    <div
                      key={message._id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isOwn && (
                        <div className="w-8 h-8 rounded-full bg-[#a855f7] flex items-center justify-center overflow-hidden mr-2 shrink-0">
                          <img
                            src={message.sender.avatar || "/default-avatar.jpg"}
                            alt={message.sender.username}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isOwn
                          ? 'bg-[#7c3aed] text-white'
                          : 'glass-card text-[#e5e7eb]'
                          }`}
                      >
                        {!isOwn && (
                          <div className="text-xs font-semibold mb-1 text-[#a855f7]">{message.sender.username}</div>
                        )}
                        <p>{message.content}</p>
                        <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-[#9ca3af]'}`}>
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Community Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-[rgba(168,85,247,0.15)] glass-panel">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Message ${selectedCommunityChat.name}...`}
                  className="flex-1 px-4 py-3 glass-card rounded-lg text-[#e5e7eb] placeholder-[#9ca3af] focus:outline-none focus:border-[rgba(168,85,247,0.5)] focus:ring-2 focus:ring-[rgba(168,85,247,0.2)] transition-all duration-200"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || sending}
                  className="p-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-[#9ca3af]">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#7c3aed]/10 flex items-center justify-center">
                <MessageCircle className="w-10 h-10 text-[#a855f7]" />
              </div>
              <p className="text-xl font-semibold text-[#e5e7eb] mb-2">Start a new chat</p>
              <p className="text-sm max-w-xs">Select a conversation from the sidebar or search for someone to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

