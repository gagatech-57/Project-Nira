# Project-Nira (Nira Chat)

A real-time messaging web application featuring **@username** handles, instant read receipts ("Seen" status), **100% Full-Page UI View**, 20 pre-seeded demo accounts in MongoDB with an **Automated Real-Time AI Auto-Reply System**, and seamless Socket.io WebSockets.

---

## 🔥 Features

- **Unique `@username` Handle System**: Register and search users by `@username` handles (e.g. `@jessica_alba`).
- **Flexible Authentication**: Sign in using either your `@username` handle or Email address.
- **Real Read Receipts ("Seen" Status)**: Read receipts ("Seen") trigger **only** when the recipient actually opens the conversation in real time via WebSockets (<10ms reaction).
- **Automated Demo Account Auto-Reply Engine**: Pre-seeded with 20 demo accounts in MongoDB. Any message sent to a demo account receives a real-time reply stored directly in MongoDB.
- **100% Full-Page UI View**: Modern full-screen responsive interface (`100vw` x `100vh`) with sleek collapsible sidebar and inline profile settings panel.
- **Smart Scroll Control**: Instant positioning on contact switch (0ms delay) and scroll protection when reading old messages.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Lucide-React Icons, Socket.io Client, Vanilla CSS
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), Socket.io Engine, BcryptJS, JWT Auth

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/gagatech-57/Project-Nira.git
cd Project-Nira
```

### 2. Install dependencies & start server
```bash
# Server setup
cd server
npm install
npm start

# Client setup (in another terminal)
cd ../client
npm install
npm run dev
```

### 3. Open in Browser
Visit `http://localhost:3000` to start chatting!
