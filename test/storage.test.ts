import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  activePerson,
  addPerson,
  loadStore,
  removePerson,
  renamePerson,
  saveStore,
  setActive,
  STORE_KEY,
  updateData,
} from '../src/lib/storage.ts';

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

describe('saved people', () => {
  it('starts with one person when nothing is saved or storage is blocked', () => {
    assert.equal(loadStore(memory()).people.length, 1);
    assert.equal(loadStore(null).people[0]!.name, 'Me');
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
    };
    assert.equal(loadStore(broken).people.length, 1);
  });

  it('ignores corrupt data', () => {
    const s = memory();
    s.m.set(STORE_KEY, '{not json');
    assert.equal(loadStore(s).people.length, 1);
    s.m.set(STORE_KEY, JSON.stringify({ v: 1, activeId: 'x', people: [] }));
    assert.equal(loadStore(s).people.length, 1);
  });

  it('round-trips people and their figures', () => {
    const s = memory();
    let st = loadStore(s);
    st = addPerson(st, 'Amma');
    st = updateData(st, st.activeId, { employers: [1] }, new Date('2026-11-09T10:00:00Z'));
    assert.equal(saveStore(s, st), true);
    const back = loadStore(s);
    assert.equal(back.people.length, 2);
    assert.equal(activePerson(back).name, 'Amma');
    assert.deepEqual(activePerson(back).data, { employers: [1] });
    assert.equal(activePerson(back).updatedAt, '2026-11-09T10:00:00.000Z');
  });

  it('switches, renames and removes', () => {
    let st = addPerson(loadStore(null), 'Thaththa');
    const first = st.people[0]!.id;
    st = setActive(st, first);
    assert.equal(activePerson(st).name, 'Me');
    st = renamePerson(st, first, '  Nuwan ');
    assert.equal(activePerson(st).name, 'Nuwan');
    assert.equal(renamePerson(st, first, '   '), st);
    st = removePerson(st, first);
    assert.equal(st.people.length, 1);
    assert.equal(activePerson(st).name, 'Thaththa');
    st = removePerson(st, st.activeId);
    assert.equal(st.people.length, 1);
    assert.equal(activePerson(st).data, null);
  });

  it('reports when saving is refused', () => {
    const full = {
      setItem: () => {
        throw new Error('quota');
      },
    };
    assert.equal(saveStore(full, loadStore(null)), false);
    assert.equal(saveStore(null, loadStore(null)), false);
  });
});
