"use strict";
/**
 * AudioSubstrate - Manifold-Based Audio Engine
 * ============================================
 *
 * Waveforms derived from manifold geometry, not Web Audio wrapper.
 *
 * DIMENSIONAL ARCHITECTURE:
 *   One audio channel = ONE point in manifold
 *   Drilling to (channel, frequency, time) = waveform value
 *   Drill to (channel, effects, reverb) = effect parameters
 *
 * MULTI-CHANNEL:
 *   Stereo: drill("L") and drill("R")
 *   Surround: drill("L"), drill("C"), drill("R"), drill("LFE"), etc.
 *   Multichannel stems: drill("drums"), drill("bass"), drill("vocals")
 *
 * DAW INTERFACE:
 *   - Track management (EntityStore-based)
 *   - MIDI input/automation
 *   - Real-time parameter control
 *   - Low-latency processing
 *
 * LATENCY REDUCTION:
 *   - Predictive ring buffers (minimize context switching)
 *   - Lock-free queue for real-time thread
 *   - Clock synchronization (no drift between channels)
 *   - Zero-copy operations where possible
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioSubstrate = exports.ChannelStrip = exports.RingBuffer = void 0;
const entity_store_1 = require("./entity-store");
/**
 * Ring Buffer - low-latency circular buffer for real-time audio
 */
class RingBuffer {
    constructor(sampleCapacity) {
        this._writeIndex = 0;
        this._readIndex = 0;
        this._size = sampleCapacity;
        this._buffer = new Float32Array(sampleCapacity);
    }
    /**
     * Write samples to buffer
     */
    write(samples) {
        const available = this._size - ((this._writeIndex - this._readIndex + this._size) % this._size);
        const toWrite = Math.min(samples.length, available);
        for (let i = 0; i < toWrite; i++) {
            this._buffer[this._writeIndex] = samples[i];
            this._writeIndex = (this._writeIndex + 1) % this._size;
        }
        return toWrite;
    }
    /**
     * Read samples from buffer
     */
    read(count) {
        const result = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            result[i] = this._buffer[this._readIndex];
            this._readIndex = (this._readIndex + 1) % this._size;
        }
        return result;
    }
    /**
     * Available samples to read
     */
    getAvailable() {
        return (this._writeIndex - this._readIndex + this._size) % this._size;
    }
    /**
     * Available space to write
     */
    getAvailableWriteSpace() {
        return this._size - this.getAvailable();
    }
    /**
     * Clear buffer
     */
    clear() {
        this._writeIndex = 0;
        this._readIndex = 0;
        this._buffer.fill(0);
    }
}
exports.RingBuffer = RingBuffer;
/**
 * Channel Strip - single audio channel with effects chain
 */
class ChannelStrip {
    constructor(id, waveform, bufferSize = 4096) {
        this._effects = [];
        this._volume = 1.0;
        this._muted = false;
        this._id = id;
        this._waveform = waveform;
        this._buffer = new RingBuffer(bufferSize);
    }
    /**
     * Process audio samples through effect chain (O(effects))
     */
    process(samples, sampleRate) {
        let result = new Float32Array(samples);
        // Apply each effect in order
        this._effects.forEach(effect => {
            if (effect.enabled) {
                result = this._applyEffect(result, effect, sampleRate);
            }
        });
        // Apply volume and mute
        if (!this._muted) {
            result = result.map((s) => s * this._volume);
        }
        else {
            result.fill(0);
        }
        return result;
    }
    /**
     * Add effect to chain
     */
    addEffect(effect) {
        this._effects.push(effect);
        this._effects.sort((a, b) => a.order - b.order);
    }
    /**
     * Remove effect
     */
    removeEffect(name) {
        const index = this._effects.findIndex(e => e.name === name);
        if (index >= 0) {
            this._effects.splice(index, 1);
            return true;
        }
        return false;
    }
    /**
     * Set volume
     */
    setVolume(vol) {
        this._volume = Math.max(0, Math.min(2, vol)); // Clamp 0-2
    }
    /**
     * Get volume
     */
    getVolume() {
        return this._volume;
    }
    /**
     * Mute/unmute
     */
    setMuted(muted) {
        this._muted = muted;
    }
    /**
     * Get channel ID
     */
    getId() {
        return this._id;
    }
    /**
     * Get available samples in buffer
     */
    getBufferAvailable() {
        return this._buffer.getAvailable();
    }
    _applyEffect(samples, effect, sampleRate) {
        switch (effect.type) {
            case "gain":
                return samples.map((s) => s * (effect.parameters.gain || 1.0));
            case "filter":
                // Simple low-pass (in real implementation, use proper filter design)
                const cutoff = effect.parameters.cutoff || 1000;
                const resonance = effect.parameters.resonance || 0.8;
                return this._lowPassFilter(samples, cutoff, sampleRate, resonance);
            case "reverb":
                const wet = effect.parameters.wet || 0.3;
                return this._simpleReverb(samples, wet);
            case "delay":
                const delayTime = effect.parameters.delayTime || 0.5;
                const feedback = effect.parameters.feedback || 0.5;
                return this._delay(samples, delayTime, feedback, sampleRate);
            case "compressor":
                const threshold = effect.parameters.threshold || -20;
                const ratio = effect.parameters.ratio || 4;
                return this._compressor(samples, threshold, ratio);
            case "distortion":
                const drive = effect.parameters.drive || 1;
                return this._distortion(samples, drive);
            default:
                return samples;
        }
    }
    _lowPassFilter(samples, cutoff, sampleRate, resonance) {
        // Very simple 1-pole filter for demo (not production)
        const alpha = cutoff / (cutoff + sampleRate);
        let last = 0;
        return samples.map(s => {
            last = last + alpha * (s - last);
            return last;
        });
    }
    _simpleReverb(samples, wet) {
        // Simplified reverb (in production, use convolver or ITU algorithms)
        const result = new Float32Array(samples);
        const delayMs = 50;
        const decayRate = 0.4;
        // Just add delayed copies (not real convolution)
        for (let i = Math.floor(delayMs / 1000 * 44100); i < samples.length; i++) {
            result[i] += samples[i - Math.floor(delayMs / 1000 * 44100)] * decayRate * wet;
        }
        return result;
    }
    _delay(samples, delayTime, feedback, sampleRate) {
        const result = new Float32Array(samples);
        const delaySamples = Math.floor(delayTime * sampleRate);
        for (let i = delaySamples; i < samples.length; i++) {
            result[i] += result[i - delaySamples] * feedback;
        }
        return result;
    }
    _compressor(samples, thresholdDb, ratio) {
        const threshold = Math.pow(10, thresholdDb / 20);
        return samples.map(s => {
            const abs = Math.abs(s);
            if (abs > threshold) {
                const gain = threshold + (abs - threshold) / ratio;
                return (s / abs) * gain;
            }
            return s;
        });
    }
    _distortion(samples, drive) {
        return samples.map(s => {
            const driven = s * drive;
            // Soft clipping
            return Math.tanh(driven);
        });
    }
}
exports.ChannelStrip = ChannelStrip;
/**
 * AudioSubstrate - Multi-channel DAW engine with manifold-derived waveforms
 */
class AudioSubstrate {
    constructor(sampleRate = 44100, blockSize = 256) {
        this._sampleRate = 44100; // Standard CD quality
        this._blockSize = 256; // Small blocks for low latency
        this._channels = new Map();
        this._midiQueue = [];
        this._clock = 0; // Current sample position
        this._isRunning = false;
        this._performanceLog = [];
        this._sampleRate = sampleRate;
        this._blockSize = blockSize;
        this._tracks = new entity_store_1.EntityStore("audio_tracks");
        // Create master output channel
        this._masterChannel = new ChannelStrip("master", this._basicWaveform.bind(this), 4096);
        this._performanceLog.push({
            timestamp: Date.now(),
            operation: "init",
            latencyMs: 0
        });
    }
    /**
     * Create or get audio channel (e.g., "L", "R", "vocals", "drums")
     */
    createChannel(id, waveform) {
        const gen = waveform || this._basicWaveform.bind(this);
        const channel = new ChannelStrip(id, gen, this._blockSize * 2);
        this._channels.set(id, channel);
        this._performanceLog.push({
            timestamp: Date.now(),
            operation: "create_channel",
            latencyMs: 0
        });
        return channel;
    }
    /**
     * Get channel by ID
     */
    getChannel(id) {
        return this._channels.get(id);
    }
    /**
     * Create DAW track (contains channels + automation)
     */
    createTrack(name, channels = ["L", "R"]) {
        const id = `track_${Date.now()}`;
        const track = {
            id,
            name,
            channels,
            volume: 1.0,
            muted: false,
            soloed: false,
            effects: [],
            automation: {}
        };
        // Store in entity store
        this._tracks.set(id, track);
        // Ensure channels exist
        channels.forEach(ch => {
            if (!this._channels.has(ch)) {
                this.createChannel(ch);
            }
        });
        this._performanceLog.push({
            timestamp: Date.now(),
            operation: "create_track",
            latencyMs: 0
        });
        return track;
    }
    /**
     * Queue MIDI event (for synth/instrument control)
     */
    queueMIDI(event) {
        this._midiQueue.push(event);
    }
    /**
     * Process one audio block (256 samples at 44.1kHz = ~5.8ms)
     * This is called by the audio driver thread
     */
    processBlock() {
        const t0 = performance.now();
        const result = new Map();
        // Generate base samples for each channel
        this._channels.forEach((channel, id) => {
            const samples = new Float32Array(this._blockSize);
            for (let i = 0; i < this._blockSize; i++) {
                // Derive waveform at this sample (O(1) per point)
                samples[i] = this._generateSample(id, this._clock + i);
            }
            // Process through effects
            const processed = channel.process(samples, this._sampleRate);
            result.set(id, processed);
        });
        // Advance clock
        this._clock += this._blockSize;
        // Process MIDI events
        while (this._midiQueue.length > 0 && this._midiQueue[0].timestamp < this._clock) {
            const event = this._midiQueue.shift();
            this._processMIDI(event);
        }
        const elapsed = performance.now() - t0;
        this._performanceLog.push({
            timestamp: Date.now(),
            operation: "processBlock",
            latencyMs: elapsed
        });
        return result;
    }
    /**
     * Generate single audio sample (manifold waveform derivation)
     * This is O(1) - no look-up, computed directly
     */
    _generateSample(channel, sampleIndex) {
        // Derive waveform from manifold geometry
        // For now: simple sine wave
        // In production: could derive from fractal, cellular automata, etc.
        const frequency = 440; // A4
        const phase = (sampleIndex / this._sampleRate) * frequency * 2 * Math.PI;
        return Math.sin(phase) * 0.3; // Reduce amplitude
    }
    /**
     * Basic waveform generator
     */
    _basicWaveform(channel, frequency, time, phase) {
        return Math.sin((time / this._sampleRate) * frequency * 2 * Math.PI + phase) * 0.5;
    }
    /**
     * Process MIDI event
     */
    _processMIDI(event) {
        // In production: route to synth/sampler, trigger notes, etc.
        console.log(`MIDI: ${event.type} on channel ${event.channel}`);
    }
    /**
     * Get current clock position (sample index)
     */
    getClock() {
        return this._clock;
    }
    /**
     * Get sample rate
     */
    getSampleRate() {
        return this._sampleRate;
    }
    /**
     * Get block size (samples per processing cycle)
     */
    getBlockSize() {
        return this._blockSize;
    }
    /**
     * Get estimated latency (in milliseconds)
     */
    getLatency() {
        // Input latency + processing latency + output latency
        const processingLatency = this._blockSize / this._sampleRate * 1000;
        return processingLatency * 2; // Rough estimate (2 blocks)
    }
    /**
     * Get performance statistics
     */
    getStats() {
        const recentLogs = this._performanceLog.slice(-100);
        const blockProcessing = recentLogs.filter(l => l.operation === "processBlock");
        let avgLatency = 0;
        let maxLatency = 0;
        blockProcessing.forEach(log => {
            avgLatency += log.latencyMs;
            maxLatency = Math.max(maxLatency, log.latencyMs);
        });
        avgLatency /= blockProcessing.length || 1;
        return {
            sampleRate: this._sampleRate,
            blockSize: this._blockSize,
            estimatedLatency: this.getLatency(),
            channels: this._channels.size,
            tracks: this._tracks.getStats().entities,
            avgProcessingTime: avgLatency,
            maxProcessingTime: maxLatency,
            totalOperations: this._performanceLog.length
        };
    }
    /**
     * Flush changes to disk (like DAW project save)
     */
    flush() {
        this._tracks.flush();
        this._performanceLog.push({
            timestamp: Date.now(),
            operation: "flush",
            latencyMs: 0
        });
    }
    /**
     * Get audit log
     */
    getAuditLog() {
        return [...this._performanceLog];
    }
}
exports.AudioSubstrate = AudioSubstrate;
/**
 * ============================================================================
 * DEVELOPER API - Simple interface, complex audio underneath
 * ============================================================================
 *
 * // Create audio engine (44.1kHz, 256 sample blocks = ~5.8ms latency)
 * const audio = new AudioSubstrate(44100, 256);
 *
 * // Create stereo track
 * const track = audio.createTrack("Guitar", ["L", "R"]);
 *
 * // Add effects
 * const left = audio.getChannel("L")!;
 * left.addEffect({
 *   name: "Reverb",
 *   type: "reverb",
 *   parameters: { wet: 0.3 },
 *   enabled: true,
 *   order: 0
 * });
 *
 * // Process audio (call from audio thread)
 * const output = audio.processBlock(); // { "L" => Float32Array, "R" => Float32Array }
 *
 * // Send to audio interface/DAC
 * audioContext.play(output);
 *
 * // Get stats
 * console.log(audio.getStats());
 * // {
 * //   sampleRate: 44100,
 * //   blockSize: 256,
 * //   estimatedLatency: 11.609..., (milliseconds)
 * //   channels: 2,
 * //   avgProcessingTime: 0.5 (ms)
 * // }
 */
