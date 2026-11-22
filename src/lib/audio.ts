/**
 * Sound synthesis using the browser's Web Audio API.
 * Zero external audio assets, works offline, and provides
 * instant chime feedback for customer orders and kitchen alerts.
 */

class SoundAlertManager {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    return this.audioCtx;
  }

  /**
   * Play a pleasant two-tone chime for customer order placement or waiter call
   */
  public playSuccessChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.0, now + 0.12); // A5

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn('Audio feedback error:', e);
    }
  }

  /**
   * Play a distinctive triple-beep chime for incoming kitchen tickets
   */
  public playKitchenAlert() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const beeps = [0, 0.16, 0.32];
      beeps.forEach((startOffset) => {
        const now = ctx.currentTime + startOffset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(740, now); // F#5

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
      });
    } catch (e) {
      console.warn('Kitchen alert sound error:', e);
    }
  }
}

export const soundManager = new SoundAlertManager();
