if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

function isReloadNavigation() {
  const navigationEntry = performance.getEntriesByType?.('navigation')?.[0];
  if (navigationEntry) {
    return navigationEntry.type === 'reload';
  }
  return performance.navigation?.type === 1;
}

function resetScrollOnRefresh() {
  if (!isReloadNavigation()) {
    return;
  }

  if (window.location.hash) {
    history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
  }
  window.scrollTo(0, 0);
}

resetScrollOnRefresh();

const triggers = Array.from(document.querySelectorAll('[data-time-trigger]'));
const phaseTriggerOffsets = {
  midday: 0.45,
  afternoon: 0.35,
  night: 0.2,
};
const phaseAnimationClasses = [
  'sunrise-to-day',
  'sunrise-to-midday',
  'day-to-midday',
  'midday-to-day',
  'midday-to-night',
  'day-to-night',
  'night-to-midday',
  'night-to-day',
];
const phaseStateClasses = ['midday', 'afternoon', 'dark'];
const transitionAnimations = {
  'day:midday': 'day-to-midday',
  'day:night': 'day-to-night',
  'midday:day': 'midday-to-day',
  'midday:night': 'midday-to-night',
  'night:midday': 'night-to-midday',
  'night:day': 'night-to-day',
};

let triggerThresholds = [];
let ticking = false;
let initialized = false;
let activePhase = '';

function measureTriggers() {
  triggerThresholds = triggers.map((trigger) => {
    const triggerOffset = window.innerHeight * (phaseTriggerOffsets[trigger.dataset.timeTrigger] ?? 0.45);
    return {
      phase: trigger.dataset.timeTrigger,
      top: trigger.getBoundingClientRect().top + window.scrollY - triggerOffset,
    };
  });
}

function getCurrentPhase() {
  return triggerThresholds.reduce((phase, trigger) => (
    window.scrollY >= trigger.top ? trigger.phase : phase
  ), 'day');
}

function getInitialAnimation(phase) {
  if (phase === 'day') {
    return 'sunrise-to-day';
  }
  if (phase === 'midday') {
    return 'sunrise-to-midday';
  }
  return '';
}

function applyPhase(phase) {
  const previousPhase = activePhase;
  const animationClass = initialized
    ? transitionAnimations[`${previousPhase}:${phase}`]
    : getInitialAnimation(phase);

  document.body.classList.remove(...phaseAnimationClasses, ...phaseStateClasses);
  document.body.classList.toggle('midday', phase === 'midday');
  document.body.classList.toggle('afternoon', phase === 'afternoon');
  document.body.classList.toggle('dark', phase === 'night');
  if (animationClass) {
    document.body.classList.add(animationClass);
  }
  activePhase = phase;
}

function updateTimeFromScroll() {
  if (!triggerThresholds.length) {
    measureTriggers();
  }

  const currentPhase = getCurrentPhase();
  if (currentPhase !== activePhase) {
    applyPhase(currentPhase);
  }

  if (!initialized) {
    initialized = true;
    window.requestAnimationFrame(() => {
      document.body.classList.add('animation-ready');
    });
  }
  ticking = false;
}

function scheduleTimeUpdate() {
  if (!ticking) {
    window.requestAnimationFrame(updateTimeFromScroll);
    ticking = true;
  }
}

function handleResize() {
  measureTriggers();
  scheduleTimeUpdate();
}

document.body.addEventListener('animationend', (event) => {
  if (event.target === document.body) {
    document.body.classList.remove(...phaseAnimationClasses);
  }
});

measureTriggers();
updateTimeFromScroll();
window.addEventListener('load', handleResize);
window.addEventListener('scroll', scheduleTimeUpdate, { passive: true });
window.addEventListener('resize', handleResize);
