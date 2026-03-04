# MTS Telecom Supervision System

**Système de supervision et ticketing intelligent pour opérateurs télécom**

Projet de Fin d'Études (PFE) — Billcom Consulting / Ericsson, 2026

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Redux Toolkit, Tailwind CSS, Material UI |
| Backend | Spring Boot 3.2, Java 17, Spring Security, JWT, Hibernate |
| Database | MySQL 8.0, Flyway migrations |
| Build | Maven (backend), npm / react-scripts (frontend) |
| Auth | JWT (HS256) + Google OAuth 2.0 |
| Real-time | WebSocket (STOMP) |
| Documentation | Swagger / OpenAPI 3 |

## Architecture

```
┌──────────────┐     HTTP/WS     ┌──────────────────┐     JPA      ┌─────────┐
│   React SPA  │ ◄──────────────► │  Spring Boot API │ ◄──────────► │  MySQL  │
│  (port 3000) │   REST + JWT    │   (port 8080)    │   Hibernate  │ (3306)  │
└──────────────┘                  └──────────────────┘              └─────────┘
```

### RBAC Roles

| Role | Permissions |
|------|------------|
| **ADMIN** | Full system access, user management, SLA configuration |
| **MANAGER** | Dashboard, reports, ticket assignment, escalation rules |
| **AGENT** | Ticket processing, comments, status changes |
| **CLIENT** | Create tickets, view own tickets, track status |

### Core Modules

- **Authentication** — JWT access/refresh tokens, Google OAuth, password reset, email verification
- **Ticketing** — Full lifecycle (NEW → OPEN → IN_PROGRESS → PENDING → RESOLVED → CLOSED), SLA tracking, attachments, bulk operations, export (PDF/Excel/CSV)
- **Incidents** — Incident management with timeline, post-mortem, service impact
- **SLA Engine** — SLA policies, business hours, escalation rules, breach detection
- **Dashboard** — KPI stats, agent performance, trend analysis
- **Services** — Telecom service catalog, health monitoring, topology
- **Notifications** — Real-time WebSocket notifications
- **Audit Log** — Complete action trail for compliance
- **Reports** — Generated reports (PDF/Excel)

---

## Prerequisites

- **Java 17** (JDK)
- **Node.js 18+** and npm
- **MySQL 8.0** (or Docker)
- **Maven 3.8+**

## Quick Start

### 1. Database Setup

**Option A — Docker (recommended):**
```bash
docker-compose up -d
```
This starts MySQL on port 3306 and phpMyAdmin on port 8081.

**Option B — Local MySQL:**
```sql
CREATE DATABASE mts_telecom_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend

```bash
cd server
mvn spring-boot:run
```

The backend starts on `http://localhost:8080`. Flyway automatically runs all database migrations on first start.

API documentation: `http://localhost:8080/swagger-ui.html`

### 3. Frontend

```bash
cd client
npm install
npm start
```

The frontend starts on `http://localhost:3000` and proxies API calls to port 8080.

---

## Configuration

### Backend — `server/src/main/resources/application.yaml`

| Property | Default | Description |
|----------|---------|-------------|
| `DB_URL` | `jdbc:mysql://localhost:3306/mts_telecom_db` | JDBC connection URL |
| `DB_USERNAME` | `root` | Database user |
| `DB_PASSWORD` | `mts2026` | Database password |
| `JWT_SECRET` | (dev default) | **Must override in production** |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Allowed frontend origins |
| `GOOGLE_CLIENT_ID` | (configured) | Google OAuth client ID |

### Frontend — `client/.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_URL` | `http://localhost:8080/api` | Backend API URL |
| `REACT_APP_GOOGLE_OAUTH_CLIENT_ID` | (configured) | Google OAuth client ID |

---

## Project Structure

```
├── client/                    # React frontend
│   ├── src/
│   │   ├── api/               # API service layer (Axios)
│   │   ├── components/        # Reusable UI components
│   │   ├── context/           # React contexts (Theme, Language, Toast)
│   │   ├── hooks/             # Custom hooks
│   │   ├── pages/             # Route pages
│   │   ├── redux/             # Redux store + slices
│   │   ├── types/             # TypeScript type definitions
│   │   └── demo/              # Demo mode (dev only, disabled in production)
│   └── package.json
│
├── server/                    # Spring Boot backend
│   ├── src/main/java/com/billcom/mts/
│   │   ├── config/            # Security, CORS, WebSocket, OpenAPI config
│   │   ├── controller/        # REST controllers (14)
│   │   ├── dto/               # Data Transfer Objects
│   │   ├── entity/            # JPA entities (15+)
│   │   ├── enums/             # Enum types
│   │   ├── exception/         # Global exception handling (RFC 7807)
│   │   ├── repository/        # Spring Data JPA repositories
│   │   ├── security/          # JWT filter, service, user details
│   │   ├── service/           # Business logic (interface + impl)
│   │   └── validation/        # Custom validators
│   ├── src/main/resources/
│   │   ├── application.yaml   # Main configuration
│   │   └── db/migration/      # Flyway SQL migrations (V1–V33)
│   └── pom.xml
│
├── docs/                      # Documentation
├── docker-compose.yml         # MySQL + phpMyAdmin
└── README.md
```

---

## API Endpoints

| Prefix | Controller | Auth Required |
|--------|-----------|---------------|
| `/api/auth` | AuthController | Public (login, register, Google) |
| `/api/tickets` | TicketController | Yes |
| `/api/users` | UserController | Yes (ADMIN for management) |
| `/api/dashboard` | DashboardController | Yes |
| `/api/services` | ServiceController | Yes |
| `/api/incidents` | IncidentController | Yes |
| `/api/sla-policies` | SlaPolicyController | Yes (ADMIN/MANAGER) |
| `/api/sla-escalation` | SlaEscalationController | Yes |
| `/api/reports` | ReportController | Yes (ADMIN/MANAGER) |
| `/api/notifications` | NotificationController | Yes |
| `/api/audit-logs` | AuditLogController | Yes (ADMIN) |
| `/api/business-hours` | BusinessHoursController | Yes |
| `/api/macros` | MacroController | Yes |
| `/api/quick-replies` | QuickReplyTemplateController | Yes |

Full API documentation available at `/swagger-ui.html` when backend is running.

---

## Database

33 Flyway migrations (V1–V33) manage the schema. Key tables:

- `users` — All system users with RBAC roles
- `clients` — B2B client profiles
- `tickets` — Support tickets with SLA tracking
- `ticket_comments` — Ticket conversation thread
- `ticket_history` — Immutable audit trail
- `services` — Telecom service catalog
- `incidents` — Incident management
- `notifications` — User notifications
- `audit_logs` — System-wide audit log
- `sla_configs` — SLA policy definitions
- `escalation_rules` — Escalation rules
- `reports` — Generated reports

See [docs/database.md](docs/database.md) for the complete schema documentation.

---

## Security Features

- **JWT Authentication** with access token (15min) + refresh token rotation (7 days)
- **Google OAuth 2.0** with server-side ID token verification
- **BCrypt** password hashing
- **Password complexity** enforcement (8+ chars, uppercase, lowercase, digit)
- **Rate limiting** on login (5/min), API (100/min), ticket creation (10/min)
- **CORS** restricted to configured origins
- **HTTP-only cookies** for token storage
- **RFC 7807** error responses
- **Audit logging** for all actions
- **Request ID** tracking for debugging

---

## License

This project was developed as a PFE (Projet de Fin d'Études) for Billcom Consulting.
