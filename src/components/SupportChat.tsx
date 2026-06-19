import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { MessageSquare, X, Send, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from '../supabase';

interface ChatMessage {
  text: string;
  type: 'user' | 'bot';
  image?: string;
}

export const SupportChat = ({ user }: { user?: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { text: 'Hi! I’m FoodFix Support. How can I help you today? Check out our recommendations or message us if you have any order details to check!', type: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isApiHealthy, setIsApiHealthy] = useState(true);
  const [isEscalated, setIsEscalated] = useState(false);
  const [supabaseWriteError, setSupabaseWriteError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Helper to resolve user ID for Supabase operations (handling standard auth vs guest mode)
  const getResolvedUserId = async (currentUser: any): Promise<string | null> => {
    if (!currentUser) return null;

    if (currentUser.id === 'demo-guest-user') {
      try {
        // First look for any existing background anonymous session in Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Clear any previous error if we recovered a session
          setSupabaseWriteError(null);
          return session.user.id;
        }

        // If no active session, sign in anonymously to create a valid authenticated session
        const { data: anonymousData, error: anonymousError } = await supabase.auth.signInAnonymously();
        if (anonymousError) {
          console.warn('[Support Chat] Supabase Anonymous sign-in failed, attempting shared guest credential authentication:', anonymousError);
          
          const guestEmail = 'guest_demo_user@foodfix.com';
          const guestPassword = 'FoodFixGuestPassword123!';
          
          // Try signing in
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: guestEmail,
            password: guestPassword
          });
          
          if (!signInError && signInData?.user) {
            setSupabaseWriteError(null);
            return signInData.user.id;
          }
          
          // If sign in failed because the user doesn't exist yet, sign them up
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: guestEmail,
            password: guestPassword
          });
          
          if (!signUpError && signUpData?.user) {
            setSupabaseWriteError(null);
            return signUpData.user.id;
          }

          // If all options fail, show a clear diagnostic error
          const detailedError = signUpError?.message || signInError?.message || anonymousError.message;
          setSupabaseWriteError(
            `Supabase Guest authentication failed: "${detailedError}". Please make sure either (1) 'Allow Anonymous Sign-ins' is enabled under Authentication -> Providers -> Anonymous in your Supabase Auth Dashboard, or (2) Email signup/authentication is allowed.`
          );
        } else if (anonymousData?.user) {
          setSupabaseWriteError(null);
          return anonymousData.user.id;
        }
      } catch (e: any) {
        console.error('[Support Chat] Error resolving guest user session:', e);
        setSupabaseWriteError(`Error resolving guest session: ${e.message || e}`);
      }

      // Fallback: Generate a persistent valid UUID format to satisfy Postgres data type layout
      let fallbackId = localStorage.getItem('foodfix_guest_chat_uuid');
      if (!fallbackId) {
        fallbackId = '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: any) =>
          (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
        localStorage.setItem('foodfix_guest_chat_uuid', fallbackId);
      }
      return fallbackId;
    }

    return currentUser.id;
  };

  // Load previous messages from Supabase chat_messages on component mount or when user changes
  useEffect(() => {
    const fetchPreviousMessages = async () => {
      if (!isSupabaseConfigured) return;
      try {
        const currentUser = user || (await supabase.auth.getUser()).data.user;
        if (currentUser) {
          const resolvedUserId = await getResolvedUserId(currentUser);
          if (!resolvedUserId) return;

          const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('user_id', resolvedUserId)
            .order('created_at', { ascending: true });

          if (error) {
            console.error('[Support Chat] Error fetching previous messages:', error);
            setSupabaseWriteError(
              `Failed to load previous messages: "${error.message}". Please verify that the 'chat_messages' table exists in your Supabase database and that RLS policies allow you to select rows.`
            );
          } else if (data) {
            // Clear any active write/sync error if fetching succeed
            setSupabaseWriteError(null);
            const dbMessages: ChatMessage[] = data.map((msg: any) => {
              let type: 'user' | 'bot' = 'user';
              let text = msg.message || '';

              if (text.startsWith('bot:')) {
                type = 'bot';
                text = text.substring(4);
              } else if (text.startsWith('user:')) {
                type = 'user';
                text = text.substring(5);
              } else if (text.startsWith('assistant:')) {
                type = 'bot';
                text = text.substring(10);
              }

              return {
                text,
                type,
              };
            });
            // Combine initial greeting with loaded messages from the database
            setMessages([
              { text: 'Hi! I’m FoodFix Support. How can I help you today? Check out our recommendations or message us if you have any order details to check!', type: 'bot' },
              ...dbMessages
            ]);
          }
        } else {
          // Reset chat messages to welcome message if user logged out
          setMessages([
            { text: 'Hi! I’m FoodFix Support. How can I help you today? Check out our recommendations or message us if you have any order details to check!', type: 'bot' }
          ]);
        }
      } catch (err) {
        console.error('[Support Chat] Error during loading previous messages:', err);
      }
    };

    fetchPreviousMessages();
  }, [user]);

  // Automatically scroll to the bottom of the chat when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Check health of full-stack API on open
  useEffect(() => {
    if (isOpen) {
      fetch('/api/health')
        .then(res => res.json())
        .then(data => {
          setIsApiHealthy(data.status === 'ok');
        })
        .catch(() => {
          setIsApiHealthy(false);
        });
    }
  }, [isOpen]);

  const handleSend = async (customText?: string, attachedImage?: string) => {
    const textToSend = customText !== undefined ? customText : input;
    if (!textToSend.trim() && !attachedImage) return;

    // Clear input field if sending manual text
    if (customText === undefined) {
      setInput('');
    }

    const newUserMsg: ChatMessage = {
      text: textToSend || 'Uploaded image',
      type: 'user',
      image: attachedImage
    };

    // Update screen instantly
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setIsTyping(true);

    // Save message to Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const currentUser = user || (await supabase.auth.getUser()).data.user;
        if (currentUser) {
          const resolvedUserId = await getResolvedUserId(currentUser);
          if (resolvedUserId) {
            const { error: insertError } = await supabase
              .from('chat_messages')
              .insert({
                user_id: resolvedUserId,
                message: `user:${textToSend || 'Uploaded image'}`
              });
            if (insertError) {
              console.error('[Support Chat] Error inserting message to Supabase:', insertError);
              const customReason = insertError.message.toLowerCase().includes('foreign key')
                ? "This is due to a foreign key constraint on the user_id column. Please enable Anonymous Sign-Ins in your Supabase Auth Dashboard so guest sessions have a valid authenticated user in the auth.users table."
                : "This is likely caused by active Row Level Security (RLS) policies on your 'chat_messages' table rejecting anonymous or guest writes.";
              setSupabaseWriteError(`Failed to save message to Supabase: "${insertError.message}". ${customReason}`);
            } else {
              setSupabaseWriteError(null);
            }
          }
        }
      } catch (err: any) {
        console.error('[Support Chat] Supabase error in save message:', err);
        setSupabaseWriteError(`Connection error: ${err.message || err}`);
      }
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await response.json();
      setIsTyping(false);

      if (data.text) {
        setMessages(prev => {
          const next = [...prev, { text: data.text, type: 'bot' as const }];
          
          if (data.escalated) {
            setIsEscalated(true);
            next.push({
              text: "👩‍💼 [Human Handoff] I've connected this session directly to our duty manager. A live human agent is reviewing your logs and will message you shortly!",
              type: 'bot' as const
            });
          }
          return next;
        });

        // Save AI message to Supabase
        if (isSupabaseConfigured) {
          try {
            const currentUser = user || (await supabase.auth.getUser()).data.user;
            if (currentUser) {
              const resolvedUserId = await getResolvedUserId(currentUser);
              if (resolvedUserId) {
                const { error: insertError } = await supabase
                  .from('chat_messages')
                  .insert({
                    user_id: resolvedUserId,
                    message: `bot:${data.text}`
                  });
                if (insertError) {
                  console.error('[Support Chat] Error inserting AI message to Supabase:', insertError);
                  setSupabaseWriteError(`Failed to save AI reply to Supabase: "${insertError.message}". Please verify your 'chat_messages' insert RLS policies.`);
                } else {
                  setSupabaseWriteError(null);
                }

                if (data.escalated) {
                  const { error: escalationError } = await supabase
                    .from('chat_messages')
                    .insert({
                      user_id: resolvedUserId,
                      message: "bot:👩‍💼 [Human Handoff] I've connected this session directly to our duty manager. A live human agent is reviewing your logs and will message you shortly!"
                    });
                  if (escalationError) {
                    console.error('[Support Chat] Error inserting escalation status to Supabase:', escalationError);
                  }
                }
              }
            }
          } catch (err) {
            console.error('[Support Chat] Supabase error in save AI message:', err);
          }
        }
      } else if (data.error) {
        setMessages(prev => [...prev, { text: `Support encountered a problem: ${data.error}`, type: 'bot' }]);
      }
    } catch (err) {
      setIsTyping(false);
      console.error(err);
      setMessages(prev => [...prev, {
        text: "I couldn't reach the support server. Please try submitting again, or verify standard server connection.",
        type: 'bot'
      }]);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const imageBase64 = event.target?.result as string;
        // Send the uploaded image directly along with a scanning prompt
        handleSend("Please inspect this food image I uploaded for quality issues.", imageBase64);
      };
      
      reader.readAsDataURL(file);
      // Reset input value so same file can be uploaded again if needed
      e.target.value = '';
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            id="open-support-chat"
            className="fixed bottom-6 right-6 bg-orange-500 hover:bg-orange-600 text-white p-5 rounded-full shadow-2xl flex items-center gap-2.5 transition-all font-bold cursor-pointer hover:shadow-orange-200 hover:-translate-y-0.5 active:translate-y-0 z-40 group"
          >
            <MessageSquare size={22} className="group-hover:rotate-12 transition-transform" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out whitespace-nowrap block text-sm">
              Live AI Support
            </span>
            <span className="text-xs bg-orange-600 px-2 py-0.5 rounded-full block border border-orange-400">AI</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            id="support-chat-window"
            className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-2rem)] h-[550px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-slate-950 flex justify-between items-center text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="bg-orange-500 p-1.5 rounded-xl text-white">
                  <Sparkles size={16} className="animate-spin duration-3000" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{isEscalated ? "FoodFix Live Help" : "FoodFix AI Support"}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isEscalated ? 'bg-orange-500' : 'bg-green-500'}`}></span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {isEscalated ? "Connecting human agent..." : "Virtual Agent Online"}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-full transition cursor-pointer text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Health Alert Bar */}
            {!isApiHealthy && (
              <div className="bg-amber-50 text-amber-800 p-2 text-[11px] flex items-center gap-1.5 border-b border-amber-100 font-medium leading-tight shrink-0">
                <AlertCircle size={14} className="shrink-0 text-amber-600" />
                <span>Express API not responding. Testing simulation mode...</span>
              </div>
            )}

            {/* Supabase Diagnostic Sync Warning Bar */}
            {isSupabaseConfigured && supabaseWriteError && (
              <div id="supabase-sync-alert" className="bg-red-50 text-red-800 p-3 text-[11px] border-b border-red-100 font-medium leading-relaxed shrink-0 max-h-32 overflow-y-auto">
                <div className="flex items-start gap-1.5">
                  <AlertCircle size={14} className="shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <span className="font-bold block text-red-950 mb-0.5">Supabase Sync Blocked</span>
                    <span className="text-slate-600 font-normal">{supabaseWriteError}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Messages Body */}
            <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50/50">
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={`flex flex-col ${m.type === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                    m.type === 'user' 
                      ? 'bg-orange-500 text-white rounded-tr-none shadow-sm' 
                      : 'bg-white text-slate-700 shadow-sm rounded-tl-none border border-slate-100/80'
                  }`}>
                    {/* Render Image Attachments first */}
                    {m.image && (
                      <div className="mb-2 max-w-full rounded-lg overflow-hidden border border-slate-100/50">
                        <img 
                          referrerPolicy="no-referrer"
                          src={m.image} 
                          alt="support diagnostic context" 
                          className="max-h-48 object-cover w-full" 
                        />
                        <div className="p-1.5 bg-slate-900/60 text-[9px] font-medium text-white flex items-center gap-1 backdrop-blur-xs justify-center font-mono">
                          <Sparkles size={10} className="text-orange-400" />
                          <span>AI SCANNING QUALITY</span>
                        </div>
                      </div>
                    )}
                    <span className="whitespace-pre-line block">{m.text}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1 font-medium">
                    {m.type === 'user' ? 'Me' : 'FoodFix AI'}
                  </span>
                </div>
              ))}
              
              {/* Type Loading State */}
              {isTyping && (
                <div className="flex flex-col items-start">
                  <div className="p-3 bg-white text-slate-500 rounded-2xl rounded-tl-none shadow-xs border border-slate-100/80 flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider mr-1.5 text-slate-400 animate-pulse">Scanning context</span>
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Quick Prompts Options */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex gap-2 overflow-x-auto scrollbar-none whitespace-nowrap shrink-0">
              <button 
                onClick={() => handleSend("What do you recommend on the menu?")}
                className="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-full hover:border-orange-500 hover:text-orange-600 transition cursor-pointer"
              >
                💡 Recommend Dishes
              </button>
              <button 
                onClick={() => handleSend("My pizza arrived cold. What is your refund policy?")}
                className="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-full hover:border-orange-500 hover:text-orange-600 transition cursor-pointer"
              >
                ❄️ Cold Food Complaint
              </button>
              <button 
                onClick={() => handleSend("Tell me about delivery times and fees.")}
                className="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-full hover:border-orange-500 hover:text-orange-600 transition cursor-pointer"
              >
                ⏱️ Delivery times
              </button>
            </div>

            {/* Form Input Footer */}
            <div className="p-4 border-t border-slate-100/90 flex items-center gap-2 bg-white rounded-b-3xl">
              <input 
                type="file" 
                accept="image/*"
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
              />
              <button 
                className="p-2 text-slate-400 hover:text-orange-500 hover:bg-slate-50 rounded-xl transition cursor-pointer" 
                onClick={() => fileInputRef.current?.click()}
                title="Upload/Snap Photo for AI review"
              >
                <ImageIcon size={20} />
              </button>
              
              <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about orders, menus or upload photos..." 
                className="flex-grow text-xs border border-slate-100 bg-slate-100/80 focus:bg-white p-2.5 rounded-xl focus:ring-1 focus:ring-orange-500 focus:outline-none transition-all text-slate-700"
              />
              
              <button 
                onClick={() => handleSend()} 
                className="p-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition active:scale-95 cursor-pointer shadow-sm hover:shadow-md"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
