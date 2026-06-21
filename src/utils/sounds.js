import { Storage } from './storage.js';
import { PlayerState } from '../state/playerState.js';

class SoundManager {
  constructor() {
    this.ctx = null;
    this.musicInterval = null;
    this.currentMusicNode = null;
    this.currentMusicTempo = 120;
    this.activeTheme = 'menu'; // 'menu', 'game', 'adventure'

    // Load settings from storage
    this.soundEnabled = Storage.get('soundEnabled', true);
    this.musicEnabled = Storage.get('musicEnabled', true);
    this.musicVolume = 0.15; // Soft background volume
    this.sfxVolume = 0.5;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
    }
    this.setupVisibilityHandler();
  }

  setupVisibilityHandler() {
    if (this._visibilityHandlerSetup) return;
    this._visibilityHandlerSetup = true;

    // Handle backgrounding on mobile/web
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Suspend the audio context to immediately pause all sounds
        if (this.ctx && this.ctx.state === 'running') {
          this.ctx.suspend();
        }
      } else {
        // Resume the audio context when returning to foreground
        if (this.ctx && this.ctx.state === 'suspended' && this.musicEnabled) {
          this.ctx.resume();
        }
      }
    });
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
    Storage.set('soundEnabled', enabled);
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    Storage.set('musicEnabled', enabled);
    if (!enabled) {
      this.stopMusic();
    } else {
      this.startMusic(this.activeTheme);
    }
  }

  // Synthesize SFX using Web Audio API
  playSfx(type, options = {}) {
    this.init();
    if (!this.ctx || !this.soundEnabled) return;

    // Resume context if suspended (browser security)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.sfxVolume, t);
    masterGain.connect(this.ctx.destination);

    switch (type) {
      case 'block-place': {
        // Soft, organic "pop" (like placing a wooden tile)
        // Layer 1: Body (low mid)
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(450, t);
        osc1.frequency.exponentialRampToValueAtTime(150, t + 0.05);

        gain1.gain.setValueAtTime(0.4, t);
        gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

        // Layer 2: Click (high frequency, very short)
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1200, t);
        osc2.frequency.exponentialRampToValueAtTime(300, t + 0.02);

        gain2.gain.setValueAtTime(0.15, t);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.02);

        osc1.connect(gain1);
        gain1.connect(masterGain);
        osc1.start(t);
        osc1.stop(t + 0.06);

        osc2.connect(gain2);
        gain2.connect(masterGain);
        osc2.start(t);
        osc2.stop(t + 0.03);
        break;
      }
      case 'line-clear': {
        const lines = options.lines || 1;
        const basePitchMod = 1 + (lines - 1) * 0.1;

        // 1. Deep "Thwomp / Water drop" body
        const thudOsc = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thudOsc.type = 'sine';
        // Fast pitch envelope for a satisfying "pop"
        thudOsc.frequency.setValueAtTime(400 * basePitchMod, t);
        thudOsc.frequency.exponentialRampToValueAtTime(50, t + 0.1);

        thudGain.gain.setValueAtTime(0.7, t);
        thudGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        
        thudOsc.connect(thudGain);
        thudGain.connect(masterGain);
        thudOsc.start(t);
        thudOsc.stop(t + 0.16);

        // 2. Glassy "Ping" (Single clear bell, scales up per line)
        const pingOsc = this.ctx.createOscillator();
        const pingGain = this.ctx.createGain();
        pingOsc.type = 'sine';
        const pingFreq = 880 * Math.pow(1.059463, (lines - 1) * 3); // Climbs musical scale
        pingOsc.frequency.setValueAtTime(pingFreq, t);

        pingGain.gain.setValueAtTime(0, t);
        pingGain.gain.linearRampToValueAtTime(0.3, t + 0.01);
        pingGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        pingOsc.connect(pingGain);
        pingGain.connect(masterGain);
        pingOsc.start(t);
        pingOsc.stop(t + 0.45);
        break;
      }
      case 'combo': {
        // Marimba / Wooden mallet sound for combos
        const notes = [523.25, 659.25]; // C5, E5
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + (idx * 0.1));
          
          gain.gain.setValueAtTime(0, t + (idx * 0.1));
          // Sharp attack
          gain.gain.linearRampToValueAtTime(0.3, t + (idx * 0.1) + 0.01);
          // Fast decay
          gain.gain.exponentialRampToValueAtTime(0.001, t + (idx * 0.1) + 0.3);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(t + (idx * 0.1));
          osc.stop(t + (idx * 0.1) + 0.35);
        });
        break;
      }
      case 'combo-3x': {
        // Beautiful resonant bell climb
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C major pentatonic climb
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator(); // harmonic
          const gain = this.ctx.createGain();
          
          const time = t + (idx * 0.06);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time);

          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(freq * 2.01, time); // slight detuned harmonic for metallic feel

          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(0.15, time + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);

          osc.connect(gain);
          osc2.connect(gain);
          gain.connect(masterGain);
          osc.start(time);
          osc2.start(time);
          osc.stop(time + 0.65);
          osc2.stop(time + 0.65);
        });
        break;
      }
      case 'button-tap': {
        // UI Glassy Tick
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.02);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.02);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.03);
        break;
      }
      case 'coin-collect': {
        // Polished modern coin pop
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();

        osc1.type = 'square';
        osc1.frequency.setValueAtTime(987.77, t); 
        osc1.frequency.setValueAtTime(1318.51, t + 0.1); 
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(4000, t);
        filter.frequency.linearRampToValueAtTime(500, t + 0.3);

        gain1.gain.setValueAtTime(0, t);
        gain1.gain.linearRampToValueAtTime(0.3, t + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

        osc1.connect(filter);
        filter.connect(gain1);
        gain1.connect(masterGain);
        osc1.start(t);
        osc1.stop(t + 0.35);
        break;
      }
      case 'level-up': {
        // Sweeping melodic arpeggio
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4 to C6
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + idx * 0.08);

          gain.gain.setValueAtTime(0, t + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.2, t + idx * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.08 + 0.3);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(t + idx * 0.08);
          osc.stop(t + idx * 0.08 + 0.35);
        });
        break;
      }
      case 'game-over': {
        // Buzzy downward sweep
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.linearRampToValueAtTime(80, t + 0.5);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

        // Lowpass filter to make it sound "warmer/crunchy"
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, t);
        filter.frequency.linearRampToValueAtTime(100, t + 0.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.61);
        break;
      }
      case 'new-record': {
        // High energy fanfare
        const fanfare = [523.25, 523.25, 523.25, 523.25, 659.25, 587.33, 659.25, 783.99];
        const durations = [0.1, 0.1, 0.1, 0.2, 0.15, 0.15, 0.15, 0.4];
        let currentOffset = 0;
        
        fanfare.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + currentOffset);

          gain.gain.setValueAtTime(0, t + currentOffset);
          gain.gain.linearRampToValueAtTime(0.25, t + currentOffset + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, t + currentOffset + durations[idx]);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(t + currentOffset);
          osc.stop(t + currentOffset + durations[idx] + 0.05);
          
          currentOffset += durations[idx] * 0.9;
        });
        break;
      }
      case 'power-up': {
        // Energy whoosh + spark
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(900, t + 0.3);

        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, t);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        
        osc.start(t);
        osc.stop(t + 0.36);
        break;
      }
      case 'x2-drop': {
        // Deep thud with a sharp glass/wood tap for the impact
        const t = this.ctx.currentTime;
        
        // 1. The Thud (Low frequency sweep)
        const oscThud = this.ctx.createOscillator();
        const gainThud = this.ctx.createGain();
        oscThud.type = 'sine';
        oscThud.frequency.setValueAtTime(150, t);
        oscThud.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        
        gainThud.gain.setValueAtTime(0.5, t);
        gainThud.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        
        oscThud.connect(gainThud);
        gainThud.connect(masterGain);
        oscThud.start(t);
        oscThud.stop(t + 0.2);

        // 2. The Snap/Click (High frequency short pop for tactile feel)
        const oscSnap = this.ctx.createOscillator();
        const gainSnap = this.ctx.createGain();
        oscSnap.type = 'triangle';
        oscSnap.frequency.setValueAtTime(1200, t);
        oscSnap.frequency.exponentialRampToValueAtTime(200, t + 0.03);

        gainSnap.gain.setValueAtTime(0.3, t);
        gainSnap.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
        
        const filterSnap = this.ctx.createBiquadFilter();
        filterSnap.type = 'highpass';
        filterSnap.frequency.value = 800;

        oscSnap.connect(filterSnap);
        filterSnap.connect(gainSnap);
        gainSnap.connect(masterGain);
        oscSnap.start(t);
        oscSnap.stop(t + 0.05);

        break;
      }
      case 'praise-crystal': {
        const t = this.ctx.currentTime;
        const numOsc = 5;
        for (let i = 0; i < numOsc; i++) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          
          const startTime = t + (i * 0.04);
          const baseFreq = 800 + (i * 300);
          
          osc.frequency.setValueAtTime(baseFreq, startTime);
          osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, startTime + 0.3);

          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.3 / numOsc, startTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(startTime);
          osc.stop(startTime + 0.7);
        }
        break;
      }
      case 'x2-combo': {
        // Arcade Level Up (Arpeggio)
        const t = this.ctx.currentTime;
        const combo = Math.min(6, Math.max(1, options.combo || 1));
        
        // Base frequency shifts up with combo
        const base = 220 * Math.pow(1.059463, (combo - 1) * 2); 
        // Major arpeggio intervals: root, major 3rd, perfect 5th, octave
        const intervals = [1, 1.25, 1.5, 2.0]; 

        intervals.forEach((mult, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(base * mult, t + (i * 0.08));
          
          gain.gain.setValueAtTime(0, t + (i * 0.08));
          gain.gain.linearRampToValueAtTime(0.15, t + (i * 0.08) + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t + (i * 0.08) + 0.15);
          
          // Soften the square wave
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2000, t);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          
          osc.start(t + (i * 0.08));
          osc.stop(t + (i * 0.08) + 0.2);
        });
        break;
      }
      case 'x2-merge': {
        // Water Drop / Bubble bloop
        const t = this.ctx.currentTime;
        const score = options.score || 2;
        
        // Map 2048 powers to frequency (2=0, 4=1, 8=2, 16=3, 32=4, 64=5...)
        let power = Math.max(0, Math.log2(score) - 1);
        // Base frequency scales up slowly and pleasantly
        const freq = 300 + (power * 50); 
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        
        // Fast pitch sweep UP for a "bloop" bubble sound
        osc.frequency.setValueAtTime(freq * 0.5, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.08);

        // Very short, snappy envelope
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.6, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.15);

        // Add an extra sub-bass "thump" for bigger merges to make them feel heavier
        if (power >= 5) { // 64 and above
          const oscBass = this.ctx.createOscillator();
          const gainBass = this.ctx.createGain();
          oscBass.type = 'sine';
          oscBass.frequency.setValueAtTime(100, t);
          oscBass.frequency.exponentialRampToValueAtTime(40, t + 0.1);
          
          gainBass.gain.setValueAtTime(0, t);
          gainBass.gain.linearRampToValueAtTime(0.4, t + 0.01);
          gainBass.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          
          oscBass.connect(gainBass);
          gainBass.connect(masterGain);
          oscBass.start(t);
          oscBass.stop(t + 0.2);
        }

        break;
      }
      case 'slide-2048': {
        // Quick satisfying slide swoosh
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);

        // Add a noise layer for friction
        const noiseSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, noiseSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < noiseSize; i++) data[i] = Math.random() * 2 - 1;
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = buffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 800;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.05, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);
        noiseSource.start(t);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
      }
      case 'merge-2048': {
        // Dynamic pitch based on merge score
        const score = options.score || 4;
        const power = Math.max(1, Math.log2(score)); 
        const freq = 220 * Math.pow(1.059463, power * 2.5); // Climb higher on piano scale

        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.15); // "Pop up" pitch effect
        
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(freq * 0.5, t); // sub octave
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 3, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + 0.2);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc2.start(t);
        osc.stop(t + 0.35);
        osc2.stop(t + 0.35);
        break;
      }
      case 'invalid': {
        // Short error buzz
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(130, t);
        osc.frequency.setValueAtTime(110, t + 0.06);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.13);
        break;
      }
      case 'undo': {
        // Reversed slide sound
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.19);
        break;
      }
      case 'achievement': {
        // Short happy melody
        const notes = [587.33, 659.25, 783.99, 880.00, 1046.50]; // D5 to C6
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + idx * 0.06);

          gain.gain.setValueAtTime(0, t + idx * 0.06);
          gain.gain.linearRampToValueAtTime(0.2, t + idx * 0.06 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.06 + 0.15);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(t + idx * 0.06);
          osc.stop(t + idx * 0.06 + 0.18);
        });
        break;
      }
      case 'match-blast': {
        // Premium Candy-Crush style glassy chime / sweet pop
        const count = options.count || 3;
        const pitchMultiplier = Math.min(1 + (count - 3) * 0.08, 1.6);
        
        // 1. "Glassy Shatter" - high frequency quick sweep for crispness
        const shatter = this.ctx.createOscillator();
        const shatterGain = this.ctx.createGain();
        shatter.type = 'triangle';
        shatter.frequency.setValueAtTime(1800 * pitchMultiplier, t);
        shatter.frequency.exponentialRampToValueAtTime(800 * pitchMultiplier, t + 0.08);
        shatterGain.gain.setValueAtTime(0.15, t);
        shatterGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        shatter.connect(shatterGain);
        shatterGain.connect(masterGain);
        shatter.start(t);
        shatter.stop(t + 0.15);

        // 2. "Sweet Bell" - pure tone that rings out (C6/E6 depending on pitch)
        const bell = this.ctx.createOscillator();
        const bellGain = this.ctx.createGain();
        bell.type = 'sine';
        bell.frequency.setValueAtTime(1046.50 * pitchMultiplier, t); // High C
        bellGain.gain.setValueAtTime(0, t);
        bellGain.gain.linearRampToValueAtTime(0.2, t + 0.02);
        bellGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        bell.connect(bellGain);
        bellGain.connect(masterGain);
        bell.start(t);
        bell.stop(t + 0.35);

        // 3. "Juicy Pop" - warm mid-frequency sweep
        const pop = this.ctx.createOscillator();
        const popGain = this.ctx.createGain();
        pop.type = 'sine';
        pop.frequency.setValueAtTime(600 * pitchMultiplier, t);
        pop.frequency.exponentialRampToValueAtTime(200, t + 0.15);
        popGain.gain.setValueAtTime(0.3, t);
        popGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        pop.connect(popGain);
        popGain.connect(masterGain);
        pop.start(t);
        pop.stop(t + 0.25);
        
        break;
      }
      case 'match-fall': {
        // Candy Crush style crisp landing "click/tap"
        
        // 1. High-pitched tiny click
        const click = this.ctx.createOscillator();
        const clickGain = this.ctx.createGain();
        click.type = 'square';
        click.frequency.setValueAtTime(1200, t);
        click.frequency.exponentialRampToValueAtTime(400, t + 0.03);
        
        // Very quick decay for a sharp tap
        clickGain.gain.setValueAtTime(0, t);
        clickGain.gain.linearRampToValueAtTime(0.05, t + 0.005);
        clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        
        click.connect(clickGain);
        clickGain.connect(masterGain);
        click.start(t);
        click.stop(t + 0.05);

        // 2. Soft underlying resonance (the "candy" body)
        const body = this.ctx.createOscillator();
        const bodyGain = this.ctx.createGain();
        body.type = 'sine';
        body.frequency.setValueAtTime(500, t);
        body.frequency.exponentialRampToValueAtTime(300, t + 0.05);
        
        bodyGain.gain.setValueAtTime(0.08, t);
        bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        
        body.connect(bodyGain);
        bodyGain.connect(masterGain);
        body.start(t);
        body.stop(t + 0.07);
        break;
      }
      case 'bubble-pop': {
        // Su baloncuğu patlaması: kısa, sulu, hafif yüksek
        // Adet arttıkça ses biraz daha tatmin edici
        const count = Math.min(options.count || 3, 8);
        const pitchMul = 1 + (count - 3) * 0.06;

        // 1. Hızlı "blop" (sine wave, frequency drop)
        const blop = this.ctx.createOscillator();
        const blopGain = this.ctx.createGain();
        blop.type = 'sine';
        blop.frequency.setValueAtTime(800 * pitchMul, t);
        blop.frequency.exponentialRampToValueAtTime(180, t + 0.08);
        blopGain.gain.setValueAtTime(0.35, t);
        blopGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        blop.connect(blopGain);
        blopGain.connect(masterGain);
        blop.start(t);
        blop.stop(t + 0.15);

        // 2. Hafif yüksek "tıs" (triangle, kısa transient)
        const tiss = this.ctx.createOscillator();
        const tissGain = this.ctx.createGain();
        tiss.type = 'triangle';
        tiss.frequency.setValueAtTime(1600 * pitchMul, t);
        tiss.frequency.exponentialRampToValueAtTime(600, t + 0.04);
        tissGain.gain.setValueAtTime(0.12, t);
        tissGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        tiss.connect(tissGain);
        tissGain.connect(masterGain);
        tiss.start(t);
        tiss.stop(t + 0.08);
        break;
      }
      case 'match-combo': {
        // Ascending triumphant arpeggio — more notes for higher combos
        const comboLevel = Math.min(options.combo || 2, 6);
        const baseNotes = [523.25, 659.25, 783.99, 880.00, 987.77, 1046.50]; // C5 to C6
        const noteCount = Math.min(comboLevel + 1, baseNotes.length);

        for (let i = 0; i < noteCount; i++) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(baseNotes[i], t + i * 0.07);

          gain.gain.setValueAtTime(0, t + i * 0.07);
          gain.gain.linearRampToValueAtTime(0.18, t + i * 0.07 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.07 + 0.18);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(t + i * 0.07);
          osc.stop(t + i * 0.07 + 0.2);

          // Harmonic shimmer
          const osc2 = this.ctx.createOscillator();
          const gain2 = this.ctx.createGain();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(baseNotes[i] * 2, t + i * 0.07);

          gain2.gain.setValueAtTime(0, t + i * 0.07);
          gain2.gain.linearRampToValueAtTime(0.05, t + i * 0.07 + 0.01);
          gain2.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.12);

          osc2.connect(gain2);
          gain2.connect(masterGain);
          osc2.start(t + i * 0.07);
          osc2.stop(t + i * 0.07 + 0.15);
        }
        break;
      }
    }
  }

  // Generates beautiful lush ambient generative music
  startMusic(theme = 'menu') {
    this.init();
    this.activeTheme = theme;
    if (!this.ctx || !this.musicEnabled) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.stopMusic();

    this.musicNodes = []; // Track all playing nodes for cleanup
    this.musicTimeouts = []; // Track all timeouts
    this.isPlayingMusic = true;

    // Create a lush reverb using a synthesized impulse response
    const reverb = this.ctx.createConvolver();
    const length = this.ctx.sampleRate * 3.5; // 3.5 seconds reverb
    const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let i = 0; i < 2; i++) {
      const channel = impulse.getChannelData(i);
      for (let j = 0; j < length; j++) {
        // Exponential decay envelope on white noise
        channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, 4);
      }
    }
    reverb.buffer = impulse;

    // Master volume for music
    const masterGain = this.ctx.createGain();
    masterGain.gain.value = this.musicVolume * 0.8; // Scale down slightly to account for reverb
    
    // Mix dry and wet signals for spaciousness
    const dryGain = this.ctx.createGain();
    const wetGain = this.ctx.createGain();
    dryGain.gain.value = 0.5;
    wetGain.gain.value = 0.6; // Heavy reverb

    masterGain.connect(dryGain);
    masterGain.connect(reverb);
    reverb.connect(wetGain);
    
    dryGain.connect(this.ctx.destination);
    wetGain.connect(this.ctx.destination);

    // Scales (Pentatonic for beautiful generative melodies that never clash)
    let scale = [];
    let baseNote = 220; // A3

    if (theme === 'menu') {
      // C Major Pentatonic (C, D, E, G, A) - Relaxing, positive
      scale = [261.63, 293.66, 329.63, 392.00, 440.00]; 
      baseNote = 130.81; // C3
    } else if (theme === 'game') {
      // F Lydian/Major Pentatonic (F, G, A, C, D) - Focus, bright
      scale = [349.23, 392.00, 440.00, 523.25, 587.33]; 
      baseNote = 174.61; // F3
    } else if (theme === 'adventure') {
      // E Minor Pentatonic (E, G, A, B, D) - Mysterious, deeper
      scale = [329.63, 392.00, 440.00, 493.88, 587.33]; 
      baseNote = 164.81; // E3
    }

    // 1. Drone / Pad Loop (The breathing foundation)
    const playPad = () => {
      if (!this.isPlayingMusic) return;
      const t = this.ctx.currentTime;
      const duration = 8.0;

      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.value = baseNote;
      
      osc2.type = 'triangle';
      osc2.frequency.value = baseNote * 1.005; // Slight detune for a thick chorus effect

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, t);
      // Slow breath envelope for the filter
      filter.frequency.linearRampToValueAtTime(500, t + duration / 2);
      filter.frequency.linearRampToValueAtTime(150, t + duration);

      // Slow volume swell
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + duration / 2);
      gain.gain.linearRampToValueAtTime(0, t + duration);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(t);
      osc2.start(t);
      osc.stop(t + duration);
      osc2.stop(t + duration);

      this.musicNodes.push({ osc, gain });
      this.musicNodes.push({ osc: osc2, gain: null });

      const timeoutId = setTimeout(playPad, (duration - 1) * 1000); // Overlap slightly for seamless looping
      this.musicTimeouts.push(timeoutId);
    };

    // 2. Generative Twinkling Arpeggio (The melody)
    const playMelodyNote = () => {
      if (!this.isPlayingMusic) return;

      const t = this.ctx.currentTime;
      // Randomly pick a note from the scale, occasionally jump an octave higher
      const noteFreq = scale[Math.floor(Math.random() * scale.length)] * (Math.random() > 0.8 ? 2 : 1);
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Sine wave for a pure, glass/bell-like tone
      osc.type = 'sine';
      osc.frequency.value = noteFreq;

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0); // Long tail feeding into the reverb

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(t);
      osc.stop(t + 2.1);

      this.musicNodes.push({ osc, gain });

      // Random delay before the next note (creates human-like, non-repetitive rhythm)
      const nextTime = 400 + Math.random() * 1600;
      const timeoutId = setTimeout(playMelodyNote, nextTime);
      this.musicTimeouts.push(timeoutId);
      
      // Keep array clean
      if (this.musicNodes.length > 30) this.musicNodes = this.musicNodes.slice(-20);
    };

    // Start the layers
    playPad();
    
    // Delay melody start slightly to let the pad fade in
    const melTimeoutId = setTimeout(playMelodyNote, 1500);
    this.musicTimeouts.push(melTimeoutId);
  }

  stopMusic() {
    this.isPlayingMusic = false;

    if (this.musicTimeouts) {
      this.musicTimeouts.forEach(id => clearTimeout(id));
      this.musicTimeouts = [];
    }
    
    if (this.musicNodes) {
      const t = this.ctx ? this.ctx.currentTime : 0;
      this.musicNodes.forEach(node => {
        try {
          if (node.gain) {
            node.gain.gain.cancelScheduledValues(t);
            node.gain.gain.setValueAtTime(node.gain.gain.value, t);
            // Smooth fade out
            node.gain.gain.linearRampToValueAtTime(0, t + 1.0);
          }
          setTimeout(() => {
            try { node.osc.stop(); } catch(e) {}
          }, 1100);
        } catch (e) {}
      });
      this.musicNodes = [];
    }
  }

  speak(text, lang = null) {
    if (!this.soundEnabled || !window.speechSynthesis) return;
    
    // Get the game language if no lang is provided (assuming global PlayerState.state.language exists, or fallback)
    const currentLang = lang || (PlayerState && PlayerState.state.language) || 'tr';
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a voice that matches the language
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;
    
    if (voices.length > 0) {
      // Find voices for the selected language code (e.g. "tr-TR", "en-US")
      const matchingVoices = voices.filter(v => v.lang.toLowerCase().startsWith(currentLang.toLowerCase()));
      if (matchingVoices.length > 0) {
        // Prefer native/local voices if available
        selectedVoice = matchingVoices.find(v => v.localService) || matchingVoices[0];
      }
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.volume = this.sfxVolume * 1.5; // Slightly louder than bg sfx
    utterance.rate = 1.1; // Slightly faster for game pacing
    utterance.pitch = 1.2; // Slightly higher pitch for gamey feel
    
    window.speechSynthesis.speak(utterance);
  }
}

export const Sounds = new SoundManager();
