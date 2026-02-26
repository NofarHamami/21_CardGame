import { Platform } from 'react-native';
import { logger } from './logger';
import { saveMutePreference, saveVolumePreference } from './storage';

let Haptics: typeof import('expo-haptics') | null = null;

async function loadHaptics() {
  if (Haptics) return Haptics;
  try {
    Haptics = await import('expo-haptics');
    return Haptics;
  } catch {
    logger.debug('expo-haptics not available');
    return null;
  }
}

let _muted = false;
let _volume = 1.0;
let _reduceMotion = false;
let _audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== 'web') return null;
  if (_audioCtx) return _audioCtx;
  try {
    _audioCtx = new AudioContext();
    return _audioCtx;
  } catch {
    return null;
  }
}

function playWebTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15 * _volume) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
    return;
  }
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playWebCardTap() {
  playWebTone(800, 0.08, 'sine', 0.1);
}

function playWebCardPlay() {
  playWebTone(600, 0.1, 'sine', 0.15);
  setTimeout(() => playWebTone(900, 0.1, 'sine', 0.12), 60);
}

function playWebPileComplete() {
  playWebTone(523, 0.15, 'sine', 0.15);
  setTimeout(() => playWebTone(659, 0.15, 'sine', 0.15), 120);
  setTimeout(() => playWebTone(784, 0.2, 'sine', 0.15), 240);
  setTimeout(() => playWebTone(1047, 0.3, 'sine', 0.18), 380);
}

function playWebInvalidMove() {
  playWebTone(300, 0.15, 'square', 0.1);
  setTimeout(() => playWebTone(250, 0.2, 'square', 0.08), 120);
}

function playWebWin() {
  const notes = [523, 659, 784, 1047, 784, 1047, 1319];
  notes.forEach((freq, i) => {
    setTimeout(() => playWebTone(freq, 0.2, 'sine', 0.15), i * 140);
  });
}

function playWebLose() {
  playWebTone(400, 0.2, 'sawtooth', 0.08);
  setTimeout(() => playWebTone(350, 0.2, 'sawtooth', 0.08), 200);
  setTimeout(() => playWebTone(300, 0.3, 'sawtooth', 0.08), 400);
}

export function setMuted(muted: boolean) {
  _muted = muted;
  saveMutePreference(muted);
}

export function isMuted(): boolean {
  return _muted;
}

export function setVolume(volume: number) {
  _volume = Math.max(0, Math.min(1, volume));
  saveVolumePreference(_volume);
}

export function playVolumePreview() {
  if (Platform.OS === 'web') {
    playWebTone(660, 0.12, 'sine', 0.15 * _volume);
    setTimeout(() => playWebTone(880, 0.12, 'sine', 0.12 * _volume), 80);
  }
}

export function getVolume(): number {
  return _volume;
}

export function setReduceMotion(enabled: boolean) {
  _reduceMotion = enabled;
}

export function isReduceMotionEnabled(): boolean {
  return _reduceMotion;
}

export function setSoundMuted(muted: boolean) {
  _muted = muted;
}

export async function playCardTapSound() {
  if (_muted) return;
  if (Platform.OS === 'web') { playWebCardTap(); return; }
  await triggerHaptic('light');
}

export async function playCardPlaySound() {
  if (_muted) return;
  if (Platform.OS === 'web') { playWebCardPlay(); return; }
  await triggerHaptic('medium');
}

export async function playPileCompleteSound() {
  if (_muted) return;
  if (Platform.OS === 'web') { playWebPileComplete(); return; }
  await triggerHaptic('success');
}

export async function playInvalidMoveSound() {
  if (_muted) return;
  if (Platform.OS === 'web') { playWebInvalidMove(); return; }
  await triggerHaptic('error');
}

export async function playWinSound() {
  if (_muted) return;
  if (Platform.OS === 'web') { playWebWin(); return; }
  await triggerHaptic('success');
  setTimeout(() => triggerHaptic('success'), 200);
  setTimeout(() => triggerHaptic('success'), 400);
}

export async function playLoseSound() {
  if (_muted) return;
  if (Platform.OS === 'web') { playWebLose(); return; }
  await triggerHaptic('warning');
}

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

async function triggerHaptic(style: HapticStyle) {
  if (Platform.OS === 'web') return;

  try {
    const haptics = await loadHaptics();
    if (!haptics) return;

    switch (style) {
      case 'light':
        await haptics.impactAsync(haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await haptics.impactAsync(haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await haptics.impactAsync(haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await haptics.notificationAsync(haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await haptics.notificationAsync(haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await haptics.notificationAsync(haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch {
    // Haptics not available on this platform
  }
}
