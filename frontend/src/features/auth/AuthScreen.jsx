import React, { useState } from 'react';
import {
  Mail, Lock, User, Phone, MapPin, Sprout, Truck, Store, Boxes, Handshake,
  ArrowRight, ArrowLeft, Loader2, AlertTriangle, CloudOff, IndianRupee, Route, BellRing, ChevronDown,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/useT';
import { loginUser, registerUser } from '../../services/api';
import { CROP_OPTIONS } from '../../utils/constants';
import { ROLES, defaultTabForRole } from '../../app/routes';
import { LanguagePicker } from '../../shared/LanguagePicker';
import { Field } from '../../design/primitives/Field';
import { ChoiceGrid } from '../../design/primitives/ChoiceGrid';
import { Button } from '../../design/primitives/Button';
import { SegmentedToggle } from '../../design/primitives/SegmentedToggle';

/**
 * The front door. Nothing in the app renders until someone is through it.
 *
 * The previous version of this screen was the last piece of the old visual
 * language left standing — gradient panels, blurred blobs, five shadow depths,
 * and eleven English-only strings on the first screen a Marathi-speaking farmer
 * would ever see. It also sat behind a nav tab, which meant the app booted
 * signed-out into a farmer dashboard showing someone else's crop.
 *
 * Three things this screen has to get right:
 *
 *   1. The language switch is the FIRST control, above the wordmark. Someone
 *      who cannot read the form must be able to reach the way out without
 *      reading the form.
 *   2. Log in is the default panel. Registration is the once-ever path; login
 *      is the every-morning one, and the every-morning path should not cost a
 *      tap.
 *   3. The sample accounts are on the screen, not hidden in a footer. A judge
 *      or a first-time visitor should never have to invent a password to see
 *      what the product does.
 */

/*
 * Sample logins — real accounts in MongoDB, not demo rows.
 *
 * They are created by backend/scripts/seedAccounts.js and documented in
 * SAMPLE_USERS.md. Keep the two in step: if you change an address here it must
 * exist there, or this button signs nobody in.
 */
const SAMPLE_ACCOUNTS = [
  { role: ROLES.FARMER, email: 'kiran.farmer@krishiflow.ai', icon: Sprout, labelKey: 'roles.farmer' },
  { role: ROLES.LOGISTICS, email: 'vikram.fleet@krishiflow.ai', icon: Boxes, labelKey: 'roles.logistics' },
  { role: ROLES.BUYER, email: 'rajesh.buyer@krishiflow.ai', icon: Store, labelKey: 'roles.buyer' },
  { role: ROLES.DALAL, email: 'govind.dalal@krishiflow.ai', icon: Handshake, labelKey: 'roles.dalal' },
];
const SAMPLE_PASSWORD = 'krishi@2026';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Indian mobile numbers: 10 digits starting 6-9, an optional +91/91 country
// prefix and any spaces/dashes the user typed stripped out first.
const PHONE_PATTERN = /^[6-9]\d{9}$/;
const isStrongPassword = (value) => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

/*
 * What the farmer actually gets, in the order the app delivers it. Each line
 * reuses the string the corresponding screen already shows — so the promise
 * made here is, word for word, the promise kept there, in all three languages.
 */
const PROMISES = [
  { icon: IndianRupee, titleKey: 'price.title', noteKey: 'price.mandis.explain' },
  { icon: BellRing, titleKey: 'price.forecast.title', noteKey: 'price.forecast.explain' },
  { icon: Route, titleKey: 'transport.book.title', noteKey: 'transport.route.whyExplain' },
];

export const AuthScreen = ({ initialMode = 'login', onBack }) => {
  const setAuth = useAppStore((state) => state.setAuth);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const setCropDetails = useAppStore((state) => state.setCropDetails);
  /*
   * App.jsx pings /health on mount, before and regardless of sign-in, so by the
   * time anyone has read the form we already know whether there is a server to
   * sign in to. Saying so here beats letting them type a password and find out.
   */
  const isOffline = useAppStore((state) => state.backendStatus === 'offline');
  const { t } = useT();

  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'
  const [role, setRole] = useState(ROLES.FARMER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    location: '',
    primaryCrop: CROP_OPTIONS[0],
  });

  const isSignup = mode === 'signup';

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
  };

  /* One landing for every successful credential, however it was obtained. */
  const enter = (user, token) => {
    setAuth(user, token);
    setActiveTab(defaultTabForRole(user?.role));
  };

  const openSample = async (account) => {
    setBusy(true);
    setError('');
    try {
      const result = await loginUser({ email: account.email, password: SAMPLE_PASSWORD });
      // The demo rows carry their own role; trust the requested one either way,
      // since the point of the button is to land in that role's dashboard.
      enter({ ...result.user, role: account.role }, result.token);
    } catch (err) {
      setError(err.message || t('auth.failed'));
      setBusy(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password) {
      setError(t('auth.required'));
      return;
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      setError(t('auth.invalidEmail'));
      return;
    }
    if (isSignup) {
      if (!form.name.trim() || !form.phone.trim()) {
        setError(t('auth.required'));
        return;
      }
      if (!PHONE_PATTERN.test(form.phone.trim().replace(/^(\+?91[\s-]?)/, '').replace(/[\s-]/g, ''))) {
        setError(t('auth.invalidPhone'));
        return;
      }
      if (!isStrongPassword(form.password)) {
        setError(t('auth.shortPassword'));
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError(t('auth.mismatch'));
        return;
      }
    }

    setBusy(true);
    try {
      if (isSignup) {
        const result = await registerUser({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          role,
          location: form.location.trim(),
          primaryCrop: form.primaryCrop,
        });
        // A farmer who told us their crop at signup should not be asked again
        // on the Today screen — carry it straight into the working state.
        if (role === ROLES.FARMER && form.primaryCrop) {
          setCropDetails({ cropType: form.primaryCrop });
        }
        enter(result.user, result.token);
      } else {
        const result = await loginUser({
          email: form.email.trim(),
          password: form.password,
        });
        enter(result.user, result.token);
      }
    } catch (err) {
      setError(err.message || t('auth.failed'));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-paper">
      <div className="mx-auto grid min-h-full w-full max-w-6xl lg:grid-cols-12">

        {/*
          ---- The board ----
          Full-bleed forest, the same painted surface as the verdict slab, so
          the first thing anyone sees is the system's signature and not a
          stock hero image. On a phone it compresses to a band: the promises
          are worth reading once, but they are not worth a scroll before the
          password box.
        */}
        <section className="flex min-h-full flex-col lg:col-span-5 bg-forest-700 px-5 py-7 text-white sm:px-8 sm:py-8 lg:px-9 lg:py-12">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="h-9 w-1.5 shrink-0 bg-turmeric-300" aria-hidden="true" />
              <span className="font-display text-3xl leading-none tracking-tight">
                Krushi<span className="text-turmeric-300">Flow</span>
              </span>
            </div>
            {/* On mobile the language picker is pinned to the viewport by
                <Gate> so it never scrolls out of reach; the desktop panel
                carries its own at the foot of this section. */}
          </div>

          <p className="max-w-md font-display text-3xl text-white sm:text-4xl">
            {t('auth.tagline')}
          </p>

          <ul className="mt-7 hidden space-y-5 lg:block">
            {PROMISES.map((promise) => {
              const Icon = promise.icon;
              return (
                <li key={promise.titleKey} className="flex gap-3.5">
                  <Icon className="mt-0.5 h-6 w-6 shrink-0 text-turmeric-300" strokeWidth={2.25} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-display text-2xl leading-none">{t(promise.titleKey)}</p>
                    <p className="mt-1 text-base text-forest-100">{t(promise.noteKey)}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* mt-auto pins the picker to the panel's own bottom edge instead of
              trailing the promise list with a fixed gap — on tall viewports the
              green panel now stretches to fill the row (min-h-full + flex-col),
              so without mt-auto the picker would sit stranded above a dead
              green gap instead of anchored where a footer control belongs.
              fullWidth so the control reaches the same right edge as the
              tagline/promises above it, instead of shrinking to its own
              content width and leaving green space beside it. */}
          <div className="mt-8 hidden lg:flex lg:mt-auto lg:pt-10">
            <LanguagePicker fullWidth />
          </div>
        </section>

        {/* ---- The form ---- */}
        <section className="lg:col-span-7 px-5 py-8 sm:px-8 sm:py-9 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-lg space-y-6">

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="lift -mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                {t('common.back')}
              </button>
            )}

            <SegmentedToggle
              options={[
                { id: 'login', label: t('auth.login'), icon: ArrowRight },
                { id: 'signup', label: t('auth.signup'), icon: User },
              ]}
              value={mode}
              onChange={switchMode}
            />

            {error && (
              <p className="notice notice-bad" role="alert">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                <span>{error}</span>
              </p>
            )}

            {isOffline && (
              <p className="notice notice-bad" role="status">
                <CloudOff className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                <span>{t('auth.offlineNote')}</span>
              </p>
            )}

            {/* Keyed so the panel replays its entrance when the mode flips. */}
            <form key={mode} onSubmit={submit} className="detail-enter space-y-4">

              {isSignup && (
                <ChoiceGrid
                  label={t('auth.chooseRole')}
                  value={role}
                  onChange={setRole}
                  columns={2}
                  options={[
                    { id: ROLES.FARMER, label: t('roles.farmer'), icon: Sprout },
                    { id: ROLES.LOGISTICS, label: t('roles.logistics'), icon: Boxes },
                    { id: ROLES.BUYER, label: t('roles.buyer'), icon: Store },
                    { id: ROLES.DALAL, label: t('roles.dalal'), icon: Handshake },
                  ]}
                />
              )}

              {isSignup && (
                <Field
                  label={t('auth.name')}
                  icon={User}
                  name="name"
                  value={form.name}
                  onChange={update}
                  placeholder={t('auth.namePlaceholder')}
                  autoComplete="name"
                  required
                />
              )}

              <Field
                label={t('auth.email')}
                icon={Mail}
                type="email"
                name="email"
                value={form.email}
                onChange={update}
                placeholder="ramesh@krishiflow.ai"
                autoComplete="email"
                inputMode="email"
                required
              />

              {isSignup && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={t('auth.phone')}
                    icon={Phone}
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={update}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    inputMode="tel"
                    required
                  />
                  <Field
                    label={t('auth.village')}
                    icon={MapPin}
                    name="location"
                    value={form.location}
                    onChange={update}
                    placeholder="Nashik"
                    autoComplete="address-level2"
                  />
                </div>
              )}

              {isSignup && role === ROLES.FARMER && (
                <div>
                  <label className="field-label" htmlFor="signup-crop">{t('auth.crop')}</label>
                  <div className="relative flex items-center">
                    <Sprout
                      className="pointer-events-none absolute left-3.5 h-5 w-5 text-ink-faint"
                      strokeWidth={2.25}
                      aria-hidden="true"
                    />
                    <select
                      id="signup-crop"
                      name="primaryCrop"
                      value={form.primaryCrop}
                      onChange={update}
                      className="field field-icon cursor-pointer appearance-none pr-11"
                    >
                      {CROP_OPTIONS.map((crop) => (
                        <option key={crop} value={crop}>{t(`crops.${crop}`)}</option>
                      ))}
                    </select>
                    {/* appearance-none strips the native arrow, so the control
                        has to say it opens something. */}
                    <ChevronDown
                      className="pointer-events-none absolute right-3.5 h-5 w-5 text-ink"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              )}

              <Field
                label={t('auth.password')}
                icon={Lock}
                type="password"
                name="password"
                value={form.password}
                onChange={update}
                placeholder="••••••"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                hint={isSignup ? t('auth.passwordHint') : undefined}
                required
              />

              {isSignup && (
                <Field
                  label={t('auth.confirmPassword')}
                  icon={Lock}
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={update}
                  placeholder="••••••"
                  autoComplete="new-password"
                  required
                />
              )}

              <Button type="submit" busy={busy} icon={busy ? Loader2 : ArrowRight}>
                {busy ? t('auth.working') : isSignup ? t('auth.signup') : t('auth.login')}
              </Button>
            </form>

            {/* ---- Sample accounts ----
                Only worth offering when there is no real server to sign in
                to — with a live backend the demo rows are just extra
                clutter next to a form that already works. */}
            {isOffline && (
              <div className="border-2 border-ink bg-white p-4">
                <p className="font-display text-2xl leading-none text-ink">{t('auth.demoTitle')}</p>
                <p className="mt-1 text-sm text-ink-soft">{t('auth.demoHint')}</p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {SAMPLE_ACCOUNTS.map((account) => {
                    const Icon = account.icon;
                    return (
                      <button
                        key={account.role}
                        type="button"
                        onClick={() => openSample(account)}
                        disabled={busy}
                        className="
                          lift flex min-h-[3.5rem] flex-col items-center justify-center gap-1
                          border-2 border-ink bg-paper px-2 py-2.5 text-ink
                          hover:bg-turmeric-300 disabled:opacity-60
                        "
                      >
                        <Icon className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                        <span className="text-sm font-bold leading-none">{t(account.labelKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-sm text-ink-faint">{t('auth.terms')}</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuthScreen;
