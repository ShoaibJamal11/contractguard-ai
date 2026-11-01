# ContractGuard AI

AI-powered contract risk analysis for legal teams. Upload a PDF contract, and an n8n workflow sends it to Groq's LLM for automated risk assessment — surfacing risk level, flagged clauses, and actionable recommendations in a sleek dashboard.

Built with **Next.js 16**, **Tailwind CSS v4**, **n8n**, and **Groq**.

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook-test/<your-webhook-id>
N8N_WEBHOOK_SECRET=          # optional — only if you set Header Auth in n8n
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

---

## n8n Workflow Setup

The repository includes the full n8n workflow at [`n8n-workflow.json`](./n8n-workflow.json).

### Pipeline overview

```
Webhook (POST, multipart/form-data)
  → Extract from File (PDF → text)
  → HTTP Request (Groq LLM — contract risk analysis)
  → Respond to Webhook (returns JSON)
```

### Import into n8n

1. Open your n8n instance (default: `http://localhost:5678`).
2. Click **Add workflow** → **Import from file**.
3. Select `n8n-workflow.json` from this repo.
4. The workflow will appear with 4 nodes: **Webhook → Extract from File → HTTP Request → Respond to Webhook**.

### Add your Groq API key

1. In the imported workflow, open the **HTTP Request** node.
2. Under **Header Parameters**, find the `Authorization` header — it currently reads `Bearer YOUR_GROQ_API_KEY_HERE`.
3. Replace `YOUR_GROQ_API_KEY_HERE` with your actual Groq API key (starts with `gsk_`).
   - Get one free at [console.groq.com/keys](https://console.groq.com/keys).
4. Save the node.

### Link the Webhook URL

1. In n8n, open the **Webhook** node and copy the **Test URL** (or **Production URL**).
   - Test URL looks like: `http://localhost:5678/webhook-test/<id>`
   - Production URL looks like: `http://localhost:5678/webhook/<id>`
2. Paste it into your `.env.local`:
   ```env
   N8N_WEBHOOK_URL=http://localhost:5678/webhook-test/3728bd23-ebae-4925-abc1-0ca972b13cb3
   ```
3. Restart the Next.js dev server (`npm run dev`).

### Test it

1. Make sure the n8n workflow is **active** (toggle on).
2. Open the dashboard at `http://localhost:3000`.
3. Drop a PDF into the upload zone — you should see the AI analysis result appear in the contract drawer.

---

## Project Structure

```
contractguard-ai/
├── app/
│   ├── api/analyze/route.ts   # POST endpoint — validates PDF, forwards to n8n
│   ├── contracts/page.tsx     # Contracts library (placeholder)
│   ├── reports/page.tsx       # Reports & analytics (placeholder)
│   ├── settings/page.tsx      # Settings (placeholder)
│   ├── globals.css            # Design tokens & animations
│   ├── layout.tsx             # Root layout with AppShell
│   └── page.tsx               # Dashboard — upload, table, drawer, toasts
├── components/
│   ├── AppShell.tsx           # Sidebar + mobile nav shell
│   ├── ContractDrawer.tsx     # Slide-over detail drawer
│   ├── ContractsTable.tsx     # Contracts data table
│   ├── RiskBadge.tsx          # Risk level badge (High/Medium/Low/Pending)
│   ├── Sidebar.tsx            # Collapsible sidebar navigation
│   ├── StatCard.tsx           # KPI stat cards
│   ├── Toast.tsx              # Toast notifications
│   └── UploadZone.tsx         # Drag-and-drop PDF upload
├── data/
│   └── mock-contracts.ts      # Sample data for development
├── types/
│   └── contract.ts            # Shared TypeScript types
├── n8n-workflow.json          # Importable n8n workflow (sanitized)
├── .env.example               # Environment variable template
└── package.json
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |
| Icons | Lucide React |
| File upload | react-dropzone |
| AI backend | n8n workflow → Groq API (allam-2-7b) |
| Language | TypeScript |

---

## License

Private — not open source.
