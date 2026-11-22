import net from 'net';
import fs from 'fs';
import path from 'path';
import { EscposBuilder } from './escpos';

export type PrinterType = 'network' | 'device' | 'virtual';

export interface PrinterConfig {
  type: PrinterType;
  host?: string;
  port?: number;
  devicePath?: string;
  outputDir?: string;
}

export interface PrinterConnection {
  print(buffer: Buffer): Promise<{ success: boolean; bytesWritten: number; message?: string }>;
  testConnection(): Promise<boolean>;
}

/**
 * TCP Network Thermal Printer Adapter (Epson, TVS-E, Star, Citizen, NGX on port 9100)
 */
export class NetworkPrinter implements PrinterConnection {
  private host: string;
  private port: number;
  private timeoutMs: number;

  constructor(host: string = '192.168.1.200', port: number = 9100, timeoutMs: number = 5000) {
    this.host = host;
    this.port = port;
    this.timeoutMs = timeoutMs;
  }

  async testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(this.timeoutMs);

      socket.connect(this.port, this.host, () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });
  }

  async print(buffer: Buffer): Promise<{ success: boolean; bytesWritten: number; message?: string }> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(this.timeoutMs);

      socket.connect(this.port, this.host, () => {
        socket.write(buffer, (err) => {
          if (err) {
            socket.destroy();
            reject(err);
          } else {
            socket.end();
            resolve({
              success: true,
              bytesWritten: buffer.length,
              message: `Printed ${buffer.length} bytes to ${this.host}:${this.port}`,
            });
          }
        });
      });

      socket.on('error', (err) => {
        socket.destroy();
        reject(new Error(`Network printer error (${this.host}:${this.port}): ${err.message}`));
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error(`Network printer timeout connecting to ${this.host}:${this.port}`));
      });
    });
  }
}

/**
 * Direct Device / USB / Serial Printer Adapter (e.g. /dev/usb/lp0 or COM1)
 */
export class DevicePrinter implements PrinterConnection {
  private devicePath: string;

  constructor(devicePath: string = '/dev/usb/lp0') {
    this.devicePath = devicePath;
  }

  async testConnection(): Promise<boolean> {
    try {
      fs.accessSync(this.devicePath, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  async print(buffer: Buffer): Promise<{ success: boolean; bytesWritten: number; message?: string }> {
    return new Promise((resolve, reject) => {
      fs.writeFile(this.devicePath, buffer, (err) => {
        if (err) {
          reject(new Error(`Failed to write to printer device ${this.devicePath}: ${err.message}`));
        } else {
          resolve({
            success: true,
            bytesWritten: buffer.length,
            message: `Wrote ${buffer.length} bytes to device ${this.devicePath}`,
          });
        }
      });
    });
  }
}

/**
 * Virtual Simulator: Renders thermal receipts directly to console & saves binary/text output
 */
export class VirtualPrinter implements PrinterConnection {
  private outputDir: string;

  constructor(outputDir?: string) {
    this.outputDir = outputDir || path.resolve(process.cwd(), 'print-agent/output');
    try {
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }
    } catch {
      // Ignore directory create error
    }
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  async print(buffer: Buffer): Promise<{ success: boolean; bytesWritten: number; message?: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const binFile = path.join(this.outputDir, `receipt-${timestamp}.bin`);
    const txtFile = path.join(this.outputDir, `receipt-${timestamp}.txt`);

    const ascii = EscposBuilder.renderAsciiSlip(buffer);

    try {
      fs.writeFileSync(binFile, buffer);
      fs.writeFileSync(txtFile, ascii, 'utf8');
    } catch {
      // Continue even if disk write fails
    }

    console.log('\n=================== [ VIRTUAL 80mm THERMAL SLIP ] ===================');
    console.log(ascii);
    console.log('=====================================================================\n');

    return {
      success: true,
      bytesWritten: buffer.length,
      message: `Virtual thermal slip rendered to console and saved to ${txtFile}`,
    };
  }
}

/**
 * Factory to create appropriate printer adapter based on configuration
 */
export function createPrinter(config: PrinterConfig): PrinterConnection {
  switch (config.type) {
    case 'network':
      return new NetworkPrinter(config.host, config.port);
    case 'device':
      return new DevicePrinter(config.devicePath);
    case 'virtual':
    default:
      return new VirtualPrinter(config.outputDir);
  }
}
