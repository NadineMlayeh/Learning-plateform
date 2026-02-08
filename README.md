🚀 Innova Learn Platform

A full-stack educational platform for kids to learn robotics, soft skills, and coding interactively.

📚 Table of Contents

Overview

Features

Users & Roles

Tech Stack

Project Structure

Getting Started

Future Improvements

🔍 Overview

Innova Learn Platform is a modern, interactive learning platform where students can enroll in courses, complete lessons, and earn badges.
Formateurs create content and track progress, while admins manage the entire system.

It’s perfect for structured learning and gamified progression.

✨ Features
🧑‍🎓 Student

Enroll in formations & courses

Access lessons (videos & PDFs)

Complete QCM exercises ✅

Unlock roadmap levels & earn badges 🏅

Receive certificates 🎓

👨‍🏫 Formateur

Create & manage formations/courses

Upload lesson content (video/PDF) 📄

Add QCM exercises for courses

Track student progress 📊

🛡️ Admin

Manage users (students & formateurs)

Validate payments 💰

View platform statistics & dashboards 📈

🧩 Users & Roles
Role	Permissions
🛡️ Admin	Full access to manage users, validate payments, monitor stats
👨‍🏫 Formateur	Create/manage courses, upload content, add exercises
🧑‍🎓 Student	Enroll in courses, complete lessons/exercises, earn badges & certificates
🛠️ Tech Stack

Frontend: React (Vite) ⚛️

Backend: NestJS 🔥

Database: PostgreSQL / MySQL 🗄️

Authentication: JWT 🔐

Deployment: Vercel (frontend) + Render (backend) 🌐

Optional: Docker 🐳

CI/CD: GitHub Actions ⚙️

🗂️ Project Structure
innova/
├─ frontend/          # React application
├─ innovabackend/     # NestJS backend with API endpoints
├─ prisma/            # Database schema & migrations
├─ scripts/           # Utility scripts
└─ README.md


Entities & Flow:

Users → Students, Formateurs, Admin

Formations → Courses → Lessons → QCM → Badges & Certificates

Students enroll → complete lessons → progress tracked → achievements awarded 🎖️

🚀 Getting Started

Clone the repo

git clone https://github.com/NadineMlayeh/Learning-plateform.git
cd Learning-plateform


Backend setup

cd innovabackend
npm install
# configure .env for DB connection
npm run start:dev


Frontend setup

cd frontend
npm install
npm run dev


Access platform

Frontend: http://localhost:5173

Backend: http://localhost:3000

🌟 Future Improvements

Integrate online payment gateway for automatic validation 💳

Add advanced dashboards for admins & formateurs 📊

Attendance tracking & notifications 🔔

More gamification elements for students 🎮
