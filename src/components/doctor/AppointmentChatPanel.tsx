// =====================================================
// Malama — Canal de Acompanhamento Pós-Consulta
// SLA indicators, file upload, 20-day countdown
// =====================================================

import React, { useEffect, useRef, useState } from 'react';
import {
  Send, Paperclip, Clock, X, FileText, Image,
  AlertTriangle, CheckCircle, MessageSquare, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { appointmentChatService } from '../../services/doctorPortalService';
import type { AppointmentChat, ChatMessage } from '../../types/doctorPortal';
import { supabase } from '../../services/supabase';

interface Props {
  doctorId: string;
  patientId: string;
  patientName: string;
}

// ─── Helpers ────────────────────────────────────────

function daysLeft(expires_at: string): number {
  return Math.max(0, Math.ceil((new Date(expires_at).getTime() - Date.now()) / 86_400_000));
}

function slaHoursLeft(sla_breach_at: string | null): number | null {
  if (!sla_breach_at) return null;
  return Math.max(0, Math.ceil((new Date(sla_breach_at).getTime() - Date.now()) / 3_600_000));
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return 'Hoje';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function groupByDate(messages: ChatMessage[]): Record<string, ChatMessage[]> {
  return messages.reduce((acc, msg) => {
    const key = formatDate(msg.created_at);
    (acc[key] ??= []).push(msg);
    return acc;
  }, {} as Record<string, ChatMessage[]>);
}

// ─── SLA Bar ────────────────────────────────────────

const SLABar: React.FC<{ chat: AppointmentChat }> = ({ chat }) => {
  const hoursLeft = slaHoursLeft(chat.sla_breach_at);
  const days = daysLeft(chat.expires_at);
  const isBreached = hoursLeft !== null && hoursLeft === 0;
  const isRisk = hoursLeft !== null && hoursLeft <= 8;

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs">
      {/* Expiração do canal */}
      <div className={`flex items-center gap-1.5 ${days <= 3 ? 'text-amber-600' : 'text-gray-500'}`}>
        <Clock className="w-3.5 h-3.5" />
        <span>Canal expira em <strong>{days} dias</strong></span>
      </div>

      {/* SLA de resposta */}
      {hoursLeft !== null && (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
          isBreached ? 'bg-red-100 text-red-700' :
          isRisk     ? 'bg-amber-100 text-amber-700' :
                       'bg-green-50 text-green-700'
        }`}>
          {isBreached ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
          {isBreached ? 'SLA vencido!' : `Responder em ${hoursLeft}h`}
        </div>
      )}
    </div>
  );
};

// ─── Message Bubble ──────────────────────────────────

const Bubble: React.FC<{ msg: ChatMessage; isDoctor: boolean }> = ({ msg, isDoctor }) => (
  <div className={`flex ${isDoctor ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
      isDoctor
        ? 'bg-[#7d4a3c] text-white rounded-br-sm'
        : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
    }`}>
      {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
      {msg.file_url && (
        <a
          href={msg.file_url}
          target="_blank"
          rel="noreferrer"
          className={`flex items-center gap-2 mt-1 text-xs underline ${isDoctor ? 'text-white/80' : 'text-[#7d4a3c]'}`}
        >
          {msg.file_type?.startsWith('image/') ? <Image className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
          {msg.file_name ?? 'Arquivo'}
        </a>
      )}
      <p className={`text-[10px] mt-1 text-right ${isDoctor ? 'text-white/60' : 'text-gray-400'}`}>
        {formatTime(msg.created_at)}
        {isDoctor && msg.is_read && <span className="ml-1">✓✓</span>}
      </p>
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────

export const AppointmentChatPanel: React.FC<Props> = ({ doctorId, patientId, patientName }) => {
  const [chat, setChat]         = useState<AppointmentChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load chat + messages
  useEffect(() => {
    let msgSub: ReturnType<typeof supabase.channel> | null = null;
    let chatWatchSub: ReturnType<typeof supabase.channel> | null = null;

    const load = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        // Query direta por doctor_id + patient_id (sem filtrar por status)
        const { data: found } = await supabase
          .from('appointment_chats')
          .select('*')
          .eq('doctor_id', doctorId)
          .eq('patient_id', patientId)
          .order('opened_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setChat(found ?? null);

        if (found) {
          const msgs = await appointmentChatService.getMessages(found.id);
          setMessages(msgs);
          if (found.status === 'open') {
            await appointmentChatService.markRead(found.id, 'doctor');
            msgSub = appointmentChatService.subscribeToMessages(found.id, (msg) => {
              setMessages(prev => [...prev, msg]);
              appointmentChatService.markRead(found.id, 'doctor');
            });
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    load();

    // Detecta quando o canal é criado para este paciente (abre ao conectar a chamada)
    chatWatchSub = supabase
      .channel(`chat-watch-${patientId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'appointment_chats',
        filter: `patient_id=eq.${patientId}`,
      }, () => { load(true); })
      .subscribe();

    return () => {
      msgSub?.unsubscribe();
      chatWatchSub?.unsubscribe();
    };
  }, [doctorId, patientId]);

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!chat || !text.trim()) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      const msg = await appointmentChatService.sendMessage(chat.id, content);
      setMessages(prev => [...prev, msg]);
    } catch {
      toast.error('Erro ao enviar mensagem');
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chat) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande (máx 10MB)'); return; }

    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `chats/${chat.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('chat-files').upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('chat-files').getPublicUrl(path);

      const msg = await appointmentChatService.sendMessage(chat.id, null, {
        url:    data.publicUrl,
        name:   file.name,
        type:   file.type,
        sizeKb: Math.round(file.size / 1024),
      });
      setMessages(prev => [...prev, msg]);
      toast.success('Arquivo enviado');
    } catch {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // ── Loading ──────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#7d4a3c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── No active chat ───────────────────────────────
  if (!chat) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-gray-300" />
        </div>
        <p className="font-semibold text-gray-700 mb-1">Canal ainda não aberto</p>
        <p className="text-sm text-gray-400 max-w-xs">
          O canal abre automaticamente assim que a videochamada conectar.
          Use-o para enviar links, orientações ou arquivos durante a consulta.
          Fica ativo por 20 dias após o encerramento.
        </p>
      </div>
    );
  }

  // ── Closed / expired chat ────────────────────────
  if (chat.status !== 'open') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock className="w-10 h-10 text-gray-300 mb-3" />
        <p className="font-semibold text-gray-700 mb-1">Canal encerrado</p>
        <p className="text-sm text-gray-400">
          Este canal foi {chat.status === 'expired' ? 'expirado' : 'encerrado'} em{' '}
          {new Date(chat.closed_at ?? chat.expires_at).toLocaleDateString('pt-BR')}.
        </p>
      </div>
    );
  }

  const grouped = groupByDate(messages);

  return (
    <div className="flex flex-col h-[600px] rounded-xl border border-gray-200 overflow-hidden">
      {/* SLA Bar */}
      <SLABar chat={chat} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            Nenhuma mensagem ainda. Inicie o acompanhamento!
          </p>
        )}

        {Object.entries(grouped).map(([date, msgs]) => (
          <div key={date}>
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 px-2">{date}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="space-y-2">
              {msgs.map(msg => (
                <Bubble key={msg.id} msg={msg} isDoctor={msg.sender_role === 'doctor'} />
              ))}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-gray-100">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Mensagem para ${patientName}…`}
            rows={1}
            className="flex-1 resize-none px-3 py-2 rounded-xl border border-gray-200 text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#7d4a3c]/30 focus:border-[#7d4a3c]
                       max-h-28 overflow-y-auto"
            style={{ height: 'auto' }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 112) + 'px';
            }}
          />

          <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="p-2 rounded-xl text-gray-400 hover:text-[#7d4a3c] hover:bg-[#7d4a3c]/5 transition disabled:opacity-40"
            title="Anexar arquivo"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-[#7d4a3c] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="p-2 rounded-xl bg-[#7d4a3c] hover:bg-[#623a2f] text-white disabled:opacity-40 transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 text-right">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
};
