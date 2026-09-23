# 🚀 Innova Learn Platform

> A full-stack educational platform for interactive learning, course management, and student progress tracking.

### 🌐 [View Live Platform](https://learning-plateform-nu.vercel.app/)

---

## 📚 About the Project

**Innova Learn** is a full-stack educational platform designed to help children learn **robotics, development, and soft skills** through structured courses and bootcamps.

The platform provides dedicated experiences for **students, formateurs, and administrators**, covering the complete learning journey — from enrollment and lesson delivery to exercises, progress tracking, badges, and certificates.

### Learning Journey

**Enroll → Learn → Practice → Progress → Earn Badges → Get Certified**

---

## ✨ Features

### 🧑‍🎓 Student

Students can:

- Browse and enroll in available formations
- Access structured courses and lessons
- Watch educational videos and access PDF resources
- Complete QCM exercises
- Progress through roadmap levels
- Track their learning progress
- Earn badges for achievements
- Receive certificates after completing formations

### 👩‍🏫 Formateur

Formateurs can:

- Create and manage formations
- Create courses and organize lessons
- Upload educational content such as videos and PDFs
- Create and manage QCM exercises
- Track student progress and performance

### 🛠️ Admin

Administrators can:

- Manage students and formateurs
- Monitor formations and platform activity
- Validate student payments
- Access platform statistics
- Supervise the overall learning ecosystem

---

## 👥 Roles & Permissions

| Role | Main Permissions |
|------|------------------|
| **Admin** | Manage users, validate payments, supervise formations, monitor statistics |
| **Formateur** | Create and manage formations, courses, lessons and exercises; monitor students |
| **Student** | Enroll in formations, access lessons, complete exercises, track progress, earn badges and certificates |

---

## 🖥️ Tech Stack

### Frontend

- **React**
- **Vite**
- JavaScript / TypeScript
- Responsive web interface

### Backend

- **NestJS**
- REST API
- JWT authentication
- Role-based access control

### Database

- **PostgreSQL / MySQL**
- **Prisma ORM**

### Deployment & DevOps

- **Vercel** — Frontend deployment
- **Render** — Backend deployment
- **GitHub Actions** — CI/CD
- **Docker** — Optional containerization

---

## 🗂️ Main Domain Entities

The platform is built around the following core entities:

- Users
- Formations
- Courses
- Lessons
- QCM Exercises
- Payments
- Badges
- Certificates
- Student Progress

### Platform Flow

```text
Student
   │
   ▼
Enrollment
   │
   ▼
Formation
   │
   ├── Courses
   │      └── Lessons
   │             ├── Videos / PDFs
   │             └── QCM Exercises
   │
   ▼
Progress Tracking
   │
   ├── Badges
   └── Certificates
```

---

## 📂 Project Structure

```text
innova/
│
├── frontend/          # React + Vite frontend application
├── innovabackend/     # NestJS backend and REST API
├── prisma/            # Database schema and migrations
├── scripts/           # Utility scripts
└── README.md
```

---

## ⚡ Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/NadineMlayeh/Learning-plateform.git
cd Learning-plateform
```

### 2. Backend Setup

```bash
cd innovabackend
npm install
```

Configure the required environment variables in your `.env` file, including the database connection and JWT configuration.

Then start the development server:

```bash
npm run start:dev
```

Backend API:

```text
http://localhost:3000
```

### 3. Frontend Setup

From the project root:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## 🔐 Authentication & Authorization

Authentication is handled using **JWT (JSON Web Tokens)**.

The platform implements **role-based access control**, with functionality available according to the authenticated user's role.

```text
Admin
├── User management
├── Payment validation
└── Platform monitoring

Formateur
├── Formation management
├── Course & lesson management
├── QCM management
└── Student progress tracking

Student
├── Course enrollment
├── Lesson access
├── QCM completion
├── Progress tracking
└── Badges & certificates
```

---

## 🚀 Deployment

The application follows a separated frontend/backend architecture:

```text
React Frontend
      │
      │ REST API
      ▼
NestJS Backend
      │
      ▼
   Database
```

- **Frontend:** Vercel
- **Backend:** Render
- **CI/CD:** GitHub Actions

### 🌐 Live Application

**[https://learning-plateform-nu.vercel.app/](https://learning-plateform-nu.vercel.app/)**

---

## 🔮 Future Improvements

- Integrate an online payment gateway
- Add advanced analytics dashboards for admins and formateurs
- Implement attendance tracking
- Add email and in-app notifications
- Expand student gamification
- Introduce additional badges and achievement levels
- Improve reporting and progress analytics
- Enhance course and student management tools

---

## 🎯 Project Goal

**Innova Learn** aims to combine **education, progress tracking, and gamification** in a single platform.

The goal is to provide students with a clear and engaging learning journey while giving formateurs and administrators the tools they need to efficiently manage educational content and monitor student progress.

---

## 🔗 Links

- **Live Platform:** [Innova Learn](https://learning-plateform-nu.vercel.app/)
- **GitHub Repository:** [Learning-plateform](https://github.com/NadineMlayeh/Learning-plateform)
