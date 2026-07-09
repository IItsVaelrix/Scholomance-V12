/* tslint:disable */
/* eslint-disable */

/**
 * Browser-facing handle around the pure-Rust engine.
 */
export class ManifoldEngine {
    free(): void;
    [Symbol.dispose](): void;
    lastClipped(): boolean;
    /**
     * Events classified during the most recent `process` call, as JSON.
     */
    lastEvents(): any;
    /**
     * Load a `manifold.bytecode.v1` program from its JSON text.
     */
    loadProgram(json: string): void;
    constructor();
    /**
     * Allocate engine state. Must be called before `process`.
     */
    prepare(sample_rate: number, max_block_size: number, channels: number): void;
    /**
     * Process one block. Returns interleaved stereo `[L0, R0, L1, R1, ...]`.
     * Classified events for this block are available via `lastEvents()`.
     */
    process(in_l: Float32Array, in_r: Float32Array, bpm: number, panic: boolean, freeze: boolean): Float32Array;
}

export function kernelSemver(): string;

export function start(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_manifoldengine_free: (a: number, b: number) => void;
    readonly kernelSemver: () => [number, number];
    readonly manifoldengine_lastClipped: (a: number) => number;
    readonly manifoldengine_lastEvents: (a: number) => any;
    readonly manifoldengine_loadProgram: (a: number, b: number, c: number) => [number, number];
    readonly manifoldengine_new: () => number;
    readonly manifoldengine_prepare: (a: number, b: number, c: number, d: number) => [number, number];
    readonly manifoldengine_process: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
    readonly start: () => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
