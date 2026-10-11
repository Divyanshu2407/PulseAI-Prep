class LiveAudioCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pending = new Float32Array(1600);
    this.offset = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel?.length) {
      let readOffset = 0;
      while (readOffset < channel.length) {
        const count = Math.min(this.pending.length - this.offset, channel.length - readOffset);
        this.pending.set(channel.subarray(readOffset, readOffset + count), this.offset);
        this.offset += count;
        readOffset += count;
        if (this.offset === this.pending.length) {
          const chunk = this.pending;
          this.pending = new Float32Array(1600);
          this.offset = 0;
          this.port.postMessage(chunk, [chunk.buffer]);
        }
      }
    }
    return true;
  }
}

registerProcessor("live-audio-capture", LiveAudioCapture);
