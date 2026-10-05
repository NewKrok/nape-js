/**
 * Binary buffer reader for spaceFromBinary.
 *
 * Reads values written by BinaryWriter in little-endian byte order.
 */

export class BinaryReader {
  private readonly view: DataView;
  private pos = 0;

  constructor(data: Uint8Array) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  readUint8(): number {
    const v = this.view.getUint8(this.pos);
    this.pos += 1;
    return v;
  }

  readUint16(): number {
    const v = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return v;
  }

  readUint32(): number {
    const v = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return v;
  }

  readInt32(): number {
    const v = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return v;
  }

  readFloat64(): number {
    const v = this.view.getFloat64(this.pos, true);
    this.pos += 8;
    return v;
  }

  readBool(): boolean {
    return this.readUint8() !== 0;
  }

  /** UTF-8 string written by BinaryWriter.writeString. */
  readString(): string {
    const len = this.readUint32();
    if (this.pos + len > this.view.byteLength) {
      throw new Error("nape-js binary: string runs past the end of the snapshot");
    }
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.pos, len);
    this.pos += len;
    return new TextDecoder().decode(bytes);
  }
}
