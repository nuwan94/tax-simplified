import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addableSections, PROFILES, visibleSections } from '../src/lib/profiles.ts';

describe('income profiles', () => {
  it('shows nothing until a profile is picked', () => {
    assert.deepEqual(visibleSections(null), []);
    assert.deepEqual(addableSections(null), []);
  });

  it('every profile includes bank interest', () => {
    for (const p of PROFILES) assert.ok(p.sections.includes('interest'), p.id);
  });

  it('shows the profile sections in page order', () => {
    assert.deepEqual(visibleSections('mixed'), ['salary', 'freelance', 'interest', 'paid']);
    assert.deepEqual(visibleSections('freelancer'), ['freelance', 'interest', 'paid']);
  });

  it('added sections join in page order and leave the addable list', () => {
    assert.deepEqual(visibleSections('savings', ['paid', 'salary']), ['salary', 'interest', 'paid']);
    assert.deepEqual(addableSections('savings', ['salary']), ['freelance', 'paid']);
    assert.deepEqual(addableSections('mixed'), []);
  });
});
