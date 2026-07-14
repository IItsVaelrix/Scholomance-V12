export class GraphicForgePipeline {
  constructor(microprocessors = []) {
    this.microprocessors = microprocessors;
  }

  add(processor) {
    this.microprocessors.push(processor);
    return this;
  }

  run(intent) {
    let state = {
      width: intent.width || 32,
      height: intent.height || 32,
      seeds: intent.baseSeeds || [],
      field: null,
      pixels: null
    };

    // startTime carries whatever the intent declares and NOTHING else. It used
    // to fall back to a wall-clock read, which handed the current time to every
    // microprocessor in a pipeline whose whole contract is that the same intent
    // renders the same pixels. Nothing reads startTime today, so the clock was
    // buying nothing and risking everything: the first processor to use it would
    // have made the forge silently non-reproducible. An intent that wants a
    // timestamp must supply one, and is then deterministic in that timestamp.
    const context = { startTime: Number.isFinite(intent.timestamp) ? intent.timestamp : null };

    for (const processor of this.microprocessors) {
      state = processor.run({ intent, input: state, context });
    }

    return state;
  }
}
