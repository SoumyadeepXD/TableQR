/**
 * TableQR Local Auto-Print Agent Daemon
 * 
 * Runs locally on restaurant POS terminal, kitchen display PC, or Raspberry Pi.
 * Connects to ESC/POS 80mm thermal printers over Network (TCP 9100) or USB device,
 * polls TableQR API for new orders, and prints tickets the moment they arrive.
 */

import fs from 'fs';
import path from 'path';
import { EscposBuilder, KotPrintPayload, BillPrintPayload } from './escpos';
import { createPrinter, PrinterConfig, PrinterType } from './printer';

// Load .env / .env.local without external dependencies
function loadEnvSafe(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(filePath);
      } else {
        const lines = fs.readFileSync(filePath, 'utf8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const idx = trimmed.indexOf('=');
            const key = trimmed.substring(0, idx).trim();
            const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      }
    }
  } catch {
    // Ignore env load errors
  }
}

loadEnvSafe(path.resolve(process.cwd(), '.env'));
loadEnvSafe(path.resolve(process.cwd(), '.env.local'));
loadEnvSafe(path.resolve(process.cwd(), '../.env.local'));

// Configuration
const SERVER_URL = process.env.TABLEQR_SERVER_URL || process.env.SERVER_URL || 'http://localhost:3001';
const RESTAURANT_ID = process.env.TABLEQR_RESTAURANT_ID || process.env.RESTAURANT_ID || '11111111-1111-1111-1111-111111111111';
const AGENT_SECRET = process.env.TABLEQR_AGENT_SECRET || process.env.PRINT_AGENT_SECRET || 'tableqr-agent-secret-demo';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '3000', 10);

// CLI args override
const args = process.argv.slice(2);
const isSimulate = args.includes('--simulate') || args.some((a) => a.includes('--type=virtual'));

const printerConfig: PrinterConfig = {
  type: isSimulate ? 'virtual' : ((process.env.PRINTER_TYPE || 'virtual') as PrinterType),
  host: process.env.PRINTER_HOST || '192.168.1.200',
  port: parseInt(process.env.PRINTER_PORT || '9100', 10),
  devicePath: process.env.PRINTER_PATH || '/dev/usb/lp0',
};

const printer = createPrinter(printerConfig);

let isRunning = true;
let pollTimer: NodeJS.Timeout | null = null;
let lastPolledTimestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString();

console.log('================================================================');
console.log('           TABLEQR LOCAL ESC/POS AUTO-PRINT AGENT              ');
console.log('================================================================');
console.log(`Server URL      : ${SERVER_URL}`);
console.log(`Restaurant ID   : ${RESTAURANT_ID}`);
console.log(`Printer Mode    : ${printerConfig.type.toUpperCase()}`);
if (printerConfig.type === 'network') {
  console.log(`Printer Target  : ${printerConfig.host}:${printerConfig.port}`);
} else if (printerConfig.type === 'device') {
  console.log(`Printer Device  : ${printerConfig.devicePath}`);
} else {
  console.log(`Virtual Output  : Console & print-agent/output/`);
}
console.log(`Polling Interval: ${POLL_INTERVAL_MS}ms`);
console.log('----------------------------------------------------------------');

/**
 * Sends acknowledgment back to the server after printing
 */
async function acknowledgeJob(jobId: string, success: boolean, errorMessage?: string) {
  try {
    const ackUrl = `${SERVER_URL}/api/print/jobs/${encodeURIComponent(jobId)}/ack`;
    const res = await fetch(ackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-secret': AGENT_SECRET,
        'x-restaurant-id': RESTAURANT_ID,
      },
      body: JSON.stringify({
        success,
        printerType: printerConfig.type,
        errorMessage,
      }),
    });

    if (!res.ok) {
      console.warn(`[WARN] Failed to acknowledge job ${jobId} (HTTP ${res.status})`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[WARN] Error sending ACK for ${jobId}: ${msg}`);
  }
}

/**
 * Processes a single print job
 */
async function processJob(job: Record<string, unknown>) {
  const jobId = String(job.id || '');
  const jobType = String(job.type || 'kot');

  console.log(`\n🖨️  [JOB RECEIVED] Processing ${jobType.toUpperCase()} Job: ${jobId}`);

  try {
    let rawBuffer: Buffer;

    if (jobType === 'bill') {
      const billData = job as unknown as BillPrintPayload;
      rawBuffer = EscposBuilder.buildBill(billData);
    } else {
      const kotData = job as unknown as KotPrintPayload;
      rawBuffer = EscposBuilder.buildKot(kotData);
    }

    // Send ESC/POS binary stream to printer
    const printResult = await printer.print(rawBuffer);

    console.log(`✅ [SUCCESS] Ticket printed successfully! (${printResult.bytesWritten} bytes)`);
    await acknowledgeJob(jobId, true);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ [ERROR] Failed to print job ${jobId}: ${errorMsg}`);
    await acknowledgeJob(jobId, false, errorMsg);
  }
}

/**
 * Main polling cycle
 */
async function pollPrintJobs() {
  if (!isRunning) return;

  try {
    const pollUrl = `${SERVER_URL}/api/print/jobs?since=${encodeURIComponent(lastPolledTimestamp)}`;
    const res = await fetch(pollUrl, {
      headers: {
        'x-agent-secret': AGENT_SECRET,
        'x-restaurant-id': RESTAURANT_ID,
      },
    });

    if (res.ok) {
      const data = await res.json();
      const jobs: Record<string, unknown>[] = data.jobs || [];

      if (jobs.length > 0) {
        console.log(`[INFO] Found ${jobs.length} pending ticket(s) to print.`);
        for (const job of jobs) {
          await processJob(job);
        }
      }

      if (data.serverTime) {
        lastPolledTimestamp = data.serverTime;
      }
    } else if (res.status === 401) {
      console.error(`[AUTH] 401 Unauthorized - Check your AGENT_SECRET setting.`);
    }
  } catch (err: unknown) {
    // Network or server temporarily unreachable
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('ECONNREFUSED')) {
      console.warn(`[POLL WARNING] ${msg}`);
    }
  } finally {
    if (isRunning) {
      pollTimer = setTimeout(pollPrintJobs, POLL_INTERVAL_MS);
    }
  }
}

// Start polling
pollPrintJobs();

// Graceful termination
const shutdown = () => {
  console.log('\n[AGENT] Stopping TableQR Print Agent...');
  isRunning = false;
  if (pollTimer) clearTimeout(pollTimer);
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
