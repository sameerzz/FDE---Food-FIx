import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { MessageSquare, X, Send, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  text: string;
  type: 'user' | 'bot';
  image?: string;
}

export const SupportChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { text: 'Hi! I’m FoodFix Support. How can I help you today? Check out our recommendations or message us if you have any order details to check!', type: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isApiHealthy, setIsApiHealthy] = useState(true);
  const [isEscalated, setIsEscalated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
