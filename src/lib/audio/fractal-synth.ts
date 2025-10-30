/**
 * Fractal Sound Synthesizer
 * Maps escape-time iteration counts to audio frequencies
 * Stable points (high iterations) = harmonic tones
 * Chaotic points (low iterations) = noisy bursts
 */

export class FractalSynth {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeOscillators: Map<string, { osc: OscillatorNode; gain: GainNode }> = new Map();

  constructor() {
    // Lazy init - only create AudioContext on first user interaction
  }

  private initAudio() {
    if (this.audioContext) return;
    
    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3; // Master volume
    this.masterGain.connect(this.audioContext.destination);
  }

  /**
   * Play a tone based on fractal escape time
   * @param iterations - Number of iterations before escape (0 = instant, maxIterations = stable)
   * @param maxIterations - Maximum iterations tested
   * @param x - Screen x position (for stereo panning)
   * @param smoothValue - Optional smooth color value for pitch bend
   */
  playPoint(
    iterations: number,
    maxIterations: number,
    x: number = 0.5,
    smoothValue?: number
  ) {
    this.initAudio();
    if (!this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;
    
    // Normalize iteration count (0 = chaotic, 1 = stable)
    const stability = iterations / maxIterations;
    
    // Calculate frequency based on stability
    // Stable points (inside set) = low, harmonic frequencies (100-400 Hz)
    // Chaotic points (quick escape) = high, dissonant frequencies (400-2000 Hz)
    let baseFreq: number;
    
    if (stability > 0.95) {
      // Very stable - deep, resonant tones
      baseFreq = 100 + stability * 50; // 100-150 Hz
    } else if (stability > 0.7) {
      // Moderately stable - musical tones
      baseFreq = 150 + stability * 250; // 150-400 Hz
    } else if (stability > 0.3) {
      // Borderline - tension tones
      baseFreq = 400 + stability * 600; // 400-1000 Hz
    } else {
      // Chaotic - harsh, noisy tones
      baseFreq = 1000 + (1 - stability) * 1000; // 1000-2000 Hz
    }

    // Use smooth value for pitch bend if available
    if (smoothValue !== undefined) {
      const bendFactor = 1 + (smoothValue % 1) * 0.1; // ±10% pitch variation
      baseFreq *= bendFactor;
    }

    // Create oscillator
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const panner = this.audioContext.createStereoPanner();

    // Waveform based on stability
    if (stability > 0.9) {
      osc.type = 'sine'; // Pure tone for stable points
    } else if (stability > 0.6) {
      osc.type = 'triangle'; // Slightly harsh for mid-stability
    } else if (stability > 0.3) {
      osc.type = 'square'; // Dissonant for borderline
    } else {
      osc.type = 'sawtooth'; // Harsh for chaotic
    }

    osc.frequency.setValueAtTime(baseFreq, now);

    // Pan based on x position (-1 = left, 1 = right)
    panner.pan.setValueAtTime(x * 2 - 1, now);

    // Envelope based on stability
    const attackTime = stability > 0.7 ? 0.05 : 0.01; // Stable = slow attack
    const decayTime = stability > 0.7 ? 0.3 : 0.05; // Stable = long decay
    const sustainLevel = stability > 0.9 ? 0.3 : 0.1; // Stable = sustained
    const releaseTime = stability > 0.7 ? 0.5 : 0.1; // Stable = long release

    // ADSR envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + attackTime); // Attack
    gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime); // Decay to sustain
    gainNode.gain.linearRampToValueAtTime(0, now + attackTime + decayTime + releaseTime); // Release

    // Connect nodes
    osc.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.masterGain);

    // Start and stop
    osc.start(now);
    osc.stop(now + attackTime + decayTime + releaseTime);

    // Cleanup
    osc.onended = () => {
      osc.disconnect();
      gainNode.disconnect();
      panner.disconnect();
    };

    // Add subtle frequency modulation for stable points (vibrato)
    if (stability > 0.8) {
      const lfo = this.audioContext.createOscillator();
      const lfoGain = this.audioContext.createGain();
      
      lfo.frequency.setValueAtTime(5, now); // 5 Hz vibrato
      lfoGain.gain.setValueAtTime(baseFreq * 0.02, now); // ±2% pitch variation
      
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      
      lfo.start(now);
      lfo.stop(now + attackTime + decayTime + releaseTime);
    }
  }

  /**
   * Play a chord for very stable points (deep inside the set)
   */
  playChord(iterations: number, maxIterations: number, x: number = 0.5) {
    const stability = iterations / maxIterations;
    
    if (stability < 0.95) {
      // Not stable enough for a chord
      this.playPoint(iterations, maxIterations, x);
      return;
    }

    // Play root, third, and fifth for harmonic chord
    const baseFreq = 100 + stability * 50;
    const intervals = [1, 1.25, 1.5]; // Major chord intervals
    
    intervals.forEach((interval, i) => {
      setTimeout(() => {
        this.playTone(baseFreq * interval, 0.8, x, 'sine');
      }, i * 30); // Slight stagger for richness
    });
  }

  /**
   * Low-level tone player
   */
  private playTone(
    frequency: number,
    duration: number,
    pan: number,
    type: OscillatorType
  ) {
    this.initAudio();
    if (!this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;
    
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const panner = this.audioContext.createStereoPanner();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    panner.pan.setValueAtTime(pan * 2 - 1, now);

    // Simple envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);

    osc.onended = () => {
      osc.disconnect();
      gainNode.disconnect();
      panner.disconnect();
    };
  }

  /**
   * Set master volume
   */
  setVolume(volume: number) {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(volume, this.audioContext!.currentTime);
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.activeOscillators.forEach(({ osc, gain }) => {
      osc.stop();
      osc.disconnect();
      gain.disconnect();
    });
    this.activeOscillators.clear();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
