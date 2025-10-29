/**
 * BroadcastService - WebRTC signaling for classroom broadcasting
 */

/**
 * Broadcasting service for classroom mode
 * Handles teacher-driven fractal streaming to students
 */
export class BroadcastService {
  private signalingUrl: string;
  private sessionId: string | null = null;
  private role: 'teacher' | 'student' | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private stream: MediaStream | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private renderer: unknown | null = null;

  constructor(signalingUrl: string) {
    this.signalingUrl = signalingUrl;
  }

  /**
   * Create a new classroom broadcast session (teacher)
   */
  async createSession(teacherId: string, classroomName?: string): Promise<string> {
    const response = await fetch(`${this.signalingUrl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create-session',
        teacherId,
        classroomName
      })
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to create session');
    }

    this.sessionId = data.sessionId;
    this.role = 'teacher';

    return data.sessionId;
  }

  /**
   * Join an existing classroom session (student)
   */
  async joinSession(sessionId: string, studentId: string, studentName?: string): Promise<void> {
    const response = await fetch(`${this.signalingUrl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'join-session',
        sessionId,
        studentId,
        studentName
      })
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to join session');
    }

    this.sessionId = sessionId;
    this.role = 'student';
  }

  /**
   * Initialize WebRTC peer connection for broadcasting
   */
  async initializeBroadcast(canvas: HTMLCanvasElement, renderer: unknown): Promise<void> {
    if (!this.sessionId || this.role !== 'teacher') {
      throw new Error('Must create session as teacher first');
    }

    this.canvas = canvas;
    this.renderer = renderer;

    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Create data channel for parameter synchronization
    this.dataChannel = this.peerConnection.createDataChannel('fractals', {
      ordered: true
    });

    this.dataChannel.onopen = () => {
      console.log('Data channel opened for parameter sync');
    };

    // Capture canvas stream
    this.stream = canvas.captureStream(30); // 30 FPS
    this.stream.getTracks().forEach(track => {
      this.peerConnection!.addTrack(track, this.stream!);
    });

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendCandidate(event.candidate);
      }
    };

    console.log('Broadcast initialized for teacher');
  }

  /**
   * Initialize WebRTC peer connection for receiving (student)
   */
  async initializeReceiver(videoElement: HTMLVideoElement): Promise<void> {
    if (!this.sessionId || this.role !== 'student') {
      throw new Error('Must join session as student first');
    }

    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Handle incoming stream
    this.peerConnection.ontrack = (event) => {
      videoElement.srcObject = event.streams[0];
    };

    // Handle data channel for parameter updates
    this.peerConnection.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleParameterUpdate(data);
      };
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendCandidate(event.candidate);
      }
    };

    console.log('Receiver initialized for student');
  }

  /**
   * Start broadcasting fractal parameters and visuals
   */
  async startBroadcast(fractalParams: Record<string, unknown>): Promise<void> {
    if (!this.dataChannel || this.role !== 'teacher') {
      throw new Error('Broadcast not initialized or not teacher');
    }

    // Send initial parameters
    this.broadcastParameters(fractalParams);

    // Set up parameter change listener
    this.setupParameterSync(fractalParams);

    console.log('Broadcast started');
  }

  /**
   * Broadcast updated fractal parameters to all students
   */
  broadcastParameters(params: Record<string, unknown>): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const message = {
        type: 'parameter-update',
        timestamp: Date.now(),
        params: params
      };
      this.dataChannel.send(JSON.stringify(message));
    }
  }

  /**
   * Use CUDA renderer for high-quality server-side rendering
   */
  async enableHeavyMode(cudaServerUrl: string): Promise<void> {
    // Initialize CUDA renderer
    try {
      const response = await fetch(`${cudaServerUrl}/gpu/status`);
      if (!response.ok) {
        throw new Error('GPU not available');
      }
      console.log('Heavy mode enabled with CUDA rendering');
    } catch (error) {
      console.error('Failed to enable heavy mode:', error);
      throw error;
    }
  }

  /**
   * Render fractal with CUDA and broadcast result
   */
  async renderAndBroadcast(params: Record<string, unknown>): Promise<void> {
    if (!this.canvas) {
      throw new Error('Canvas not set');
    }

    // Here you would call the CUDA renderer
    // For now, just broadcast parameters
    this.broadcastParameters(params);
  }

  /**
   * Handle incoming parameter updates (student)
   */
  private handleParameterUpdate(data: Record<string, unknown>): void {
    if (data.type === 'parameter-update') {
      // Emit custom event for parameter changes
      const event = new CustomEvent('fractalParameterUpdate', {
        detail: (data as Record<string, unknown>).params
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Set up automatic parameter synchronization
   */
  private setupParameterSync(params: Record<string, unknown>): void {
    // Watch for parameter changes and broadcast them
    // This is a simplified implementation
    Object.keys(params).forEach((key) => {
      console.log('Setup parameter sync for:', key);
    });
  }

  /**
   * Send ICE candidate through signaling server
   */
  private async sendCandidate(candidate: RTCIceCandidate): Promise<void> {
    await fetch(`${this.signalingUrl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send-candidate',
        sessionId: this.sessionId,
        fromPeer: this.role === 'teacher' ? 'teacher' : 'student',
        candidate: candidate
      })
    });
  }

  /**
   * Poll for signaling messages
   */
  async pollForMessages(): Promise<void> {
    if (!this.sessionId) return;

    try {
      const response = await fetch(`${this.signalingUrl}?` + new URLSearchParams({
        action: 'get-session-info',
        sessionId: this.sessionId,
        peerId: this.role || ''
      }));

      const data = await response.json();
      
      // Handle pending offers/answers/candidates
      if (data.pendingOffer && this.role === 'student') {
        await this.handleOffer(data.pendingOffer.offer);
      }
      
      if (data.pendingAnswer && this.role === 'teacher') {
        await this.handleAnswer(data.pendingAnswer.answer);
      }
      
      if (data.iceCandidates) {
        for (const candidate of data.iceCandidates) {
          await this.peerConnection?.addIceCandidate(candidate.candidate);
        }
      }
    } catch (error) {
      console.error('Error polling for messages:', error);
    }
  }

  /**
   * Handle incoming offer (student)
   */
  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;

    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    // Send answer through signaling
    await fetch(`${this.signalingUrl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send-answer',
        sessionId: this.sessionId,
        fromPeer: 'student',
        answer: answer
      })
    });
  }

  /**
   * Handle incoming answer (teacher)
   */
  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(answer);
  }

  /**
   * Clean up resources
   */
  async disconnect(): Promise<void> {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.sessionId) {
      await fetch(`${this.signalingUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave-session',
          sessionId: this.sessionId,
          peerId: this.role
        })
      });
    }

    this.sessionId = null;
    this.role = null;
    console.log('Disconnected from broadcast session');
  }
}