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

const getIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const turnUrl = import.meta.env.VITE_TURN_SERVER_URL;
  const turnUser = import.meta.env.VITE_TURN_USERNAME;
  const turnCred = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl && turnUser && turnCred) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
  }

  return servers;
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

  const sendSignal = useCallback(
    async (type: string, payload: object) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'signal',
        payload: { from: role, type, ...payload },
      });
    },
    [role]
  );

  const handleSignal = useCallback(
    async (signal: {
      from: Role;
      type: string;
      sdp?: string;
      candidate?: RTCIceCandidateInit;
    }) => {
      if (signal.from === role) return;
      const pc = pcRef.current;
      if (!pc) return;

      try {
        if (signal.type === 'offer' && signal.sdp) {
          await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal('answer', { sdp: answer.sdp });
        }

        if (signal.type === 'answer' && signal.sdp) {
          await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
        }

        if (signal.type === 'ice-candidate' && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('[WebRTC] Signal handling error:', err);
      }
    },
    [role, sendSignal]
  );

  const startCall = useCallback(async () => {
    try {
      setError(null);
      setConnectionState('connecting');

      // 1. Get local media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      // 2. Create RTCPeerConnection
      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
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
        setConnectionState(pc.connectionState);
        if (pc.connectionState === 'connected') onConnected?.();
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          onDisconnected?.();
        }
      };

      // 6. Send ICE candidates via Supabase Realtime
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
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
          if (status === 'SUBSCRIBED') {
            // 8. Doctor creates offer, patient waits
            if (role === 'doctor') {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              await sendSignal('offer', { sdp: offer.sdp });
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
  }, [roomId, role, onConnected, onDisconnected, sendSignal, handleSignal]);

  const endCall = useCallback(() => {
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
  }, []);

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
