import { useState } from 'react';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';

const initialFormation = {
  title: '',
  description: '',
  price: 0,
  type: 'ONLINE',
  location: '',
  startDate: '',
  endDate: '',
};

export default function FormateurPage() {
  const user = getCurrentUser();
  const [log, setLog] = useState('No action yet.');
  const [formation, setFormation] = useState(initialFormation);
  const [formationIdForCourse, setFormationIdForCourse] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseIdForLesson, setCourseIdForLesson] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonPdfUrl, setLessonPdfUrl] = useState('');
  const [courseIdForQuiz, setCourseIdForQuiz] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [quizIdForQuestion, setQuizIdForQuestion] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [choicesText, setChoicesText] = useState('Option A|false\nOption B|true');
  const [courseIdForPublish, setCourseIdForPublish] = useState('');
  const [formationIdForPublish, setFormationIdForPublish] = useState('');

  function setApiLog(title, payload) {
    setLog(`${title}\n${JSON.stringify(payload, null, 2)}`);
  }

  async function createFormation(event) {
    event.preventDefault();
    try {
      const payload = {
        ...formation,
        price: Number(formation.price),
      };

      if (!payload.location) delete payload.location;
      if (!payload.startDate) delete payload.startDate;
      if (!payload.endDate) delete payload.endDate;

      const data = await apiRequest('/formations', {
        method: 'POST',
        token: user.token,
        body: payload,
      });
      setApiLog('Formation created', data);
      setFormationIdForCourse(String(data.id));
      setFormationIdForPublish(String(data.id));
      setFormation(initialFormation);
    } catch (err) {
      setApiLog('Create formation failed', { message: err.message });
    }
  }

  async function createCourse(event) {
    event.preventDefault();
    try {
      const data = await apiRequest(`/formations/${formationIdForCourse}/courses`, {
        method: 'POST',
        token: user.token,
        body: { title: courseTitle },
      });
      setApiLog('Course created', data);
      setCourseIdForLesson(String(data.id));
      setCourseIdForQuiz(String(data.id));
      setCourseIdForPublish(String(data.id));
      setCourseTitle('');
    } catch (err) {
      setApiLog('Create course failed', { message: err.message });
    }
  }

  async function createLesson(event) {
    event.preventDefault();
    try {
      const data = await apiRequest(`/courses/${courseIdForLesson}/lessons`, {
        method: 'POST',
        token: user.token,
        body: { title: lessonTitle, pdfUrl: lessonPdfUrl },
      });
      setApiLog('Lesson created', data);
      setLessonTitle('');
      setLessonPdfUrl('');
    } catch (err) {
      setApiLog('Create lesson failed', { message: err.message });
    }
  }

  async function createQuiz(event) {
    event.preventDefault();
    try {
      const data = await apiRequest(`/courses/${courseIdForQuiz}/quizzes`, {
        method: 'POST',
        token: user.token,
        body: { title: quizTitle },
      });
      setApiLog('Quiz created', data);
      setQuizIdForQuestion(String(data.id));
      setQuizTitle('');
    } catch (err) {
      setApiLog('Create quiz failed', { message: err.message });
    }
  }

  function parseChoices(raw) {
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [text, isCorrect] = line.split('|');
        return {
          text: (text || '').trim(),
          isCorrect: String(isCorrect).trim().toLowerCase() === 'true',
        };
      });
  }

  async function addQuestion(event) {
    event.preventDefault();
    try {
      const data = await apiRequest(`/quizzes/${quizIdForQuestion}/questions`, {
        method: 'POST',
        token: user.token,
        body: {
          text: questionText,
          choices: parseChoices(choicesText),
        },
      });
      setApiLog('Question added', data);
      setQuestionText('');
    } catch (err) {
      setApiLog('Add question failed', { message: err.message });
    }
  }

  async function publishCourse(event) {
    event.preventDefault();
    try {
      const data = await apiRequest(`/courses/${courseIdForPublish}/publish`, {
        method: 'PATCH',
        token: user.token,
      });
      setApiLog('Course published', data);
    } catch (err) {
      setApiLog('Publish course failed', { message: err.message });
    }
  }

  async function publishFormation(event) {
    event.preventDefault();
    try {
      const data = await apiRequest(`/formations/${formationIdForPublish}/publish`, {
        method: 'PATCH',
        token: user.token,
      });
      setApiLog('Formation published', data);
    } catch (err) {
      setApiLog('Publish formation failed', { message: err.message });
    }
  }

  return (
    <section className="stack">
      <div className="card">
        <h1>Formateur Workspace</h1>
        <p className="hint">Flow: create formation -&gt; create course -&gt; add lesson + 3 quizzes -&gt; publish course -&gt; publish formation.</p>
      </div>

      <form className="card grid" onSubmit={createFormation}>
        <h2>Create Formation</h2>
        <input placeholder="Title" value={formation.title} onChange={(e) => setFormation({ ...formation, title: e.target.value })} required />
        <textarea placeholder="Description" value={formation.description} onChange={(e) => setFormation({ ...formation, description: e.target.value })} required />
        <input type="number" placeholder="Price" value={formation.price} onChange={(e) => setFormation({ ...formation, price: e.target.value })} required />
        <select value={formation.type} onChange={(e) => setFormation({ ...formation, type: e.target.value })}>
          <option value="ONLINE">ONLINE</option>
          <option value="PRESENTIEL">PRESENTIEL</option>
        </select>
        <input placeholder="Location (optional)" value={formation.location} onChange={(e) => setFormation({ ...formation, location: e.target.value })} />
        <input type="date" value={formation.startDate} onChange={(e) => setFormation({ ...formation, startDate: e.target.value })} />
        <input type="date" value={formation.endDate} onChange={(e) => setFormation({ ...formation, endDate: e.target.value })} />
        <button type="submit">Create formation</button>
      </form>

      <form className="card grid" onSubmit={createCourse}>
        <h2>Create Course</h2>
        <input placeholder="Formation ID" value={formationIdForCourse} onChange={(e) => setFormationIdForCourse(e.target.value)} required />
        <input placeholder="Course title" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} required />
        <button type="submit">Create course</button>
      </form>

      <form className="card grid" onSubmit={createLesson}>
        <h2>Create Lesson</h2>
        <input placeholder="Course ID" value={courseIdForLesson} onChange={(e) => setCourseIdForLesson(e.target.value)} required />
        <input placeholder="Lesson title" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} required />
        <input placeholder="PDF URL" value={lessonPdfUrl} onChange={(e) => setLessonPdfUrl(e.target.value)} required />
        <button type="submit">Create lesson</button>
      </form>

      <form className="card grid" onSubmit={createQuiz}>
        <h2>Create Quiz</h2>
        <input placeholder="Course ID" value={courseIdForQuiz} onChange={(e) => setCourseIdForQuiz(e.target.value)} required />
        <input placeholder="Quiz title" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} required />
        <button type="submit">Create quiz</button>
      </form>

      <form className="card grid" onSubmit={addQuestion}>
        <h2>Add Question</h2>
        <input placeholder="Quiz ID" value={quizIdForQuestion} onChange={(e) => setQuizIdForQuestion(e.target.value)} required />
        <input placeholder="Question text" value={questionText} onChange={(e) => setQuestionText(e.target.value)} required />
        <textarea value={choicesText} onChange={(e) => setChoicesText(e.target.value)} rows={4} />
        <p className="hint">Choices format: one line per choice -&gt; <code>Choice text|true/false</code></p>
        <button type="submit">Add question</button>
      </form>

      <form className="card grid" onSubmit={publishCourse}>
        <h2>Publish Course</h2>
        <input placeholder="Course ID" value={courseIdForPublish} onChange={(e) => setCourseIdForPublish(e.target.value)} required />
        <button type="submit">Publish course</button>
      </form>

      <form className="card grid" onSubmit={publishFormation}>
        <h2>Publish Formation</h2>
        <input placeholder="Formation ID" value={formationIdForPublish} onChange={(e) => setFormationIdForPublish(e.target.value)} required />
        <button type="submit">Publish formation</button>
      </form>

      <pre className="card log">{log}</pre>
    </section>
  );
}
