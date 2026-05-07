import React, { useEffect, useRef, useState } from 'react';
import { appointmentChatService } from '../services/doctorPortalService';
import type { AppointmentChat, ChatMessage } from '../types/doctorPortal';
import { supabase } from '../services/supabase';

interface Props {
  consultationId: string;
  doctorName: string;
  onClose: () => void;
}

function daysLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Hoje';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function groupByDate(messages: ChatMessage[]): [string, ChatMessage[]][] {
  const map = new Map<string, ChatMessage[]>();
  for (const msg of messages) {
    const key = formatDate(msg.created_at);
    (map.get(key) ?? (map.set(key, []) && map.get(key)))!.push(msg);
  }
  return Array.from(map.entries());
}

export const PatientChatModal: React.FC<Props> = ({ consultationId, doctorName, onClose }) => {
  const [chat, setChat]         = useState<AppointmentChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    let sub: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      setLoading(true);
      try {
        // Step 1: find the doctor_id for this consultation's chat (any status)
        const { data: ref } = await supabase
          .from('appointment_chats')
          .select('doctor_id')
          .eq('consultation_id', consultationId)
          .maybeSingle();

        if (!ref) { setChat(null); return; }

        // Step 2: use the NEWEST open chat with that doctor
        // (RLS automatically filters to patient_id = auth.uid())
        const { data } = await supabase
          .from('appointment_chats')
          .select('*')
          .eq('doctor_id', ref.doctor_id)
          .eq('status', 'open')
          .order('opened_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          setChat(data as AppointmentChat);
          const msgs = await appointmentChatService.getMessages(data.id);
          setMessages(msgs);
          appointmentChatService.markRead(data.id, 'patient').catch(console.error);

          sub = appointmentChatService.subscribeToMessages(data.id, (msg) => {
            setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
            appointmentChatService.markRead(data.id, 'patient').catch(console.error);
          });
        }
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => { if (sub) supabase.removeChannel(sub); };
  }, [consultationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Polling fallback — guarantees delivery when realtime events aren't firing
  const chatId     = chat?.id;
  const chatIsOpen = chat?.status === 'open';
  useEffect(() => {
    if (!chatId || !chatIsOpen) return;
    const poll = setInterval(async () => {
      try {
        const msgs = await appointmentChatService.getMessages(chatId);
        setMessages(prev => {
          const known = new Set(prev.map(m => m.id));
          const fresh = msgs.filter(m => !known.has(m.id));
          return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
      } catch { /* silent */ }
    }, 5_000);
    return () => clearInterval(poll);
  }, [chatId, chatIsOpen]);

  const handleSend = async () => {
    if (!chat || !text.trim()) return;
    setSending(true);
    try {
      const msg = await appointmentChatService.sendMessage(chat.id, text.trim());
      setMessages(prev => [...prev, msg]);
      setText('');
    } finally {
      setSending(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chat) return;
    const ext  = file.name.split('.').pop();
    const path = `chats/${chat.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('chat-files').upload(path, file);
    if (upErr) return;
    const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(path);
    const msg = await appointmentChatService.sendMessage(chat.id, null, {
      url: urlData.publicUrl, name: file.name,
      type: file.type, sizeKb: Math.round(file.size / 1024),
    });
    setMessages(prev => [...prev, msg]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const days = chat?.expires_at ? daysLeft(chat.expires_at) : null;
  const grouped = groupByDate(messages);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#EEEFF4] font-display">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-12 pb-3 bg-white shadow-sm">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{doctorName}</p>
          <p className="text-xs text-gray-500">Suporte pós-consulta</p>
        </div>
        {days !== null && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            days <= 3 ? 'bg-red-100 text-red-600' :
            days <= 7 ? 'bg-amber-100 text-amber-600' :
                        'bg-green-100 text-green-700'
          }`}>
            {days}d restante{days !== 1 ? 's' : ''}
          </span>
        )}
      </header>

      {/* Chat fechado / expirado */}
      {chat && chat.status !== 'open' && (
        <div className="mx-4 mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
          {chat.status === 'expired' ? '⏰ Canal de suporte expirado.' : '🔒 Canal de suporte encerrado.'}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center pt-16">
            <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !chat ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center pt-16">
            <span className="material-symbols-outlined text-4xl text-gray-300">chat</span>
            <p className="text-sm text-gray-400">Canal de suporte não disponível para esta consulta.</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center pt-16">
            <span className="material-symbols-outlined text-5xl text-gray-300">forum</span>
            <p className="text-sm font-semibold text-gray-500">Nenhuma mensagem ainda</p>
            <p className="text-xs text-gray-400">Envie uma mensagem para o seu médico</p>
          </div>
        ) : (
          grouped.map(([date, msgs]) => (
            <div key={date} className="space-y-2">
              <div className="flex justify-center">
                <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100">
                  {date}
                </span>
              </div>
              {msgs.map(msg => {
                const isMe = msg.sender_id === myUserId;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl shadow-sm text-sm ${
                      isMe
                        ? 'bg-gray-900 text-white rounded-br-sm'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
                    }`}>
                      {!isMe && (
                        <p className="text-[10px] font-semibold text-gray-400 mb-1">{doctorName}</p>
                      )}
                      {msg.content && <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                      {msg.file_url && (
                        msg.file_type?.startsWith('image/') ? (
                          <div className="mt-1.5">
                            <img
                              src={msg.file_url}
                              alt={msg.file_name ?? 'imagem'}
                              className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer"
                              onClick={() => window.open(msg.file_url!, '_blank')}
                            />
                            <a
                              href={`${msg.file_url}?download=${encodeURIComponent(msg.file_name ?? 'imagem')}`}
                              className={`flex items-center gap-1 mt-1 text-xs underline ${isMe ? 'text-white/70' : 'text-gray-500'}`}
                            >
                              <span className="material-symbols-outlined text-sm">download</span> Baixar
                            </a>
                          </div>
                        ) : (
                          <a
                            href={`${msg.file_url}?download=${encodeURIComponent(msg.file_name ?? 'arquivo')}`}
                            className={`flex items-center gap-1.5 mt-1 text-xs underline ${isMe ? 'text-white/80' : 'text-gray-500'}`}
                          >
                            <span className="material-symbols-outlined text-sm">attach_file</span>
                            {msg.file_name ?? 'Arquivo'}
                          </a>
                        )
                      )}
                      <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/50' : 'text-gray-300'}`}>
                        {formatTime(msg.created_at)}
                        {isMe && msg.is_read && <span className="ml-1">✓✓</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {chat?.status === 'open' && (
        <div className="px-4 pb-6 pt-2 bg-white border-t border-gray-100">
          <div className="flex items-end gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition shrink-0"
            >
              <span className="material-symbols-outlined text-xl">attach_file</span>
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Digite sua mensagem..."
              rows={1}
              className="flex-1 resize-none bg-gray-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 max-h-28"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-800 transition disabled:opacity-40 shrink-0"
            >
              <span className="material-symbols-outlined text-xl">send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
