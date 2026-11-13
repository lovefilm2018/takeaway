# AGENTS.md — Seedbox-First Operational Protocol

> **Scope:** Canonical operational rules for `Seedbox-24-7` (`/storage/workspaces/*` and `/storage/services/*`). Global routing & shared path rules live in `~/.gemini/config/GEMINI.md`.

## I. Human-AI Partnership
- **Project Director:** Alex Poxon (strategic vision, credentials, final approval).
- **AI Partner:** Antigravity CLI (clean architecture, error handling, reliability).
- **Direct Communication:** Lead with the answer, followed by concise technical context.

---

## II. Mandatory Rules

### 1. 2-Strike Loop-Breaker (Hard Stop)
If any build, test, deployment, or bugfix fails **2 consecutive times** in a session:
1. **STOP immediately.** Do not attempt a 3rd blind fix.
2. Deliver a concise 3-point debrief: (a) attempted, (b) why it failed, (c) root cause.
3. Prompt Alex to escalate via `/model` to **Gemini 4 Argon** or **Claude**, and reply `"Proceed"`.

### 2. Pre-Execution & Credential Safety
- Summarize destructive migrations, bulk deletions, or core config changes before running.
- Never hardcode API keys, tokens, or passwords in git repos; use `/storage/config/.env` or `.gitignore`.
- Always pass `--no-launch-browser` for CLI/OAuth web auth and print the URL to terminal.

### 3. Telegram Hub Service Reload (Seedbox Local)
When updating `/storage/workspaces/LoveFilm/services/telegram_gateway/` (`context/*.md` or `tools/*.py`):
```bash
cp -r /storage/workspaces/LoveFilm/services/telegram_gateway/context/* /storage/services/telegram_gateway/context/
cp -r /storage/workspaces/LoveFilm/services/telegram_gateway/tools/* /storage/services/telegram_gateway/tools/
pkill -f '[b]ot.py'; nohup python3 /storage/services/telegram_gateway/bot.py >/storage/services/telegram_gateway/bot.log 2>&1 </dev/null & disown
```

### 4. Spoxify Deployment
Never use manual `scp`/`ssh` shortcuts; run `python3 spoxify/deploy.py --seedbox-only` (or copy synced files to `/storage/services/spoxify/` and run `/storage/services/spoxify/start.sh`).

### 5. Gmail & Google Drive
- **Interactive Sessions:** Use Antigravity Connected Apps (`Google Drive`, `Google Sheets`) where appropriate.
- **Gmail Drafts (Drafts only, never auto-send):** `python3 /storage/workspaces/LoveFilm/services/gmail_inbox.py <search|thread|read|reply> ...`
- **Service Account (Reports/Docs):** `/storage/services/telegram_gateway/service_account.json`.

---

## III. Streamlined Session Lifecycle (Zero-Token Hooks + 1-Call Wrap-Up)

### 1. Session Startup
- Do **not** run speculative `git pull` or bulk directory scans unless needed for the task.
- Use `SERVICE_REGISTRY.json` / `GEMINI.md` Feature IDs (`LF-01`, `TB-01`, etc.) to jump straight to target files.

### 2. Per-Task Audit Logging (Automatic)
- Handled automatically at **0 AI tokens** by the native AGY `Stop` hook (`~/.gemini/config/hooks.json` -> `/storage/workspaces/AI_Usage_Audit/buffer_task_hook.py`).

### 3. Session Wrap-Up Protocol (Trigger: `"That's a wrap"`)
When Alex says **"That's a wrap"**:
1. **Sync Docs (if features/routes changed):** Update `GEMINI.md` and `/storage/workspaces/LoveFilm/SERVICE_REGISTRY.json` (then run `python3 /storage/workspaces/LoveFilm/services/build_architecture_hub.py` — live immediately at `https://radio.lovefilm.info/hub`).
2. **One-Call Wrap-Up:** Run:
   ```bash
   python3 /storage/services/wrap_session.py "<ProjectName>" "<Concise Session Summary>"
   ```
   *(This single script stages, commits, pushes to GitHub, flushes all buffered tasks + `SESSION_CLOSE` to `AI_Usage_Audit`, and prints a clean status report).*
3. **Executive Recap:** Present a concise summary of achievements and verified system status.
