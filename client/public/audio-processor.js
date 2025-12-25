// AudioWorklet processor for streaming audio to Hume EVI
class AudioStreamProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input.length > 0) {
      const inputChannel = input[0];
      
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex++] = inputChannel[i];
        
        // When buffer is full, send it
        if (this.bufferIndex >= this.bufferSize) {
          // Convert Float32Array to Int16Array
          const int16Data = new Int16Array(this.bufferSize);
          for (let j = 0; j < this.bufferSize; j++) {
            const s = Math.max(-1, Math.min(1, this.buffer[j]));
            int16Data[j] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          
          // Send to main thread
          this.port.postMessage(int16Data.buffer, [int16Data.buffer]);
          
          // Reset buffer
          this.buffer = new Float32Array(this.bufferSize);
          this.bufferIndex = 0;
        }
      }
    }
    
    return true; // Keep processor alive
  }
}

registerProcessor('audio-stream-processor', AudioStreamProcessor);

