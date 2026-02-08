🚀 Innova Learn Platform

A full-stack educational platform for teaching kids robotics, soft skills, and development through interactive courses and bootcamps.

📚 Overview

Innova Learn Platform provides an interactive and organized learning experience for children of different ages.
Formateurs (teachers) can create and manage courses, while students learn, complete exercises, and earn badges and certificates.
Admins oversee the system, validate payments, and monitor progress.

✨ Features
🧑‍🎓 Student

Enroll in formations and courses

Access lesson content (videos, PDFs)

Complete QCM exercises and unlock roadmap levels

Earn badges 🏅 and certificates 🎓

👩‍🏫 Formateur

Create & manage formations and courses

Upload lesson content (video/PDF)

Add QCM exercises

Track student progress 📊

🛠️ Admin

Manage users (students & formateurs)

Validate payments 💰

View platform statistics 📈

👥 Users & Roles
Role	Permissions
Admin	Full access to manage users, validate payments, monitor stats
Formateur	Create/manage courses, upload content, add exercises
Student	Enroll in courses, complete lessons & exercises, earn badges & certificates
🖥️ Tech Stack

Frontend: React (Vite) ⚛️

Backend: NestJS 🏗️

Database: PostgreSQL / MySQL 🗄️

Authentication: JWT 🔒

Deployment: Vercel (frontend) + Render (backend) 🌐

CI/CD: GitHub Actions 🤖

Optional: Docker 🐳

📂 Project Structure
innova/
├─ frontend/           # React application
├─ innovabackend/      # NestJS backend with API endpoints
├─ prisma/             # Database schema & migrations
├─ scripts/            # Utility scripts
└─ README.md


Roles: Admin, Formateur, Student

Entities: Users, Formations, Courses, Lessons, QCM Exercises, Payments, Badges, Certificates

Flow: Students enroll → complete courses → progress tracked → badges/certificates awarded

⚡ Getting Started
1️⃣ Clone the repo
git clone https://github.com/NadineMlayeh/Learning-plateform.git
cd Learning-plateform

2️⃣ Backend setup
cd innovabackend
npm install
# configure .env for DB connection
npm run start:dev

3️⃣ Frontend setup
cd frontend
npm install
npm run dev

4️⃣ Access platform

Frontend: http://localhost:5173

Backend API: http://localhost:3000

🚀 Future Improvements

Integrate online payment gateway for automatic validation 💳

Add analytics dashboards for admin & formateurs 📊

Implement attendance tracking & notifications 🔔

Add more gamification elements for students 🎮
