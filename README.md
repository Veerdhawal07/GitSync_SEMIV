# 🚀 GitSync - AI-Powered Git Collaboration

GitSync is a modern platform designed to automate Git collaboration and simplify conflict resolution. By combining real-time activity monitoring with AI-assisted merging, GitSync helps teams manage their repositories more efficiently.

---

## ✨ Features

- **Intelligent Conflict Resolution**: AI-driven suggestions for resolving complex merge conflicts.
- **Real-time Activity Stream**: Monitor push and pull events across multiple repositories.
- **GitHub Integration**: Seamless connection with your GitHub account via OAuth.
- **Unified Dashboard**: A clean, modern interface to manage all your Git workflows.
- **Collaborator Management**: Track team members and their contributions.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, Vite, TypeScript, Tailwind CSS, Shadcn UI |
| **Backend** | FastAPI (Python), SQLAlchemy (Async), WebSockets |
| **Database** | PostgreSQL (via Supabase) |
| **Authentication** | Supabase Auth (GitHub OAuth) |
| **AI Engine** | OpenAI API (for conflict analysis) |

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python 3.10+](https://www.python.org/)
- [Git](https://git-scm.com/)
- A [Supabase](https://supabase.com/) account

---

## 🚀 Getting Started

### 1. Clone the Project
```bash
git clone <your-repository-url>
cd git-flow-mate
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and add your credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Backend Configuration
DATABASE_URL=postgresql+asyncpg://postgres:password@db_host:5432/postgres
OPENAI_API_KEY=your_openai_key
```

### 3. Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```
The frontend will be available at `http://localhost:8080`.

### 4. Backend Setup
```bash
# Navigate to backend (or stay in root if using python -m)
pip install -r backend/requirements.txt

# Start the FastAPI server
python -m backend.main
```
The backend API will run at `http://localhost:8000`.

---

## 🔑 GitHub OAuth Setup

To enable "Continue with GitHub" login, follow these steps:

### Step 1: Create GitHub OAuth App
1. Visit [GitHub Developer Settings](https://github.com/settings/developers).
2. Click **New OAuth App**.
3. Set **Homepage URL** to `http://localhost:8080`.
4. Set **Authorization callback URL** to:
   `https://<your-project-id>.supabase.co/auth/v1/callback`
5. Register and copy your **Client ID** and **Client Secret**.

### Step 2: Configure Supabase
1. Go to your **Supabase Dashboard** → **Authentication** → **Providers**.
2. Find **GitHub** and enable it.
3. Paste your **Client ID** and **Client Secret**.
4. In **Redirect URLs**, add `http://localhost:8080`.

---

## 🗄️ Database & PostgreSQL

GitSync uses PostgreSQL managed by Supabase.

### Schema Management
Migrations are located in `/supabase/migrations`. The core schema includes:
- `profiles`: Syncs with Supabase Auth users.
- `repositories`: Tracks connected GitHub repos.
- `conflicts`: Stores detected merge conflicts and their resolutions.

### Operation Guide
- **Table Triggers**: A trigger `on_auth_user_created` automatically creates a profile entry when a new user signs up via GitHub.
- **Connecting to DB**: Use the `DATABASE_URL` for backend connections. Ensure you use the `postgresql+asyncpg://` prefix for asynchronous operations in Python.

---

## 🔍 Troubleshooting & Debugging

### "Supabase is not configured" / Blank Screen
If you see a blank screen or a "Supabase is required" error:
1. Ensure your `.env` file is present and contains valid keys.
2. Restart the development server.
3. If you want to run without Supabase, the app includes a safe-guard in `client.ts` that will return `null` if keys are missing, but features requiring auth will be disabled.

### GitHub Redirect Loops
If you are redirected back to the login page after authorizing:
1. Open **Browser DevTools (F12)** → **Application** tab.
2. Clear **Local Storage** and **Cookies**.
3. Verify your **Callback URL** in GitHub matches exactly what is in Supabase.
4. Check the **Network** tab for failed requests to your Supabase project URL.

### Backend Connection Issues
1. Ensure the PostgreSQL connection string is correct and your database is accessible.
2. Check if the port `8000` is already in use by another process.

---

## 📂 Project Structure

```text
├── backend/            # FastAPI source code
│   ├── api/           # Route handlers
│   ├── database/      # Connection logic and models
│   ├── services/      # Business logic (AI, Git operations)
│   └── main.py        # Entry point
├── src/               # React frontend source code
│   ├── components/    # Reusable UI components
│   ├── pages/         # Page layouts
│   └── integrations/  # External service clients (Supabase)
├── supabase/          # Database migrations and config
└── package.json       # Frontend dependencies and scripts
```

---

**Happy Coding!** 🚀


TO run the mock : python -m backend.mock_demo.py11



 python -c "
import asyncio
from backend.database.connection import AsyncSessionLocal
from backend.models.schema import WebhookEvent, MergeOperation, Conflict
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        print('--- WEBHOOKS ---')
        events = (await db.execute(select(WebhookEvent).order_by(WebhookEvent.id.desc()).limit(3))).scalars().all()
        for op in events: print(f'ID: {op.id}, status: {op.status}, date: {op.created_at}')
        
        print('--- MERGOPS ---')
        ops = (await db.execute(select(MergeOperation).order_by(MergeOperation.id.desc()).limit(3))).scalars().all()
        for op in ops: print(f'ID: {op.id}, status: {op.status}, branch: {op.source_branch}, date: {op.created_at}')
        
        print('--- CONFLICTS ---')
        cfs = (await db.execute(select(Conflict).order_by(Conflict.id.desc()).limit(3))).scalars().all()
        for op in cfs: print(f'ID: {op.id}, file: {op.file_path}, resolved: {op.resolved}, date: {op.created_at}')

asyncio.run(main())
"


 python -c "
import asyncio
from backend.database.connection import AsyncSessionLocal
from backend.models.schema import WebhookEvent, MergeOperation, Conflict
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        print('--- WEBHOOKS ---')
        events = (await db.execute(select(WebhookEvent).order_by(WebhookEvent.id.desc()).limit(3))).scalars().all()
        for op in events: print(f'ID: {op.id}, status: {op.status}, date: {op.created_at}')
        
        print('--- MERGOPS ---')
        ops = (await db.execute(select(MergeOperation).order_by(MergeOperation.id.desc()).limit(3))).scalars().all()
        for op in ops: print(f'ID: {op.id}, status: {op.status}, branch: {op.source_branch}, date: {op.created_at}')
        
        print('--- CONFLICTS ---')
        cfs = (await db.execute(select(Conflict).order_by(Conflict.id.desc()).limit(3))).scalars().all()
        for op in cfs: print(f'ID: {op.id}, file: {op.file_path}, resolved: {op.resolved}, date: {op.created_at}')

asyncio.run(main())
"