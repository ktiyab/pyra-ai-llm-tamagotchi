import { Stage } from '../types';

const SOUND_URLS = {
  chirp: 'https://storage.googleapis.com/vai-pet/A_baby_dragon_chirps_.mp3',
  coo: 'https://storage.googleapis.com/vai-pet/A_baby_dragon_emits__little_long_babble.mp3',
  babble: 'https://storage.googleapis.com/vai-pet/baby-dragon-babbles.mp3',
  roar: 'https://storage.googleapis.com/vai-pet/baby-dragon_long_babble.mp3',
  ambientMusic: 'https://storage.googleapis.com/vai-pet/kids-game-gaming-background-music-295075.mp3'
};

const AMBIENT_CONFIG = {
  volume: 0.30,
  fadeInDuration: 2,
  fadeOutDuration: 1,
} as const;

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private loaded = false;

  // Egg Ambience Nodes
  private eggOsc: OscillatorNode | null = null;
  private eggGain: GainNode | null = null;
  private eggFilter: BiquadFilterNode | null = null;

  // Background Music Nodes
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientPlaying = false;

  private init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.4;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  async preload() {
    this.init();
    if (this.loaded || !this.ctx) return;

    const promises = Object.entries(SOUND_URLS).map(async ([key, url]) => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        if (this.ctx) {
          const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
          this.buffers.set(key, audioBuffer);
        }
      } catch (error) {
        console.error(`Failed to load sound: ${key}`, error);
      }
    });

    await Promise.all(promises);
    this.loaded = true;
    console.log("ðŸ¦• Audio Assets Loaded");
  }

  private playBuffer(name: string, volume: number = 1.0, playbackRate: number = 1.0) {
    this.init();
    if (!this.ctx || !this.masterGain) return false;
    
    const buffer = this.buffers.get(name);
    if (!buffer) return false;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate * (0.95 + Math.random() * 0.1);

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.masterGain);
    source.start(0);
    return true;
  }

  // --- Ambient Background Music ---
  startAmbientMusic() {
    this.init();
    if (!this.ctx || !this.masterGain || this.ambientPlaying) return;
    
    const buffer = this.buffers.get('ambientMusic');
    if (!buffer) {
      console.warn("Ambient music not loaded yet");
      return;
    }

    this.ambientSource = this.ctx.createBufferSource();
    this.ambientSource.buffer = buffer;
    this.ambientSource.loop = true;
    
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0;
    
    this.ambientSource.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);
    
    this.ambientSource.start(0);
    this.ambientPlaying = true;
    
    const t = this.ctx.currentTime;
    this.ambientGain.gain.setValueAtTime(0, t);
    this.ambientGain.gain.linearRampToValueAtTime(
      AMBIENT_CONFIG.volume, 
      t + AMBIENT_CONFIG.fadeInDuration
    );
    
    console.log("ðŸŽµ Ambient music started");
  }

  stopAmbientMusic() {
    if (!this.ctx || !this.ambientSource || !this.ambientGain || !this.ambientPlaying) return;
    
    const t = this.ctx.currentTime;
    
    this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, t);
    this.ambientGain.gain.linearRampToValueAtTime(0, t + AMBIENT_CONFIG.fadeOutDuration);
    
    const source = this.ambientSource;
    setTimeout(() => {
      try { source.stop(); } catch (e) {}
      source.disconnect();
    }, AMBIENT_CONFIG.fadeOutDuration * 1000);
    
    this.ambientSource = null;
    this.ambientGain = null;
    this.ambientPlaying = false;
    
    console.log("ðŸŽµ Ambient music stopped");
  }

  setAmbientVolume(volume: number) {
    if (!this.ctx || !this.ambientGain) return;
    
    const clampedVolume = Math.max(0, Math.min(AMBIENT_CONFIG.volume, volume));
    const t = this.ctx.currentTime;
    this.ambientGain.gain.setTargetAtTime(clampedVolume, t, 0.1);
  }

  isAmbientPlaying(): boolean {
    return this.ambientPlaying;
  }

  // --- Egg Ambience ---
  startEggHum() {
    this.init();
    if (!this.ctx || !this.masterGain || this.eggOsc) return;

    const t = this.ctx.currentTime;
    
    this.eggOsc = this.ctx.createOscillator();
    this.eggGain = this.ctx.createGain();
    this.eggFilter = this.ctx.createBiquadFilter();

    this.eggOsc.type = 'triangle';
    this.eggOsc.frequency.value = 45;

    this.eggFilter.type = 'lowpass';
    this.eggFilter.frequency.value = 100;

    this.eggGain.gain.value = 0;

    this.eggOsc.connect(this.eggFilter);
    this.eggFilter.connect(this.eggGain);
    this.eggGain.connect(this.masterGain);

    this.eggOsc.start(t);
  }

  stopEggHum() {
    if (this.eggOsc) {
      try { this.eggOsc.stop(); } catch (e) {}
      this.eggOsc.disconnect();
      this.eggOsc = null;
    }
    if (this.eggGain) {
      this.eggGain.disconnect();
      this.eggGain = null;
    }
    if (this.eggFilter) {
      this.eggFilter.disconnect();
      this.eggFilter = null;
    }
  }

  syncEggHum(intensity: number, warmth: number) {
    if (!this.ctx || !this.eggGain || !this.eggOsc || !this.eggFilter) return;
    const t = this.ctx.currentTime;
    const targetVol = 0.05 + (intensity * 0.15);
    this.eggGain.gain.setTargetAtTime(targetVol, t, 0.05);
    const targetFreq = 45 + (warmth / 100) * 15;
    this.eggOsc.frequency.setTargetAtTime(targetFreq, t, 0.1);
    const targetFilter = 100 + (warmth / 100) * 200;
    this.eggFilter.frequency.setTargetAtTime(targetFilter, t, 0.1);
  }

  // --- Vocalizations ---
  playVocalization(type: 'chirp' | 'purr' | 'whimper' | 'growl' | 'roar' | 'babble') {
    this.init();
    let played = false;

    switch (type) {
      case 'chirp':
        played = this.playBuffer('chirp', 0.6);
        if (!played) this.playSyntheticChirp();
        break;
      case 'purr':
        played = this.playBuffer('coo', 0.7);
        if (!played) this.playSyntheticPurr();
        break;
      case 'babble':
        played = this.playBuffer('babble', 0.8);
        if (!played) this.playSyntheticChirp();
        break;
      case 'roar':
        played = this.playBuffer('roar', 0.9);
        if (!played) this.playSyntheticRoar();
        break;
      case 'growl':
        this.playSyntheticGrowl();
        break;
      case 'whimper':
        this.playSyntheticWhimper();
        break;
    }
  }

  // --- Interaction Sounds ---
  playInteraction(type: string) {
    this.init();
    
    switch (type) {
      case 'feed':
        this.playBuffer('babble', 0.8, 1.1);
        break;
      case 'pet':
        this.playBuffer('coo', 0.7);
        break;
      case 'warm':
        this.playBuffer('coo', 0.5, 0.9);
        break;
      case 'play':
        this.playBuffer('chirp', 0.7, 1.2);
        break;
      case 'clean':
        this.playSyntheticChirp();
        break;
    }
  }

  playCrack() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    this.createNoiseBurst(t, 0.05, 2000);
    this.createNoiseBurst(t + 0.2, 0.1, 1500);
  }

  // --- Synthetic Fallbacks ---
  private playSyntheticChirp() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private playSyntheticPurr() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 30;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 10;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 5;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.5);
    gain.gain.linearRampToValueAtTime(0, t + 2.0);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + 2.0);
    lfo.stop(t + 2.0);
  }

  private playSyntheticWhimper() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(500, t + 0.3);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  private playSyntheticGrowl() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.5);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.6);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.7);
  }

  private playSyntheticRoar() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.linearRampToValueAtTime(30, t + 1.2);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.2);
    gain.gain.linearRampToValueAtTime(0, t + 1.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 1.3);
  }

  private createNoiseBurst(t: number, duration: number, filterFreq: number) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
  }
}

export const audioService = new AudioService(