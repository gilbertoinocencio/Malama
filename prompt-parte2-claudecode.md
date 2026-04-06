# PROMPT PARTE 2 — Telemedicina Nura (Lógica e Videochamada)
# Para: Claude Code
# Pré-requisito: Parte 1 já implementada (banco + portal base)

---

## Contexto

A estrutura base do portal do médico já foi criada (tabelas Supabase, rotas, telas).
Agora vamos implementar a lógica complexa:

1. Sistema de agendamento com disponibilidade real
2. Videochamada WebRTC nativa (sem SDK externo)
3. Ajuste de metas em tempo real durante a consulta
4. Briefing pré-consulta gerado pela Claude API
5. Receita digital em PDF
6. Integração completa com o app do paciente
7. Notificações e lembretes

---

## PARTE 1 — SISTEMA DE AGENDAMENTO

### Lógica de slots disponíveis

Criar função `getAvailableSlots(doctorId, date)`:

```typescript
// src/lib/scheduling.ts

export async function getAvailableSlots(
  doctorId: string,
  date: Date
): Promise<TimeSlot[]> {
  // 1. Buscar disponibilidade do médico para o dia da semana
  const dayOfWeek = date.getDay()
  const availability = await supabase
    .from('doctor_availability')
    .select('*')
    .eq('doctor_id', doctorId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .single()

  if (!availability.data) return []

  // 2. Buscar consultas já agendadas para o dia
  const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString()
  const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString()

  const { data: bookedConsultations } = await supabase
    .from('consultations')
    .select('scheduled_at, duration_minutes')
    .eq('doctor_id', doctorId)
    .gte('scheduled_at', startOfDay)
    .lte('scheduled_at', endOfDay)
    .not('status', 'in', '("cancelled","no_show")')

  // 3. Gerar slots a cada [duration_minutes] minutos
  // considerando o horário de início/fim da disponibilidade
  // e removendo slots que conflitam com consultas já agendadas
  const doctor = await supabase
    .from('doctors')
    .select('consultation_duration')
    .eq('id', doctorId)
    .single()

  const duration = doctor.data?.consultation_duration || 30
  const slots = generateSlots(
    availability.data.start_time,
    availability.data.end_time,
    duration,
    bookedConsultations?.data || []
  )

  return slots
}
```

### Fluxo de confirmação de consulta

Ao paciente confirmar agendamento:
1. Verificar se slot ainda está disponível (race condition protection)
2. Calcular `platform_fee` = price × (platform_fee_percent / 100)
3. Calcular `doctor_payout` = price - platform_fee
4. Gerar `room_id` único: `crypto.randomUUID()`
5. Inserir em `consultations` com status "scheduled"
6. Disparar emails de confirmação (médico e paciente)
7. Agendar lembretes (24h e 10 min antes)

---

## PARTE 2 — VIDEOCHAMADA WEBRTC NATIVA

### Arquitetura

```
Paciente (PWA mobile)          Médico (portal web)
       │                              │
       └──────── Supabase Realtime ───┘
                 (sinalização WebSocket)
                        │
                   WebRTC P2P
                (vídeo/áudio direto)
                        │
              TURN Server (fallback)
              Metered.ca (MVP)
```

### Hook principal — `useWebRTC`

Criar `src/hooks/useWebRTC.ts`:

```typescript
import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

type Role = 'doctor' | 'patient'
type ConnectionState = RTCPeerConnectionState | 'idle'

interface UseWebRTCOptions {
  roomId: string
  role: Role
  onConnected?: () => void
  onDisconnected?: () => void
}

interface UseWebRTCReturn {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  connectionState: ConnectionState
  startCall: () => Promise<void>
  endCall: () => void
  toggleMute: () => void
  toggleCamera: () => void
  isMuted: boolean
  isCameraOff: boolean
  error: string | null
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: import.meta.env.VITE_TURN_SERVER_URL,
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_CREDENTIAL,
  },
]

export function useWebRTC({
  roomId,
  role,
  onConnected,
  onDisconnected,
}: UseWebRTCOptions): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  const sendSignal = useCallback(
    async (type: string, payload: object) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'signal',
        payload: { from: role, type, ...payload },
      })
    },
    [role]
  )

  const handleSignal = useCallback(
    async (signal: { from: Role; type: string; sdp?: string; candidate?: RTCIceCandidateInit }) => {
      if (signal.from === role) return
      const pc = pcRef.current
      if (!pc) return

      if (signal.type === 'offer' && signal.sdp) {
        await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp })
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        await sendSignal('answer', { sdp: answer.sdp })
      }

      if (signal.type === 'answer' && signal.sdp) {
        await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp })
      }

      if (signal.type === 'ice-candidate' && signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
      }
    },
    [role, sendSignal]
  )

  const startCall = useCallback(async () => {
    try {
      setError(null)

      // 1. Obter mídia local
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      })
      localStreamRef.current = stream
      setLocalStream(stream)

      // 2. Criar RTCPeerConnection
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pcRef.current = pc

      // 3. Adicionar tracks locais
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      // 4. Receber stream remoto
      const remoteStreamObj = new MediaStream()
      setRemoteStream(remoteStreamObj)
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStreamObj.addTrack(track)
        })
      }

      // 5. Monitorar estado da conexão
      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState)
        if (pc.connectionState === 'connected') onConnected?.()
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          onDisconnected?.()
        }
      }

      // 6. Enviar ICE candidates via Supabase Realtime
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          sendSignal('ice-candidate', { candidate: candidate.toJSON() })
        }
      }

      // 7. Assinar canal Supabase Realtime
      const channel = supabase.channel(`webrtc:${roomId}`, {
        config: { broadcast: { self: false } },
      })
      channelRef.current = channel

      channel
        .on('broadcast', { event: 'signal' }, ({ payload }) => {
          handleSignal(payload)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // 8. Médico cria offer, paciente aguarda
            if (role === 'doctor') {
              const offer = await pc.createOffer()
              await pc.setLocalDescription(offer)
              await sendSignal('offer', { sdp: offer.sdp })
            }
          }
        })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao iniciar chamada'
      setError(message)
      console.error('WebRTC error:', err)
    }
  }, [roomId, role, onConnected, onDisconnected, sendSignal, handleSignal])

  const endCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    pcRef.current?.close()
    channelRef.current?.unsubscribe()
    pcRef.current = null
    channelRef.current = null
    localStreamRef.current = null
    setLocalStream(null)
    setRemoteStream(null)
    setConnectionState('idle')
  }, [])

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    stream.getAudioTracks().forEach((t) => { t.enabled = !t.enabled })
    setIsMuted((prev) => !prev)
  }, [])

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    stream.getVideoTracks().forEach((t) => { t.enabled = !t.enabled })
    setIsCameraOff((prev) => !prev)
  }, [])

  useEffect(() => {
    return () => { endCall() }
  }, [endCall])

  return {
    localStream,
    remoteStream,
    connectionState,
    startCall,
    endCall,
    toggleMute,
    toggleCamera,
    isMuted,
    isCameraOff,
    error,
  }
}
```

### Componente VideoStream

Criar `src/components/VideoStream.tsx`:

```typescript
// Renderiza um MediaStream em um elemento <video>
// Props: stream, muted, className, mirror (para self-view)
// Usar useEffect para atribuir stream.current.srcObject = stream
// Importante para iOS: adicionar atributos playsinline e autoPlay
```

### Tela de consulta — Médico (`/medico/consulta/:id`)

Layout dividido (desktop):

```
┌────────────────────────────────┬──────────────────────┐
│                                │                      │
│      VÍDEO DO PACIENTE         │   PAINEL PACIENTE    │
│         (60% largura)          │   (40% largura)      │
│                                │                      │
│  ┌──────┐                      │  Nome + IMC + GLP-1  │
│  │self  │  ● 12:34             │  ─────────────────── │
│  │view  │                      │  Últimos sintomas    │
│  └──────┘                      │  ─────────────────── │
│                                │  📝 Anotações        │
│  [🎤] [📷] [📞 Encerrar]      │  (textarea live)     │
│                                │                      │
│                                │  [Ajustar metas]     │
│                                │  [Emitir receita]    │
│                                │  [Mensagem pós-cons] │
└────────────────────────────────┴──────────────────────┘
```

Implementar:
- `useWebRTC({ roomId, role: 'doctor' })`
- Botão "Iniciar chamada" → chama `startCall()`
- Indicador de status de conexão (connecting / connected / disconnected)
- Timer cronômetro iniciando quando `connectionState === 'connected'`
- Anotações salvas no Supabase com debounce de 1s (auto-save)
- Modal "Ajustar metas" → salvar em `doctor_plan_adjustments` + atualizar metas do paciente via Supabase Realtime
- Modal "Emitir receita" → ver Parte 3
- Modal "Mensagem pós-consulta" → salvar em `doctor_messages`
- Ao encerrar: `endCall()` + atualizar `consultations.status = 'completed'` + `ended_at = now()`

### Tela de consulta — Paciente (PWA mobile)

Criar `src/pages/ConsultaPage.tsx` no app do paciente:

Layout mobile (fullscreen):
```
┌─────────────────────────────┐
│                             │
│    VÍDEO DO MÉDICO          │
│    (tela cheia)             │
│                    ┌──────┐ │
│                    │self  │ │
│                    │view  │ │
│                    └──────┘ │
│                             │
│  ● 12:34   Dr. Carlos Silva │
│                             │
│  ────── ────── ──────       │
│  [🎤]   [📷]   [📞]        │
└─────────────────────────────┘
```

Implementar:
- `useWebRTC({ roomId, role: 'patient' })`
- Ao entrar na página: `startCall()` automaticamente
- Indicador de qualidade: bom (verde) / médio (amarelo) / ruim (vermelho)
- Tratar getUserMedia errors (permissão negada, câmera em uso)
- iOS Safari: garantir `playsInline` e `autoPlay` nos elementos video

---

## PARTE 3 — RECEITA DIGITAL

### Geração do PDF

Instalar: `npm install jspdf`

Criar `src/lib/prescription.ts`:

```typescript
import jsPDF from 'jspdf'

interface PrescriptionData {
  doctorName: string
  doctorCRM: string
  doctorSpecialty: string
  patientName: string
  patientCPF: string
  medication: string
  dosage: string
  instructions: string
  issuedAt: Date
  expiresAt: Date
}

export async function generatePrescriptionPDF(data: PrescriptionData): Promise<Blob> {
  const doc = new jsPDF()

  // Cabeçalho
  doc.setFontSize(20)
  doc.text('Receita Médica', 105, 20, { align: 'center' })

  // Logo Nura (se disponível)
  // doc.addImage(logoBase64, 'PNG', 10, 10, 30, 10)

  // Dados do médico
  doc.setFontSize(12)
  doc.text(`Dr(a). ${data.doctorName}`, 20, 40)
  doc.text(`CRM: ${data.doctorCRM}`, 20, 47)
  doc.text(`${data.doctorSpecialty}`, 20, 54)

  // Linha divisória
  doc.line(20, 60, 190, 60)

  // Dados do paciente
  doc.text(`Paciente: ${data.patientName}`, 20, 70)
  doc.text(`CPF: ${data.patientCPF}`, 20, 77)

  // Linha divisória
  doc.line(20, 83, 190, 83)

  // Prescrição
  doc.setFontSize(14)
  doc.text('Prescrição:', 20, 93)
  doc.setFontSize(12)
  doc.text(data.medication, 20, 103)
  doc.text(`Posologia: ${data.dosage}`, 20, 110)

  const instructionLines = doc.splitTextToSize(data.instructions, 170)
  doc.text(instructionLines, 20, 120)

  // Validade
  doc.setFontSize(10)
  doc.text(
    `Válido por 90 dias a partir de ${data.issuedAt.toLocaleDateString('pt-BR')}`,
    20,
    200
  )
  doc.text(
    `Vencimento: ${data.expiresAt.toLocaleDateString('pt-BR')}`,
    20,
    207
  )

  // QR Code de verificação (URL)
  // Adicionar QR code com URL de verificação: nura.app/receita/verify/:id
  const verificationUrl = `${import.meta.env.VITE_APP_URL}/receita/verify/${Date.now()}`
  doc.text(`Verificar em: ${verificationUrl}`, 20, 220)

  // Assinatura (hash SHA-256 como placeholder ICP-Brasil)
  const hashData = `${data.doctorCRM}${data.patientCPF}${data.medication}${data.issuedAt.toISOString()}`
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashData))
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  doc.setFontSize(8)
  doc.text(`Hash de integridade: ${hashHex.substring(0, 32)}...`, 20, 235)
  doc.text('Documento assinado digitalmente', 20, 242)

  return doc.output('blob')
}
```

### Upload e salvamento

```typescript
export async function savePrescription(
  consultationId: string,
  doctorId: string,
  patientId: string,
  pdfBlob: Blob,
  prescriptionData: Omit<PrescriptionData, 'doctorName' | 'doctorCRM' | 'doctorSpecialty'>
): Promise<string> {
  // 1. Upload do PDF para Supabase Storage
  const fileName = `${patientId}/${consultationId}_${Date.now()}.pdf`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('prescriptions')
    .upload(fileName, pdfBlob, { contentType: 'application/pdf' })

  if (uploadError) throw uploadError

  // 2. Obter URL pública
  const { data: urlData } = supabase.storage
    .from('prescriptions')
    .getPublicUrl(fileName)

  const pdfUrl = urlData.publicUrl

  // 3. Salvar no banco
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 90)

  await supabase.from('prescriptions').insert({
    consultation_id: consultationId,
    doctor_id: doctorId,
    patient_id: patientId,
    medication: prescriptionData.medication,
    dosage: prescriptionData.dosage,
    instructions: prescriptionData.instructions,
    validity_days: 90,
    expires_at: expiresAt.toISOString(),
    pdf_url: pdfUrl,
    status: 'active',
  })

  return pdfUrl
}
```

---

## PARTE 4 — BRIEFING PRÉ-CONSULTA COM IA

### Função de geração do briefing

Criar `src/lib/briefing.ts`:

```typescript
export async function generateConsultationBriefing(
  patientId: string,
  doctorId: string
): Promise<string> {
  // 1. Buscar dados do paciente
  // - Dados do perfil (peso, altura, IMC, idade, gênero)
  // - Histórico de peso (últimos 90 dias)
  // - Média calórica e proteica (últimas 4 semanas)
  // - Adesão ao plano (% dias com registro)
  // - Check-ins de sintomas (últimas 4 semanas)
  // - Status GLP-1 (medicamento, fase, sintomas)
  // - Consultas anteriores com este médico

  // 2. Montar contexto
  const context = `
    Paciente: ${patient.name}, ${patient.age} anos, ${patient.gender}
    IMC: ${patient.bmi} (${patient.bmi_classification})
    GLP-1: ${patient.glp1_medication || 'Não usa'} — Fase: ${patient.glp1_phase || 'N/A'}
    
    Evolução de peso (90 dias): ${weightStart}kg → ${weightCurrent}kg (${weightDiff > 0 ? '+' : ''}${weightDiff}kg)
    
    Nutrição (média 4 semanas):
    - Calorias: ${avgCalories}kcal/dia (meta: ${calorieGoal}kcal)
    - Proteína: ${avgProtein}g/dia (meta: ${proteinGoal}g)
    - Adesão: ${adherencePercent}% dos dias
    
    Sintomas frequentes: ${topSymptoms.join(', ')}
    Principal preocupação: ${patient.glp1_main_concern || 'N/A'}
  `

  // 3. Chamar Claude API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `Você é um assistente médico especializado em nutrição e emagrecimento.
        Gere um briefing pré-consulta objetivo e clinicamente relevante.
        Use português brasileiro. Seja direto e prático.
        Formato: seções com emojis, máximo 300 palavras.`,
      messages: [
        {
          role: 'user',
          content: `Gere um briefing pré-consulta para o seguinte paciente:\n\n${context}`,
        },
      ],
    }),
  })

  const data = await response.json()
  return data.content[0].text
}
```

### Integração na tela do paciente (aba Briefing IA)

- Ao clicar "Gerar briefing": chamar `generateConsultationBriefing()`
- Exibir loading skeleton durante geração
- Exibir resultado formatado em card
- Botão "Regenerar" disponível
- Salvar briefing gerado em cache local (sessionStorage) para não regenerar ao trocar de aba

---

## PARTE 5 — INTEGRAÇÃO COM APP DO PACIENTE

### Novas telas no app PWA do paciente

**1. Tela de agendamento** `src/pages/AgendarConsultaPage.tsx`

Fluxo em steps:

```
Step 1: Tipo de consulta
  - Consulta inicial (ícone 🩺)
  - Correção de rota (ícone 🔄)  
  - Renovação de receita (ícone 📋)

Step 2: Escolher médico
  - Cards com: foto, nome, especialidade, avaliação (estrelas), preço, próximos horários
  - Buscar em `doctors` onde status = 'approved'

Step 3: Escolher data e horário
  - Calendário (próximos 30 dias)
  - Ao selecionar data: chamar getAvailableSlots(doctorId, date)
  - Exibir slots disponíveis como chips

Step 4: Confirmar + pagamento
  - Resumo da consulta
  - Card "Dados compartilhados com o médico":
    - Peso atual, IMC, últimos check-ins, status GLP-1
  - Placeholder de pagamento: botão "Confirmar e pagar (R$ X)"
  - Ao confirmar: inserir em consultations + enviar notificações

Step 5: Sucesso
  - "Consulta agendada! ✅"
  - Data, horário, médico
  - Botão "Ver minhas consultas"
```

**2. Seção "Minhas consultas"** (adicionar no perfil do paciente)

Lista de consultas:
- Próximas (ordenadas por data)
- Passadas (com opção de avaliar se ainda não avaliou)

Card de consulta:
```
┌─────────────────────────────────────────┐
│ 📅 15/04/2026 às 14:30                  │
│ Dr. Carlos Silva — Endocrinologista     │
│ Consulta inicial · 30 min · R$ 199      │
│ Status: ● Confirmada                    │
│                                         │
│ [Entrar na consulta]  [Cancelar]        │
└─────────────────────────────────────────┘
```

Botão "Entrar na consulta" ativo somente 10 minutos antes do horário.

**3. Banner na home** (quando há consulta no dia)

Inserir no topo do dashboard:

```typescript
// Verificar se há consulta hoje
const todayConsultation = await supabase
  .from('consultations')
  .select('*, doctors(name, specialty)')
  .eq('patient_id', userId)
  .gte('scheduled_at', startOfToday)
  .lte('scheduled_at', endOfToday)
  .eq('status', 'scheduled')
  .single()

// Se existir, exibir banner
```

Banner:
```
┌─────────────────────────────────────────┐
│ 📹 Consulta hoje às 14:30               │
│ Dr. Carlos Silva                        │
│                        [Entrar →]       │
└─────────────────────────────────────────┘
```

**4. Mensagem do médico na home**

Buscar mensagens ativas:
```typescript
const { data: message } = await supabase
  .from('doctor_messages')
  .select('*, doctors(name)')
  .eq('patient_id', userId)
  .gte('visible_until', new Date().toISOString())
  .order('created_at', { ascending: false })
  .limit(1)
  .single()
```

Exibir card na home se existir:
```
┌─────────────────────────────────────────┐
│ 💪 Dr. Silva disse:                     │
│ "Ótimo progresso! Continue com a        │
│  proteína elevada esta semana."         │
│                        [há 2 dias]      │
└─────────────────────────────────────────┘
```

Ao exibir: atualizar `seen_at` se ainda null.

**5. Metas ajustadas pelo médico**

Ao carregar o dashboard:
```typescript
// Buscar último ajuste de metas
const { data: adjustment } = await supabase
  .from('doctor_plan_adjustments')
  .select('*, doctors(name)')
  .eq('patient_id', userId)
  .order('applied_at', { ascending: false })
  .limit(1)
  .single()

// Se existir, usar essas metas no lugar das metas padrão
// Exibir badge "Ajustado pelo Dr. [Nome]" ao lado das metas
```

**6. Seção "Minhas receitas"** (no perfil do paciente)

```typescript
// Buscar receitas do paciente
const { data: prescriptions } = await supabase
  .from('prescriptions')
  .select('*, doctors(name)')
  .eq('patient_id', userId)
  .order('issued_at', { ascending: false })
```

Card por receita:
```
┌─────────────────────────────────────────┐
│ 💊 Ozempic 0,5mg                        │
│ Dr. Carlos Silva · 15/01/2026           │
│ Vence em: 15/04/2026 (em 9 dias) ⚠️    │
│                                         │
│ [Baixar PDF]  [Agendar renovação]       │
└─────────────────────────────────────────┘
```

Lógica de alerta: se `expires_at` < agora + 15 dias → mostrar badge laranja ⚠️

**7. Avaliação pós-consulta**

Disparar 30 minutos após `ended_at`:
- Verificar se `rating` ainda é null
- Exibir modal de avaliação na home

```typescript
// Modal de avaliação
// Estrelas interativas (1 a 5)
// Campo de comentário opcional
// Botão "Enviar" → UPDATE consultations SET rating, rating_comment WHERE id = consultationId
```

---

## PARTE 6 — NOTIFICAÇÕES

### Supabase Edge Functions para envio de emails

Criar edge function `send-consultation-reminder`:

```typescript
// Disparar para:
// - 24h antes: email + push notification (se PWA instalada)
// - 1h antes: push notification
// - 10 min antes: push notification

// Usar Resend para emails:
// npm install resend (no edge function)
```

### Push Notifications (PWA)

Registrar Service Worker no app:
```typescript
// src/serviceWorker.ts
// Pedir permissão de notificação após login
// Salvar subscription no Supabase (tabela push_subscriptions)
// Edge function envia push via Web Push Protocol
```

Templates de email:

**Para paciente — confirmação:**
```
Assunto: Consulta confirmada — Dr. [Nome] em [data]

Olá [Nome do paciente],

Sua consulta está confirmada!

Médico: Dr. [Nome] — [Especialidade]
Data: [dia], [horário]
Duração: [X] minutos

Entrar na consulta: [link]

Você receberá um lembrete 24h antes.
```

**Para médico — nova consulta:**
```
Assunto: Nova consulta agendada — [Nome do paciente]

Dr. [Nome],

Uma nova consulta foi agendada.

Paciente: [Nome]
Data: [dia], [horário]
Tipo: [tipo]

Ver perfil do paciente: [link]
```

---

## PARTE 7 — REALTIME SYNC DE METAS

Quando médico aplica ajuste de metas durante consulta:

```typescript
// No portal do médico — ao salvar ajuste:
await supabase.from('doctor_plan_adjustments').insert({ ... })

// Notificar via Supabase Realtime
await supabase.channel(`patient:${patientId}`).send({
  type: 'broadcast',
  event: 'goals_updated',
  payload: { calorie_goal, protein_goal, ... }
})
```

No app do paciente:
```typescript
// Assinar canal do próprio usuário
supabase.channel(`patient:${userId}`)
  .on('broadcast', { event: 'goals_updated' }, ({ payload }) => {
    // Atualizar metas no estado local
    updateGoals(payload)
    // Exibir toast: "Suas metas foram atualizadas pelo Dr. X"
  })
  .subscribe()
```

---

## VARIÁVEIS DE AMBIENTE NECESSÁRIAS

Adicionar ao `.env`:

```env
VITE_CLAUDE_API_KEY=sk-ant-...
VITE_TURN_SERVER_URL=turn:relay.metered.ca:80
VITE_TURN_USERNAME=SEU_USERNAME_METERED
VITE_TURN_CREDENTIAL=SUA_CREDENTIAL_METERED
VITE_APP_URL=https://nura.app
VITE_RESEND_API_KEY=re_...
```

Para obter TURN gratuito: cadastrar em https://metered.ca → gerar credenciais

---

## ORDEM DE IMPLEMENTAÇÃO

```
1. getAvailableSlots() + lógica de agendamento completa
2. Telas de agendamento no app do paciente (steps 1-5)
3. hook useWebRTC completo
4. Tela de consulta do médico (com vídeo + painel lateral)
5. Tela de consulta do paciente (fullscreen mobile)
6. Testar WebRTC: desktop (médico) ↔ mobile Chrome (paciente)
7. Testar WebRTC: desktop (médico) ↔ mobile Safari iOS (paciente)
8. Modal de ajuste de metas + realtime sync
9. Modal de receita + geração de PDF
10. generateConsultationBriefing() + integração na aba Briefing
11. Banner de consulta na home do paciente
12. Mensagens do médico na home do paciente
13. Seção "Minhas receitas" + alertas de vencimento
14. Avaliação pós-consulta
15. Push notifications + emails transacionais
```

---

## NOTAS TÉCNICAS IMPORTANTES

1. **iOS Safari WebRTC:** Elementos `<video>` precisam ter `playsInline` e `autoPlay`. Sem isso a câmera não funciona no iPhone.

2. **getUserMedia em HTTP:** WebRTC só funciona em HTTPS ou localhost. Garantir que o domínio tenha SSL.

3. **TURN server:** Sem TURN, ~20% das chamadas falham em redes com NAT restritivo. Metered.ca tem tier gratuito de 50GB/mês — suficiente para MVP.

4. **Supabase Realtime para sinalização:** Mais simples que WebSocket próprio pois já está no stack. O canal WebRTC é aberto apenas durante a consulta e fechado ao encerrar.

5. **Race condition no agendamento:** Usar transação Supabase para verificar disponibilidade + inserir consulta atomicamente. Evita double-booking.

6. **PDF no Supabase Storage:** Criar bucket `prescriptions` com acesso público ou por signed URL. Signed URL recomendado por ser dado de saúde sensível.

7. **LGPD:** Antes de compartilhar histórico nutricional com o médico, exibir consentimento explícito no Step 4 do agendamento. Salvar `consent_at` na tabela consultations.
```
