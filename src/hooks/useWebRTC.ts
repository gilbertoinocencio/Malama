import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';

type Role = 'doctor' | 'patient';
type ConnectionState = RTCPeerConnectionState | 'idle';

interface UseWebRTCOptions {
  roomId: string;
  role: Role;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: ConnectionState;
  startCall: () => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  isMuted: boolean;
  isCameraOff: boolean;
  error: string | null;
}

const DEFAULT_STUN: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const getStaticIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [...DEFAULT_STUN];

  const turnUrl = import.meta.env.VITE_TURN_SERVER_URL;
  const turnUser = import.meta.env.VITE_TURN_USERNAME;
  const turnCred = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl && turnUser && turnCred) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
  }

  return servers;
};

// As credenciais TURN são efêmeras e vêm da Edge Function `turn-credentials`
// (a chave do provedor fica no servidor). Sem TURN, redes com CGNAT — celular
// em 4G/5G no Brasil — não conseguem conexão direta e a chamada não conecta.
// Qualquer falha aqui NÃO pode impedir a chamada: cai nos servidores estáticos.
const fetchIceServers = async (): Promise<RTCIceServer[]> => {
  try {
    const result = await Promise.race([
      supabase.functions.invoke('turn-credentials', { body: {} }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('turn-credentials timeout')), 5000)
      ),
    ]);
    if (result.error) {
      console.warn('[WebRTC] turn-credentials retornou erro:', result.error);
    }
    const servers = (result.data?.iceServers ?? []) as RTCIceServer[];
    if (Array.isArray(servers) && servers.length > 0) {
      const hasTurn = servers.some((s) => String(s.urls).includes('turn'));
      console.log(`[WebRTC] ICE via função: ${servers.length} entradas (TURN: ${hasTurn ? 'sim' : 'NÃO'})`);
      return [...DEFAULT_STUN, ...servers];
    }
  } catch (err) {
    console.warn('[WebRTC] TURN indisponível, seguindo só com STUN:', err);
  }
  console.warn('[WebRTC] Sem TURN — fallback para STUN estático');
  return getStaticIceServers();
};

export function useWebRTC({
  roomId,
  role,
  onConnected,
  onDisconnected,
}: UseWebRTCOptions): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());

  // ICE candidates que chegam antes da descrição remota ser aplicada precisam
  // ser bufferizados — addIceCandidate falha se não houver remoteDescription.
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const makingOfferRef = useRef(false);
  // O médico reenvia a oferta em intervalo até a chamada conectar. Isso torna a
  // conexão robusta a: (a) broadcast efêmero do Supabase perdido quando o peer
  // ainda não estava inscrito, (b) ordem de entrada, (c) paciente com bundle
  // antigo que não envia "hello" mas responde ofertas. O paciente é sempre o
  // answerer, então reofertas não causam glare.
  const offerRetryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const helloRetryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // O paciente guarda a última oferta aplicada e a resposta gerada. Como o
  // médico reenvia a MESMA oferta até conectar, ao ver uma oferta repetida o
  // paciente só reenvia a resposta (idempotente) — sem renegociar o PC.
  const lastRemoteOfferSdpRef = useRef<string | null>(null);
  const lastAnswerSdpRef = useRef<string | null>(null);

  const sendSignal = useCallback(
    async (type: string, payload: object) => {
      if (type !== 'ice-candidate') console.log(`[WebRTC] → enviando ${type}`);
      channelRef.current?.send({
        type: 'broadcast',
        event: 'signal',
        payload: { from: role, type, ...payload },
      });
    },
    [role]
  );

  const flushPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
    const pending = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const c of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (err) {
        console.error('[WebRTC] addIceCandidate (buffered) error:', err);
      }
    }
  }, []);

  // Só o médico (offerer) cria a oferta. Pode ser chamada repetidamente (retry):
  // enquanto não conectou, reofertar é seguro — se já respondeu, o estado não é
  // 'have-local-offer' problemático e o setLocalDescription apenas renova a
  // oferta. makingOfferRef evita criação concorrente.
  const createAndSendOffer = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || role !== 'doctor') return;
    if (makingOfferRef.current) return;
    if (pc.connectionState === 'connected') return;
    // Já existe oferta pendente → reenvia a MESMA (mantém o SDP estável e
    // aproveita a deduplicação do paciente), em vez de criar uma nova.
    if (pc.signalingState === 'have-local-offer' && pc.localDescription) {
      await sendSignal('offer', { sdp: pc.localDescription.sdp });
      return;
    }
    if (pc.signalingState !== 'stable') return;
    try {
      makingOfferRef.current = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal('offer', { sdp: pc.localDescription?.sdp });
    } catch (err) {
      console.error('[WebRTC] createOffer error:', err);
    } finally {
      makingOfferRef.current = false;
    }
  }, [role, sendSignal]);

  // Para os timers de retry (chamado ao conectar e ao encerrar).
  const stopRetries = useCallback(() => {
    if (offerRetryRef.current) { clearInterval(offerRetryRef.current); offerRetryRef.current = null; }
    if (helloRetryRef.current) { clearInterval(helloRetryRef.current); helloRetryRef.current = null; }
  }, []);

  const handleSignal = useCallback(
    async (signal: {
      from: Role;
      type: string;
      sdp?: string;
      candidate?: RTCIceCandidateInit;
    }) => {
      if (signal.from === role) return;
      if (signal.type !== 'ice-candidate') console.log(`[WebRTC] ← recebido ${signal.type} de ${signal.from}`);
      const pc = pcRef.current;
      if (!pc) return;

      try {
        if (signal.type === 'hello') {
          // Presença do peer detectada — o médico oferta imediatamente (caminho
          // rápido; a retry periódica é a rede de segurança).
          if (role === 'doctor') await createAndSendOffer();
          return;
        }

        if (signal.type === 'offer' && signal.sdp) {
          // Oferta repetida (retry do médico) → só reenvia a última resposta,
          // que pode ter se perdido. Não mexe no PC (evita churn de ICE).
          if (signal.sdp === lastRemoteOfferSdpRef.current) {
            if (lastAnswerSdpRef.current) await sendSignal('answer', { sdp: lastAnswerSdpRef.current });
            return;
          }
          // Paciente (answerer). Glare improvável (paciente nunca oferta), mas
          // por segurança volta ao estado estável antes de aplicar a oferta.
          if (pc.signalingState !== 'stable') {
            try { await pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit); } catch { /* ignore */ }
          }
          await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
          lastRemoteOfferSdpRef.current = signal.sdp;
          await flushPendingCandidates(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          lastAnswerSdpRef.current = pc.localDescription?.sdp ?? null;
          await sendSignal('answer', { sdp: pc.localDescription?.sdp });
          return;
        }

        if (signal.type === 'answer' && signal.sdp) {
          // Só aplica a resposta se realmente há uma oferta local pendente.
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
            await flushPendingCandidates(pc);
          }
          return;
        }

        if (signal.type === 'ice-candidate' && signal.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            // Chegou antes da descrição remota — buffer até estar pronto.
            pendingCandidatesRef.current.push(signal.candidate);
          }
          return;
        }
      } catch (err) {
        console.error('[WebRTC] Signal handling error:', err);
      }
    },
    [role, sendSignal, createAndSendOffer, flushPendingCandidates]
  );

  const startCall = useCallback(async () => {
    try {
      setError(null);
      setConnectionState('connecting');

      // Tear down de qualquer sessão anterior — evita DUAS inscrições no mesmo
      // canal `webrtc:<room>` (o Supabase fecha a duplicada → o CLOSED que
      // aparecia nos logs e engolia sinais). Idempotente e seguro.
      stopRetries();
      try { channelRef.current?.unsubscribe(); } catch { /* ignore */ }
      try { pcRef.current?.close(); } catch { /* ignore */ }
      channelRef.current = null;
      pcRef.current = null;

      // Reset das guardas de handshake para esta nova sessão de chamada
      pendingCandidatesRef.current = [];
      makingOfferRef.current = false;
      lastRemoteOfferSdpRef.current = null;
      lastAnswerSdpRef.current = null;

      // 1. Get local media (busca de credenciais TURN corre em paralelo
      // com o prompt de permissão — não adiciona latência)
      const iceServersPromise = fetchIceServers();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      // 2. Create RTCPeerConnection
      const pc = new RTCPeerConnection({ iceServers: await iceServersPromise });
      pcRef.current = pc;

      // 3. Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // 4. Receive remote stream
      remoteStreamRef.current = new MediaStream();
      setRemoteStream(remoteStreamRef.current);
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStreamRef.current.addTrack(track);
        });
        // Trigger re-render by replacing the ref
        setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
      };

      // 5. Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] connectionState: ${pc.connectionState}`);
        setConnectionState(pc.connectionState);
        if (pc.connectionState === 'connected') {
          stopRetries(); // conectou — para de reofertar/repingar
          onConnected?.();
          // Loga o caminho da mídia (host/srflx = direto, relay = via TURN)
          pc.getStats().then((stats) => {
            stats.forEach((s: Record<string, unknown> & { type: string; state?: string }) => {
              if (s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded') {
                const local = stats.get(s.localCandidateId as string) as
                  | { candidateType?: string }
                  | undefined;
                console.log(`[WebRTC] Conectado via: ${local?.candidateType ?? '?'}`);
              }
            });
          });
        }
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          onDisconnected?.();
        }
      };
      pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] iceConnectionState: ${pc.iceConnectionState}`);
      };

      // 6. Send ICE candidates via Supabase Realtime
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          // relay = TURN funcionando; srflx = STUN; host = rede local
          if (candidate.type) console.log(`[WebRTC] candidato local: ${candidate.type}`);
          sendSignal('ice-candidate', { candidate: candidate.toJSON() });
        }
      };

      // 7. Subscribe to Supabase Realtime channel
      const channel = supabase.channel(`webrtc:${roomId}`, {
        config: { broadcast: { self: false } },
      });
      channelRef.current = channel;

      channel
        .on('broadcast', { event: 'signal' }, ({ payload }) => {
          handleSignal(payload);
        })
        .subscribe(async (status) => {
          console.log(`[WebRTC] canal realtime: ${status} (sala ${roomId})`);
          if (status === 'SUBSCRIBED') {
            // 8. Anuncia presença e liga a rede de segurança. O broadcast do
            // Supabase é efêmero (sem replay): quem entra primeiro perde o
            // hello/oferta do outro. Por isso repetimos:
            //  - hello a cada 2s (ambos os lados) até conectar → presença
            //  - oferta a cada 2s (médico) até conectar → renegocia mesmo se a
            //    1ª oferta se perdeu ou se o paciente é bundle antigo (que só
            //    responde ofertas, não envia hello).
            await sendSignal('hello', {});
            if (role === 'doctor') await createAndSendOffer();

            stopRetries();
            helloRetryRef.current = setInterval(() => {
              if (pcRef.current?.connectionState === 'connected') { stopRetries(); return; }
              sendSignal('hello', {});
            }, 2000);
            if (role === 'doctor') {
              offerRetryRef.current = setInterval(() => {
                const rpc = pcRef.current;
                if (!rpc || rpc.connectionState === 'connected') { stopRetries(); return; }
                // Já temos oferta local pendente → apenas REENVIA o mesmo SDP
                // (o paciente pode não tê-lo recebido). Não cria oferta nova
                // para não reiniciar o ICE de uma conexão em andamento.
                if (rpc.signalingState === 'have-local-offer' && rpc.localDescription) {
                  sendSignal('offer', { sdp: rpc.localDescription.sdp });
                } else if (rpc.signalingState === 'stable') {
                  createAndSendOffer();
                }
              }, 2000);
            }
          }
        });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.name === 'NotAllowedError'
            ? 'Permissão de câmera/microfone negada. Verifique as configurações do seu navegador.'
            : err.name === 'NotFoundError'
            ? 'Câmera ou microfone não encontrado.'
            : err.message
          : 'Erro ao iniciar chamada';
      setError(msg);
      setConnectionState('idle');
      console.error('[WebRTC] startCall error:', err);
    }
  }, [roomId, role, onConnected, onDisconnected, sendSignal, handleSignal, createAndSendOffer, stopRetries]);

  const endCall = useCallback(() => {
    stopRetries();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    channelRef.current?.unsubscribe();
    pcRef.current = null;
    channelRef.current = null;
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('idle');
    setIsMuted(false);
    setIsCameraOff(false);
  }, [stopRetries]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((prev) => !prev);
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCameraOff((prev) => !prev);
  }, []);

  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

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
  };
}
