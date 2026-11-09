// Saved figures for one or more people, kept in this browser's localStorage only.
// Nothing leaves the device. Every read and write tolerates storage being unavailable
// (private windows, blocked site data), in which case the page works without saving.

export const STORE_KEY = 'tax-simplified:v1';

export interface Person {
  id: string;
  name: string;
  updatedAt: string | null;
  /** The form's saved state; shape owned by the calculator. */
  data: unknown;
}

export interface Store {
  v: 1;
  activeId: string;
  people: Person[];
}

type Getter = Pick<Storage, 'getItem'>;
type Setter = Pick<Storage, 'setItem'>;

const newId = () => Math.random().toString(36).slice(2, 10);

export function emptyStore(name = 'Me'): Store {
  const id = newId();
  return { v: 1, activeId: id, people: [{ id, name, updatedAt: null, data: null }] };
}

function isStore(x: unknown): x is Store {
  if (!x || typeof x !== 'object') return false;
  const s = x as Store;
  return (
    s.v === 1 &&
    typeof s.activeId === 'string' &&
    Array.isArray(s.people) &&
    s.people.length > 0 &&
    s.people.every((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
  );
}

export function loadStore(storage: Getter | null): Store {
  try {
    const raw = storage?.getItem(STORE_KEY);
    if (raw) {
      const s: unknown = JSON.parse(raw);
      if (isStore(s)) {
        return s.people.some((p) => p.id === s.activeId) ? s : { ...s, activeId: s.people[0]!.id };
      }
    }
  } catch {
    // unreadable or blocked: start fresh
  }
  return emptyStore();
}

/** Returns false when the browser refused to save (storage blocked or full). */
export function saveStore(storage: Setter | null, store: Store): boolean {
  try {
    if (!storage) return false;
    storage.setItem(STORE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export const activePerson = (s: Store): Person => s.people.find((p) => p.id === s.activeId) ?? s.people[0]!;

export function addPerson(s: Store, name: string): Store {
  const id = newId();
  return {
    ...s,
    activeId: id,
    people: [...s.people, { id, name: name.trim() || 'Someone', updatedAt: null, data: null }],
  };
}

export function renamePerson(s: Store, id: string, name: string): Store {
  const n = name.trim();
  if (!n) return s;
  return { ...s, people: s.people.map((p) => (p.id === id ? { ...p, name: n } : p)) };
}

/** Deletes a person and their figures. The last person is reset rather than removed. */
export function removePerson(s: Store, id: string): Store {
  const rest = s.people.filter((p) => p.id !== id);
  if (rest.length === 0) return emptyStore();
  return { ...s, people: rest, activeId: s.activeId === id ? rest[0]!.id : s.activeId };
}

export const setActive = (s: Store, id: string): Store =>
  s.people.some((p) => p.id === id) ? { ...s, activeId: id } : s;

export function updateData(s: Store, id: string, data: unknown, now: Date): Store {
  return {
    ...s,
    people: s.people.map((p) => (p.id === id ? { ...p, data, updatedAt: now.toISOString() } : p)),
  };
}
