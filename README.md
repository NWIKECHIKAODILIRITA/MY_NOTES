# Notely - Premium Notes App

A premium note-taking application with a beautiful modern UI, built with **Node.js**, **Express**, and **PostgreSQL**.

![Features](https://img.shields.io/badge/Node.js-Express-green) ![Database](https://img.shields.io/badge/Database-PostgreSQL-blue) ![UI](https://img.shields.io/badge/UI-Premium-purple)

---

## ✨ Features

- **Rich Text Editor** - Bold, italic, underline, headers, lists, text colors, highlighting
- **Categories** - Organize notes with color-coded categories
- **Tags** - Add multiple tags to every note with instant search
- **Pin Notes** - Important notes stay at the top
- **Live Search** - Instantly filter notes by title, content, or tags
- **Dark/Light Mode** - Toggle between premium themes
- **Modern UI** - Glassmorphism, gradients, smooth animations, fully responsive

## 🚀 Prerequisites

Before you begin, make sure you have installed:

1. **[Node.js](https://nodejs.org/)** (v14 or later)
2. **[PostgreSQL](https://www.postgresql.org/download/)** (any recent version)

## 📦 Installation

### Step 1: Create the Database

Open **psql** or **pgAdmin** and create a new database:

```sql
CREATE DATABASE notes_db;
```

### Step 2: Configure Environment Variables

Edit the `.env` file in the project root and update it with your PostgreSQL credentials:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=notes_db
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### Step 3: Install Dependencies

Run this command in the project folder:

```bash
npm install
```

### Step 4: Initialize Database Tables

The server automatically creates the required tables (`notes` and `categories`) when it starts — no manual SQL needed.

## ▶️ Run the Website

Start the server:

```bash
npm start
```

Or in development mode (with auto-restart on file changes):

```bash
npm run dev
```

Then open your browser and go to:

```
http://localhost:3000
```

## 📋 Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the production server |
| `npm run dev` | Start with auto-reload (nodemon) |
| `npm run setup` | Auto-install dependencies & test DB connection |

## 🎨 Usage

- Click **"New Note"** to create your first note
- Use the **toolbar** to format text (bold, lists, colors, etc.)
- Add **tags** by typing comma-separated words
- Assign a **category** or create a new one with the `+` button
- **Pin** important notes to keep them on top
- Use **search** to find notes instantly
- Toggle **dark mode** from the sidebar

## 🗄️ Database Schema

**notes**

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Note ID |
| title | VARCHAR(255) | Note title |
| content | TEXT | HTML content |
| category_id | INT → categories.id | Category reference |
| tags | TEXT[] | Array of tags |
| pinned | BOOLEAN | Pinned status |
| color | VARCHAR(20) | Accent color |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

**categories**

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PRIMARY KEY | Category ID |
| name | VARCHAR(100) | Category name |
| color | VARCHAR(20) | Display color |
| created_at | TIMESTAMP | Creation time |

## 📁 Project Structure

```
├── server.js          # Express server entry point
├── database.js        # PostgreSQL connection & schema init
├── routes/
│   └── api.js         # REST API routes
├── public/
│   ├── index.html     # Main frontend
│   ├── css/
│   │   └── style.css  # Premium styles
│   └── js/
│       └── app.js     # Frontend logic
├── setup.js           # One-command setup script
├── .env               # Database configuration
└── package.json       # Project dependencies
```

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | Get all notes (supports ?search, ?category, ?tag) |
| GET | `/api/notes/:id` | Get a specific note |
| POST | `/api/notes` | Create a new note |
| PUT | `/api/notes/:id` | Update a note |
| DELETE | `/api/notes/:id` | Delete a note |
| PATCH | `/api/notes/:id/pin` | Toggle pin status |
| GET | `/api/categories` | Get all categories |
| POST | `/api/categories` | Create a category |
| DELETE | `/api/categories/:id` | Delete a category |

## 🛠️ Troubleshooting

**Can't connect to the database?**
- Make sure PostgreSQL is running
- Check your password in `.env`
- Verify the database `notes_db` exists

**Port already in use?**
- Change the `PORT` value in `.env`

**Missing dependencies?**
- Run `npm install` again

---

Made with ❤️ using Express & PostgreSQL