/**
 * Clinical Ledger Medication Audio & Notification Service
 * Synthesizes a gentle dual-frequency chime using Web Audio API (offline-safe, zero MP3 dependencies).
 */

class NotificationService {
  private audioCtx: AudioContext | null = null;
  private alertedEventIds = new Set<string>();

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Plays a calm, gentle clinical double-chime (D5 -> A5)
   */
  public playChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note 1: D5 (587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.18, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Note 2: A5 (880.00 Hz) slightly delayed
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.15);
      gain2.gain.setValueAtTime(0, now + 0.15);
      gain2.gain.linearRampToValueAtTime(0.18, now + 0.19);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.75);
    } catch (err) {
      console.warn('Audio chime playback error:', err);
    }
  }

  /**
   * Requests browser notification permission if not yet decided
   */
  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission();
      return result === 'granted';
    }
    return false;
  }

  /**
   * Triggers a system browser notification
   */
  public showSystemNotification(title: string, body: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.svg',
          tag: 'maip-med-reminder',
        });
      } catch {
        // Fallback gracefully
      }
    }
  }

  public hasAlerted(eventId: string): boolean {
    return this.alertedEventIds.has(eventId);
  }

  public markAlerted(eventId: string) {
    this.alertedEventIds.add(eventId);
  }
}

export const notificationService = new NotificationService();
