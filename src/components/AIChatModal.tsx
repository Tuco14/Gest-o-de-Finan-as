import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Trash2, 
  Minimize2, 
  Maximize2, 
  Copy, 
  Check, 
  Volume2, 
  VolumeX 
} from 'lucide-react';
import { Transaction, Account, PayableBill, FinancialGoal } from '../types';
import { Robot3D } from './Robot3D';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  availableBalance: number;
  totalBalance: number;
  accounts: Account[];
  currentMonth: string;
  monthlyMetrics: {
    totalIncome: number;
    paidIncome: number;
    pendingIncome: number;
    totalExpense: number;
    paidExpense: number;
    pendingExpense: number;
  };
  bills: PayableBill[];
  goals: FinancialGoal[];
  recentTransactions: Transaction[];
  userEmail?: string;
}

const STORAGE_KEY = 'fincontrol_ai_chat_history_v2';

export const AIChatModal: React.FC<AIChatModalProps> = ({
  isOpen,
  onClose,
  onOpen,
  availableBalance,
  totalBalance,
  accounts,
  currentMonth,
  monthlyMetrics,
  bills,
  goals,
  recentTransactions,
  userEmail,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Erro ao recuperar histórico:', e);
    }
    return [
      {
        id: 'welcome-1',
        role: 'assistant',
        content: `Olá! Sou o **FinBot AI**, seu assistente financeiro no **FinControl**.\n\nVocê pode me perguntar se é viável realizar compras, planejar despesas ou avaliar sua situação financeira.\n\nComo posso ajudar você agora?`,
        timestamp: new Date().toISOString(),
      },
    ];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRobotHovered, setIsRobotHovered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error(e);
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const financialContext = {
        availableBalance,
        totalBalance,
        accounts: accounts.map(a => ({
          name: a.name,
          institution: a.institution,
          type: a.type,
          balance: a.balance,
          isMain: a.isMain,
        })),
        currentMonth,
        monthlyMetrics,
        bills: bills.map(b => ({
          name: b.name,
          billType: b.billType,
          installmentAmount: b.installmentAmount,
          totalInstallments: b.totalInstallments,
          paidInstallments: b.paidInstallments,
          dueDate: b.dueDate,
          isPaidThisMonth: b.lastPaidMonth === currentMonth,
        })),
        goals: goals.map(g => ({
          title: g.title,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          deadline: g.deadline,
        })),
        recentTransactions: recentTransactions.slice(0, 15).map(t => ({
          description: t.description,
          amount: t.amount,
          type: t.type,
          date: t.date,
          status: t.status,
          category: t.category,
        })),
        userEmail,
      };

      const serverMessages = updatedMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: serverMessages,
          financialContext,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${res.status}`);
      }

      const data = await res.json();
      const botReply: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Não foi possível gerar uma resposta clara.',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, botReply]);
    } catch (err: any) {
      console.error('Erro ao consultar FinBot AI:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Ocorreu uma instabilidade ao processar a pergunta: ${err.message || 'Erro inesperado'}. Por favor, tente novamente.`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Deseja limpar o histórico da conversa com o FinBot AI?')) {
      const initial: ChatMessage[] = [
        {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: 'Histórico limpo. Como posso ajudar com seu planejamento ou consultas financeiras?',
          timestamp: new Date().toISOString(),
        },
      ];
      setMessages(initial);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#/g, '')
      .replace(/`/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
      const cleanLine = isBullet ? line.trim().substring(2) : line;
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);

      return (
        <div key={idx} className={`${isBullet ? 'flex items-start gap-1.5 my-0.5 pl-1.5' : 'my-0.5'}`}>
          {isBullet && <span className="text-lime-400 font-bold">•</span>}
          <div className="flex-1 leading-relaxed">
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                const boldText = part.slice(2, -2);
                const isCurrency = boldText.includes('R$') || /^\d+([.,]\d+)?$/.test(boldText);
                return (
                  <strong 
                    key={pIdx} 
                    className={isCurrency ? 'text-lime-300 font-semibold' : 'text-zinc-100 font-semibold'}
                  >
                    {boldText}
                  </strong>
                );
              }
              return <span key={pIdx}>{part}</span>;
            })}
          </div>
        </div>
      );
    });
  };

  return (
    <>
      {/* Estado 1: Bonequinho 3D do Robozinho (quando o chat está fechado) */}
      {!isOpen && (
        <aside 
          aria-label="FinBot AI" 
          className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50 flex flex-col items-center group cursor-pointer animate-in fade-in zoom-in-90 duration-200"
          onMouseEnter={() => setIsRobotHovered(true)}
          onMouseLeave={() => setIsRobotHovered(false)}
          onClick={onOpen}
        >
          {/* Badge flutuante interativo */}
          <div className="mb-0.5 px-2.5 py-1 bg-zinc-900/95 text-lime-400 border border-lime-500/40 rounded-full text-[11px] font-bold shadow-lg backdrop-blur-md transition-all duration-200 group-hover:scale-105 group-hover:border-lime-400 group-hover:text-lime-300 flex items-center gap-1.5 pointer-events-none select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
            <span>FinBot AI</span>
          </div>

          {/* Bonequinho 3D interativo */}
          <div className="relative filter drop-shadow-xl transition-transform duration-200 group-hover:scale-105 active:scale-95">
            <Robot3D 
              isHovered={isRobotHovered} 
              size={80}
            />
          </div>
        </aside>
      )}

      {/* Estado 2: Janela de Chat Aberta */}
      {isOpen && (
        <>
          {/* Backdrop sutil */}
          <div 
            className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent transition-opacity duration-300" 
            onClick={onClose} 
          />

          <div 
            id="finbot-ai-container"
            className={`fixed bottom-5 right-3 sm:bottom-6 sm:right-6 z-50 origin-bottom-right overflow-hidden bg-zinc-900 border border-zinc-750 rounded-[20px] shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] animate-in fade-in slide-in-from-bottom-2 ${
              isExpanded
                ? 'w-[calc(100vw-24px)] sm:w-[480px] h-[520px]'
                : 'w-[calc(100vw-24px)] sm:w-[360px] h-[460px]'
            }`}
          >
            <div className="w-full h-full flex flex-col">
              {/* Cabeçalho do Chat com mini robozinho 3D */}
              <div className="px-3.5 py-2 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-zinc-900 border border-lime-500/30">
                    <Robot3D isHovered={true} size={32} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">FinBot AI</h3>
                  </div>
                </div>

            <div className="flex items-center gap-1 text-zinc-400">
              <button
                onClick={handleClearHistory}
                className="p-1 rounded-md hover:bg-zinc-800 hover:text-rose-400 transition-colors"
                title="Limpar histórico"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:block p-1 rounded-md hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                title={isExpanded ? 'Restaurar tamanho' : 'Expandir'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                title="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Lista de Mensagens */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs sm:text-sm bg-zinc-900/90">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div 
                  key={m.id} 
                  className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-6 h-6 rounded-md bg-lime-500/10 border border-lime-500/20 flex-shrink-0 flex items-center justify-center text-lime-400 mt-0.5">
                      <Bot className="w-3 h-3" />
                    </div>
                  )}

                  <div 
                    className={`max-w-[88%] rounded-xl px-3 py-2 relative ${
                      isUser 
                        ? 'bg-lime-500 text-zinc-950 font-medium rounded-tr-xs shadow-xs' 
                        : 'bg-zinc-850 text-zinc-200 border border-zinc-750/70 rounded-tl-xs shadow-xs'
                    }`}
                  >
                    <div className="break-words">
                      {isUser ? m.content : renderMessageContent(m.content)}
                    </div>

                    {!isUser && (
                      <div className="mt-1.5 pt-1.5 border-t border-zinc-750 flex items-center justify-between text-[10px] text-zinc-400">
                        <span>FinBot AI</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSpeak(m.content)}
                            className="hover:text-lime-400 transition-colors p-0.5 rounded"
                            title={isSpeaking ? 'Parar leitura de voz' : 'Ouvir resposta'}
                          >
                            {isSpeaking ? <VolumeX className="w-3 h-3 text-lime-400" /> : <Volume2 className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => handleCopy(m.content, m.id)}
                            className="hover:text-lime-400 transition-colors p-0.5 rounded flex items-center gap-1"
                            title="Copiar texto"
                          >
                            {copiedId === m.id ? (
                              <Check className="w-3 h-3 text-lime-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex-shrink-0 flex items-center justify-center text-zinc-300 mt-0.5 text-[10px] font-bold">
                      {userEmail ? userEmail.charAt(0).toUpperCase() : 'EU'}
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-2 justify-start items-center">
                <div className="w-6 h-6 rounded-md bg-lime-500/10 border border-lime-500/20 flex-shrink-0 flex items-center justify-center text-lime-400 animate-pulse">
                  <Bot className="w-3 h-3" />
                </div>
                <div className="bg-zinc-850 border border-zinc-750 rounded-xl rounded-tl-xs px-3 py-2 flex items-center gap-2 text-zinc-400 text-xs">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>Analisando...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-2.5 bg-zinc-950 border-t border-zinc-800 flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-1.5"
            >
              <div className="flex-1 relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder='Ex: "É possível comprar esse ventilador por 300 reais?"'
                  disabled={isLoading}
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 disabled:opacity-50 pr-8"
                />
                {inputPrompt.trim() && (
                  <button
                    type="button"
                    onClick={() => setInputPrompt('')}
                    className="absolute right-2.5 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={!inputPrompt.trim() || isLoading}
                className="bg-lime-500 hover:bg-lime-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 p-2 rounded-lg font-bold transition-all shadow-xs flex items-center justify-center cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                title="Enviar"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )}
</>
  );
};
