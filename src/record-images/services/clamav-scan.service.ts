import { Injectable } from '@nestjs/common';
import * as net from 'net';

interface ScanResult {
  ok: boolean;
  found?: string;
  raw: string;
}

@Injectable()
export class ClamavScanService {
  private host = process.env.CLAMAV_HOST || 'clamav';
  private port = Number(process.env.CLAMAV_PORT || 3310);
  private timeoutMs = Number(process.env.CLAMAV_TIMEOUT_MS || 15000);
  private chunkSize = 64 * 1024;

  async ping(): Promise<boolean> {
    const res = await this.sendSimple('PING\n');
    return res.trim() === 'PONG';
  }

  async version(): Promise<string> {
    return this.sendSimple('VERSION\n');
  }

  private sendSimple(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port });
      let data = '';
      let done = false;

      const cleanUp = (err?: Error) => {
        if (done) return;
        done = true;
        socket.destroy();
        err ? reject(err) : resolve(data);
      };

      socket.setTimeout(this.timeoutMs, () => cleanUp(new Error('clamd timeout')));
      socket.on('connect', () => socket.write(cmd));
      socket.on('data', (buf) => (data += buf.toString('utf8')));
      socket.on('error', (e) => cleanUp(e));
      socket.on('close', () => cleanUp());
    });
  }

  async scanStream(readable: NodeJS.ReadableStream): Promise<ScanResult> {
    return new Promise<ScanResult>((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port });
      let response = '';
      let finished = false;

      const cleanup = (err?: Error) => {
        if (finished) return;
        finished = true;
        socket.destroy();
        if (err) reject(err);
      };

      const endWithResponse = () => {
        const raw = response.trim();
        const foundMatch = raw.match(/stream:\s*(.+)\s+FOUND/i);
        const ok = /stream:\s*OK/i.test(raw);
        if (foundMatch) resolve({ ok: false, found: foundMatch[1], raw });
        else if (ok) resolve({ ok: true, raw });
        else resolve({ ok: false, raw });
      };

      socket.setTimeout(this.timeoutMs, () => cleanup(new Error('clamd timeout')));
      socket.on('error', cleanup);
      socket.on('data', (buf) => (response += buf.toString('utf8')));
      socket.on('close', () => {
        if (!finished) {
          finished = true;
          endWithResponse();
        }
      });

      socket.on('connect', () => {
        socket.write('zINSTREAM\0');
        readable.on('data', (chunk: Buffer) => {
          for (let offset = 0; offset < chunk.length; offset += this.chunkSize) {
            const slice = chunk.subarray(offset, Math.min(offset + this.chunkSize, chunk.length));
            const size = Buffer.alloc(4);
            size.writeUInt32BE(slice.length, 0);
            socket.write(size);
            socket.write(slice);
          }
        });
        readable.on('end', () => {
          const zero = Buffer.alloc(4);
          zero.writeUInt32BE(0, 0);
          socket.write(zero);
        });
        readable.on('error', (e) => cleanup(e));
      });
    });
  }
}
