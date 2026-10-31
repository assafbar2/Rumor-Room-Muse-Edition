'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  Fingerprint,
  Gem,
  Image as ImageIcon,
  Link2,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  Pin,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { asset, cases, caseById } from '@/lib/game/cases';
import { CaseFile, ClaimId, Move, Source, moves, ReplySchema } from '@/lib/game/schema';
import {
  Game as GameState,
  GameAction,
  discoveredIds,
  gameReducer,
  hasResearched,
  interviewsLeft,
  newGame,
  researchLeft,
  revealedIds,
  score,
} from '@/lib/game/rules';
import {
  Progress,
  emptyProgress,
  mergeProgress,
  readProgress,
  recordScore,
  updateProgress,
  writeProgress,
  STORAGE_KEY,
} from '@/lib/game/storage';

const pad = (n: number) => String(n).padStart(2, '0');
const difficulty = ['First impressions', 'Read between the lines', 'Trust nothing'];
const moveIcons = { trace: Fingerprint, second: Link2, primary: ShieldCheck, fresh: Clock3 };
const dateLabel = (date: string) =>
  new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }) + ' UTC';

function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previouslyFocused?.focus();
    };
  }, []);
  return (
    <dialog
      className={`dialog ${wide ? 'dialog-wide' : ''}`}
      ref={ref}
      aria-label={title}
      onCancel={() => close.current()}
      onClick={(e) => {
        if (e.target === e.currentTarget) close.current();
      }}
    >
      <div className="dialog-shell">
        <div className="dialog-heading">
          <span className="eyebrow">RUMOR ROOM / THE FILES</span>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X size={22} />
          </button>
        </div>
        <h2>{title}</h2>
        {children}
      </div>
    </dialog>
  );
}

function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="A good story deserves a second look." onClose={onClose}>
      <p className="dialog-intro">
        Four claims. Four research turns. One claim the evidence doesn’t support. Your job: find it.
      </p>
      <ol className="how-steps">
        <li>
          <strong>Pick a rumor.</strong>
          <p>
            Select a claim, then spend one turn tracing its origin, finding a second source,
            checking an official record, or looking for an update.
          </p>
        </li>
        <li>
          <strong>Follow the receipts.</strong>
          <p>
            Read your source documents. Three headlines can still come from one source. Re-reading
            is always free.
          </p>
        </li>
        <li>
          <strong>Look closer. Ask better.</strong>
          <p>
            Inspect and pin the exhibit for free. Ask the witness up to two prepared questions.
            Compare the image with records you’ve found.
          </p>
        </li>
        <li>
          <strong>Call the bluff.</strong>
          <p>
            Choose the claim you don’t buy and lock your verdict. The receipt explains the answer,
            even if you missed it.
          </p>
        </li>
      </ol>
      <div className="rule-note">
        <strong>100 points for a correct verdict.</strong> Add 15 for each unused research turn, up
        to 160. A lucky guess can score well; the receipt always shows how much you investigated.
      </div>
      <p className="fine-print">
        All ten cases are unlocked. Progress saves on this browser when storage is available.
        Replays keep the same solution. Every character and event is fictional.
      </p>
      <button className="button button-primary full-width" onClick={onClose}>
        I know what to look for <ArrowRight size={18} />
      </button>
    </Dialog>
  );
}

function Mark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span>R</span>
      <span>R</span>
    </span>
  );
}

export default function RumorRoom({ liveEnabled }: { liveEnabled: boolean }) {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const progressRef = useRef(progress);
  const ownedRequests = useRef(new Set<string>());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [howTo, setHowTo] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const save = useCallback((next: Progress, replace = false) => {
    let saved = next;
    try {
      const latest = readProgress(window.localStorage, { preservePending: true });
      if (!replace && !latest.unavailable)
        saved = mergeProgress(progressRef.current, next, latest.progress);
      if (!writeProgress(window.localStorage, saved)) {
        saved = next;
        setNotice('Progress is saved for this visit only. Browser storage is unavailable.');
      }
    } catch {
      setNotice('Progress is saved for this visit only. Browser storage is unavailable.');
    }
    progressRef.current = saved;
    setProgress(saved);
  }, []);

  const prepareCase = useCallback(
    (c: CaseFile) => {
      const game = progressRef.current.games[c.id];
      if (!game) {
        save(updateProgress(progressRef.current, newGame(c)));
      } else if (game.pendingRequestId && !ownedRequests.current.has(game.pendingRequestId)) {
        // Opening a saved run never restarts a request from another document.
        setNotice(
          'Your live interview was interrupted. It was not resent. Prepared questions are still available.',
        );
        save(updateProgress(progressRef.current, { ...game, pendingRequestId: null }));
      }
    },
    [save],
  );

  useEffect(() => {
    let loaded: Progress;
    try {
      const result = readProgress(window.localStorage, { preservePending: true });
      loaded = result.progress;
      setNotice(result.notice);
    } catch {
      loaded = emptyProgress();
      setNotice('Browser storage is unavailable. You can still play for this visit.');
    }
    const syncLocation = () => {
      const id = new URLSearchParams(window.location.hash.slice(1)).get('case');
      const c = id ? caseById(id) : undefined;
      if (c) prepareCase(c);
      setActiveId(c?.id ?? null);
    };
    progressRef.current = loaded;
    setProgress(loaded);
    syncLocation();
    setReady(true);
    window.addEventListener('hashchange', syncLocation);
    window.addEventListener('popstate', syncLocation);
    const syncStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      try {
        const result = readProgress(window.localStorage, { preservePending: true });
        if (result.unavailable) return;
        const latest = result.progress;
        progressRef.current = latest;
        setProgress(latest);
      } catch {
        setNotice('Progress is saved for this visit only. Browser storage is unavailable.');
      }
    };
    window.addEventListener('storage', syncStorage);
    return () => {
      window.removeEventListener('hashchange', syncLocation);
      window.removeEventListener('popstate', syncLocation);
      window.removeEventListener('storage', syncStorage);
    };
  }, [prepareCase]);

  function navigate(c?: CaseFile) {
    if (!ready) return;
    if (c) prepareCase(c);
    window.history.pushState(
      {},
      '',
      c ? `#case=${c.id}` : window.location.pathname + window.location.search,
    );
    setActiveId(c?.id ?? null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function dispatch(caseId: string, gameId: string, action: GameAction): boolean {
    if (action.type === 'live-success' || action.type === 'live-failure')
      ownedRequests.current.delete(action.requestId);
    const game = progressRef.current.games[caseId];
    if (!game || game.gameId !== gameId) return false;
    const next = gameReducer(game, action, caseById(caseId)!);
    if (next === game) return false;
    if (action.type === 'live-start') ownedRequests.current.add(action.requestId);
    save(updateProgress(progressRef.current, next));
    return true;
  }
  const c = activeId ? caseById(activeId) : undefined;
  const game = c ? progress.games[c.id] : undefined;
  const closed = Object.values(progress.records).filter((r) => r.correct).length;
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          const main = document.getElementById('main');
          main?.focus();
          main?.scrollIntoView();
        }}
      >
        Skip to the game
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a
            className="brand"
            href={asset('/')}
            onClick={(e) => {
              e.preventDefault();
              navigate();
            }}
            aria-label="Rumor Room home"
          >
            <Mark />
            <span>
              RUMOR ROOM<span className="brand-sub">NOT EVERY STORY HOLDS UP.</span>
            </span>
          </a>
          <div className="header-actions">
            <span className="edition">
              THE PRIVATE FILES <span>VOL. 01</span>
            </span>
            <button className="button button-quiet" onClick={() => setHowTo(true)}>
              <CircleHelp size={17} />
              <span>How to play</span>
            </button>
          </div>
        </div>
      </header>
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button
            className="icon-button"
            onClick={() => setNotice('')}
            aria-label="Dismiss progress notice"
          >
            <X size={17} />
          </button>
        </div>
      )}
      <main id="main" tabIndex={-1}>
        {c && game ? (
          <Investigation
            key={game.gameId}
            c={c}
            game={game}
            liveEnabled={liveEnabled}
            dispatch={(action) => dispatch(c.id, game.gameId, action)}
            onBack={() => navigate()}
            onReplay={() => {
              save(updateProgress(progressRef.current, newGame(c)));
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onNext={() => navigate(cases[c.number % cases.length])}
          />
        ) : (
          <CaseShelf progress={progress} closed={closed} ready={ready} onOpen={navigate} />
        )}
      </main>
      <footer className="site-footer">
        <div>
          <span className="footer-brand">RUMOR ROOM</span>
          <p>All fiction. Real instincts.</p>
        </div>
        <p className="footer-center">TEN CASES. A FEW BEAUTIFUL LIES.</p>
        <button className="text-button" onClick={() => setClearOpen(true)}>
          Reset my progress <RotateCcw size={13} />
        </button>
      </footer>
      {howTo && <HowTo onClose={() => setHowTo(false)} />}
      {clearOpen && (
        <Dialog title="A clean slate?" onClose={() => setClearOpen(false)}>
          <p>
            This clears all ten case saves and your best scores on this browser. You can start any
            case again.
          </p>
          <div className="dialog-actions">
            <button className="button button-outline" onClick={() => setClearOpen(false)}>
              Keep my progress
            </button>
            <button
              className="button button-primary"
              onClick={() => {
                save(emptyProgress(), true);
                setClearOpen(false);
                navigate();
              }}
            >
              Clear all progress
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}

function CaseShelf({
  progress,
  closed,
  ready,
  onOpen,
}: {
  progress: Progress;
  closed: number;
  ready: boolean;
  onOpen: (c: CaseFile) => void;
}) {
  const [filter, setFilter] = useState('All cases');
  const [genre, setGenre] = useState('All genres');
  const filtered = cases.filter(
    (c) =>
      (genre === 'All genres' || c.category === genre) &&
      (filter === 'Unsolved'
        ? !progress.records[c.id]?.correct
        : filter === 'Quick starts'
          ? c.difficulty === 1
          : filter === 'Deep cuts'
            ? c.difficulty === 3
            : true),
  );
  return (
    <div className="shelf page-width">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow hero-kicker">
            <span className="live-dot" /> A GAME OF BEAUTIFUL LIES
          </p>
          <h1 id="hero-title">
            A little scandal.
            <br />
            <em>A lot of evidence.</em>
          </h1>
          <p className="hero-description">
            Behind every perfect story is a detail that doesn’t fit.
            <br className="desktop-break" /> Pick a case. Follow the receipts. Call the bluff.
          </p>
          <div className="hero-facts">
            <span>10 CASES</span>
            <i /> <span>4 RESEARCH TURNS</span>
            <i /> <span>1 LIE</span>
          </div>
        </div>
        <div className="hero-composition" aria-hidden="true">
          <div className="hero-orbit" />
          <div className="editorial-note">
            <span className="eyebrow">STRICTLY BETWEEN US</span>
            <span className="note-title">
              The truth has
              <br />
              <em>excellent timing.</em>
            </span>
            <div className="note-rule" />
            <span className="note-signature">Trust the receipts.</span>
            <Fingerprint className="note-fingerprint" strokeWidth={0.8} />
          </div>
          <span className="round-seal">
            <span>READ BETWEEN</span>
            <Gem size={24} strokeWidth={1} />
            <span>THE LIES</span>
          </span>
          <span className="hero-cross">+</span>
        </div>
      </section>
      <div className="shelf-heading">
        <div>
          <p className="eyebrow">THE CASE COLLECTION</p>
          <h2>
            Pick your <em>poison.</em>
          </h2>
        </div>
        <div className="completion">
          <span className="completion-count">
            {pad(closed)}
            <span> / 10</span>
          </span>
          <span>CASES CLOSED</span>
          <div className="completion-track">
            <span style={{ width: `${closed * 10}%` }} />
          </div>
        </div>
      </div>
      <div className="shelf-toolbar">
        <div className="filters" aria-label="Filter cases">
          {['All cases', 'Unsolved', 'Quick starts', 'Deep cuts'].map((f) => (
            <button
              className={filter === f ? 'filter active' : 'filter'}
              aria-pressed={filter === f}
              key={f}
              onClick={() => setFilter(f)}
            >
              {f}
              {f === 'All cases' && <span>10</span>}
            </button>
          ))}
        </div>
        <label className="genre-filter">
          <span className="sr-only">Filter by genre</span>
          <select value={genre} onChange={(e) => setGenre(e.target.value)}>
            <option>All genres</option>
            {cases.map((c) => (
              <option key={c.id}>{c.category}</option>
            ))}
          </select>
        </label>
      </div>
      {filtered.length ? (
        <div className="case-grid">
          {filtered.map((c) => {
            const saved = progress.games[c.id];
            const solved = !!progress.records[c.id]?.correct;
            return (
              <a
                href={`#case=${c.id}`}
                className="case-card"
                data-testid="case-card"
                key={c.id}
                aria-label={`Open case ${c.number}: ${c.title}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (ready) onOpen(c);
                }}
              >
                <div className={`case-art art-${c.art}`}>
                  <img
                    src={asset(`/art/${c.art}.svg`)}
                    width={900}
                    height={600}
                    alt=""
                    loading={c.number < 4 ? 'eager' : 'lazy'}
                  />
                  <span className="case-number">FILE {pad(c.number)}</span>
                  {solved && (
                    <span className="closed-stamp">
                      <Check size={12} /> CASE CLOSED
                    </span>
                  )}
                  <span className="case-art-arrow">
                    <ArrowUpRight size={23} />
                  </span>
                </div>
                <div className="case-card-body">
                  <span className="case-category">{c.category}</span>
                  <h3>{c.title}</h3>
                  <p>{c.teaser}</p>
                  <div className="case-card-footer">
                    <span className="difficulty" aria-label={`Difficulty ${c.difficulty} of 3`}>
                      {[1, 2, 3].map((n) => (
                        <i key={n} className={n <= c.difficulty ? 'filled' : ''} />
                      ))}
                      <span>{difficulty[c.difficulty - 1]}</span>
                    </span>
                    <span className="case-duration">
                      {saved && !saved.accusation
                        ? 'Resume'
                        : solved
                          ? `${recordScore(progress.records[c.id])} pts`
                          : `${c.minutes} min`}
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="empty-shelf">
          <ShieldCheck size={38} />
          <h3>{closed === 10 ? 'Nothing gets past you.' : 'A different kind of trouble?'}</h3>
          <p>
            {closed === 10
              ? 'You’ve closed all ten cases. The files are always here for another look.'
              : 'No cases match these filters. There are more stories on the shelf.'}
          </p>
          <button
            className="button button-primary"
            onClick={() => {
              setFilter('All cases');
              setGenre('All genres');
            }}
          >
            See the collection <ArrowRight size={17} />
          </button>
        </div>
      )}
      <div className="shelf-bottom">
        <span className="small-star">✳</span>
        <p>
          Good gossip travels fast.
          <br />
          <strong>Good instincts go deeper.</strong>
        </p>
        <span className="eyebrow">
          ENTIRELY FICTIONAL.
          <br />
          DELIBERATELY SUSPICIOUS.
        </span>
      </div>
    </div>
  );
}

type InspectorTab = 'evidence' | 'exhibit' | 'witness';
function Investigation({
  c,
  game,
  liveEnabled,
  dispatch,
  onBack,
  onReplay,
  onNext,
}: {
  c: CaseFile;
  game: GameState;
  liveEnabled: boolean;
  dispatch: (a: GameAction) => boolean;
  onBack: () => void;
  onReplay: () => void;
  onNext: () => void;
}) {
  const [selected, setSelected] = useState<ClaimId>(game.order[0]);
  const [tab, setTab] = useState<InspectorTab>('evidence');
  const [source, setSource] = useState<string | null>(null);
  const [exhibit, setExhibit] = useState(false);
  const [accuseOpen, setAccuseOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    if (game.accusation) document.getElementById('receipt-title')?.focus({ preventScroll: true });
  }, [game.accusation]);
  const known = discoveredIds(game, c);
  const readable = new Set([...known, ...revealedIds(game, c)]);
  const currentSource =
    source && readable.has(source) ? c.sources.find((s) => s.id === source) : undefined;
  const claim = c.claims.find((x) => x.id === selected)!;
  function research(move: Move) {
    if (dispatch({ type: 'research', claimId: selected, move })) {
      const outcome = c.research[selected][move];
      setTab('evidence');
      setAnnouncement(
        `${moves.find((m) => m.id === move)!.label}: ${outcome.note} ${researchLeft(game) - 1} research turns left.`,
      );
    }
  }
  return (
    <div className="investigation page-width">
      <div className="case-topline">
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={16} /> All cases
        </button>
        <span className="eyebrow">
          FILE {pad(c.number)} / 10 <span className="topline-divider">/</span>{' '}
          <span className="fiction-label">FICTIONAL CASE FILE</span>
        </span>
        <button
          className="text-button restart"
          onClick={() => setResetOpen(true)}
          disabled={!!game.pendingRequestId}
        >
          <RotateCcw size={14} /> Restart
        </button>
      </div>
      <div className="case-heading">
        <div>
          <p className="eyebrow case-genre">
            {c.category} <span>·</span> {c.setting}
          </p>
          <h1>{c.title}</h1>
          <p>{c.teaser}</p>
        </div>
        <div className="case-counters">
          <Counter label="Research" value={researchLeft(game)} max={4} testId="research-left" />
          <Counter label="Interviews" value={interviewsLeft(game)} max={2} />
        </div>
      </div>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      {game.accusation ? (
        <Receipt
          c={c}
          game={game}
          onSource={setSource}
          onNext={onNext}
          onReplay={onReplay}
          onBack={onBack}
          onExhibit={() => setExhibit(true)}
        />
      ) : (
        <>
          <div className="briefing">
            <BookOpen size={20} strokeWidth={1.3} />
            <div>
              <span className="eyebrow">YOUR BRIEFING</span>
              <p>{c.briefing}</p>
            </div>
          </div>
          <div className="game-layout">
            <section className="claims-zone" aria-labelledby="claims-title">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">01 / THE RUMORS</p>
                  <h2 id="claims-title">One doesn’t hold up.</h2>
                </div>
                <span className="small-label">SELECT A LEAD ↓</span>
              </div>
              <div className="claims-grid">
                {game.order.map((id, i) => {
                  const item = c.claims.find((x) => x.id === id)!;
                  const used = game.research.filter((r) => r.claimId === id).length;
                  return (
                    <button
                      key={id}
                      className={`claim-card ${selected === id ? 'selected' : ''}`}
                      data-testid={`claim-${id}`}
                      aria-pressed={selected === id}
                      onClick={() => setSelected(id)}
                    >
                      <div className="claim-top">
                        <span className="claim-letter">{String.fromCharCode(65 + i)}</span>
                        <span>
                          {used
                            ? `${used} ${used === 1 ? 'lead' : 'leads'} followed`
                            : 'UNVERIFIED CLAIM'}
                        </span>
                        {selected === id && <span className="selection-dot" />}
                      </div>
                      <p>{item.text}</p>
                      <div className="claim-bottom">
                        <span>
                          {selected === id ? 'Following this lead' : 'Take a closer look'}
                        </span>
                        <ArrowUpRight size={17} />
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="research-panel">
                <div className="research-panel-heading">
                  <div>
                    <span className="eyebrow">02 / FOLLOW THE RECEIPTS</span>
                    <h3>
                      {researchLeft(game)
                        ? 'How do you want to dig?'
                        : 'Time to read what you found.'}
                    </h3>
                  </div>
                  <span className="turn-cost">
                    {researchLeft(game) ? '1 TURN PER MOVE' : 'NO RESEARCH TURNS LEFT'}
                  </span>
                </div>
                <p className="selected-lead">
                  Investigating{' '}
                  <strong>claim {String.fromCharCode(65 + game.order.indexOf(selected))}</strong>
                </p>
                <div className="research-actions">
                  {moves.map((m) => {
                    const Icon = moveIcons[m.id];
                    const used = hasResearched(game, selected, m.id);
                    return (
                      <button
                        key={m.id}
                        className={`research-button ${used ? 'used' : ''}`}
                        data-testid={`move-${m.id}`}
                        onClick={() => research(m.id)}
                        disabled={used || researchLeft(game) === 0 || !!game.pendingRequestId}
                      >
                        <Icon size={21} strokeWidth={1.4} />
                        <span>
                          <strong>{m.label}</strong>
                          <small>{used ? 'Already in your file' : m.description}</small>
                        </span>
                        {used ? <Check size={15} /> : <ChevronRight size={15} />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="verdict-action">
                <div>
                  <span className="eyebrow">READY TO CALL IT?</span>
                  <p>Choose the claim you don’t buy.</p>
                </div>
                <button
                  className="button button-primary"
                  data-testid="make-verdict"
                  disabled={!!game.pendingRequestId}
                  onClick={() => setAccuseOpen(true)}
                >
                  Make my verdict <ArrowRight size={18} />
                </button>
              </div>
            </section>
            <aside className="inspector" aria-label="Investigation desk">
              <div className="inspector-heading">
                <span className="eyebrow">YOUR DESK</span>
                <span className="desk-count">
                  {known.length} {known.length === 1 ? 'SOURCE' : 'SOURCES'} PINNED
                </span>
              </div>
              <div className="inspector-tabs" role="tablist" aria-label="Desk sections">
                {(['evidence', 'exhibit', 'witness'] as const).map((t) => (
                  <button
                    key={t}
                    id={`tab-${t}`}
                    role="tab"
                    aria-selected={tab === t}
                    aria-controls={`panel-${t}`}
                    tabIndex={tab === t ? 0 : -1}
                    onKeyDown={(e) => {
                      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                        e.preventDefault();
                        const list: InspectorTab[] = ['evidence', 'exhibit', 'witness'];
                        const index =
                          e.key === 'Home'
                            ? 0
                            : e.key === 'End'
                              ? 2
                              : (list.indexOf(t) + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
                        setTab(list[index]);
                        document.getElementById(`tab-${list[index]}`)?.focus();
                      }
                    }}
                    onClick={() => setTab(t)}
                  >
                    {t === 'evidence' ? (
                      <FileText size={16} />
                    ) : t === 'exhibit' ? (
                      <ImageIcon size={16} />
                    ) : (
                      <MessageCircle size={16} />
                    )}
                    <span>
                      {t === 'exhibit' ? 'Exhibit' : t === 'witness' ? 'Witness' : 'Evidence'}
                    </span>
                  </button>
                ))}
              </div>
              <div
                className="inspector-content"
                id={`panel-${tab}`}
                role="tabpanel"
                aria-labelledby={`tab-${tab}`}
                tabIndex={0}
              >
                {tab === 'evidence' && (
                  <Evidence
                    c={c}
                    game={game}
                    onSource={setSource}
                    onExhibit={() => {
                      setTab('exhibit');
                    }}
                  />
                )}
                {tab === 'exhibit' && (
                  <Exhibit
                    c={c}
                    game={game}
                    onExpand={() => setExhibit(true)}
                    onPin={() => {
                      if (dispatch({ type: 'image' }))
                        setAnnouncement('Exhibit pinned to your file. No research turn spent.');
                    }}
                  />
                )}
                <div hidden={tab !== 'witness'}>
                  <Witness
                    c={c}
                    game={game}
                    dispatch={dispatch}
                    liveEnabled={liveEnabled}
                    announce={setAnnouncement}
                  />
                </div>
              </div>
              <div className="desk-footnote">
                <LockKeyhole size={12} /> Your notes stay on this browser.
              </div>
            </aside>
          </div>
        </>
      )}
      {currentSource && (
        <SourceDialog
          source={currentSource}
          onClose={() => setSource(null)}
          revealed={!known.includes(currentSource.id)}
        />
      )}
      {exhibit && (
        <ExhibitDialog
          c={c}
          game={game}
          onClose={() => setExhibit(false)}
          onPin={() => dispatch({ type: 'image' })}
        />
      )}
      {accuseOpen && (
        <Accusation
          c={c}
          game={game}
          initial={claim.id}
          onClose={() => setAccuseOpen(false)}
          onConfirm={(id) => {
            dispatch({ type: 'accuse', claimId: id });
            setAccuseOpen(false);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        />
      )}
      {resetOpen && (
        <Dialog title="Reopen this case?" onClose={() => setResetOpen(false)}>
          <p>
            This starts a fresh investigation of <strong>{c.title}</strong>. The solution stays the
            same. Your best score and other case saves remain.
          </p>
          <div className="dialog-actions">
            <button className="button button-outline" onClick={() => setResetOpen(false)}>
              Keep investigating
            </button>
            <button
              className="button button-primary"
              onClick={() => {
                setResetOpen(false);
                onReplay();
              }}
            >
              Start this case over
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function Counter({
  label,
  value,
  max,
  testId,
}: {
  label: string;
  value: number;
  max: number;
  testId?: string;
}) {
  return (
    <div className="counter">
      <span className="eyebrow">{label}</span>
      <span className="counter-value">
        <strong data-testid={testId}>{value}</strong>
        <span> / {max}</span>
      </span>
      <span className="counter-dots" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
          <i key={i} className={i < value ? 'available' : ''} />
        ))}
      </span>
    </div>
  );
}

function SourceButton({ source, onClick }: { source: Source; onClick: () => void }) {
  return (
    <button className="source-button" onClick={onClick}>
      <span className="source-id">{source.id.toUpperCase()}</span>
      <span>
        <strong>{source.title}</strong>
        <small>{source.publisher}</small>
      </span>
      <ArrowUpRight size={16} />
    </button>
  );
}

function Evidence({
  c,
  game,
  onSource,
  onExhibit,
}: {
  c: CaseFile;
  game: GameState;
  onSource: (id: string) => void;
  onExhibit: () => void;
}) {
  const known = discoveredIds(game, c);
  return (
    <>
      {!game.research.length ? (
        <div className="empty-desk">
          <div className="empty-file-icon">
            <FileText size={38} strokeWidth={1} />
            <Search size={25} strokeWidth={1.3} />
          </div>
          <h3>
            Instincts are good.
            <br />
            <em>Receipts are better.</em>
          </h3>
          <p>
            Pick a claim and follow a lead.
            <br />
            Your sources will land here.
          </p>
          <span className="eyebrow">EVERY DETAIL COUNTS.</span>
        </div>
      ) : (
        <>
          <p className="panel-intro">
            Your research <span>{game.research.length} / 4 moves</span>
          </p>
          <div className="research-notes">
            {game.research.map((r, i) => {
              const result = c.research[r.claimId][r.move];
              const m = moves.find((m) => m.id === r.move)!;
              return (
                <div className="research-note" key={`${r.claimId}-${r.move}`}>
                  <span className="eyebrow">
                    {pad(i + 1)} · {m.label} · CLAIM{' '}
                    {String.fromCharCode(65 + game.order.indexOf(r.claimId))}
                  </span>
                  <p>{result.note}</p>
                  <div className="note-citations">
                    {result.sourceIds.map((id) => (
                      <button key={id} onClick={() => onSource(id)}>
                        {id.toUpperCase()} <ArrowUpRight size={11} />
                      </button>
                    ))}
                    {!result.sourceIds.length && <span>No matching update in this case file.</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="source-stack">
            <p className="eyebrow">PINNED SOURCE DOCUMENTS</p>
            {known.map((id) => (
              <SourceButton
                key={id}
                source={c.sources.find((s) => s.id === id)!}
                onClick={() => onSource(id)}
              />
            ))}
          </div>
        </>
      )}
      <button className="exhibit-nudge" onClick={onExhibit}>
        <ImageIcon size={18} />
        <span>
          <strong>{game.imagePinned ? 'Exhibit pinned' : 'There’s an image in the file.'}</strong>
          <small>
            {game.imagePinned
              ? 'Revisit the detail that caught your eye.'
              : 'Inspecting it costs no research turns.'}
          </small>
        </span>
        <ChevronRight size={16} />
      </button>
    </>
  );
}

function Exhibit({
  c,
  game,
  onExpand,
  onPin,
}: {
  c: CaseFile;
  game: GameState;
  onExpand: () => void;
  onPin: () => void;
}) {
  const comparison = discoveredIds(game, c).includes(c.artifact.comparisonEvidenceId);
  return (
    <div className="exhibit-panel">
      <span className="eyebrow">EXHIBIT S1 / PREPARED IMAGE</span>
      <h3>{c.artifact.title}</h3>
      <button
        className="exhibit-preview"
        onClick={onExpand}
        aria-label="Enlarge exhibit and read transcript"
      >
        <img
          src={asset(`/cases/${c.id}-s1.png`)}
          alt={`Prepared exhibit: ${c.artifact.title}. Open for the full transcript.`}
          width={1200}
          height={800}
        />
        <span>
          <Search size={15} /> Take a closer look
        </span>
      </button>
      <p className="exhibit-note">
        {comparison ? c.artifact.comparisonNote : c.artifact.initialNote}
      </p>
      {comparison && (
        <span className="comparison-label">
          <Link2 size={14} /> Compared with {c.artifact.comparisonEvidenceId.toUpperCase()}
        </span>
      )}
      <button
        className={`button ${game.imagePinned ? 'button-outline' : 'button-primary'} full-width`}
        disabled={game.imagePinned || !!game.pendingRequestId}
        onClick={onPin}
      >
        {game.imagePinned ? <Check size={17} /> : <Pin size={17} />}
        {game.imagePinned ? 'Pinned to your file' : 'Pin this clue · free'}
      </button>
      <p className="fine-print">Prepared crop · authored transcript. Inspection is always free.</p>
    </div>
  );
}

function ExhibitDialog({
  c,
  game,
  onClose,
  onPin,
}: {
  c: CaseFile;
  game: GameState;
  onClose: () => void;
  onPin: () => void;
}) {
  const [crop, setCrop] = useState(false);
  const compare =
    discoveredIds(game, c).includes(c.artifact.comparisonEvidenceId) || !!game.accusation;
  return (
    <Dialog title={c.artifact.title} onClose={onClose} wide>
      <div className="exhibit-switch">
        <button
          className={!crop ? 'filter active' : 'filter'}
          aria-pressed={!crop}
          onClick={() => setCrop(false)}
        >
          Full exhibit
        </button>
        <button
          className={crop ? 'filter active' : 'filter'}
          aria-pressed={crop}
          onClick={() => setCrop(true)}
        >
          Prepared crop
        </button>
      </div>
      <img
        className="full-exhibit"
        src={asset(`/cases/${c.id}-s1${crop ? '-card' : ''}.png`)}
        alt={`Prepared ${crop ? 'crop' : 'exhibit'}; its exact text is transcribed below.`}
        width={crop ? 840 : 1200}
        height={crop ? 360 : 800}
      />
      <div className="transcript">
        <span className="eyebrow">AUTHORED TRANSCRIPT</span>
        <pre>{c.artifact.transcript}</pre>
      </div>
      <div className="rule-note">
        <strong>
          {compare
            ? `Compared with ${c.artifact.comparisonEvidenceId.toUpperCase()}`
            : 'Look closely'}
        </strong>
        <p>{compare ? c.artifact.comparisonNote : c.artifact.initialNote}</p>
      </div>
      {!game.accusation && (
        <button
          className="button button-primary full-width"
          disabled={game.imagePinned || !!game.pendingRequestId}
          onClick={onPin}
        >
          {game.imagePinned ? <Check size={17} /> : <Pin size={17} />}
          {game.imagePinned ? 'Pinned to your file' : 'Pin this clue · free'}
        </button>
      )}
    </Dialog>
  );
}

function Witness({
  c,
  game,
  dispatch,
  liveEnabled,
  announce,
}: {
  c: CaseFile;
  game: GameState;
  dispatch: (a: GameAction) => boolean;
  liveEnabled: boolean;
  announce: (s: string) => void;
}) {
  const [custom, setCustom] = useState(false);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const activeRequest = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const unloading = useRef(false);
  const pendingId = useRef<string | null>(null);
  useEffect(() => {
    const leavingDocument = () => {
      // Keep the persisted marker so the next document can explain the interruption.
      unloading.current = true;
      activeRequest.current?.abort();
    };
    const returningDocument = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      unloading.current = false;
      if (pendingId.current) {
        dispatch({ type: 'live-failure', requestId: pendingId.current });
        pendingId.current = null;
        setError(
          'Your live interview was interrupted. It was not resent. Prepared questions are still available.',
        );
      }
    };
    window.addEventListener('beforeunload', leavingDocument);
    window.addEventListener('pagehide', leavingDocument);
    window.addEventListener('pageshow', returningDocument);
    return () => {
      window.removeEventListener('beforeunload', leavingDocument);
      window.removeEventListener('pagehide', leavingDocument);
      window.removeEventListener('pageshow', returningDocument);
      activeRequest.current?.abort();
    };
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current || game.pendingRequestId) return;
    const trimmed = question.trim();
    if (!trimmed || [...trimmed].length > 280) return;
    const requestId = crypto.randomUUID();
    if (!dispatch({ type: 'live-start', requestId })) return;
    pendingId.current = requestId;
    busy.current = true;
    setError('');
    const controller = new AbortController();
    activeRequest.current = controller;
    const timer = setTimeout(() => controller.abort(), 25_000);
    try {
      const res = await fetch(asset('/api/ai/witness'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: c.id, gameId: game.gameId, requestId, question: trimmed }),
        signal: controller.signal,
      });
      const result = await res.json();
      if (
        !res.ok ||
        result.requestId !== requestId ||
        result.reply?.origin !== 'live' ||
        typeof result.reply?.model !== 'string'
      )
        throw new Error('unavailable');
      const reply = ReplySchema.parse({
        text: result.reply.text,
        statementIds: result.reply.statementIds,
      });
      if (
        !reply.statementIds.every((id) => c.witness.statements.some((w) => w.id === id)) ||
        (!reply.statementIds.length && reply.text !== "That isn't in my notes.")
      )
        throw new Error('invalid reply');
      if (
        !unloading.current &&
        dispatch({
          type: 'live-success',
          requestId,
          reply: { ...reply, model: result.reply.model },
        })
      ) {
        announce('Live witness reply added to your file.');
        setQuestion('');
      }
    } catch {
      if (!unloading.current) {
        dispatch({ type: 'live-failure', requestId });
        setError(
          'Live interviews are unavailable right now. You can still use prepared questions and finish the case.',
        );
      }
    } finally {
      clearTimeout(timer);
      activeRequest.current = null;
      busy.current = false;
      if (!unloading.current) pendingId.current = null;
    }
  }
  return (
    <div className="witness-panel">
      <div className="witness-profile">
        <div className="witness-avatar" aria-hidden="true">
          {c.witness.name
            .split(' ')
            .map((x) => x[0])
            .slice(0, 2)
            .join('')}
        </div>
        <div>
          <span className="eyebrow">ON THE RECORD</span>
          <h3>{c.witness.name}</h3>
          <p>{c.witness.role}</p>
        </div>
      </div>
      <p className="panel-intro">
        Choose your questions carefully.<span>{interviewsLeft(game)} left</span>
      </p>
      <div className="witness-questions">
        {c.witness.statements.map((w) => (
          <div key={w.id}>
            <button
              data-testid={`question-${w.id}`}
              disabled={
                game.interviewIds.includes(w.id) ||
                interviewsLeft(game) === 0 ||
                !!game.pendingRequestId
              }
              onClick={() => {
                if (dispatch({ type: 'interview', statementId: w.id }))
                  announce('Prepared interview added: ' + w.text);
              }}
            >
              <span>{w.question}</span>
              {game.interviewIds.includes(w.id) ? <Check size={15} /> : <ChevronRight size={15} />}
            </button>
            {game.interviewIds.includes(w.id) && (
              <div className="testimony">
                <span className="eyebrow">PREPARED INTERVIEW · {w.id.toUpperCase()}</span>
                <p>“{w.text}”</p>
              </div>
            )}
          </div>
        ))}
      </div>
      {game.liveReplies.map((r) => (
        <div className="testimony live-testimony" key={r.requestId}>
          <span className="eyebrow">LIVE AI REPLY</span>
          <p>{r.text}</p>
          <details>
            <summary>Testimony & model</summary>
            <p>{r.model}</p>
            {r.statementIds.map((id) => (
              <p key={id}>
                <strong>{id.toUpperCase()}</strong> —{' '}
                {c.witness.statements.find((w) => w.id === id)?.text}
              </p>
            ))}
          </details>
        </div>
      ))}
      {liveEnabled && (
        <div className="live-witness">
          <button className="text-button" aria-expanded={custom} onClick={() => setCustom(!custom)}>
            <Sparkles size={15} /> Ask your own question <ArrowDown size={14} />
          </button>
          {custom && (
            <form onSubmit={submit}>
              <label htmlFor="custom-question">Your question to {c.witness.name}</label>
              <textarea
                id="custom-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                disabled={!!game.pendingRequestId}
                placeholder="Ask about a detail in this case…"
              />
              <span className="question-count">{[...question].length} / 280 characters</span>
              <p className="fine-print">
                Custom questions are sent to our AI provider. Please don’t include personal
                information.
              </p>
              <button
                className="button button-primary full-width"
                disabled={
                  !question.trim() ||
                  [...question.trim()].length > 280 ||
                  !!game.pendingRequestId ||
                  game.liveDispatchesUsed >= 2 ||
                  interviewsLeft(game) === 0
                }
              >
                {game.pendingRequestId ? (
                  <>
                    <LoaderCircle className="spin" size={17} /> Waiting for the witness…
                  </>
                ) : (
                  <>
                    Ask the witness <ArrowRight size={16} />
                  </>
                )}
              </button>
              <p className="fine-print">
                {2 - game.liveDispatchesUsed} live requests left in this run.
              </p>
            </form>
          )}
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
      <p className="fine-print witness-fine">
        Prepared answers are part of the case file. A witness’s word is a lead, not a substitute for
        a source.
      </p>
    </div>
  );
}

function SourceDialog({
  source,
  revealed,
  onClose,
}: {
  source: Source;
  revealed: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog title={source.title} onClose={onClose}>
      <div className="source-metadata">
        <span className="source-id">{source.id.toUpperCase()}</span>
        <span>{revealed ? 'REVEALED AT VERDICT' : 'YOUR RESEARCH'}</span>
      </div>
      <div className="source-byline">
        <strong>{source.publisher}</strong>
        <span>{dateLabel(source.publishedAt)}</span>
      </div>
      <div className="document-body">
        <p>{source.body}</p>
      </div>
      <div className="provenance">
        <Fingerprint size={19} />
        <div>
          <span className="eyebrow">ORIGIN GROUP</span>
          <p>{source.group.replaceAll('-', ' ')}</p>
        </div>
      </div>
      <p className="fine-print">
        Fictional source document. This is authored evidence inside the game, not a real-world
        publication.
      </p>
    </Dialog>
  );
}

function Accusation({
  c,
  game,
  initial,
  onClose,
  onConfirm,
}: {
  c: CaseFile;
  game: GameState;
  initial: ClaimId;
  onClose: () => void;
  onConfirm: (id: ClaimId) => void;
}) {
  const [choice, setChoice] = useState(initial);
  return (
    <Dialog title="Which story falls apart?" onClose={onClose}>
      <p className="dialog-intro">
        Choose the claim the evidence doesn’t support. Locking your verdict closes this
        investigation.
      </p>
      <fieldset className="accusation-options">
        <legend className="sr-only">Select the unsupported claim</legend>
        {game.order.map((id, i) => (
          <label
            className={choice === id ? 'accusation-option selected' : 'accusation-option'}
            key={id}
          >
            <input
              type="radio"
              name="accusation"
              value={id}
              checked={choice === id}
              onChange={() => setChoice(id)}
            />
            <span className="claim-letter">{String.fromCharCode(65 + i)}</span>
            <span>{c.claims.find((x) => x.id === id)?.text}</span>
          </label>
        ))}
      </fieldset>
      <div className="dialog-actions">
        <button className="button button-outline" onClick={onClose}>
          Keep digging
        </button>
        <button
          className="button button-primary"
          data-testid="lock-verdict"
          onClick={() => onConfirm(choice)}
        >
          Lock my verdict <LockKeyhole size={16} />
        </button>
      </div>
    </Dialog>
  );
}

function Receipt({
  c,
  game,
  onSource,
  onNext,
  onReplay,
  onBack,
  onExhibit,
}: {
  c: CaseFile;
  game: GameState;
  onSource: (id: string) => void;
  onNext: () => void;
  onReplay: () => void;
  onBack: () => void;
  onExhibit: () => void;
}) {
  const correct = game.accusation === c.verdict.falseClaimId;
  const researched = discoveredIds(game, c);
  const revealed = revealedIds(game, c);
  const target = c.claims.find((x) => x.id === c.verdict.falseClaimId)!;
  const chosen = c.claims.find((x) => x.id === game.accusation)!;
  return (
    <section
      className={`receipt ${correct ? 'correct' : 'incorrect'}`}
      data-testid="receipt"
      aria-labelledby="receipt-title"
    >
      <div className="receipt-head">
        <div>
          <span className="eyebrow">
            <ShieldCheck size={15} />{' '}
            {correct ? 'CASE CLOSED / CORRECT VERDICT' : 'CASE REVIEWED / VERDICT MISSED'}
          </span>
          <h2 id="receipt-title" tabIndex={-1}>
            {correct ? (
              <>
                Nice <em>instincts.</em>
              </>
            ) : (
              <>
                A beautiful lie
                <br />
                <em>got through.</em>
              </>
            )}
          </h2>
          <p>
            {correct
              ? 'You found the detail the story couldn’t explain.'
              : 'The good news? The receipts are all here.'}
          </p>
        </div>
        <div className="score-block">
          <span className="eyebrow">YOUR SCORE</span>
          <strong data-testid="receipt-score">{score(game, c)}</strong>
          <span>OUT OF 160</span>
        </div>
      </div>
      <div className="receipt-body">
        <div className="receipt-explanation">
          <span className="eyebrow">THE CLAIM THAT CRACKED</span>
          <blockquote>{target.text}</blockquote>
          <p>{c.verdict.explanation}</p>
          <div className="receipt-citations">
            {c.verdict.decisiveEvidenceIds.map((id) => (
              <button className="citation-button" key={id} onClick={() => onSource(id)}>
                <FileText size={14} /> {id.toUpperCase()} <ArrowUpRight size={12} />
              </button>
            ))}
          </div>
          {!correct && (
            <div className="wrong-pick">
              <strong>Your pick was supported:</strong>
              <p>{chosen.text}</p>
              <p>The following independent records support that claim:</p>
              {chosen.supportEvidenceIds.map((id) => (
                <SourceButton
                  key={id}
                  source={c.sources.find((s) => s.id === id)!}
                  onClick={() => onSource(id)}
                />
              ))}
            </div>
          )}
          <div className="lesson">
            <Fingerprint size={26} strokeWidth={1.2} />
            <div>
              <span className="eyebrow">TAKE THIS INSTINCT WITH YOU</span>
              <p>{c.verdict.lesson}</p>
            </div>
          </div>
        </div>
        <div className="receipt-audit">
          <span className="eyebrow">YOUR INVESTIGATION</span>
          <h3>
            {game.research.length} research {game.research.length === 1 ? 'move' : 'moves'} used.
          </h3>
          <p>
            {correct
              ? `100 for the verdict + ${15 * researchLeft(game)} for ${researchLeft(game)} unused turns.`
              : 'A correct verdict earns points. This attempt scored 0.'}
          </p>
          {game.research.length === 0 && (
            <p>You made this verdict without researching any source.</p>
          )}
          <ol className="receipt-moves">
            {game.research.map((r, i) => (
              <li key={i}>
                <span>{pad(i + 1)}</span>
                {moves.find((m) => m.id === r.move)?.label}
                <small>CLAIM {String.fromCharCode(65 + game.order.indexOf(r.claimId))}</small>
              </li>
            ))}
          </ol>
          <div className="receipt-source-group">
            <h4>Your research</h4>
            {researched.length ? (
              researched.map((id) => (
                <SourceButton
                  key={id}
                  source={c.sources.find((s) => s.id === id)!}
                  onClick={() => onSource(id)}
                />
              ))
            ) : (
              <p>No source documents were researched.</p>
            )}
          </div>
          <div className="receipt-source-group">
            <h4>Revealed at verdict</h4>
            {revealed.length ? (
              revealed.map((id) => (
                <SourceButton
                  key={id}
                  source={c.sources.find((s) => s.id === id)!}
                  onClick={() => onSource(id)}
                />
              ))
            ) : (
              <p>You had already found the decisive sources.</p>
            )}
          </div>
          {game.imagePinned && (
            <div className="receipt-source-group">
              <h4>Your image clue</h4>
              <p>{c.artifact.comparisonNote}</p>
              <button className="text-button" onClick={onExhibit}>
                Reopen exhibit S1 <ArrowUpRight size={14} />
              </button>
            </div>
          )}
          {(game.interviewIds.length > 0 || game.liveReplies.length > 0) && (
            <div className="receipt-source-group">
              <h4>Witness testimony</h4>
              {game.interviewIds.map((id) => (
                <p key={id}>
                  <strong>{id.toUpperCase()} · Prepared interview</strong>
                  <br />“{c.witness.statements.find((s) => s.id === id)?.text}”
                </p>
              ))}
              {game.liveReplies.map((r) => (
                <div key={r.requestId}>
                  <p>
                    <strong>Live AI reply · {r.model}</strong>
                    <br />
                    {r.text}
                  </p>
                  {r.statementIds.map((id) => (
                    <p key={id}>
                      {id.toUpperCase()}: {c.witness.statements.find((s) => s.id === id)?.text}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="receipt-bottom">
        <button className="text-button" onClick={onReplay}>
          <RotateCcw size={15} /> Replay this case
        </button>
        <div>
          <button className="button button-outline" onClick={onBack}>
            All cases
          </button>
          <button className="button button-primary" onClick={onNext}>
            {c.number === 10 ? 'Back to the first file' : 'The next little scandal'}
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}
