'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TOPICS, type Topic, type TopicId } from './explainers';
import { XIcon } from './Icons';

/** A small "?" mark that opens a plain-language explainer with a short animation. */
export function Hint({ topic }: { topic: TopicId }) {
  const [open, setOpen] = useState(false);
  const t = TOPICS[topic];
  return (
    <>
      <button
        type="button"
        className="hint"
        aria-haspopup="dialog"
        aria-label={`Explain: ${t.title}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        ?
      </button>
      {open && createPortal(<Explainer topic={topic} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

/** Text followed by a hint mark, keeping the last word and the mark together on one line. */
export function WithHint({ text, topic }: { text: string; topic: TopicId }) {
  const i = text.lastIndexOf(' ');
  return (
    <>
      {text.slice(0, i + 1)}
      <span className="nowrap">
        {text.slice(i + 1)}
        <Hint topic={topic} />
      </span>
    </>
  );
}

function Explainer({ topic, onClose }: { topic: TopicId; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [play, setPlay] = useState(0);
  const t: Topic = TOPICS[topic];
  const Scene = t.scene;

  useEffect(() => {
    const d = ref.current;
    // removing the element on unmount closes it; calling close() here would fire onClose twice
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="explain"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        // a click on the backdrop lands on the dialog element itself
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="explain-card">
        <header className="explain-head">
          <div>
            <h2 id={titleId}>{t.title}</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <XIcon />
          </button>
        </header>

        <figure className="explain-scene">
          <Scene key={play} />
          <figcaption>
            <button type="button" className="link-btn" onClick={() => setPlay((n) => n + 1)}>
              Play again
            </button>
          </figcaption>
        </figure>

        <div className="explain-body">{t.body}</div>

        {t.example && (
          <p className="explain-example">
            <b>Example.</b> {t.example}
          </p>
        )}
        {t.where && (
          <p className="explain-where">
            <b>Where to find it:</b> {t.where}
          </p>
        )}

        <div className="explain-actions">
          <button type="button" className="btn-primary" onClick={onClose} autoFocus>
            Got it
          </button>
        </div>
      </div>
    </dialog>
  );
}
