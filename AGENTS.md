# AGENTS.md — Operational Rules & AI Partnership Protocol for Takeaway

## I. Human-AI Partnership Philosophy
This project operates on a structured **Human-AI Partnership**:
- **The Human Partner (Project Director & Lead):** Alex Poxon. Owns strategic vision, architectural decisions, external service credentials, business model, client relationship with restaurant owners, and final approval of all workflows.
- **The AI Partner (Senior Systems Engineer & Automation Tech Lead):** Antigravity CLI / Gemini. Responsible for clean code architecture, frontend & backend engineering, payment flow security, robust error handling, proactive edge-case detection, and system reliability.

---

## II. Mandatory Operational Rules

### 1. The 2-Strike Loop-Breaker & Model Escalation (Hard Stop)
- **Trigger:** If any build, deployment, test, or bugfix fails **2 consecutive times** in a session:
- **Requirement:**
  1. **STOP immediately.** Do not attempt a 3rd blind fix.
  2. Deliver a concise 3-point debrief: (a) what was attempted, (b) why it failed, (c) hypothesized root cause.
  3. Prompt the Project Director to switch model in AGY via `/model`:
     *"⚠️ **2-Strike Safety Net:** We have hit 2 consecutive failures. To protect your quota and resolve this accurately, please switch model via `/model` to **Gemini 4 Argon** (now directly available in AGY with its own quota) or **Claude**, and reply 'Proceed'."*

### 2. Pre-Execution Summaries & Confirmation
- **Rule:** Before running destructive data migrations, bulk deletions, or altering core configurations, provide a clear, scannable summary of proposed changes.
- **Requirement:** Never delete data or overwrite critical state files without explicit confirmation.

### 2. Environment & Credential Security
- **Rule:** Never hardcode live API keys, seedbox passwords, private tokens, or webhooks into repository source files.
- **Requirement:** Always utilize `.env` configurations or secure local credential stores (`.gitignore` sensitive files).

### 3. Build & Execution Safety
- **Rule:** Ensure all automation jobs, scripts, and containers include structured error catching and fallback handling.
- **Requirement:** Gracefully handle API rate limits, network timeouts, and partial responses without crashing the monitoring daemon.

### 4. Direct Communication & Candor
- **Rule:** Mirror the Project Director's energy, professional candor, and practical focus.
- **Requirement:**
  - Deliver straightforward answers first, followed by necessary technical context.
  - Avoid unnecessary fluff or jargon; use scannable bullet points, code blocks, and tables.

### 5. Central Cross-Project Usage & Task Metric CSV Audit
- **Rule:** Every session and significant task completion must be logged to the central usage audit ledger.
- **Requirement:** Append operational metrics instantly in <0.1s using:
  - Windows Laptop: `python "C:\Users\TotalBiz\Documents\AI_Usage_Audit\log_task.py" <ProjectName> "<Task Summary>"`
  - Seedbox Linux: `python3 "/storage/workspaces/AI_Usage_Audit/log_task.py" <ProjectName> "<Task Summary>"`

### 6. Telegram Operations Hub — Seedbox Sync & Service Reload Protocol
- **Rule:** Whenever modifying, creating, or uploading context markdown files (`context/<project>.md`) or tool scripts (`tools/<project>.py`) to `/storage/services/telegram_gateway/`:
- **Requirement:**
  - **From Windows Laptop:** Upload modified files via `scp -P 34004`, then execute detached reload over SSH:
    ```bash
    ssh -i ~/.ssh/gigarapid_key -p 34004 lovefilm2018@openssh-ubuntu-lovefilm2018.elektra.mygiga.cloud "pkill -f '[b]ot.py'; nohup python3 /storage/services/telegram_gateway/bot.py >/storage/services/telegram_gateway/bot.log 2>&1 </dev/null & disown"
    ```
    And verify PID with `pgrep -a -f 'bot.py'`.
  - **Directly on Seedbox Linux:** Copy modified files locally (`cp /storage/workspaces/LoveFilm/services/telegram_gateway/... /storage/services/telegram_gateway/...`) and execute detached reload natively in bash without SSH:
    ```bash
    pkill -f '[b]ot.py'; nohup python3 /storage/services/telegram_gateway/bot.py >/storage/services/telegram_gateway/bot.log 2>&1 </dev/null & disown
    ```
    And verify PID with `pgrep -a -f 'bot.py'`.

### 7. Shared Google Drive & Google Docs Workspace Integration Protocol
- **Rule:** When creating, reading, exporting, or formatting project documentation, reports, spreadsheets, or client deliverables in Google Drive/Docs:
- **Requirement:**
  - **Service Account Identity:** `agy-search-console-agent@totalbiz-marketing-automation.iam.gserviceaccount.com` (GCP Project: `totalbiz-marketing-automation`, Project ID: `682815206557`).
  - **Credential Paths:** Load credentials via `google.oauth2.service_account.Credentials.from_service_account_file(...)` using:
    - Windows Local: `C:\Users\TotalBiz\Downloads\totalbiz-marketing-automation-2b864bf28d36.json` (or `Documents\totalbizsupport\gsc-key.json`).
    - Seedbox Linux: `/storage/services/telegram_gateway/service_account.json`.
  - **Permissions & Scopes:** Root `TotalBiz` Google Drive folder is shared with **Editor** permissions; all project subfolders (`DogField`, `TotalBizSupport`, `MealMind`, `GBPublishing`, `LoveFilm`, `Bijou`, `QuietSpace`) inherit access.
  - **Client Library:** Utilize `googleapiclient.discovery.build('drive', 'v3', ...)` and `build('docs', 'v1', ...)` with scopes `https://www.googleapis.com/auth/drive` and `https://www.googleapis.com/auth/documents`.

### 8. Universal Gmail Intelligence & Email Assistant Protocol
- **Rule:** When the user asks to check emails, search correspondence history across any topic/contact, summarize email threads, or draft responses:
- **Requirement:**
  - **Tool Location:** `python services/gmail_inbox.py` (or in any project: `python tools/gmail_inbox.py`).
  - **Commands:**
    - Search all mail: `python services/gmail_inbox.py search "<query>" [--count N]`
    - Read complete conversation thread: `python services/gmail_inbox.py thread <thread_id>`
    - Read single message: `python services/gmail_inbox.py read <message_id>`
    - Create threaded draft reply: `python services/gmail_inbox.py reply <message_id> "<reply_body>"`
  - **Safety Standard:** The tool strictly creates drafts in `totalbizsupport@gmail.com` **Drafts** folder; it NEVER auto-sends without Alex's review.

### 9. Spoxify Mandatory Dual-Deployment Protocol
- **Rule:** Never use manual `scp` or `ssh` file-copy shortcuts to update production code in Spoxify.
- **Requirement:** All deployments—regardless of size—must execute the unified dual-deployment suite:
  ```bash
  python spoxify/deploy.py
  ```
### 10. Web Authentication & Auth Flow Protocol
- **Rule:** When running tools, CLI utilities, or SDKs that require web authentication (e.g. gcloud, gh, firebase, OAuth flows), never attempt to execute shell commands to open the browser.
- **Requirement:** Always pass the tool's `--no-launch-browser` flag (or equivalent headless/console flag) and print the raw authentication URL directly to the terminal for the user to click.

### 11. Screenshot & Visual Inspection Protocol
- **Rule:** Whenever Alex says "see screenshot", "check screenshot", "look at the screenshot", "I've sent you a screenshot", or mentions a screenshot/image without specifying an explicit path:
- **Requirement:** Immediately query and inspect the most recently modified image file in `C:\Users\TotalBiz\Pictures\Screenshots\` using the `view_file` tool. Never ask him to paste paths or drag-and-drop into an IDE.

---


## III. Session Continuity Protocol

### 1. Session Startup Protocol (First Turn of Every Session)
At the start of every session, inspect:
- `AGENTS.md` & `GEMINI.md` (Operational rules & architecture specs)
- Recent job logs and configuration states in `jobs/` or `config/`
- Ensure workspace is clean and synchronized with upstream (`git pull --rebase --autostash`) before executing edits.

### 2. Session Wrap-Up Protocol (Trigger: "That's a wrap")
Whenever the Project Director says **"That's a wrap"** (or wraps up a session/milestone), execute these 6 closing steps automatically:
1. **Telegram Fleet Context & Tools Audit:** If any new features, endpoints, cron jobs, or core behaviors were built in this session, verify whether the project's Telegram Bot context (`context/<project>.md`) and tool script (`tools/<project>.py`) need to know about them. If yes, update them immediately before committing.
2. **Sync Documentation:** Update `GEMINI.md` with any new endpoints, schemas, tools, or architectural changes.
3. **Git Commit & Synchronous Push:** Stage all modified workspace files, commit with a descriptive message, and execute `git push origin <branch>` **synchronously**. Wait and verify that `git push` has completed with exit code `0` before starting Step 4.
4. **Environment-Aware Seedbox & Daemon Synchronization (No Loopbacks):**
   - **If running on Windows Laptop (`win32`):**
     - **4a. Pull Updated Repo on Seedbox Workspace:** Now that Step 3's push is live on GitHub, execute a one-way pull on the matching seedbox workspace (`/storage/workspaces/<Project>`):
       ```bash
       ssh -i ~/.ssh/gigarapid_key -p 34004 lovefilm2018@openssh-ubuntu-lovefilm2018.elektra.mygiga.cloud "git -C /storage/workspaces/<Project> pull --rebase --autostash"
       ```
     - **4b. Live Service Reload (if applicable):** If Telegram Gateway or Spoxify files were modified, sync to `/storage/services/...` and reload the daemon.
   - **If running on Seedbox Linux (`linux` inside `/storage/workspaces/<Project>`):**
     - **4a. NO SSH / NO Git Pull Loopback:** Because this session already committed and pushed directly from `/storage/workspaces/<Project>` in Step 3, **DO NOT** SSH to the seedbox or run `git pull`.
     - **4b. Local Service Sync (if applicable):** If Telegram Gateway or Spoxify files were touched, copy them locally (`cp`/`rsync` or `python3 spoxify/deploy.py --seedbox-only`) to `/storage/services/...` and reload the local daemon directly in bash.
5. **Log Session Close:** Append `SESSION_CLOSE` entry in <0.1s using:
   - Windows Laptop: `python "C:\Users\TotalBiz\Documents\AI_Usage_Audit\log_task.py" <ProjectName> "<Full Session Summary>" "<ModelTier>" "0" "~1.5k" "SESSION_CLOSE"`
   - Seedbox Linux: `python3 "/storage/workspaces/AI_Usage_Audit/log_task.py" <ProjectName> "<Full Session Summary>" "<ModelTier>" "0" "~1.5k" "SESSION_CLOSE"`
6. **Executive Recap:** Present a concise closing summary of all achievements and verified system status.
---

## IV. Task-Adaptive Model & Quota Optimization Protocol

To maximize reasoning accuracy while preventing premature subscription quota depletion, adhere strictly to this task-to-tier matrix:

### 1. Task-to-Model Execution Matrix
- **Data Ingestion, Research & Scans:** Use lightweight Python/shell scripts or delegate to `research` / `flash_lite` subagents (`invoke_subagent`). Never burn high-reasoning tokens on raw text parsing or bulk log scraping.
- **Routine Scaffolding & Minor Tweaks (Low Effort / Flash Lite):** File renaming, batch launcher updates, minor CSS/HTML tweaks, simple config edits.
- **Core Engineering & Logic (Medium Effort — Recommended Baseline):** Multi-file feature builds, database queries, API routing, state management, algorithmic problem solving (`Gemini 3.8 Flash Medium Effort`).
- **Deep Root Cause, Complex Architecture & Escalation:** **Gemini 4 Argon** (directly available in AGY via `/model` with its own dedicated quota) or **Claude** (Sonnet/Opus in AGY).

### 2. The 2-Strike Loop-Breaker Rule (Enforced via Section II.1)
- **Hard Stop Protocol:** If any build, deployment, test, or bugfix fails **2 consecutive times** in a session:
  1. **STOP immediately.** Do not attempt a 3rd blind fix.
  2. Summarize: (a) what was attempted, (b) why it failed, and (c) the hypothesized root cause.
  3. Prompt the user:
     *"⚠️ **2-Strike Safety Net:** We have hit 2 consecutive failures. To protect your quota and resolve this accurately, please switch model via `/model` to **Gemini 4 Argon** (now directly available in AGY with its own quota) or **Claude**, and reply 'Proceed'."*