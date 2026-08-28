/**
 * Noise Suppressor AudioWorklet Processor
 *
 * When RNNoise WASM is available it runs ML-based noise suppression.
 * Falls back to a transparent pass-through if WASM hasn't loaded yet,
 * so the processor is always safe to register.
 *
 * RNNoise processes audio in 480-sample frames at 48kHz.
 * We accumulate input, process in chunks, and flush output.
 */

const FRAME_SIZE = 480; // RNNoise native frame size

class NoiseSuppressorProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._enabled = false;
    this._rnnoise = null;      // RNNoise state object (set when WASM loads)
    this._inputBuf = new Float32Array(FRAME_SIZE);
    this._inputFill = 0;
    this._outputQueue = [];   // Float32Array chunks ready to play

    // Listen for control messages from the main thread
    this.port.onmessage = (e) => {
      if (e.data.type === 'enable') {
        this._enabled = e.data.value;
      } else if (e.data.type === 'rnnoise-module') {
        // Receive the initialised RNNoise module from main thread
        try {
          this._rnnoise = e.data.module.newState();
          console.log('[NoiseSuppressor] RNNoise state created');
        } catch (err) {
          console.warn('[NoiseSuppressor] Failed to create RNNoise state:', err);
        }
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0]) return true;

    const inChannel = input[0];
    const outChannel = output[0];

    // Pass-through if disabled or RNNoise not loaded
    if (!this._enabled || !this._rnnoise) {
      outChannel.set(inChannel);
      return true;
    }

    // Buffer input and process in FRAME_SIZE chunks
    let inOffset = 0;
    while (inOffset < inChannel.length) {
      const space = FRAME_SIZE - this._inputFill;
      const toCopy = Math.min(space, inChannel.length - inOffset);
      this._inputBuf.set(inChannel.subarray(inOffset, inOffset + toCopy), this._inputFill);
      this._inputFill += toCopy;
      inOffset += toCopy;

      if (this._inputFill === FRAME_SIZE) {
        // Scale to s16 range that RNNoise expects, process, scale back
        const frame = new Float32Array(FRAME_SIZE);
        for (let i = 0; i < FRAME_SIZE; i++) frame[i] = this._inputBuf[i] * 32768;
        try {
          this._rnnoise.processFrame(frame);
        } catch { /* ignore processing errors — output silence for this frame */ }
        const processed = new Float32Array(FRAME_SIZE);
        for (let i = 0; i < FRAME_SIZE; i++) processed[i] = frame[i] / 32768;
        this._outputQueue.push(processed);
        this._inputFill = 0;
      }
    }

    // Drain output queue into outChannel
    let outOffset = 0;
    while (outOffset < outChannel.length && this._outputQueue.length > 0) {
      const chunk = this._outputQueue[0];
      const toCopy = Math.min(chunk.length, outChannel.length - outOffset);
      outChannel.set(chunk.subarray(0, toCopy), outOffset);
      outOffset += toCopy;
      if (toCopy === chunk.length) {
        this._outputQueue.shift();
      } else {
        this._outputQueue[0] = chunk.subarray(toCopy);
      }
    }

    // If queue was empty, fill remainder with silence
    if (outOffset < outChannel.length) {
      outChannel.fill(0, outOffset);
    }

    return true;
  }
}

registerProcessor('noise-suppressor', NoiseSuppressorProcessor);
