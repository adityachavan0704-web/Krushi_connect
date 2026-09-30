import React, { useMemo } from 'react';
import {
  Sprout, Truck, Store, Boxes, ArrowRight, TrendingUp, TrendingDown, Minus, Navigation, ShieldAlert, Handshake,
} from 'lucide-react';
import { useT } from '../../i18n/useT';
import { LanguagePicker } from '../../shared/LanguagePicker';
import { Button } from '../../design/primitives/Button';
import { MarketStatusStamp } from '../../design/primitives/MarketStatusStamp';
import { useLiveMarket, mandiLabel } from '../../data/useLiveMarket';
import { BOARD_CROPS } from '../../utils/constants';

/**
 * The front of the front door.
 *
 * AuthScreen is a form with a hero panel bolted on; this is the hero on its
 * own, at full scale, before anyone is asked to type anything. It exists so
 * the first thing a visitor sees is the product's own signature — a rate
 * board — rather than an empty email box.
 *
 * The board below is real product mechanics, not decoration: it pulls the
 * same `useLiveMarket` hook the Today/Price screens use, so the number a
 * visitor sees here is the number a signed-in farmer would see — the real
 * Agmarknet feed when it's reachable, falling back to demoMarket.js (see
 * data/demoMarket.js) with the same stamp as everywhere else when it isn't.
 */
const ROLE_ITEMS = [
  { icon: Sprout, labelKey: 'roles.farmer', noteKey: 'landing.roleFarmer' },
  { icon: Store, labelKey: 'roles.buyer', noteKey: 'landing.roleBuyer' },
  { icon: Boxes, labelKey: 'roles.logistics', noteKey: 'landing.roleLogistics' },
  { icon: Handshake, labelKey: 'roles.dalal', noteKey: 'landing.roleDalal' },
];

export const LandingScreen = ({ onEnter }) => {
  const { t, rate } = useT();

  /*
   * Four fixed hooks rather than a loop, because hooks cannot be called from
   * one. They cost nothing extra: all four read the same module-level cache
   * (data/marketCache.js), which App.jsx has already warmed with exactly these
   * crops — so this board renders from memory and the same entries are still
   * warm when the farmer reaches Today and Prices after signing in.
   */
  const [cropA, cropB, cropC, cropD] = BOARD_CROPS;
  const marketA = useLiveMarket(cropA, 100);
  const marketB = useLiveMarket(cropB, 100);
  const marketC = useLiveMarket(cropC, 100);
  const marketD = useLiveMarket(cropD, 100);

  const board = useMemo(
    () => [[cropA, marketA], [cropB, marketB], [cropC, marketC], [cropD, marketD]].map(
      ([crop, state]) => ({
        crop,
        // Highest rate in the state, not highest net: a visitor has no farm on
        // file, so there is no honest haul to subtract. The net-of-freight
        // ranking is the whole point of the app, and it starts the moment they
        // tell us where they are.
        ratePerKg: state.topRate.ratePerKg,
        mandi: mandiLabel(t, state.topRate),
        delta: state.delta,
        status: state.status,
      })
    ),
    [t, cropA, cropB, cropC, cropD, marketA, marketB, marketC, marketD]
  );

  // One stamp for the whole board: still fetching beats "live" beats "demo" —
  // a visitor should see "updating" until every crop has settled, not a stamp
  // that flips from demo to live as each of the four calls happens to land.
  const boardStatus = board.some((row) => row.status === 'loading')
    ? 'loading'
    : board.every((row) => row.status === 'live')
      ? 'live'
      : 'demo';

  return (
    <div className="min-h-full bg-forest-700 text-white">
      <div className="mx-auto min-h-full w-full max-w-5xl px-6 py-10 sm:px-10 sm:py-14 lg:px-6 lg:py-20">
        <div className="stagger">

          {/*
           * Sticky, not scrolling. The board and the role cards run past a
           * phone screen, and the language picker used to leave with the
           * header — a Marathi speaker on the English build then had to scroll
           * back up to switch. The whole screen is one forest surface, so a
           * bg-forest-700 band pinned to the top is invisible as a band; only
           * the wordmark and the picker stay put. Bled to the gutters so no
           * content shows beside it on the way up.
           */}
          <div className="sticky top-0 z-40 -mx-6 flex items-center justify-between gap-4 bg-forest-700 px-6 py-3 sm:-mx-10 sm:px-10 lg:-mx-6 lg:px-6">
            <div className="flex items-center gap-2.5">
              <span className="h-9 w-1.5 shrink-0 bg-turmeric-300" aria-hidden="true" />
              <span className="font-display text-3xl leading-none tracking-tight">
                Krushi<span className="text-turmeric-300">Flow</span>
              </span>
            </div>
            <LanguagePicker compact />
          </div>

          {/* The board: the system's own rate-board motif, shown at hero scale
              for the only time in the app — everywhere else it stays small. */}
          <div className="mt-12 sm:mt-16">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-turmeric-300">
                {t('landing.eyebrow')}
              </span>
              <MarketStatusStamp status={boardStatus} />
            </div>
            <p className="mt-2 text-sm text-forest-100">{t('landing.boardNote')}</p>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
              {board.map(({ crop, ratePerKg, mandi, delta }) => {
                const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
                const deltaColor = delta > 0 ? 'text-forest-600' : delta < 0 ? 'text-terracotta-600' : 'text-ink-faint';
                return (
                  <div key={crop} className="bg-paper px-3.5 py-4 text-ink sm:px-4 sm:py-5">
                    <p className="truncate text-sm font-bold text-ink-soft">{t(`crops.${crop}`)}</p>
                    <p className="font-display text-3xl leading-none sm:text-4xl">{rate(ratePerKg)}</p>
                    <div className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-ink-faint">
                      <DeltaIcon className={`h-3.5 w-3.5 shrink-0 ${deltaColor}`} strokeWidth={2.5} aria-hidden="true" />
                      <span className="truncate">{mandi}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-12 max-w-2xl font-display text-4xl sm:mt-16 sm:text-5xl lg:text-6xl">
            {t('landing.headline')}
          </p>
          <p className="mt-4 max-w-xl text-lg text-forest-100 sm:text-xl">
            {t('landing.sub')}
          </p>

          <ul className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-3 sm:gap-6">
            {ROLE_ITEMS.map((role) => {
              const Icon = role.icon;
              return (
                <li key={role.labelKey} className="flex gap-3">
                  <Icon className="mt-0.5 h-6 w-6 shrink-0 text-turmeric-300" strokeWidth={2.25} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-display text-xl leading-none">{t(role.labelKey)}</p>
                    <p className="mt-1 text-sm text-forest-100">{t(role.noteKey)}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-10 flex max-w-md flex-col gap-3 sm:mt-14">
            <Button variant="accent" icon={ArrowRight} onClick={() => onEnter('login')}>
              {t('auth.login')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => onEnter('signup')}
              className="border-white text-white hover:bg-white/10"
            >
              {t('auth.signup')}
            </Button>
          </div>

          <button
            type="button"
            onClick={() => onEnter('login')}
            className="lift mt-6 text-sm font-semibold text-forest-100 underline decoration-forest-300 underline-offset-4 hover:text-white"
          >
            {t('auth.demoTitle')}
          </button>

          {/* The dispatch-routing walk-through — playable without an account. */}
          <button
            type="button"
            onClick={() => onEnter('vrp-demo')}
            className="lift mt-4 flex items-center gap-1.5 text-sm font-semibold text-forest-100 underline decoration-forest-300 underline-offset-4 hover:text-white"
          >
            <Navigation className="h-4 w-4 shrink-0 text-turmeric-300" strokeWidth={2.25} aria-hidden="true" />
            {t('vrpDemo.entry')}
          </button>

          {/* The Blackout resilience drill — runnable without an account. */}
          <button
            type="button"
            onClick={() => onEnter('blackout')}
            className="lift mt-3 flex items-center gap-1.5 text-sm font-semibold text-forest-100 underline decoration-forest-300 underline-offset-4 hover:text-white"
          >
            <ShieldAlert className="h-4 w-4 shrink-0 text-turmeric-300" strokeWidth={2.25} aria-hidden="true" />
            {t('blackout.entry')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingScreen;
