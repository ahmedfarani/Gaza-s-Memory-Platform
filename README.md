<div align="center">

# ☽ Gaza's Memory

**A living digital platform for documenting and sharing stories of resilience and human memory in Gaza**

[![Status](https://img.shields.io/badge/status-live-brightgreen)](https://ahmedfarani.github.io/Gaza-s-Memory-Platform/)
[![Firebase](https://img.shields.io/badge/backend-Firebase-FFCA28?logo=firebase)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/license-MIT-blue)](#)

[View the Platform Live](https://ahmedfarani.github.io/Gaza-s-Memory-Platform/) · [Report an Issue](https://wa.me/972592478068)

</div>

---

## 📖 About the Project

**Gaza's Memory** is an independent digital space where the people of Gaza write their stories and memories in their own words family stories, memories, moments of resilience, and hope to remain preserved and visible to the world. Every published story becomes part of a living archive that grows over time.

The platform is built entirely with core web technologies (HTML / CSS / JavaScript) without any framework, and connects directly to Firebase as a database and authentication service.

---

## ✨ Features

- **A living story archive** | browse, instant search, and filter by category (memory, family, love and hope, resilience)
- **A three-tier role system** | visitor, registered user, and system admin, each with different permissions and interface
- **Publish and edit stories** | every user manages only their own stories (publish, edit, delete)
- **Admin dashboard** | full oversight of stories and users with live statistics
- **Fully responsive design** | a custom mobile hamburger menu across all views
- **Full Arabic support** | native RTL layout with Cairo and Amiri fonts
- **Database-level security** | Firestore rules prevent any client-side tampering

---

## 🧭 Roles and Usage Flow

| Role                | What They Can Do                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------- |
| **Visitor**         | Browse all stories, search, filter - no account required                                      |
| **Registered User** | All visitor permissions + publish/edit/delete their own stories from their personal dashboard |
| **System Admin**    | Full oversight: delete any story, view all users, delete accounts, platform statistics        |

Upon login, the user is automatically routed to `dashboard.html` or `admin.html` based on their role stored in Firestore - there is no manual role switching from the interface.

---

## 🗂️ Project Structure

```
Gaza-s-Memory-Platform/
├── index.html                 # Main page (public)
│
├── pages/
│   ├── login.html              # Login
│   ├── register.html           # Account creation
│   ├── dashboard.html          # User dashboard
│   └── admin.html              # Admin dashboard
│
├── assets/
│   ├── css/
│   │   └── style.css           # Full platform styling
│   └── js/
│       ├── firebase-config.js  # Firebase setup + shared utilities (roles, hamburger menu)
│       ├── script.js           # Main page logic
│       ├── login.js
│       ├── register.js
│       ├── dashboard.js        # User dashboard logic
│       └── admin.js            # Admin dashboard logic
│
├── firestore.rules             # Database security rules
├── firestore.indexes.json      # Required Firestore indexes
└── firebase.json               # Hosting and deployment settings
```

---

## 🛠️ Technologies Used

- **HTML5 / CSS3** | no CSS framework, fully custom design
- **JavaScript (Vanilla)** | no front-end library
- **[Firebase Authentication](https://firebase.google.com/docs/auth)** | email and password login
- **[Cloud Firestore](https://firebase.google.com/docs/firestore)** | stories and users database
- **Google Fonts** | Cairo (interface) and Amiri (story text)

---

## 🚀 Running Locally

The project requires no build tools - it is entirely static files.

```bash
git clone https://github.com/ahmedfarani/Gaza-s-Memory-Platform.git
cd Gaza-s-Memory-Platform
```

Then open `index.html` directly in your browser, or run a simple local server:

```bash
npx serve .
```

> **Note:** The project is connected to a real Firebase project (`gaza-memory`) via `assets/js/firebase-config.js`. To run your own version, create a new Firebase project and replace the configuration data there.

### Deploying Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore
```

---

## 🔐 Security Rules (Overview)

The Firestore rules (`firestore.rules`) ensure:

- Reading is available to everyone - even unregistered visitors
- Publishing requires login, and `authorUid` must match the user's real identity
- Editing and deletion are restricted to the story's owner or an admin only
- No user can change their own role to `admin` from the client side — this field is fully protected server-side

---

## 👥 Team

This project was developed by:

**Ahmed Al-Farani** · **Hadi Abu Aisha**

---

## 📜 License

This project is open source under the [MIT](LICENSE) license.

---

<div align="center">

**All rights reserved © 2026 — Gaza's Memory. We will not forget.**

</div>
