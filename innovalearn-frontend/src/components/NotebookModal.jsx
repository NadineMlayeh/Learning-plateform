import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../api';

function formatDateLabel(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '';
  }
}

function sortTodos(items) {
  return [...items].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export default function NotebookModal({ isOpen, onClose, token }) {
  const [activeTab, setActiveTab] = useState('notes');
  const [notes, setNotes] = useState([]);
  const [todos, setTodos] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [newTodo, setNewTodo] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteValue, setEditingNoteValue] = useState('');
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingTodoValue, setEditingTodoValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveState, setSaveState] = useState('✓ All saved');

  useEffect(() => {
    if (!isOpen || !token) return;

    let isAlive = true;
    setIsLoading(true);
    Promise.all([
      apiRequest('/notebook/notes', { token }),
      apiRequest('/notebook/todos', { token }),
    ])
      .then(([notesData, todosData]) => {
        if (!isAlive) return;
        setNotes(Array.isArray(notesData) ? notesData : []);
        setTodos(sortTodos(Array.isArray(todosData) ? todosData : []));
      })
      .catch(() => {
        if (!isAlive) return;
        setNotes([]);
        setTodos([]);
        setSaveState('Unable to load');
      })
      .finally(() => {
        if (isAlive) setIsLoading(false);
      });

    return () => {
      isAlive = false;
    };
  }, [isOpen, token]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalDone = todos.filter((todo) => todo.completed).length;
  const footerText =
    activeTab === 'notes'
      ? `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`
      : `${totalDone}/${todos.length} done`;

  async function withSaving(action) {
    setSaveState('Saving...');
    try {
      await action();
      setSaveState('✓ All saved');
    } catch {
      setSaveState('Save failed');
    }
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  async function addNote() {
    const content = normalizeText(newNote);
    if (!content) return;

    await withSaving(async () => {
      const created = await apiRequest('/notebook/notes', {
        method: 'POST',
        token,
        body: { content },
      });
      setNotes((prev) => [created, ...prev]);
      setNewNote('');
    });
  }

  async function addTodo() {
    const content = normalizeText(newTodo);
    if (!content) return;

    await withSaving(async () => {
      const created = await apiRequest('/notebook/todos', {
        method: 'POST',
        token,
        body: { content },
      });
      setTodos((prev) => sortTodos([created, ...prev]));
      setNewTodo('');
    });
  }

  async function saveNoteEdit(noteId, nextValue) {
    const content = normalizeText(nextValue);
    const original = notes.find((note) => note.id === noteId)?.content || '';
    if (!content || content === original) {
      setEditingNoteId(null);
      setEditingNoteValue('');
      return;
    }

    await withSaving(async () => {
      const updated = await apiRequest(`/notebook/notes/${noteId}`, {
        method: 'PUT',
        token,
        body: { content },
      });
      setNotes((prev) => prev.map((note) => (note.id === noteId ? updated : note)));
      setEditingNoteId(null);
      setEditingNoteValue('');
    });
  }

  async function saveTodoEdit(todoId, nextValue) {
    const content = normalizeText(nextValue);
    const original = todos.find((todo) => todo.id === todoId)?.content || '';
    if (!content || content === original) {
      setEditingTodoId(null);
      setEditingTodoValue('');
      return;
    }

    await withSaving(async () => {
      const updated = await apiRequest(`/notebook/todos/${todoId}`, {
        method: 'PUT',
        token,
        body: { content },
      });
      setTodos((prev) =>
        sortTodos(prev.map((todo) => (todo.id === todoId ? updated : todo))),
      );
      setEditingTodoId(null);
      setEditingTodoValue('');
    });
  }

  async function toggleTodo(todo) {
    await withSaving(async () => {
      const updated = await apiRequest(`/notebook/todos/${todo.id}`, {
        method: 'PUT',
        token,
        body: { completed: !todo.completed },
      });
      setTodos((prev) =>
        sortTodos(prev.map((item) => (item.id === todo.id ? updated : item))),
      );
    });
  }

  async function deleteNote(noteId) {
    await withSaving(async () => {
      await apiRequest(`/notebook/notes/${noteId}`, {
        method: 'DELETE',
        token,
      });
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
    });
  }

  async function deleteTodo(todoId) {
    await withSaving(async () => {
      await apiRequest(`/notebook/todos/${todoId}`, {
        method: 'DELETE',
        token,
      });
      setTodos((prev) => prev.filter((todo) => todo.id !== todoId));
    });
  }

  const orderedTodos = sortTodos(todos);

  const modalContent = (
    <div
      className="notebook-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="My Notebook"
      onClick={onClose}
    >
      <article
        className="notebook-modal-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="notebook-modal-head">
          <div className="notebook-modal-title-row">
            <span className="notebook-modal-title-icon" aria-hidden="true">
              📋
            </span>
            <h2>My Notebook</h2>
          </div>
          <button
            type="button"
            className="notebook-modal-close"
            onClick={onClose}
            aria-label="Close notebook"
          >
            ✕
          </button>
        </header>

        <nav className="notebook-tabs">
          <button
            type="button"
            className={`notebook-tab ${activeTab === 'notes' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            📝 Quick Notes
          </button>
          <button
            type="button"
            className={`notebook-tab ${activeTab === 'todos' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('todos')}
          >
            ✅ To-Do List
          </button>
        </nav>

        <section className="notebook-content">
          {activeTab === 'notes' && (
            <>
              <div className="notebook-input-row">
                <input
                  type="text"
                  value={newNote}
                  onChange={(event) => setNewNote(event.target.value)}
                  placeholder="Write a quick note..."
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addNote();
                    }
                  }}
                />
                <button type="button" onClick={addNote}>
                  +
                </button>
              </div>

              <div className="notebook-list">
                {!isLoading && notes.length === 0 && (
                  <p className="notebook-empty">No notes yet.</p>
                )}
                {notes.map((note) => {
                  const isEditing = editingNoteId === note.id;
                  return (
                    <article className="notebook-note-card" key={note.id}>
                      <div className="notebook-note-accent" aria-hidden="true" />
                      <div className="notebook-note-main">
                        {isEditing ? (
                          <textarea
                            value={editingNoteValue}
                            onChange={(event) => setEditingNoteValue(event.target.value)}
                            onBlur={() => saveNoteEdit(note.id, editingNoteValue)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                saveNoteEdit(note.id, editingNoteValue);
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <p
                            className="notebook-note-text"
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditingNoteValue(note.content);
                            }}
                          >
                            {note.content}
                          </p>
                        )}
                        <span className="notebook-note-time">
                          {formatDateLabel(note.createdAt)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="notebook-delete-btn"
                        onClick={() => deleteNote(note.id)}
                        aria-label="Delete note"
                      >
                        ✕
                      </button>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'todos' && (
            <>
              <div className="notebook-input-row">
                <input
                  type="text"
                  value={newTodo}
                  onChange={(event) => setNewTodo(event.target.value)}
                  placeholder="Add a todo..."
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addTodo();
                    }
                  }}
                />
                <button type="button" onClick={addTodo}>
                  +
                </button>
              </div>

              <div className="notebook-list">
                {!isLoading && orderedTodos.length === 0 && (
                  <p className="notebook-empty">No todos yet.</p>
                )}
                {orderedTodos.map((todo) => {
                  const isEditing = editingTodoId === todo.id;
                  return (
                    <article
                      className={`notebook-todo-row ${todo.completed ? 'is-completed' : ''}`}
                      key={todo.id}
                    >
                      <button
                        type="button"
                        className={`notebook-checkbox ${todo.completed ? 'is-checked' : ''}`}
                        onClick={() => toggleTodo(todo)}
                        aria-label={todo.completed ? 'Mark as not done' : 'Mark as done'}
                      >
                        {todo.completed ? '✓' : ''}
                      </button>

                      {isEditing ? (
                        <input
                          className="notebook-inline-input"
                          value={editingTodoValue}
                          onChange={(event) => setEditingTodoValue(event.target.value)}
                          onBlur={() => saveTodoEdit(todo.id, editingTodoValue)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              saveTodoEdit(todo.id, editingTodoValue);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <p
                          className="notebook-todo-text"
                          onClick={() => {
                            setEditingTodoId(todo.id);
                            setEditingTodoValue(todo.content);
                          }}
                        >
                          {todo.content}
                        </p>
                      )}

                      <button
                        type="button"
                        className="notebook-delete-btn"
                        onClick={() => deleteTodo(todo.id)}
                        aria-label="Delete todo"
                      >
                        ✕
                      </button>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <footer className="notebook-footer">
          <span>{footerText}</span>
          <strong>{saveState}</strong>
        </footer>
      </article>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
