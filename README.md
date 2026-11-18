# AI-Powered Academic Study Assistant
## macOS Setup and Run Guide

This guide explains how to run the project on a new MacBook. The frontend and backend run locally. PostgreSQL and file storage use the existing hosted Supabase project. ChromaDB is a local persistent vector store, and LLM requests use the configured OpenRouter account.

## 1. Requirements

- macOS with internet access and permission to install software.
- The complete project folder.
- The environment files supplied privately by the project owner.
- The existing ChromaDB persistence directory if the recipient must use the already-indexed documents.

The recipient does **not** need to install PostgreSQL or Supabase locally.

## 2. Install Homebrew, Python and Node.js

Open the macOS **Terminal** application.

Check whether Homebrew is installed:

```bash
brew --version
```

If it is missing, install Homebrew using its official instructions: https://brew.sh/

Install Python 3.11:

```bash
brew install python@3.11
python3.11 --version
```

Install Node.js and npm:

```bash
brew install node
node --version
npm --version
```

## 3. Open the project folder

Copy or extract the project folder, for example into `~/Documents/academic-study-assistant`.

In Terminal:

```bash
cd ~/Documents/academic-study-assistant
```

The folder should contain `backend/` and `frontend/`. If yours is in a different location, use its actual path in all commands below.

## 4. Configure environment files

The expected locations are:

```text
academic-study-assistant/
├── backend/
│   └── .env
└── frontend/
    └── .env
```

The project owner should supply the working environment files privately. If only `.env.example` files are supplied, copy them first:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Then enter the values provided by the project owner. Do not overwrite already-supplied working `.env` files.

### Backend `.env`

It must contain the exact settings expected by `backend/app/core/config.py`, including the existing project's:

- Supabase URL and backend service-role key.
- OpenRouter API key and configured model settings.
- JWT/application authentication secret and any other required backend settings.

Use the variable names already defined in the project. Do not rename them or invent replacement values.

### Frontend `.env`

The frontend must point to the local backend:


## 5. Set up and run the backend

Open a Terminal window:

```bash
cd ~/Documents/academic-study-assistant/backend

```

Create a Python virtual environment:

```bash
python3.11 -m venv .venv
```

Activate it:

```bash
source .venv/bin/activate
```

Upgrade pip:

```bash
python -m pip install --upgrade pip
```

Install the project's backend dependencies:

```bash
pip install -r requirements.txt
```

This installs the packages listed by the project, including its FastAPI, Uvicorn, SQLAlchemy, database driver, Supabase, ChromaDB, embedding, and document-processing dependencies.

If `requirements.txt` is missing, ask the project owner for the correct dependency file. Do not guess package versions.

Start the backend:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Keep this Terminal window open. Check that the API is running:

- API: http://localhost:8000
- Interactive API documentation: http://localhost:8000/docs

## 6. Set up and run the frontend

Open a **second Terminal window**. Leave the backend running in the first one.

```bash
cd ~/Documents/academic-study-assistant/frontend
npm install
npm run dev
```

Vite normally displays:

```text
http://localhost:5173
```

Open that address in a browser. Keep this Terminal window open too.

## 7. Use the application

1. Open http://localhost:5173.
2. Register an account if needed, or sign in with an existing account in the configured application.
3. Open **My Documents**.
4. Upload a PDF, DOCX, or PPTX if needed.
5. Wait for document processing to show **COMPLETED**.
6. Test AI Study Chat, Summaries, Quizzes, Flashcards, and the other available pages.

The application connects to the supplied hosted Supabase project for its database and file storage.


## 7. Database setup and migrations

This handover assumes the existing Supabase database and tables are already set up.

For a normal demonstration:

- Do not install local PostgreSQL.
- Do not create another Supabase project.
- Do not run migrations unnecessarily.
- Keep the supplied backend environment settings.

Only run database migrations if the project owner has changed the schema and explicitly instructs you to do so.

## 8. Stop and restart the application

To stop a server, press `Control + C` in its Terminal window.

For later runs, no need to reinstall dependencies. Start two Terminal windows.

**Terminal 1 — Backend:**

```bash
cd ~/Documents/academic-study-assistant/backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 — Frontend:**

```bash
cd ~/Documents/academic-study-assistant/frontend
npm run dev
```

Then open http://localhost:5173.

## 11. Troubleshooting

### `python3.11: command not found`

```bash
brew install python@3.11
```

Close and reopen Terminal, then check `python3.11 --version`.

### `uvicorn: command not found` or `ModuleNotFoundError`

Activate the backend environment and reinstall the requirements:

```bash
cd ~/Documents/academic-study-assistant/backend
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend cannot connect to the API

1. Confirm the backend is running at http://localhost:8000.
2. Confirm `frontend/.env` contains `VITE_API_URL=http://localhost:8000/api/v1`.
3. Stop and restart the frontend after changing `.env`:

```bash
npm run dev
```

### Supabase, authentication or OpenRouter errors

Check that the supplied `backend/.env` exists, that its values are correct, and that the credentials remain active. Confirm the MacBook has internet access. Never paste API keys into error reports.

### Documents appear but RAG cannot retrieve their content

Check that the ChromaDB persistence directory was included and is at the path configured by the backend. Supabase does not automatically transfer the local ChromaDB index.

### Port 8000 or 5173 is already in use

Close the other process using that port. If a port must be changed, update the frontend API URL accordingly and coordinate the change with the project owner.

## 12. Project architecture

| Component | Technology | Runs where |
|---|---|---|
| Frontend | React, TypeScript, Vite | MacBook |
| Backend API | Python, FastAPI, Uvicorn | MacBook |
| Relational database | PostgreSQL via Supabase | Hosted Supabase |
| File storage | Supabase Storage | Hosted Supabase |
| Vector database | ChromaDB | Local persistent storage on MacBook |
| Embeddings | BAAI/bge-small-en-v1.5 | Backend runtime |
| LLM | LLaMA 3.1 8B Instruct via OpenRouter | OpenRouter API |

**End of setup guide.**
