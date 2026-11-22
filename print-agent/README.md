# TableQR Local Auto-Print Agent (ESC/POS)

A lightweight Node.js daemon that connects directly to 80mm thermal receipt printers over **Ethernet/WiFi (TCP 9100)** or **USB/Serial (`/dev/usb/lp0`)**, polls the TableQR SaaS API, and automatically prints Kitchen Order Tickets (KOT) and Customer Bills the instant they are placed.

---

## 1. Supported Thermal Hardware

Compatible with standard 80mm (72mm printable / 48 column) thermal receipt printers:
- **Epson**: TM-T82, TM-T82II, TM-T88IV, TM-T88V, TM-T88VI
- **TVS-E**: RP-3150, RP-3200 Star, RP-45 Shoppe
- **Star Micronics**: TSP100, TSP143, TSP650
- **NGX / Citizen / Posiflex / Bixolon**: All standard ESC/POS models
- **Generic 80mm USB / LAN POS Printers**: Any printer supporting standard ESC/POS protocol (`0x1B`, `0x1D`).

---

## 2. Quick Start

### A. Zero-Hardware Simulation Mode
Test the agent without any physical printer attached. It will render 80mm ASCII receipts formatted to 48 columns directly to your terminal and save binary `.bin` and text `.txt` files to `print-agent/output/`:

```bash
cd print-agent
npm install
npm run simulate
```

### B. Network / WiFi Thermal Printer (Recommended for Kitchens)
Connect your printer via Ethernet cable or WiFi to the cafe router.

1. **Find Printer IP**: Turn the printer OFF, hold down the `FEED` button, and turn the printer ON. Release `FEED` after 2 seconds. The printer will print a self-test slip showing its IP address (e.g. `192.168.1.200`).
2. **Configure `.env`**:
   ```env
   TABLEQR_SERVER_URL=http://localhost:3001
   TABLEQR_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
   TABLEQR_AGENT_SECRET=tableqr-agent-secret-demo
   PRINTER_TYPE=network
   PRINTER_HOST=192.168.1.200
   PRINTER_PORT=9100
   POLL_INTERVAL_MS=3000
   ```
3. **Start Agent**:
   ```bash
   npm start
   ```

### C. USB Thermal Printer
Plug the printer into the POS counter PC or Raspberry Pi via USB.

1. **Linux / Raspberry Pi**:
   Check the printer device path:
   ```bash
   ls -la /dev/usb/lp*
   # Ensure user has read/write permissions
   sudo usermod -a -G lp $USER
   sudo chmod 666 /dev/usb/lp0
   ```
2. **Configure `.env`**:
   ```env
   PRINTER_TYPE=device
   PRINTER_PATH=/dev/usb/lp0
   ```
3. **Start Agent**:
   ```bash
   npm start
   ```

---

## 3. Running as a 24/7 Background Service

### With PM2 (Recommended)
```bash
npm install -g pm2
pm2 start src/index.ts --name "tableqr-printer" --interpreter tsx
pm2 save
pm2 startup
```

### With Systemd (Ubuntu / Debian / Raspberry Pi OS)
Create `/etc/systemd/system/tableqr-printer.service`:
```ini
[Unit]
Description=TableQR Local ESC/POS Print Agent
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/opt/tableqr/print-agent
ExecStart=/usr/bin/npx tsx src/index.ts
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```
Enable and start:
```bash
sudo systemctl enable tableqr-printer
sudo systemctl start tableqr-printer
sudo systemctl status tableqr-printer
```

---

## 4. ESC/POS Features Implemented

| Feature | ESC/POS Code | Purpose |
|---------|--------------|---------|
| **Table & Order Numbers** | `GS ! 0x11` / `0x01` | Double-height / double-size text for high kitchen visibility |
| **Cooking Requests** | `GS B 0x01` | Inverted white-on-black printing for special dietary or chef alerts |
| **Dashed Cut Lines** | `0x2D` + `0x0A` | Clean separation between items and totals |
| **Paper Cut** | `GS V 0x42 0x00` | Full or partial automatic paper cutting |
| **Cash Drawer Kick** | `ESC p 0 25 250` | Pops open the cash register drawer upon bill print |
| **Two-Column Alignment** | 48-char pad | Clean alignment of quantities, items, and INR prices |

---

## 5. Security & Isolation

- **API Token Authentication**: Each request requires `x-agent-secret` matching `PRINT_AGENT_SECRET`.
- **Tenant Isolation**: Every print job is strictly filtered by `restaurant_id`.
- **Deduplication**: Once printed, the agent calls `/api/print/jobs/[id]/ack`, writing an audit record so tickets are never printed twice.
