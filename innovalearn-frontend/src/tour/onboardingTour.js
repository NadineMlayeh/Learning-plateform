import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { apiRequest } from '../api';

const TOUR_FALLBACK_KEY = 'innova_tour_done';

function readTourFallbackMap() {
  try {
    const raw = localStorage.getItem(TOUR_FALLBACK_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeTourFallbackMap(map) {
  try {
    localStorage.setItem(TOUR_FALLBACK_KEY, JSON.stringify(map));
  } catch {
    // ignore storage failures
  }
}

export function hasLocalTourDone(userId) {
  if (!userId) return false;
  const map = readTourFallbackMap();
  return Boolean(map[String(userId)]);
}

export function markLocalTourDone(userId) {
  if (!userId) return;
  const map = readTourFallbackMap();
  map[String(userId)] = true;
  writeTourFallbackMap(map);
}

export async function markTourSeen({ token, userId }) {
  if (!token || !userId) return;
  // Persist locally first so refresh/navigation can't retrigger auto-tour.
  markLocalTourDone(userId);
  try {
    await apiRequest('/users/me/tour-seen', {
      method: 'PATCH',
      token,
    });
  } catch {
    // Keep local fallback only; backend update can be retried later.
  }
}

function resolveStepElement(step) {
  if (!step?.element) return document.body;
  if (typeof step.element === 'string') return document.querySelector(step.element);
  if (typeof step.element === 'function') {
    try {
      return step.element();
    } catch {
      return null;
    }
  }
  return step.element;
}

function keepExistingSteps(steps) {
  return (steps || []).filter((step) => Boolean(resolveStepElement(step)));
}

export function startOnboardingTour({
  steps,
  onFinish,
  popoverClass = 'innova-tour-popover',
}) {
  const availableSteps = keepExistingSteps(steps);
  if (!availableSteps.length) return null;

  let completed = false;
  const doneOnce = () => {
    if (completed) return;
    completed = true;
    onFinish?.();
  };

  let tourDriver = null;
  const handleClose = () => {
    doneOnce();
    if (tourDriver?.isActive?.()) {
      tourDriver.destroy();
    }
  };

  tourDriver = driver({
    animate: true,
    smoothScroll: true,
    stagePadding: 9,
    stageRadius: 14,
    overlayColor: 'rgba(8, 18, 38, 0.72)',
    showProgress: true,
    allowClose: true,
    popoverClass,
    nextBtnText: 'Next',
    prevBtnText: 'Previous',
    doneBtnText: 'Done',
    onCloseClick: () => handleClose(),
    onDestroyStarted: () => doneOnce(),
    onDestroyed: () => doneOnce(),
  });

  tourDriver.setSteps(availableSteps);
  tourDriver.drive();
  return tourDriver;
}
