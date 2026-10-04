// Dev-only click recorder: logs each click as a readable step so a navigation
// path can be copied from the console and shared.
//   copy(clickPath())  - copy the recorded steps (DevTools console)
//   clearClicks()      - start a new recording
// Steps survive page reloads (sessionStorage) until cleared or the tab is closed.

const STORAGE_KEY = 'dev-click-path';
const INTERACTIVE =
  'button, a, input, select, textarea, label, [role="button"], [role="option"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="switch"], [role="radio"], [data-combobox-option]';

type Fiber = { type: unknown; return: Fiber | null };

function loadSteps(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveSteps(steps: string[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(steps));
  } catch {
    // storage unavailable - keep recording in memory only
  }
}

let steps = loadSteps();

function oneLine(text: string | null | undefined, max = 50) {
  const s = (text ?? '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function describeElement(el: Element) {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute('role');
  const kind = role ?? (tag === 'input' ? `input[${(el as HTMLInputElement).type}]` : tag);
  const label =
    el.getAttribute('aria-label') ||
    oneLine((el as HTMLElement).innerText) ||
    el.getAttribute('title') ||
    el.getAttribute('placeholder') ||
    el.getAttribute('alt') ||
    el.getAttribute('name') ||
    '';
  return label ? `${kind} "${label}"` : kind;
}

function componentName(type: unknown): string | null {
  if (!type || typeof type === 'string') return null;
  const t = type as { displayName?: string; name?: string; render?: { name?: string }; type?: { name?: string } };
  return t.displayName || t.name || t.render?.name || t.type?.name || null;
}

// Nearest components from this app (skips Mantine/router internals)
function userComponents(el: Element, limit = 3) {
  const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
  let fiber = key ? ((el as unknown as Record<string, Fiber>)[key] ?? null) : null;
  const names: string[] = [];
  while (fiber && names.length < limit) {
    const name = componentName(fiber.type);
    if (name && /^[A-Z]/.test(name) && !name.includes('/') && !names.includes(name) && !/^(Mantine|Router|Match|Outlet|Transitioner|SafeFragment|CatchBoundary|ErrorBoundary)/.test(name) && !/(Impl|Boundary)$/.test(name)) {
      names.push(name);
    }
    fiber = fiber.return;
  }
  return names;
}

function record(step: string) {
  steps.push(step);
  saveSteps(steps);
  console.log(`%c[click ${steps.length}]%c ${step}`, 'color:#228be6;font-weight:bold', 'color:inherit');
}

function onClick(event: MouseEvent) {
  const target = event.target as Element | null;
  if (!target) return;
  const el = target.closest(INTERACTIVE) ?? target;
  const components = userComponents(el);
  const where = components.length ? ` in ${components.join(' › ')}` : '';
  record(`click ${describeElement(el)}${where} @ ${location.pathname}${location.search}`);
}

function onChange(event: Event) {
  const el = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  if (!el || !('value' in el)) return;
  if (el instanceof HTMLInputElement && ['password', 'checkbox', 'radio'].includes(el.type)) return;
  const components = userComponents(el);
  const where = components.length ? ` in ${components.join(' › ')}` : '';
  record(`typed "${oneLine(el.value)}" into ${describeElement(el)}${where}`);
}

export function startClickRecorder() {
  document.addEventListener('click', onClick, true);
  document.addEventListener('change', onChange, true);

  const w = window as unknown as Record<string, unknown>;
  w.clickPath = () => `Click path (${steps.length} steps):\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
  w.clearClicks = () => {
    steps = [];
    saveSteps(steps);
    console.log('[click] recording cleared');
  };

  console.log(
    `%c[click recorder]%c ${steps.length ? `${steps.length} steps recorded so far. ` : ''}Run copy(clickPath()) to copy the steps, clearClicks() to start over.`,
    'color:#228be6;font-weight:bold',
    'color:inherit',
  );
}
