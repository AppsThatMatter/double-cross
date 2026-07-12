import { type NetworkManager } from '../networking/NetworkManager';

type SignalPayload =
    | { type: 'offer'; sdp: RTCSessionDescriptionInit }
    | { type: 'answer'; sdp: RTCSessionDescriptionInit }
    | { type: 'ice-candidate'; candidate: RTCIceCandidateInit };

interface VoiceSignalMessage {
    from: string;
    data: SignalPayload;
}

interface ForwardSignalMessage {
    to: string;
    data: SignalPayload;
}

interface PeerConnectionEntry {
    pc: RTCPeerConnection;
    pendingCandidates: RTCIceCandidateInit[];
}

const RTC_CONFIG: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export class VoiceManager {
    private network: NetworkManager | null = null;
    private localStream: MediaStream | null = null;
    private peers = new Map<string, PeerConnectionEntry>();
    private audioElements = new Map<string, HTMLAudioElement>();
    private unsubscribeSignal: (() => void) | null = null;
    private started = false;

    async start(network: NetworkManager): Promise<void> {
        if (this.started) return;

        this.network = network;

        this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
            video: false,
        });

        this.unsubscribeSignal = network.onMessage<VoiceSignalMessage>('voice:signal', (message) => {
            void this.handleSignal(message).catch((error) => {
                console.warn('Voice signal handling failed:', error);
            });
        });

        this.started = true;

        // If players were already in the room, establish mesh links immediately.
        for (const sessionId of network.getRemoteSessionIds()) {
            this.onPeerJoined(sessionId);
        }
    }

    onPeerJoined(peerId: string) {
        if (!this.network || !this.started) return;
        if (!this.network.sessionId || peerId === this.network.sessionId) return;

        const shouldInitiate = this.network.sessionId < peerId;
        const entry = this.ensurePeer(peerId);

        if (!shouldInitiate) return;
        if (entry.pc.signalingState !== 'stable') return;

        void this.createAndSendOffer(peerId, entry.pc);
    }

    onPeerLeft(peerId: string) {
        this.destroyPeer(peerId);
    }

    stop() {
        this.unsubscribeSignal?.();
        this.unsubscribeSignal = null;

        for (const track of this.localStream?.getTracks() ?? []) {
            track.stop();
        }
        this.localStream = null;

        for (const peerId of this.peers.keys()) {
            this.destroyPeer(peerId);
        }

        this.started = false;
        this.network = null;
    }

    private ensurePeer(peerId: string): PeerConnectionEntry {
        const existing = this.peers.get(peerId);
        if (existing) return existing;

        const pc = new RTCPeerConnection(RTC_CONFIG);

        for (const track of this.localStream?.getTracks() ?? []) {
            pc.addTrack(track, this.localStream!);
        }

        pc.onicecandidate = (event) => {
            if (!event.candidate || !this.network) return;

            const payload: ForwardSignalMessage = {
                to: peerId,
                data: {
                    type: 'ice-candidate',
                    candidate: event.candidate.toJSON(),
                },
            };

            this.network.sendMessage('voice:signal', payload);
        };

        pc.ontrack = (event) => {
            const stream = event.streams[0];
            if (!stream) return;

            let audio = this.audioElements.get(peerId);
            if (!audio) {
                audio = document.createElement('audio');
                audio.autoplay = true;
                audio.setAttribute('playsinline', 'true');
                audio.dataset.peerId = peerId;
                audio.style.display = 'none';
                document.body.appendChild(audio);
                this.audioElements.set(peerId, audio);
            }

            audio.srcObject = stream;
            void audio.play().catch(() => {
                // Browsers may block autoplay until user gesture. Playback will
                // resume on first interaction or when policy allows it.
            });
        };

        const entry: PeerConnectionEntry = {
            pc,
            pendingCandidates: [],
        };

        this.peers.set(peerId, entry);
        return entry;
    }

    private async createAndSendOffer(peerId: string, pc: RTCPeerConnection) {
        if (!this.network) return;

        const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false,
        });

        await pc.setLocalDescription(offer);

        const payload: ForwardSignalMessage = {
            to: peerId,
            data: {
                type: 'offer',
                sdp: offer,
            },
        };

        this.network.sendMessage('voice:signal', payload);
    }

    private async handleSignal(message: VoiceSignalMessage) {
        const { from, data } = message;
        const entry = this.ensurePeer(from);
        const { pc } = entry;

        if (data.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            this.network?.sendMessage<ForwardSignalMessage>('voice:signal', {
                to: from,
                data: {
                    type: 'answer',
                    sdp: answer,
                },
            });

            await this.flushPendingCandidates(entry);
            return;
        }

        if (data.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            await this.flushPendingCandidates(entry);
            return;
        }

        if (!pc.remoteDescription) {
            entry.pendingCandidates.push(data.candidate);
            return;
        }

        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }

    private async flushPendingCandidates(entry: PeerConnectionEntry) {
        if (!entry.pc.remoteDescription || entry.pendingCandidates.length === 0) return;

        const candidates = [...entry.pendingCandidates];
        entry.pendingCandidates.length = 0;

        for (const candidate of candidates) {
            await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }

    private destroyPeer(peerId: string) {
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.pc.close();
            this.peers.delete(peerId);
        }

        const audio = this.audioElements.get(peerId);
        if (audio) {
            audio.srcObject = null;
            audio.remove();
            this.audioElements.delete(peerId);
        }
    }
}

export const voice = new VoiceManager();
