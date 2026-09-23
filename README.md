<div align="center">

# 🌌 Synapse

### A real-time, community-first social platform — built as a system, not a clone.

Posts, reels, stories, communities, direct messaging, live presence and **peer-to-peer WebRTC calls**, all wired together over an event-driven Socket.IO layer.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-realtime-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![Tests](https://img.shields.io/badge/tests-Vitest%20%2B%20Supertest-6E9F18?logo=vitest&logoColor=white)](#-testing--quality)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#-license)

[**Live App**](https://synapse-app.vercel.app) · [**API**](https://orbit-v-backend.onrender.com/health) · [**API Docs (Swagger)**](https://orbit-v-backend.onrender.com/api-docs)

</div>

> **Replace the Live App link** above with your deployed Vercel URL.

---

## ✨ Overview

**Synapse** is a full-stack MERN + TypeScript platform where creators, communities and conversations move around you in real time. It goes well beyond CRUD + JWT: think optimistic UI, live typing indicators, presence tracking, role-based communities, and browser-to-browser audio/video calls — backed by a hardened, tested API.

<div align="center">

<!-- Add real screenshots here -->
<img src="docs/screenshots/feed.png" alt="Feed" width="80%" />

<sub>Add screenshots/GIFs under <code>docs/screenshots/</code> and reference them here.</sub>

</div>

---

## 🚀 Features

### 📸 Content
- **Posts** — image & video uploads (Cloudinary), captions, likes, threaded comments
- **Reels** — short-form video feed
- **Stories** — 24-hour ephemeral media with auto-expiry (MongoDB TTL)
- **Home feed** — followed users + your own posts, paginated with like-state hydration

### 👥 Social graph
- **Follow / unfollow** with follower & following lists
- **Profiles** with avatars, bios, verification badges
- **Search** across users, posts and communities (regex-injection safe)
- **Privacy controls** — private accounts, message policy, mentions & tagging toggles

### 🏘️ Communities
- Create **public or private** communities with cover art & rules
- **Role hierarchy** — Owner → Admin → Member, with promote/remove flows
- **Join requests & approvals** for private communities
- Community **posts, comments and real-time chat channels**
- Live **active-member counts** and **daily activity** per community

### 💬 Real-time (Socket.IO)
- **Direct messaging** with conversation model & message-policy enforcement
- **Typing indicators** and **online presence** tracking
- **Live notifications** for likes, comments, follows, community activity
- Namespaced, **JWT-authenticated** socket handshake (identity derived server-side)

### 📞 WebRTC calls
- **Peer-to-peer audio & video** calls with a clean lifecycle
- Offer / answer / ICE signaling over sockets
- Ring, accept, reject, and reliable teardown of local/remote streams

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, **TanStack Query**, Framer Motion, socket.io-client, WebRTC |
| **Backend** | Node.js, Express 5, MongoDB + Mongoose, Socket.IO, JWT (httpOnly cookies), Zod, Cloudinary |
| **Security** | Helmet, CORS allow-list, tiered rate limiting, request sanitization, bcrypt |
| **Quality** | Vitest, Supertest, mongodb-memory-server, ESLint, GitHub Actions CI |
| **Docs** | Swagger / OpenAPI (`swagger-jsdoc` + `swagger-ui-express`) |

---

## 🧠 Architecture Highlights

- **Event-driven real-time layer** — a dedicated socket module with authenticated handshakes, presence maps, and room-based community broadcasting.
- **Stateless auth** — short-lived access + long-lived refresh JWTs in httpOnly cookies, with transparent silent refresh on the client.
- **Defense in depth** — Zod validation, Mongo operator sanitization, regex escaping on search, Helmet headers, and a strict credentialed CORS allow-list.
- **Data integrity** — unique indexes to prevent double-likes, and cascade-delete helpers so removing an account or community leaves no orphaned documents or media.
- **Optimistic UX** — TanStack Query mutations update the UI instantly and reconcile with the server (with rollback on error).
- **Performance** — route-based code-splitting and vendor chunking keep the initial bundle lean.

```
Synapse/
├── backend/                 # Express 5 API + Socket.IO
│   ├── src/
│   │   ├── controllers/     # Route handlers (users, posts, communities, chat…)
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # REST route definitions (+ Swagger docs)
│   │   ├── middlewares/     # auth, validation, rate limiting, sanitization
│   │   ├── socket/          # authenticated real-time layer + WebRTC signaling
│   │   ├── utils/           # logger, cloudinary, cascade, sanitize, emitters
│   │   └── app.js / index.js
│   └── tests/               # Vitest unit + Supertest integration
├── frontend/                # React 19 + Vite + TS
│   └── src/
│       ├── pages/           # Feed, Communities, Messages, Reels, Profile…
│       ├── components/      # feature-grouped UI
│       ├── hooks/queries/   # typed TanStack Query hooks
│       ├── store/           # Zustand stores (auth, socket, community)
│       ├── lib/ · types/    # axios client, typed API layer
│       └── main.tsx
└── .github/workflows/ci.yml # lint + test + build on every push/PR
```

---

## ⚡ Getting Started

### Prerequisites
- Node.js **20+**
- A MongoDB connection string (local or Atlas)
- A [Cloudinary](https://cloudinary.com/) account (for media uploads)

### 1. Clone
```bash
git clone https://github.com/Pradeep-10x/Synapse.git
cd Synapse
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env      # then fill in the values
npm run dev               # starts API + Socket.IO on http://localhost:5000
```

<details>
<summary><b>Backend environment variables</b> (see <code>backend/.env.example</code>)</summary>

```env
PORT=5000
NODE_ENV=development
MONGO_URI=your-mongodb-uri
JWT_SECRET=long-random-secret
REFRESH_TOKEN_SECRET=another-long-random-secret
CORS_ORIGIN=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```
</details>

### 3. Frontend
```bash
cd ../frontend
npm install
npm run dev               # http://localhost:5173
```

The frontend reads `VITE_API_URL` and `VITE_SOCKET_URL` from `.env.development` (already pointed at `localhost:5000`).

---

## 🧪 Testing & Quality

The backend ships with a real test suite that runs against an **in-memory MongoDB** — no external services required.

```bash
cd backend
npm test          # 25 unit + integration tests (Vitest + Supertest)
npm run lint      # ESLint
```

```bash
cd frontend
npm run lint      # ESLint
npm run build     # type-check + production build
```

Every push and pull request runs lint, tests and builds for **both** apps via [GitHub Actions](.github/workflows/ci.yml).

---

## 📚 API Documentation

Interactive Swagger UI is served by the backend:

- **Local:** http://localhost:5000/api-docs
- **Live:** https://orbit-v-backend.onrender.com/api-docs

All routes live under `/api/v1` — `user`, `post`, `feed`, `comment`, `like`, `notification`, `message`, `reel`, `story`, `community`, `community-post`, `community-comments`, `community-chat`.

---

## 🗺️ Roadmap

- [ ] Message reactions & read receipts
- [ ] Message threading and file sharing in chat
- [ ] Group video calls
- [ ] Redis-backed presence & rate limiting for horizontal scaling
- [ ] Full-text search via MongoDB text indexes
- [ ] Push notifications

---

## 👤 Author

**Pradeep**
[GitHub](https://github.com/Pradeep-10x)

---

## 📄 License

Released under the **MIT License**.

<div align="center">
<sub>Built with a focus on real-time systems, clean architecture, and production-grade fundamentals.</sub>
</div>
