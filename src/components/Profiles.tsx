'use client';

import { PROFILES, SECTION_LABEL, type ProfileId } from '@/lib/profiles';
import { BankIcon, BriefcaseIcon, GlobeIcon, LaptopIcon, PlusIcon } from './Icons';
import type { TaxForm } from './useTaxForm';

const ICON: Record<ProfileId, () => React.ReactNode> = {
  salaried: BriefcaseIcon,
  mixed: GlobeIcon,
  freelancer: LaptopIcon,
  savings: BankIcon,
};

/** First choice on the page: which kind of income you had. Decides which sections appear. */
export function ProfilePicker({ f }: { f: TaxForm }) {
  return (
    <section className="part" aria-labelledby="sec-profile">
      <header className="part-head">
        <h2 id="sec-profile">Your income for 2025/26</h2>
      </header>
      <fieldset className="profiles">
        <legend>Which describes you best?</legend>
        <div className="profile-grid">
          {PROFILES.map((p) => {
            const Icon = ICON[p.id];
            const on = f.profile === p.id;
            return (
              <label key={p.id} className={`profile-card${on ? ' on' : ''}`}>
                <input type="radio" name="profile" value={p.id} checked={on} onChange={() => f.setProfile(p.id)} />
                <span className="profile-icon">
                  <Icon />
                </span>
                <span className="profile-title">{p.title}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
}

/** Sections hidden by the profile, offered back in one line. */
export function SomethingElse({ f }: { f: TaxForm }) {
  if (f.addable.length === 0) return null;
  return (
    <section className="part something-else" aria-labelledby="sec-else">
      <h2 id="sec-else">Something else?</h2>
      <div className="else-row">
        {f.addable.map((s) => (
          <button key={s} type="button" className="btn-secondary" onClick={() => f.addSection(s)}>
            <PlusIcon /> {SECTION_LABEL[s]}
          </button>
        ))}
      </div>
    </section>
  );
}
