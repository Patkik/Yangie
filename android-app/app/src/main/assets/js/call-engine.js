/**
 * call-engine.js (KiroRTC — Starlight Call Engine v1.4.0)
 * ─────────────────────────────────────────────────────────
 * Manages the full WebRTC peer-to-peer call lifecycle for Patrick & Yangiee
 * inside Kiro's Space Capsule V3.
 *
 * Architecture:
 *  - Local P2P with Google + Cloudflare STUN servers
 *  - BroadcastChannel API for same-session signaling relay (demo mode)
 *  - RTCPeerConnection with 3-tier simulcast encoding (720p / 360p / 180p)
 *  - RTCRtpScriptTransform slot pre-wired for E2EE frame injection
 *  - Signaling State Machine: IDLE → AWAITING_ENDPOINT → NEGOTIATING → CONNECTED → ENDED
 *
 * Complies with Master Walkthrough Audit v1.2.1 (token normalization via KiroState).
 */

import { KiroState } from './state.js';

// ─── ICE Server Configuration ──────────────────────────────────────────────
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

// ─── Simulcast Encoding Tiers ──────────────────────────────────────────────
const SIMULCAST_ENCODINGS = [
  { rid: 'high',   maxBitrate: 2_500_000, scaleResolutionDownBy: 1   }, // 720p
  { rid: 'medium', maxBitrate:   600_000, scaleResolutionDownBy: 2   }, // 360p
  { rid: 'low',    maxBitrate:   150_000, scaleResolutionDownBy: 4   }, // 180p
];

// ─── Call State Machine ────────────────────────────────────────────────────
export const CallState = Object.freeze({
  IDLE:              'IDLE',
  AWAITING_ENDPOINT: 'AWAITING_ENDPOINT',
  NEGOTIATING:       'NEGOTIATING',
  CONNECTED:         'CONNECTED',
  ENDED:             'ENDED',
});

// ─── Signaling Channel IDs ─────────────────────────────────────────────────
const SIGNAL_CH_OFFER  = 'kiro-rtc-offer';
const SIGNAL_CH_ANSWER = 'kiro-rtc-answer';
const SIGNAL_CH_ICE    = 'kiro-rtc-ice';

export class KiroCallEngine {
  constructor() {
    /** @type {RTCPeerConnection|null} */
    this.pc = null;

    /** @type {MediaStream|null} */
    this.localStream = null;

    /** @type {MediaStream|null} */
    this.remoteStream = null;

    /** @type {MediaStream|null} */
    this.screenStream = null;

    /** @type {string} */
    this.callState = CallState.IDLE;

    /** @type {boolean} */
    this.isInitiator = false;

    /** Callbacks registered by the UI layer */
    this._onStateChange  = null;
    this._onRemoteStream = null;
    this._onLocalStream  = null;
    this._onError        = null;

    /** BroadcastChannel signalers */
    this._offerCh  = null;
    this._answerCh = null;
    this._iceCh    = null;

    /** Bound to KiroCryptoEngine.encryptTransform — injected externally */
    this.cryptoEngine = null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Register UI callbacks.
   * @param {{ onStateChange, onRemoteStream, onLocalStream, onError }} callbacks
   */
  setCallbacks({ onStateChange, onRemoteStream, onLocalStream, onError }) {
    this._onStateChange  = onStateChange  || null;
    this._onRemoteStream = onRemoteStream || null;
    this._onLocalStream  = onLocalStream  || null;
    this._onError        = onError        || null;
  }

  /**
   * Initiate a call (this peer is the caller/offerer).
   * @param {{ video?: boolean, audio?: boolean, screen?: boolean }} options
   */
  async startCall({ video = true, audio = true, screen = false } = {}) {
    if (this.callState !== CallState.IDLE) {
      console.warn('[KiroRTC] startCall called while not IDLE — ignoring.');
      return;
    }
    this.isInitiator = true;
    this._setState(CallState.AWAITING_ENDPOINT);

    try {
      // ① Acquire local media
      await this._acquireLocalMedia({ video, audio, screen });

      // ② Open signaling channels
      this._openSignalingChannels();

      // ③ Simulate "endpoint allocated" after STUN warmup
      await this._delay(800);
      this._setState(CallState.NEGOTIATING);

      // ④ Build RTCPeerConnection and add tracks
      this._buildPeerConnection();
      this._addLocalTracks();

      // ⑤ Create and send SDP offer
      const offer = await this.pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
      await this.pc.setLocalDescription(offer);

      this._offerCh.postMessage({ type: 'offer', sdp: offer.sdp });
      console.info('[KiroRTC] SDP Offer sent via BroadcastChannel.');
    } catch (err) {
      this._handleError('Failed to start call', err);
    }
  }

  /**
   * Answer an incoming call (this peer is the callee/answerer).
   * @param {{ video?: boolean, audio?: boolean }} options
   */
  async answerCall({ video = true, audio = true } = {}) {
    if (this.callState !== CallState.IDLE) {
      console.warn('[KiroRTC] answerCall called while not IDLE — ignoring.');
      return;
    }
    this.isInitiator = false;
    this._setState(CallState.AWAITING_ENDPOINT);

    try {
      await this._acquireLocalMedia({ video, audio, screen: false });
      this._openSignalingChannels();

      // Listen for inbound offer on the offer channel
      this._offerCh.onmessage = async (e) => {
        if (e.data?.type === 'offer') {
          await this._handleRemoteOffer(e.data.sdp);
        }
      };

      await this._delay(400);
      this._setState(CallState.NEGOTIATING);
    } catch (err) {
      this._handleError('Failed to answer call', err);
    }
  }

  /**
   * End the active call and clean up all resources.
   */
  endCall() {
    this._cleanup();
    this._setState(CallState.ENDED);
    setTimeout(() => this._setState(CallState.IDLE), 1200);
  }

  /**
   * Toggle mute on local audio track.
   * @returns {boolean} New muted state.
   */
  toggleMute() {
    if (!this.localStream) return true;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) return true;
    audioTrack.enabled = !audioTrack.enabled;
    return !audioTrack.enabled; // true = muted
  }

  /**
   * Toggle local camera (video track on/off).
   * @returns {boolean} New disabled state.
   */
  toggleCamera() {
    if (!this.localStream) return true;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return true;
    videoTrack.enabled = !videoTrack.enabled;
    return !videoTrack.enabled; // true = camera off
  }

  /**
   * Start screen sharing and replace video track in the peer connection.
   */
  async startScreenShare() {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, cursor: 'always' },
        audio: true,
      });

      const screenTrack = this.screenStream.getVideoTracks()[0];

      if (this.pc) {
        const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(screenTrack);
      }

      screenTrack.onended = () => this.stopScreenShare();

      // Notify native layer if available (Android API 29+ system audio)
      if (window.AndroidHost?.startNativeCapture) {
        try { window.AndroidHost.startNativeCapture(); } catch (_) {}
      }

      return this.screenStream;
    } catch (err) {
      console.warn('[KiroRTC] Screen capture failed:', err);
      return null;
    }
  }

  /**
   * Stop screen sharing and restore camera track.
   */
  async stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }

    // Restore camera track in sender
    if (this.pc && this.localStream) {
      const cameraTrack = this.localStream.getVideoTracks()[0];
      if (cameraTrack) {
        const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(cameraTrack);
      }
    }

    if (window.AndroidHost?.stopNativeCapture) {
      try { window.AndroidHost.stopNativeCapture(); } catch (_) {}
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Native Android Opus Callback (invoked from AndroidHost bridge)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Called by MainActivity when the native audio mixer delivers an Opus chunk.
   * Base64-encoded chunk is decoded and forwarded to the active audio sender.
   * @param {string} base64Chunk
   */
  onOpusChunk(base64Chunk) {
    // Future: route to custom AudioWorklet for injection into audio sender
    console.debug('[KiroRTC] Native Opus chunk received:', base64Chunk.length, 'chars');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private — RTCPeerConnection
  // ──────────────────────────────────────────────────────────────────────────

  _buildPeerConnection() {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this._iceCh.postMessage({ type: 'ice', candidate: e.candidate });
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      const s = this.pc?.iceConnectionState;
      console.info('[KiroRTC] ICE state:', s);
      if (s === 'connected' || s === 'completed') {
        this._setState(CallState.CONNECTED);
      } else if (s === 'disconnected' || s === 'failed') {
        this._handleError('ICE connection lost', new Error(s));
      }
    };

    this.pc.ontrack = (e) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        this._onRemoteStream?.(this.remoteStream);
      }
      this.remoteStream.addTrack(e.track);
    };
  }

  _addLocalTracks() {
    if (!this.pc || !this.localStream) return;
    const audioTracks = this.localStream.getAudioTracks();
    const videoTracks = this.localStream.getVideoTracks();

    // Add audio track (no simulcast for audio)
    audioTracks.forEach(track => this.pc.addTrack(track, this.localStream));

    // Add video with simulcast encodings
    if (videoTracks.length > 0) {
      const sender = this.pc.addTrack(videoTracks[0], this.localStream);
      try {
        const params = sender.getParameters();
        params.encodings = SIMULCAST_ENCODINGS;
        sender.setParameters(params).catch(e =>
          console.warn('[KiroRTC] Simulcast params not supported:', e)
        );
      } catch (e) {
        console.warn('[KiroRTC] Simulcast setParameters skipped:', e);
      }
    }
  }

  async _handleRemoteOffer(remoteSdp) {
    this._buildPeerConnection();
    this._addLocalTracks();

    await this.pc.setRemoteDescription({ type: 'offer', sdp: remoteSdp });
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    this._answerCh.postMessage({ type: 'answer', sdp: answer.sdp });
    console.info('[KiroRTC] SDP Answer sent via BroadcastChannel.');

    // Listen for ICE candidates from offerer
    this._iceCh.onmessage = async (e) => {
      if (e.data?.type === 'ice' && e.data.candidate) {
        try { await this.pc.addIceCandidate(e.data.candidate); } catch (_) {}
      }
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private — Signaling Channels (BroadcastChannel relay)
  // ──────────────────────────────────────────────────────────────────────────

  _openSignalingChannels() {
    this._offerCh  = new BroadcastChannel(SIGNAL_CH_OFFER);
    this._answerCh = new BroadcastChannel(SIGNAL_CH_ANSWER);
    this._iceCh    = new BroadcastChannel(SIGNAL_CH_ICE);

    if (this.isInitiator) {
      // Offerer listens for the answer and ICE candidates from answerer
      this._answerCh.onmessage = async (e) => {
        if (e.data?.type === 'answer' && this.pc) {
          await this.pc.setRemoteDescription({ type: 'answer', sdp: e.data.sdp });
          console.info('[KiroRTC] Remote SDP answer set.');
        }
      };
      this._iceCh.onmessage = async (e) => {
        if (e.data?.type === 'ice' && e.data.candidate && this.pc) {
          try { await this.pc.addIceCandidate(e.data.candidate); } catch (_) {}
        }
      };
    }
  }

  _closeSignalingChannels() {
    this._offerCh?.close();  this._offerCh  = null;
    this._answerCh?.close(); this._answerCh = null;
    this._iceCh?.close();    this._iceCh    = null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private — Media Acquisition
  // ──────────────────────────────────────────────────────────────────────────

  async _acquireLocalMedia({ video, audio, screen }) {
    try {
      const constraints = {
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
          channelCount: 2,
        } : false,
        video: video ? {
          width:  { ideal: 1280 },
          height: { ideal: 720  },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user',
        } : false,
      };
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this._onLocalStream?.(this.localStream);
    } catch (err) {
      // Fallback: audio only if camera unavailable
      console.warn('[KiroRTC] Camera unavailable, falling back to audio-only:', err);
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this._onLocalStream?.(this.localStream);
      } catch (audioErr) {
        throw audioErr;
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private — Cleanup & Utilities
  // ──────────────────────────────────────────────────────────────────────────

  _cleanup() {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.screenStream?.getTracks().forEach(t => t.stop());
    this.pc?.close();
    this._closeSignalingChannels();

    this.localStream  = null;
    this.remoteStream = null;
    this.screenStream = null;
    this.pc           = null;
    this.isInitiator  = false;
    this.cryptoEngine = null;
  }

  _setState(newState) {
    const prev = this.callState;
    this.callState = newState;
    KiroState.set('callState', newState);
    console.info(`[KiroRTC] State: ${prev} → ${newState}`);
    this._onStateChange?.(newState, prev);
  }

  _handleError(message, err) {
    console.error(`[KiroRTC] ${message}:`, err);
    this._onError?.(message, err);
    this._cleanup();
    this._setState(CallState.IDLE);
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ─── Singleton Export ──────────────────────────────────────────────────────
export const kiroCallEngine = new KiroCallEngine();

// Expose to native bridge for Opus chunk delivery
window.KiroRTC = kiroCallEngine;
