// =====================================================
// Malama — Lembretes de consulta no dispositivo (Capacitor)
// Agenda notificações locais 24h / 3h / 30min antes do horário.
// Funciona offline e dispara mesmo com o app fechado (iOS + Android).
// A confirmação de agendamento e o sino in-app vêm do servidor (trigger + cron);
// aqui cuidamos só do alerta na tela bloqueada do device nativo.
// =====================================================

import { Capacitor } from '@capacitor/core';
import { getPatientConsultations, type Consultation } from '../lib/scheduling';

type ReminderKind = '24h' | '3h' | '30min';

const KINDS: ReminderKind[] = ['24h', '3h', '30min'];

const OFFSET_MS: Record<ReminderKind, number> = {
  '24h':   24 * 60 * 60 * 1000,
  '3h':     3 * 60 * 60 * 1000,
  '30min':      30 * 60 * 1000,
};

const KIND_INDEX: Record<ReminderKind, number> = { '24h': 0, '3h': 1, '30min': 2 };

// URL lida pelo App.tsx no tap para navegar até "Minhas Consultas"
const DEEP_LINK = '/?view=minhas-consultas';

// LocalNotifications só existe no nativo — import dinâmico para não quebrar a web.
async function getPlugin() {
  if (!Capacitor.isNativePlatform()) return null;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  return LocalNotifications;
}

// ID inteiro determinístico e estável por (consulta, tipo) — permite cancelar depois.
function notifId(consultationId: string, kind: ReminderKind): number {
  let h = 0;
  for (let i = 0; i < consultationId.length; i++) {
    h = (h * 31 + consultationId.charCodeAt(i)) | 0;
  }
  const base = Math.abs(h) % 400_000_000; // < 2^31 mesmo após *4
  return base * 4 + KIND_INDEX[kind];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function contentFor(kind: ReminderKind, c: Consultation): { title: string; body: string } {
  const doctor = c.doctors?.name ? `Dr(a). ${c.doctors.name}` : 'seu médico';
  const time = formatTime(c.scheduled_at);
  switch (kind) {
    case '24h':
      return { title: 'Consulta amanhã', body: `Amanhã às ${time} você tem consulta com ${doctor}.` };
    case '3h':
      return { title: 'Consulta hoje em 3 horas', body: `Sua consulta com ${doctor} é às ${time}.` };
    case '30min':
      return { title: 'Sua consulta começa em 30 min', body: `Entre pelo app alguns minutos antes do horário (${time}).` };
  }
}

async function ensurePermission(): Promise<boolean> {
  const LN = await getPlugin();
  if (!LN) return false;
  const status = await LN.checkPermissions();
  if (status.display === 'granted') return true;
  const req = await LN.requestPermissions();
  return req.display === 'granted';
}

export const consultationReminderService = {
  /** Agenda (ou re-agenda) os lembretes locais de uma consulta. */
  async scheduleFor(c: Consultation): Promise<void> {
    const LN = await getPlugin();
    if (!LN) return;
    if (c.status !== 'scheduled') return;
    if (!(await ensurePermission())) return;

    // Limpa antes para evitar duplicatas em reagendamentos
    await this.cancelFor(c.id);

    const scheduledMs = new Date(c.scheduled_at).getTime();
    const now = Date.now();

    const notifications = KINDS
      .map(kind => ({ kind, at: scheduledMs - OFFSET_MS[kind] }))
      .filter(({ at }) => at > now) // só agenda os que ainda vão acontecer
      .map(({ kind, at }) => {
        const { title, body } = contentFor(kind, c);
        return {
          id: notifId(c.id, kind),
          title,
          body,
          schedule: { at: new Date(at), allowWhileIdle: true },
          extra: { consultationId: c.id, url: DEEP_LINK },
        };
      });

    if (notifications.length > 0) {
      await LN.schedule({ notifications });
    }
  },

  /** Cancela todos os lembretes locais de uma consulta (cancelamento/reagendamento). */
  async cancelFor(consultationId: string): Promise<void> {
    const LN = await getPlugin();
    if (!LN) return;
    await LN.cancel({ notifications: KINDS.map(kind => ({ id: notifId(consultationId, kind) })) });
  },

  /**
   * Re-sincroniza os lembretes locais com o servidor no boot do app:
   * agenda as consultas futuras e cancela o que não é mais 'scheduled'.
   * Cobre reinstalação/troca de device e cancelamentos feitos em outro lugar.
   */
  async reconcile(patientId: string): Promise<void> {
    const LN = await getPlugin();
    if (!LN) return;
    try {
      const consultations = await getPatientConsultations(patientId);
      for (const c of consultations) {
        if (c.status === 'scheduled' && new Date(c.scheduled_at).getTime() > Date.now()) {
          await this.scheduleFor(c);
        } else {
          await this.cancelFor(c.id);
        }
      }
    } catch (e) {
      console.error('[reminders] reconcile failed', e);
    }
  },
};
