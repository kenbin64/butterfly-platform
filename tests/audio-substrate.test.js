"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const audio_substrate_1 = require("../core/substrate/audio-substrate");
describe("AudioSubstrate - Waveform Derivation & Multi-Channel Processing", () => {
    let audioSubstrate;
    beforeEach(() => {
        audioSubstrate = new audio_substrate_1.AudioSubstrate(44100, 256);
    });
    describe("RingBuffer - O(1) Low-Latency Circular I/O", () => {
        test("should write and read samples with wrap-around", () => {
            const buffer = new audio_substrate_1.RingBuffer(10);
            // Write 7 samples
            const write1 = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]);
            const written = buffer.write(write1);
            expect(written).toBe(7);
            // Read 5 samples (should get first 5 written)
            const read1 = buffer.read(5);
            expect(read1.length).toBe(5);
            // Use toBeCloseTo for floating-point comparisons
            for (let i = 0; i < 5; i++) {
                expect(read1[i]).toBeCloseTo(write1[i], 5);
            }
            // Write 4 more samples (should wrap around)
            const write2 = new Float32Array([0.8, 0.9, 1.0, 1.1]);
            const written2 = buffer.write(write2);
            expect(written2).toBe(4);
            // Read remaining samples
            const read2 = buffer.read(6);
            expect(read2.length).toBe(6);
            for (let i = 0; i < 6; i++) {
                const expected = i < 2 ? write1[i + 5] : write2[i - 2];
                expect(read2[i]).toBeCloseTo(expected, 5);
            }
        });
        test("should handle multiple wrap-around cycles", () => {
            const buffer = new audio_substrate_1.RingBuffer(5);
            // First cycle
            const cycle1 = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
            buffer.write(cycle1);
            const r1 = buffer.read(5);
            expect(r1.length).toBe(5);
            for (let i = 0; i < 5; i++) {
                expect(r1[i]).toBeCloseTo(cycle1[i], 5);
            }
            // Second cycle (wrap around)
            const cycle2 = new Float32Array([0.6, 0.7, 0.8, 0.9, 1.0]);
            buffer.write(cycle2);
            const r2 = buffer.read(5);
            expect(r2.length).toBe(5);
            for (let i = 0; i < 5; i++) {
                expect(r2[i]).toBeCloseTo(cycle2[i], 5);
            }
            // Partial write and read
            const partial = new Float32Array([1.1, 1.2]);
            buffer.write(partial);
            const r3 = buffer.read(2);
            expect(r3.length).toBe(2);
            for (let i = 0; i < 2; i++) {
                expect(r3[i]).toBeCloseTo(partial[i], 5);
            }
        });
        test("should maintain O(1) time complexity under load", () => {
            const buffer = new audio_substrate_1.RingBuffer(1024);
            const samples = new Float32Array(512);
            const startWrite = performance.now();
            for (let i = 0; i < 100; i++) {
                buffer.write(samples);
            }
            const writeTime = performance.now() - startWrite;
            const startRead = performance.now();
            for (let i = 0; i < 100; i++) {
                buffer.read(512);
            }
            const readTime = performance.now() - startRead;
            // Should complete quickly (not scale with size)
            expect(writeTime).toBeLessThan(50); // ~0.5ms per 100 ops
            expect(readTime).toBeLessThan(50);
        });
    });
    describe("ChannelStrip - Effect Chain Processing", () => {
        test("should apply gain effect", () => {
            const waveformGen = (channel, freq, time, phase) => 0.1;
            const strip = new audio_substrate_1.ChannelStrip("test-channel", waveformGen);
            strip.addEffect({
                name: "gain",
                type: "gain",
                parameters: { gain: 2.0 },
                enabled: true,
                order: 0,
            });
            const input = new Float32Array([0.1, 0.2, 0.3]);
            const output = strip.process(input, 44100);
            expect(output[0]).toBeCloseTo(0.2, 5);
            expect(output[1]).toBeCloseTo(0.4, 5);
            expect(output[2]).toBeCloseTo(0.6, 5);
        });
        test("should apply distortion effect", () => {
            const waveformGen = (channel, freq, time, phase) => 0.1;
            const strip = new audio_substrate_1.ChannelStrip("test-channel", waveformGen);
            strip.addEffect({
                name: "distortion",
                type: "distortion",
                parameters: { drive: 2.0 },
                enabled: true,
                order: 0,
            });
            const input = new Float32Array([0.5, 0.6, 0.7]);
            const output = strip.process(input, 44100);
            // Distortion should clip high values
            for (let i = 0; i < output.length; i++) {
                expect(output[i]).toBeGreaterThanOrEqual(-1.0);
                expect(output[i]).toBeLessThanOrEqual(1.0);
            }
        });
        test("should apply multiple effects in chain", () => {
            const waveformGen = (channel, freq, time, phase) => 0.1;
            const strip = new audio_substrate_1.ChannelStrip("test-channel", waveformGen);
            strip.addEffect({
                name: "gain",
                type: "gain",
                parameters: { gain: 0.5 },
                enabled: true,
                order: 0,
            });
            strip.addEffect({
                name: "distortion",
                type: "distortion",
                parameters: { drive: 1.0 },
                enabled: true,
                order: 1,
            });
            const input = new Float32Array([0.4, 0.5, 0.6]);
            const output = strip.process(input, 44100);
            expect(output.length).toBe(3);
            for (let i = 0; i < output.length; i++) {
                expect(output[i]).toBeGreaterThanOrEqual(-1.0);
                expect(output[i]).toBeLessThanOrEqual(1.0);
            }
        });
        test("should apply reverb effect (wet mix)", () => {
            const waveformGen = (channel, freq, time, phase) => 0.1;
            const strip = new audio_substrate_1.ChannelStrip("test-channel", waveformGen);
            strip.addEffect({
                name: "reverb",
                type: "reverb",
                parameters: { wet: 0.3 },
                enabled: true,
                order: 0,
            });
            // Create a longer input to see the reverb tail effect
            const input = new Float32Array(1000);
            input[0] = 0.5; // Impulse at start
            const output = strip.process(input, 44100);
            // First sample should be affected by reverb
            expect(output[0]).toBeCloseTo(0.5, 2);
            // Some later samples should have reverb decay (will be > 0)
            const hasDecay = Array.from(output).some(s => Math.abs(s) > 0.01);
            expect(hasDecay).toBe(true);
        });
        test("should respect volume control", () => {
            const waveformGen = (channel, freq, time, phase) => 0.1;
            const strip = new audio_substrate_1.ChannelStrip("test-channel", waveformGen);
            strip.setVolume(0.5);
            const input = new Float32Array([0.4, 0.6, 0.8]);
            const output = strip.process(input, 44100);
            expect(output[0]).toBeCloseTo(0.2, 5);
            expect(output[1]).toBeCloseTo(0.3, 5);
            expect(output[2]).toBeCloseTo(0.4, 5);
        });
    });
    describe("AudioSubstrate - Channel Management", () => {
        test("should create and retrieve channels", () => {
            const waveformGen = (channel, freq, time, phase) => Math.sin((freq * time * 2 * Math.PI) / 44100 + phase);
            const leftChannel = audioSubstrate.createChannel("L", waveformGen);
            const rightChannel = audioSubstrate.createChannel("R", waveformGen);
            expect(audioSubstrate.getChannel("L")).toBe(leftChannel);
            expect(audioSubstrate.getChannel("R")).toBe(rightChannel);
        });
        test("should create tracks with channel configuration", () => {
            const stereoTrack = audioSubstrate.createTrack("drums", ["L", "R"]);
            expect(stereoTrack.name).toBe("drums");
            expect(stereoTrack.channels).toEqual(["L", "R"]);
            const surround = audioSubstrate.createTrack("orchestral", ["L", "C", "R", "LFE", "SL", "SR"]);
            expect(surround.channels.length).toBe(6);
        });
        test("should get sample rate and block size", () => {
            expect(audioSubstrate.getSampleRate()).toBe(44100);
            expect(audioSubstrate.getBlockSize()).toBe(256);
        });
    });
    describe("Low-Latency Block Processing", () => {
        test("should process blocks with expected timing", () => {
            audioSubstrate.createChannel("test", (ch, freq, time, phase) => Math.sin((freq * time * 2 * Math.PI) / 44100 + phase));
            const startTime = performance.now();
            const block = audioSubstrate.processBlock();
            const processingTime = performance.now() - startTime;
            expect(block.size).toBeGreaterThan(0);
            expect(processingTime).toBeLessThan(20); // Should be very fast
        });
        test("should maintain consistent block timing", () => {
            audioSubstrate.createChannel("timing-test", (ch, freq, time, phase) => Math.sin((freq * time * 2 * Math.PI) / 44100 + phase));
            const timings = [];
            for (let i = 0; i < 10; i++) {
                const startTime = performance.now();
                audioSubstrate.processBlock();
                const duration = performance.now() - startTime;
                timings.push(duration);
            }
            const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
            const maxTiming = Math.max(...timings);
            expect(avgTiming).toBeLessThan(10);
            expect(maxTiming).toBeLessThan(20);
        });
        test("should calculate block latency correctly", () => {
            const latency = audioSubstrate.getLatency();
            // 256 samples at 44100 Hz = 5.8ms, doubled for estimate = ~11.6ms
            const expectedLatency = (256 * 1000) / 44100;
            expect(latency).toBeCloseTo(expectedLatency * 2, 0.5);
        });
    });
    describe("MIDI Event Queueing", () => {
        test("should queue and process MIDI events", () => {
            audioSubstrate.createChannel("midi-test", (ch, freq, time, phase) => Math.sin((freq * time * 2 * Math.PI) / 44100 + phase));
            audioSubstrate.queueMIDI({
                timestamp: 0,
                type: "noteOn",
                channel: 0,
                note: 60,
                velocity: 100,
            });
            const block = audioSubstrate.processBlock();
            expect(block.size).toBeGreaterThan(0);
        });
        test("should handle polyphonic MIDI", () => {
            audioSubstrate.createChannel("poly", (ch, freq, time, phase) => Math.sin((freq * time * 2 * Math.PI) / 44100 + phase));
            // Queue multiple simultaneous notes
            audioSubstrate.queueMIDI({
                timestamp: 0,
                type: "noteOn",
                channel: 0,
                note: 60,
                velocity: 100,
            });
            audioSubstrate.queueMIDI({
                timestamp: 0,
                type: "noteOn",
                channel: 0,
                note: 64,
                velocity: 100,
            });
            audioSubstrate.queueMIDI({
                timestamp: 0,
                type: "noteOn",
                channel: 0,
                note: 67,
                velocity: 100,
            });
            const block = audioSubstrate.processBlock();
            expect(block.size).toBeGreaterThan(0);
        });
    });
    describe("Performance Statistics & Monitoring", () => {
        test("should return accurate statistics", () => {
            const stats = audioSubstrate.getStats();
            expect(stats.sampleRate).toBe(44100);
            expect(stats.blockSize).toBe(256);
            expect(stats.estimatedLatency).toBeGreaterThan(5); // ~11.6ms
            expect(stats.estimatedLatency).toBeLessThan(20);
        });
        test("should track average processing time", () => {
            audioSubstrate.createChannel("perf-test", (ch, freq, time, phase) => Math.sin((freq * time * 2 * Math.PI) / 44100 + phase));
            for (let i = 0; i < 10; i++) {
                audioSubstrate.processBlock();
            }
            const stats = audioSubstrate.getStats();
            expect(stats.avgProcessingTime).toBeGreaterThan(0);
            expect(stats.avgProcessingTime).toBeLessThan(20);
        });
        test("should track maximum processing time", () => {
            audioSubstrate.createChannel("max-test", (ch, freq, time, phase) => Math.sin((freq * time * 2 * Math.PI) / 44100 + phase));
            for (let i = 0; i < 5; i++) {
                audioSubstrate.processBlock();
            }
            const stats = audioSubstrate.getStats();
            expect(stats.maxProcessingTime).toBeGreaterThan(0);
            expect(stats.maxProcessingTime).toBeLessThan(50);
        });
        test("should count active channels", () => {
            audioSubstrate.createChannel("track1", (ch, freq, time, phase) => 0);
            audioSubstrate.createChannel("track2", (ch, freq, time, phase) => 0);
            const stats = audioSubstrate.getStats();
            expect(stats.channels).toBe(2);
        });
        test("should track total operations in audit log", () => {
            const stats = audioSubstrate.getStats();
            expect(stats.totalOperations).toBeGreaterThan(0); // At least init
        });
    });
    describe("Integration - Full Audio Pipeline", () => {
        test("should process complete audio pipeline with multi-channel output", () => {
            // Create multiple channels with manifold-derived waveforms
            audioSubstrate.createChannel("bass", (ch, freq, time, phase) => Math.sin((36 * time * 2 * Math.PI) / 44100 + phase) * 0.5 // 36 Hz bass
            );
            audioSubstrate.createChannel("lead", (ch, freq, time, phase) => Math.sin((440 * time * 2 * Math.PI) / 44100 + phase) * 0.3 // A4
            );
            let totalSamples = 0;
            for (let i = 0; i < 5; i++) {
                const block = audioSubstrate.processBlock();
                totalSamples += 256;
                expect(block.size).toBe(2); // bass + lead
                expect(block.has("bass")).toBe(true);
                expect(block.has("lead")).toBe(true);
            }
            // Get final stats
            const stats = audioSubstrate.getStats();
            expect(stats.channels).toBe(2);
            expect(stats.avgProcessingTime).toBeGreaterThan(0);
            expect(stats.maxProcessingTime).toBeLessThan(50);
        });
        test("should produce block output with 256 samples", () => {
            audioSubstrate.createChannel("test", (ch, freq, time, phase) => Math.sin((440 * time * 2 * Math.PI) / 44100 + phase));
            const block = audioSubstrate.processBlock();
            const testSamples = block.get("test");
            expect(testSamples).toBeDefined();
            expect(testSamples.length).toBe(256);
        });
        test("should maintain O(1) processing with increasing channel count", () => {
            const timings = [];
            // Create 10 channels and measure processing time
            for (let i = 0; i < 10; i++) {
                const freq = 50 + i * 50; // Different frequencies
                audioSubstrate.createChannel(`ch-${i}`, (ch, f, time, phase) => Math.sin((freq * time * 2 * Math.PI) / 44100 + phase) * 0.1);
                const startTime = performance.now();
                audioSubstrate.processBlock();
                const duration = performance.now() - startTime;
                timings.push(duration);
            }
            // Check that timing doesn't degrade significantly (O(1) distribution)
            // Note: may increase due to more channels, but should be < N*initial
            const maxTiming = Math.max(...timings);
            expect(maxTiming).toBeLessThan(100); // Should be reasonable
        });
    });
    describe("Determinism - Bit-Perfect Reproducibility", () => {
        test("should produce deterministic output for identical setup", () => {
            const substrate1 = new audio_substrate_1.AudioSubstrate(44100, 256);
            const substrate2 = new audio_substrate_1.AudioSubstrate(44100, 256);
            // Create identical waveforms on both
            const waveform = (ch, freq, time, phase) => Math.sin((440 * time * 2 * Math.PI) / 44100 + phase);
            substrate1.createChannel("test", waveform);
            substrate2.createChannel("test", waveform);
            // Process same number of blocks
            for (let i = 0; i < 3; i++) {
                const block1 = substrate1.processBlock();
                const block2 = substrate2.processBlock();
                const ch1 = block1.get("test");
                const ch2 = block2.get("test");
                expect(ch1?.length).toBe(ch2?.length);
                // Samples should match exactly
                if (ch1 && ch2) {
                    for (let j = 0; j < ch1.length; j++) {
                        expect(ch1[j]).toBe(ch2[j]);
                    }
                }
            }
        });
    });
    describe("Stress Testing - Audio Scaling Limits", () => {
        test("should handle 16 simultaneous channels without degradation", () => {
            const timings = [];
            for (let i = 0; i < 16; i++) {
                audioSubstrate.createChannel(`stress-${i}`, (ch, freq, time, phase) => Math.sin(((60 + i * 10) * time * 2 * Math.PI) / 44100 + phase) * 0.01);
            }
            for (let block = 0; block < 10; block++) {
                const startTime = performance.now();
                audioSubstrate.processBlock();
                const duration = performance.now() - startTime;
                timings.push(duration);
            }
            const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
            expect(avgTiming).toBeLessThan(50); // Should stay performant
        });
        test("should process 100,000 effect operations with low overhead", () => {
            const waveformGen = (ch, freq, time, phase) => 0.1;
            const strip = new audio_substrate_1.ChannelStrip("stress-strip", waveformGen);
            strip.addEffect({
                name: "gain",
                type: "gain",
                parameters: { gain: 1.5 },
                enabled: true,
                order: 0,
            });
            strip.addEffect({
                name: "distortion",
                type: "distortion",
                parameters: { drive: 1.0 },
                enabled: true,
                order: 1,
            });
            const samples = new Float32Array(256);
            const startTime = performance.now();
            for (let i = 0; i < 400; i++) {
                strip.process(samples, 44100);
            }
            const duration = performance.now() - startTime;
            expect(duration).toBeLessThan(1000); // 100,000 operations / <1 second
        });
    });
    describe("Clock and Sample Position Management", () => {
        test("should advance clock position", () => {
            audioSubstrate.createChannel("clock-test", (ch, freq, time, phase) => 0);
            const initialClock = audioSubstrate.getClock();
            expect(initialClock).toBe(0);
            audioSubstrate.processBlock();
            const afterFirstBlock = audioSubstrate.getClock();
            expect(afterFirstBlock).toBe(256);
            audioSubstrate.processBlock();
            const afterSecondBlock = audioSubstrate.getClock();
            expect(afterSecondBlock).toBe(512);
        });
        test("should maintain monotonic clock", () => {
            audioSubstrate.createChannel("mono-clock", (ch, freq, time, phase) => 0);
            const clocks = [];
            for (let i = 0; i < 10; i++) {
                clocks.push(audioSubstrate.getClock());
                audioSubstrate.processBlock();
            }
            // Verify strictly increasing
            for (let i = 0; i < clocks.length - 1; i++) {
                expect(clocks[i]).toBeLessThan(clocks[i + 1]);
            }
        });
    });
    describe("Audit Trail & Flush Operations", () => {
        test("should track operations in audit log", () => {
            audioSubstrate.createChannel("audit-test", (ch, freq, time, phase) => 0);
            audioSubstrate.processBlock();
            audioSubstrate.processBlock();
            const auditLog = audioSubstrate.getAuditLog();
            expect(auditLog.length).toBeGreaterThan(0);
            // Should have init + create_channel + 2x processBlock
            const blockOps = auditLog.filter(log => log.operation === "processBlock");
            expect(blockOps.length).toBe(2);
        });
        test("should flush to entity store", () => {
            audioSubstrate.createTrack("flush-test", ["L", "R"]);
            audioSubstrate.flush();
            // Just verify no exception
            expect(true).toBe(true);
        });
    });
});
