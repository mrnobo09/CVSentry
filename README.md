
<div align="center">
  <img src="./Images/CVSentryLogo.png" alt="CVSentry Logo" width="150"/>
  <h1>CVSentry</h1>
  
  **A surveillance system that detects criminal intent to alert authorities before the crime happens.**
  
  *Currently in production with active backend and frontend development*
</div>

---

## 📋 Table of Contents

- [Project Architecture](#project-architecture)
- [Environment Configuration](#environment-configuration)
- [Setup Instructions](#setup-instructions)
- [Tech Stack](#tech-stack)
- [Current Status](#current-status)
- [License](#license)

---

## Project Architecture

```
CVSentry/
├─ core/                    # Django REST API backend
│  ├─ api/                  # Django project settings and configs
│  ├─ auth/                 # Custom authentication app
│  ├─ .env                  # Backend environment variables
│  ├─ Dockerfile            # Docker setup for backend
│  ├─ manage.py
│  └─ requirements.txt
│
├─ dashboard/               # React + Vite dashboard frontend
│  ├─ public/
│  ├─ src/
│  ├─ .env                  # Frontend environment variables
│  ├─ package.json
│  ├─ vite.config.ts
│  └─ tsconfig.json
│
├─ docker-compose.yaml      # Docker setup for backend and database
└─ README.md
```

---

## Environment Configuration

### Backend Configuration

Create a `.env` file inside the **core/** directory with the following variables:

```env
POSTGRES_DB=
POSTGRES_HOST=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_PORT=
DASHBOARD_URL=          # URL where the React dashboard is hosted
SECRET_KEY=             # Django secret key
DEBUG=True              # Set to False in production
EMAIL_HOST_USER=        # Email address for sending OTPs
EMAIL_HOST_PASSWORD=    # App password for the email account
```

### Frontend Configuration

Create a `.env` file inside the **dashboard/** directory:

```env
VITE_BACKEND_URL=       # API base URL (e.g., http://localhost:8000)
```

---

## Setup Instructions

### Backend Setup

Ensure Docker and Docker Compose are installed on your system.

```bash
docker-compose up --build
```

This command will:
- Build the Django backend container
- Initialize a PostgreSQL 17 database
- Expose the API at `http://localhost:8000`

### Frontend Setup

Navigate to the dashboard directory and install dependencies:

```bash
cd dashboard
npm install
npm run dev
```

The development server will start at `http://localhost:5173`

---

## Tech Stack

- **Backend:** Django REST Framework, PostgreSQL, Djoser (Authentication)
- **Frontend:** React, TypeScript, Vite
- **Containerization:** Docker, Docker Compose
- **Environment Management:** dotenv

---

## Current Status

- ✓ Backend containerized with PostgreSQL
- ✓ Frontend integrated with backend via environment variables
- ⚠ Active development on authentication and dashboard integration
- ⚠ Production deployment workflow in progress

---

## License

This project is currently proprietary and not open source.

---

> **Note:** CVSentry is an internal-use system and should only be deployed in secure network environments.