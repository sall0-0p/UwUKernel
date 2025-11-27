export class BinaryWriter {
    private data: string[] = [];

    public writeByte(val: number) {
        this.data.push(string.char(Math.floor(val) % 256));
    }

    public writeUInt16(val: number) {
        val = Math.floor(val);
        this.writeByte(val >> 8);
        this.writeByte(val);
    }

    public writeUInt32(val: number) {
        val = Math.floor(val);
        this.writeByte(val >> 24);
        this.writeByte(val >> 16);
        this.writeByte(val >> 8);
        this.writeByte(val);
    }

    public writeString(str: string) {
        this.writeUInt16(str.length);
        for (let i = 0; i < str.length; i++) {
            this.writeByte(str.charCodeAt(i));
        }
    }

    public writeDouble(val: number) {
        const packed = string.pack(">d", val);
        this.data.push(packed);
    }

    public getBuffer(): string {
        return this.data.join("");
    }
}

export class BinaryReader {
    private index: number = 1; // Lua is 1-indexed for string methods

    constructor(private buffer: string) {}

    public hasMore(): boolean {
        return this.index <= this.buffer.length;
    }

    public readByte(): number {
        const byte = this.buffer.charCodeAt(this.index - 1);
        this.index++;
        return byte;
    }

    public readUInt16(): number {
        const b1 = this.readByte();
        const b2 = this.readByte();
        return (b1 << 8) | b2;
    }

    public readUInt32(): number {
        const b1 = this.readByte();
        const b2 = this.readByte();
        const b3 = this.readByte();
        const b4 = this.readByte();
        return (b1 << 24) | (b2 << 16) | (b3 << 8) | b4;
    }

    public readString(): string {
        const len = this.readUInt16();
        const str = this.buffer.substring(this.index - 1, this.index - 1 + len);
        this.index += len;
        return str;
    }

    public readDouble(): number {
        const size = 8;
        const sub = this.buffer.substring(this.index - 1, this.index - 1 + size);
        this.index += size;
        const [val] = string.unpack(">d", sub);
        return val;
    }
}