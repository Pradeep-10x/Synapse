import { useState, useRef, useEffect } from 'react';
import { useSocketStore } from '@/store/socketStore';

import SimplePeer from 'simple-peer';

interface UseWebRTCReturn {
  isCallActive: boolean;
  isCallIncoming: boolean;
  callType: 'audio' | 'video' | null;
  callerId: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (userId: string, type: 'audio' | 'video') => void;
  answerCall: () => void;
  endCall: () => void;
  rejectCall: () => void;
}

export const useWebRTC = (): UseWebRTCReturn => {
  const { socket } = useSocketStore();

  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallIncoming, setIsCallIncoming] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [callerId, setCallerId] = useState<string | null>(null);
  const [calleeId, setCalleeId] = useState<string | null>(null); // For outgoing calls
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const incomingOfferRef = useRef<any>(null);

  const peerRef = useRef<SimplePeer.Instance | null>(null);
  // Always points at the latest endCall so socket handlers (whose effect only
  // depends on `socket`) never call a stale closure.
  const endCallRef = useRef<() => void>(() => {});


  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = async (data: { from: string; offer: any; type: 'audio' | 'video'; fromSocketId?: string }) => {
      setCallerId(data.from);
      setCallType(data.type);
      setIsCallIncoming(true);
      incomingOfferRef.current = data.offer;
    };

    const handleCallAnswer = async (data: { answer: any; from?: string }) => {
      if (peerRef.current && data.answer) {
        try {
          peerRef.current.signal(data.answer);
        } catch (error) {
          console.error('Error signaling answer:', error);
        }
      }
    };

    const handleCallICE = (data: { candidate: any; from?: string }) => {
      if (peerRef.current && data.candidate) {
        try {
          peerRef.current.signal(data.candidate);
        } catch (error) {
          console.error('Error signaling ICE:', error);
        }
      }
    };

    const handleCallEnd = () => {
      endCallRef.current();
    };

    const handleCallRejected = () => {
      endCallRef.current();
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:answer', handleCallAnswer);
    socket.on('call:ice', handleCallICE);
    socket.on('call:end', handleCallEnd);
    socket.on('call:rejected', handleCallRejected);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:answer', handleCallAnswer);
      socket.off('call:ice', handleCallICE);
      socket.off('call:end', handleCallEnd);
      socket.off('call:rejected', handleCallRejected);
    };
  }, [socket]);

  const startCall = async (userId: string, type: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });

      setLocalStream(stream);
      setCallType(type);
      setIsCallActive(true);
      setCalleeId(userId); // Store who we're calling

      const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream
      });

      peer.on('signal', (data) => {
        socket?.emit('call:start', {
          to: userId,
          offer: data,
          type
        });
      });

      peer.on('stream', (stream) => {
        setRemoteStream(stream);
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
        endCall();
      });

      peerRef.current = peer;
    } catch (error) {
      console.error('Error starting call:', error);
      endCall();
    }
  };

  const answerCall = async () => {
    if (!callerId || !callType || !socket || !incomingOfferRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });

      setLocalStream(stream);
      setIsCallActive(true);
      setIsCallIncoming(false);

      const peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream
      });

      // Signal the incoming offer
      peer.signal(incomingOfferRef.current);
      incomingOfferRef.current = null;

      peer.on('signal', (data) => {
        socket.emit('call:answer', {
          to: callerId,
          answer: data
        });
      });

      peer.on('stream', (stream) => {
        setRemoteStream(stream);
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
        endCall();
      });

      peerRef.current = peer;
    } catch (error) {
      console.error('Error answering call:', error);
      endCall();
    }
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    // Notify the other party before clearing state
    if (socket) {
      if (callerId) {
        // Incoming call - notify caller
        socket.emit('call:end', { to: callerId });
      } else if (calleeId) {
        // Outgoing call - notify callee
        socket.emit('call:end', { to: calleeId });
      }
    }

    setIsCallActive(false);
    setIsCallIncoming(false);
    setCallType(null);
    setCallerId(null);
    setCalleeId(null);
    incomingOfferRef.current = null;
  };

  // Keep the ref current so socket handlers always invoke the latest endCall.
  useEffect(() => {
    endCallRef.current = endCall;
  });

  const rejectCall = () => {
    if (callerId && socket) {
      socket.emit('call:reject', { to: callerId });
    }
    setIsCallIncoming(false);
    setCallerId(null);
    setCallType(null);
  };

  return {
    isCallActive,
    isCallIncoming,
    callType,
    callerId,
    localStream,
    remoteStream,
    startCall,
    answerCall,
    endCall,
    rejectCall
  };
};

