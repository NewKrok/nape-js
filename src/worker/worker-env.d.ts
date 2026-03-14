/**
 * Minimal DOM/Worker type declarations for the worker sub-package.
 *
 * The main nape-js library deliberately excludes "dom" from `lib` to enforce
 * zero DOM dependencies.  These declarations cover only the Web Worker and
 * Blob APIs needed by PhysicsWorkerManager.
 */

declare class Worker {
  constructor(url: string | URL, options?: { type?: string });
  postMessage(message: any, transfer?: Transferable[]): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<any>) => void) | null;
  addEventListener(type: string, listener: (event: MessageEvent<any>) => void): void;
  removeEventListener(type: string, listener: (event: MessageEvent<any>) => void): void;
}

declare class Blob {
  constructor(parts: BlobPart[], options?: { type?: string });
}

type BlobPart = string | ArrayBuffer | ArrayBufferView | Blob;

interface MessageEvent<T = any> {
  readonly data: T;
}

declare const URL: {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
};
