import React, { useEffect, useState } from 'react';
import { LogOut, Pencil, KeyRound, Check, CloudOff } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/useT';
import { fetchProfile } from '../../services/api';
import { normaliseRole, ROLES } from '../../app/routes';
import { SectionHead } from '../../design/primitives/SectionHead';
import { LedgerRow } from '../../design/primitives/LedgerRow';
import { Button } from '../../design/primitives/Button';
import { LanguagePicker } from '../../shared/LanguagePicker';
import { EditDetailsForm } from './EditDetailsForm';
import { ChangePasswordForm } from './ChangePasswordForm';

/**
 * Who is signed in, what the app knows about them, and the two ways to change
 * it — plus the way out.
 *
 * One component rather than a per-role profile page: a fleet owner and a buyer
 * need exactly the same facts about themselves as a farmer does, and the old
 * build's answer to that was a farmer-shaped profile card that told a logged-in
 * buyer they were a "Tomato Producer" with "SMS price alerts enabled".
 *
 * Everything here is read from the session. Nothing is invented — a field the
 * account never filled in says so, rather than being filled in for it.
 *
 * The panel is one screen with three states rather than three screens: editing
 * your own name is not a journey, and a farmer who taps "edit" should still be
 * able to see they are in the same place they were a second ago.
 */
const ROLE_KEYS = {
  [ROLES.FARMER]: 'roles.farmer',
  [ROLES.BUYER]: 'roles.buyer',
  [ROLES.LOGISTICS]: 'roles.logistics',
};

export const ProfilePanel = ({ showHead = true }) => {
  const user = useAppStore((state) => state.user);
  const activeRole = useAppStore((state) => state.activeRole);
  const updateUser = useAppStore((state) => state.updateUser);
  const logout = useAppStore((state) => state.logout);
  const { t } = useT();

  const [mode, setMode] = useState('view'); // 'view' | 'details' | 'password'
  const [flash, setFlash] = useState(null); // 'saved' | 'savedHere' | 'passwordSaved'

  /*
   * Refresh the account from the server on open.
   *
   * A session rehydrated from localStorage is only as complete as the login
   * that wrote it, and logins made before the server returned phone and village
   * carry neither — which showed as "Not given" for details the account gave us
   * at signup. A failed refresh is silent: the stored session still renders,
   * it is just older, and there is nothing here for the user to do about it.
   */
  useEffect(() => {
    let cancelled = false;
    fetchProfile().then((fresh) => {
      if (!cancelled && fresh) updateUser(fresh);
    });
    return () => { cancelled = true; };
  }, [updateUser]);

  const blank = t('crop.profile.notSet');
  const initial = (user?.name || '?').trim().charAt(0).toUpperCase();
  const role = normaliseRole(activeRole);
  const isFarmer = role === ROLES.FARMER;

  const leave = (next) => {
    setMode('view');
    setFlash(next || null);
  };

  return (
    <section className="space-y-4">
      {showHead && (
        <SectionHead title={mode === 'view' ? t('crop.profile.title') : t('crop.profile.editTitle')} />
      )}

      {/* Cleared the moment anything else is opened, so a confirmation never
          outlives the action it is confirming. */}
      {flash && mode === 'view' && (
        <p className={`notice ${flash === 'savedHere' ? 'notice-bad' : 'notice-good'}`} role="status">
          {flash === 'savedHere'
            ? <CloudOff className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
            : <Check className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden="true" />}
          <span>{t(`crop.profile.${flash}`)}</span>
        </p>
      )}

      {mode === 'details' && (
        <EditDetailsForm
          onSaved={(offline) => leave(offline ? 'savedHere' : 'saved')}
          onCancel={() => leave()}
        />
      )}

      {mode === 'password' && (
        <ChangePasswordForm
          onSaved={() => leave('passwordSaved')}
          onCancel={() => leave()}
        />
      )}

      {mode === 'view' && (
        <>
          <div className="border-2 border-ink bg-white">
            {/* Name block: the one place an avatar earns its keep, as a square chip. */}
            <div className="flex items-center gap-3.5 border-b-2 border-ink px-4 py-4">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center bg-forest-700 font-display text-3xl leading-none text-white"
                aria-hidden="true"
              >
                {initial}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-3xl leading-none text-ink">
                  {user?.name || blank}
                </p>
                <p className="mt-1 text-base text-ink-soft">
                  {t(ROLE_KEYS[role])}
                </p>
              </div>
            </div>

            <div className="px-4">
              <LedgerRow label={t('crop.profile.email')} value={<span className="font-sans text-base">{user?.email || blank}</span>} />
              <LedgerRow label={t('crop.profile.phone')} value={<span className="font-sans text-base tnum">{user?.phone || blank}</span>} />
              <LedgerRow label={t('crop.profile.village')} value={<span className="font-sans text-base">{user?.location || blank}</span>} />
              {/* The account's crop, not the consignment's — buyers and fleet
                  owners have no such thing, so they are not shown an empty row. */}
              {isFarmer && (
                <LedgerRow
                  label={t('crop.profile.crop')}
                  value={<span className="font-sans text-base">{user?.primaryCrop ? t(`crops.${user.primaryCrop}`) : blank}</span>}
                />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <span className="text-sm font-bold text-ink">{t('lang.label')}</span>
              <LanguagePicker compact />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button icon={Pencil} onClick={() => { setFlash(null); setMode('details'); }}>
              {t('crop.profile.edit')}
            </Button>
            <Button variant="secondary" icon={KeyRound} onClick={() => { setFlash(null); setMode('password'); }}>
              {t('crop.profile.changePassword')}
            </Button>
          </div>

          <div className="flex justify-end">
            <Button
              variant="secondary"
              icon={LogOut}
              onClick={logout}
              full={false}
              className="!min-h-0 !h-9 !px-3 !text-xs !gap-1.5 [&_svg]:!h-4 [&_svg]:!w-4"
            >
              {t('crop.profile.logout')}
            </Button>
          </div>
        </>
      )}
    </section>
  );
};

export default ProfilePanel;
