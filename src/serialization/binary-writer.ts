/**
 * Growable binary buffer writer for spaceToBinary.
 *
 * Uses a DataView over an ArrayBuffer that doubles in capacity when needed.
 * All multi-byte values are written in little-endian byte order.
 */

const INITIAL_CAPACITY = 4096;

export class BinaryWriter {
  private buf: ArrayBuffer;
  private view: DataView;
  private pos = 0;

  constructor(initialCapacity = INITIAL_CAPACITY) {
    this.buf = new ArrayBuffer(initialCapacity);
    this.view = new DataView(this.buf);
  }

  /** Ensure at least `n` additional bytes can be written. */
  private ensure(n: number): void {
    const needed = this.pos + n;
    if (needed <= this.buf.byteLength) return;
    let cap = this.buf.byteLength;
    while (cap < needed) cap *= 2;
    const next = new ArrayBuffer(cap);
    new Uint8Array(next).set(new Uint8Array(this.buf));
    this.buf = next;
    this.view = new DataView(this.buf);
  }

  writeUint8(v: number): void {
    this.ensure(1);
    this.view.setUint8(this.pos, v);
    this.pos += 1;
  }

  writeUint16(v: number): void {
    this.ensure(2);
    this.view.setUint16(this.pos, v, true);
    this.pos += 2;
  }

  writeUint32(v: number): void {
    this.ensure(4);
    this.view.setUint32(this.pos, v, true);
    this.pos += 4;
  }

  writeInt32(v: number): void {
    this.ensure(4);
    this.view.setInt32(this.pos, v, true);
    this.pos += 4;
  }

  writeFloat64(v: number): void {
    this.ensure(8);
    this.view.setFloat64(this.pos, v, true);
    this.pos += 8;
  }

  writeBool(v: boolean): void {
    this.writeUint8(v ? 1 : 0);
  }

  /** Return a trimmed Uint8Array (no excess capacity). */
  finish(): Uint8Array {
    return new Uint8Array(this.buf, 0, this.pos);
  }
}
