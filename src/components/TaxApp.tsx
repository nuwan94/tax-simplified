'use client';

import { useEffect, useRef, useState } from 'react';
import {
  activePerson,
  addPerson,
  emptyStore,
  loadStore,
  removePerson,
  renamePerson,
  saveStore,
  setActive,
  updateData,
  type Store,
} from '@/lib/storage';
import { Calculator } from './Calculator';
import { PlusIcon } from './Icons';
import type { SavedForm } from './useTaxForm';

const browserStorage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** People on this device and the calculator for whoever is selected. Saved in this browser only. */
export function TaxApp() {
  // Pre-rendered pages have no storage; the saved people load after hydration.
  const [store, setStore] = useState<Store | null>(null);
  const [saved, setSaved] = useState<boolean | null>(null);
  useEffect(() => setStore(loadStore(browserStorage())), []);

  const commit = (next: Store) => {
    setStore(next);
    setSaved(saveStore(browserStorage(), next));
  };

  // A save from the calculator always applies to the person it was opened for.
  const storeRef = useRef(store);
  storeRef.current = store;
  const save = (id: string) => (data: SavedForm) => {
    const s = storeRef.current;
    if (s) commit(updateData(s, id, data, new Date()));
  };

  if (!store) {
    return <Calculator key="loading" />;
  }
  const person = activePerson(store);

  return (
    <>
      <PeopleBar store={store} saved={saved} onChange={commit} />
      <Calculator key={person.id} initial={person.data} onSave={save(person.id)} person={person.name} />
    </>
  );
}

function PeopleBar({ store, saved, onChange }: { store: Store; saved: boolean | null; onChange: (s: Store) => void }) {
  const person = activePerson(store);
  const [editing, setEditing] = useState<null | 'add' | 'rename'>(null);
  const [name, setName] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onChange(editing === 'add' ? addPerson(store, name) : renamePerson(store, person.id, name));
    setEditing(null);
  };

  const remove = () => {
    const ok = window.confirm(`Delete ${person.name}'s figures from this browser? This can't be undone.`);
    if (ok) onChange(store.people.length > 1 ? removePerson(store, person.id) : emptyStore());
  };

  const updated = person.updatedAt
    ? new Date(person.updatedAt).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <section className="people" aria-label="Whose tax">
      <div className="people-row">
        <span className="people-label">Whose tax?</span>
        <div className="people-list" role="radiogroup" aria-label="Person">
          {store.people.map((p) => (
            <label key={p.id} className={`person-chip${p.id === person.id ? ' on' : ''}`}>
              <input
                type="radio"
                name="person"
                checked={p.id === person.id}
                onChange={() => onChange(setActive(store, p.id))}
              />
              <span className="avatar" aria-hidden="true">
                {p.name.trim().charAt(0).toUpperCase() || '?'}
              </span>
              {p.name}
            </label>
          ))}
          <button
            type="button"
            className="btn-secondary small"
            onClick={() => {
              setName('');
              setEditing('add');
            }}
          >
            <PlusIcon /> Add person
          </button>
        </div>
      </div>

      {editing ? (
        <form className="people-form" onSubmit={submit}>
          <label className="mini-field">
            <span>{editing === 'add' ? 'Name of the new person' : `New name for ${person.name}`}</span>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Amma" maxLength={40} />
          </label>
          <button type="submit" className="btn-primary small">
            {editing === 'add' ? 'Add' : 'Rename'}
          </button>
          <button type="button" className="link-btn" onClick={() => setEditing(null)}>
            Cancel
          </button>
        </form>
      ) : (
        <p className="people-status">
          <span>{saved === false ? 'Not saving in this browser' : updated ? `Saved ${updated}` : ''}</span>
          <span className="people-actions">
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setName(person.name);
                setEditing('rename');
              }}
            >
              Rename
            </button>
            <button type="button" className="link-btn danger" onClick={remove}>
              Delete
            </button>
          </span>
        </p>
      )}
    </section>
  );
}
