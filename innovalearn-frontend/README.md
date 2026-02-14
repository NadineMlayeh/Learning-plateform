# InnovaLearn Frontend (Testing UI)

This frontend is a standalone app to test the backend features without Postman.

## Run

```bash
npm install
npm run dev
```

App URL: `http://localhost:5173`
Backend URL expected: `http://localhost:3000`

## Features covered

- Signup/Login
- Role-based pages (`ADMIN`, `FORMATEUR`, `STUDENT`)
- Formateur approval state handling (blocked login message from backend)
- Admin formateur approval workflow
- Formation/Course/Lesson/Quiz creation and publishing
- Student published formations listing and enrollments

## Notes

- If your backend runs on another URL, edit `src/api.js` (`API_BASE_URL`).
- This UI is intentionally simple and focused on API testing coverage.
