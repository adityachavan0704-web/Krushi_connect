import { Sun, IndianRupee, Truck, Sprout, ClipboardList, Route, Store, PackageCheck, User, Shuffle, Boxes, Handshake, BarChart3, Users, Scale } from 'lucide-react';

/**
 * Every destination in the app, in one table.
 *
 * Replaces the previous arrangement, where the tab list lived in Navbar.jsx,
 * the render branches lived in App.jsx, and the two had drifted apart — some
 * `activeTab` values were reachable from the nav but had no branch, and some
 * branches had no way to reach them.
 *
 * Each role gets at most four tabs. Four is not arbitrary: it is what fits a
 * mobile bottom bar at a 56px target with Devanagari labels that do not
 * truncate. A fifth tab would shrink every target to buy a destination the
 * farmer did not ask for.
 */

export const ROLES = {
  FARMER: 'Farmer',
  BUYER: 'APMC Buyer',
  /*
   * The fleet owner — and there is deliberately no 'Driver' role beside it.
   *
   * A driver is a name and a phone number attached to a vehicle, not an
   * account. The person who decides where a truck goes is the person who owns
   * it, and giving drivers their own logins turned this into a ride-hailing
   * app: a farmer hailing individual trucks, each accepting or declining on its
   * own. That makes the capacitated VRP meaningless, because nobody is
   * optimising a fleet. Old 'Driver'/'Transporter' accounts are read as fleet
   * owners below.
   */
  LOGISTICS: 'Logistics',
  /*
   * The Dalal (commission agent / mandi broker). The person who sits at the
   * mandi gate, grades arriving lots, negotiates the price between farmer and
   * buyer, and records the deal.
   */
  DALAL: 'Dalal',
};

/** Older stored sessions and the backend use several spellings for each role. */
export const normaliseRole = (role) => {
  if (role === 'Logistics' || role === 'Logistics Provider' || role === 'Fleet'
    // Legacy. These accounts own vehicles like anyone else.
    || role === 'Transporter' || role === 'Driver') return ROLES.LOGISTICS;
  if (role === 'Trader' || role === 'Buyer' || role === 'APMC Buyer') return ROLES.BUYER;
  if (role === 'Dalal') return ROLES.DALAL;
  return ROLES.FARMER;
};

const FARMER_TABS = [
  { id: 'today',     labelKey: 'nav.farmer.today',     icon: Sun },
  { id: 'price',     labelKey: 'nav.farmer.price',     icon: IndianRupee },
  { id: 'transport', labelKey: 'nav.farmer.transport', icon: Truck },
  { id: 'crop',      labelKey: 'nav.farmer.crop',      icon: Sprout },
];

const LOGISTICS_TABS = [
  { id: 'logistics-dispatch', labelKey: 'nav.logistics.dispatch', icon: Shuffle },
  { id: 'logistics-jobs',     labelKey: 'nav.logistics.jobs',     icon: ClipboardList },
  { id: 'logistics-fleet',    labelKey: 'nav.logistics.fleet',    icon: Boxes },
  { id: 'logistics-routes',   labelKey: 'nav.logistics.routes',   icon: Route },
];

const BUYER_TABS = [
  { id: 'buyer-rates',   labelKey: 'nav.buyer.rates',   icon: Store },
  { id: 'buyer-inbound', labelKey: 'nav.buyer.inbound', icon: PackageCheck },
  { id: 'buyer-profile', labelKey: 'nav.buyer.profile', icon: User },
];

export const TABS_BY_ROLE = {
  [ROLES.FARMER]: FARMER_TABS,
  [ROLES.BUYER]: BUYER_TABS,
  [ROLES.LOGISTICS]: LOGISTICS_TABS,
  [ROLES.DALAL]: [
    { id: 'dalal-arrivals',  labelKey: 'nav.dalal.arrivals',  icon: Handshake },
    { id: 'dalal-rates',     labelKey: 'nav.dalal.rates',     icon: Scale },
    { id: 'dalal-analytics', labelKey: 'nav.dalal.analytics', icon: BarChart3 },
    { id: 'dalal-farmers',   labelKey: 'nav.dalal.farmers',   icon: Users },
  ],
};

/**
 * Profile is a destination but not a tab.
 *
 * It used to be bolted onto the bottom of the farmer's "My crop" screen, which
 * put "log out" and "what am I growing" on the same scroll — two things that
 * have nothing to do with each other and are edited at completely different
 * frequencies. It gets its own screen now.
 *
 * It is NOT in the nav lists, and that is the point. The bottom bar holds four
 * items at a 56px target with Devanagari labels; a fifth shrinks every one of
 * them to buy a screen a farmer opens roughly twice — once to check their
 * number, once to sign out. So the way in is the identity chip in the top bar,
 * which is where a user already looks for their own account.
 */
export const PROFILE_TAB = 'profile';

/**
 * The dispatch-routing walk-through. A destination, not a tab — the same shape
 * as PROFILE_TAB. Reached from the "?" on the fleet owner's Dispatch screen
 * (and, pre-auth, straight from the landing page via App.jsx's Gate). Kept out
 * of every role's nav list so it never spends one of the four bottom-bar slots.
 */
export const VRP_DEMO_TAB = 'vrp-demo';

export const tabsForRole = (role) => TABS_BY_ROLE[normaliseRole(role)] || FARMER_TABS;

export const defaultTabForRole = (role) => tabsForRole(role)[0].id;

/** True when `tabId` is reachable in `role` — used to recover from a stale stored tab. */
export const isTabValidForRole = (tabId, role) =>
  tabId === PROFILE_TAB || tabId === VRP_DEMO_TAB
  || tabsForRole(role).some((tab) => tab.id === tabId);

export const ALL_TAB_IDS = [
  ...[...FARMER_TABS, ...BUYER_TABS, ...LOGISTICS_TABS, ...TABS_BY_ROLE[ROLES.DALAL]].map((t) => t.id),
  PROFILE_TAB,
  VRP_DEMO_TAB,
];
