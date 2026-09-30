import React, { Suspense, lazy, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useT } from '../i18n/useT';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';
import { useTabHistory } from './useTabHistory';
import { normaliseRole, defaultTabForRole, isTabValidForRole, PROFILE_TAB, VRP_DEMO_TAB } from './routes';

import { TodayScreen } from '../features/farmer/today/TodayScreen';
import { PriceScreen } from '../features/farmer/price/PriceScreen';

/*
 * The farmer's other two screens are lazy — they are a tap away, not on the
 * critical path to the verdict, and Today is what has to paint fast on a
 * 3G handset standing in a field.
 */
const TransportScreen = lazy(() => import('../features/farmer/transport/TransportScreen').then((m) => ({ default: m.TransportScreen })));
const CropScreen = lazy(() => import('../features/farmer/crop/CropScreen').then((m) => ({ default: m.CropScreen })));

/*
 * Fleet-owner and buyer screens are lazy-loaded, so a farmer who never opens
 * those views never downloads them.
 */
const DispatchScreen = lazy(() => import('../features/logistics/DispatchScreen').then((m) => ({ default: m.DispatchScreen })));
const VrpSimulationScreen = lazy(() => import('../features/logistics/VrpSimulationScreen').then((m) => ({ default: m.VrpSimulationScreen })));
const FleetScreen = lazy(() => import('../features/logistics/FleetScreen').then((m) => ({ default: m.FleetScreen })));
const LogisticsRoutesScreen = lazy(() => import('../features/logistics/LogisticsRoutesScreen').then((m) => ({ default: m.LogisticsRoutesScreen })));
const LogisticsJobsScreen = lazy(() => import('../features/logistics/LogisticsJobsScreen').then((m) => ({ default: m.LogisticsJobsScreen })));
const BuyerRatesScreen = lazy(() => import('../features/buyer/BuyerRatesScreen').then((m) => ({ default: m.BuyerRatesScreen })));
const BuyerInboundScreen = lazy(() => import('../features/buyer/BuyerInboundScreen').then((m) => ({ default: m.BuyerInboundScreen })));
const ProfilePanel = lazy(() => import('../features/profile/ProfilePanel').then((m) => ({ default: m.ProfilePanel })));

const DalalArrivalsScreen = lazy(() => import('../features/dalal/DalalArrivalsScreen').then((m) => ({ default: m.DalalArrivalsScreen })));
const DalalRatesScreen = lazy(() => import('../features/dalal/DalalRatesScreen').then((m) => ({ default: m.DalalRatesScreen })));
const DalalAnalyticsScreen = lazy(() => import('../features/dalal/DalalAnalyticsScreen').then((m) => ({ default: m.DalalAnalyticsScreen })));
const DalalFarmersScreen = lazy(() => import('../features/dalal/DalalFarmersScreen').then((m) => ({ default: m.DalalFarmersScreen })));


const Loading = () => {
  const { t } = useT();
  return <div className="py-16 text-center text-ink-faint">{t('common.loading')}</div>;
};

const screenFor = (tabId, setActiveTab) => {
  switch (tabId) {
    case 'today':
      return <TodayScreen />;
    case 'price':
      return <PriceScreen />;
    case 'transport':
      return <TransportScreen />;
    case 'crop':
      return <CropScreen />;

    /* Every role reaches this from the top bar's identity chip. */
    case PROFILE_TAB:
      return <div className="pt-4"><ProfilePanel /></div>;

    case 'logistics-dispatch':
      return <DispatchScreen />;
    case VRP_DEMO_TAB:
      return <VrpSimulationScreen onExit={() => setActiveTab('logistics-dispatch')} />;
    case 'logistics-jobs':
      return <LogisticsJobsScreen />;
    case 'logistics-fleet':
      return <FleetScreen />;
    case 'logistics-routes':
      return <LogisticsRoutesScreen />;

    case 'buyer-rates':
      return <BuyerRatesScreen />;
    case 'buyer-inbound':
      return <BuyerInboundScreen />;
    case 'buyer-profile':
      return <div className="pt-4"><ProfilePanel /></div>;

    case 'dalal-arrivals':
      return <DalalArrivalsScreen />;
    case 'dalal-rates':
      return <DalalRatesScreen />;
    case 'dalal-analytics':
      return <DalalAnalyticsScreen />;
    case 'dalal-farmers':
      return <DalalFarmersScreen />;

    /*
     * Unreachable: routes.js is the only source of tab ids and every one of
     * them is handled above. Falling back to the role's home beats rendering
     * a dead screen if that ever stops being true.
     */
    default:
      return <TodayScreen />;
  }
};

const RAGAssistantModal = lazy(() => import('../features/rag/RAGAssistantModal'));

export const AppShell = () => {
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const activeRole = useAppStore((state) => state.activeRole);
  const [isRagOpen, setIsRagOpen] = React.useState(false);

  useTabHistory();

  useEffect(() => {
    const handleOpenRag = () => setIsRagOpen(true);
    window.addEventListener('open-rag-assistant', handleOpenRag);
    return () => window.removeEventListener('open-rag-assistant', handleOpenRag);
  }, []);

  const role = normaliseRole(activeRole);
  useEffect(() => {
    if (!isTabValidForRole(activeTab, role)) {
      setActiveTab(defaultTabForRole(role));
    }
  }, [activeTab, role, setActiveTab]);

  return (
    <div className="flex min-h-full bg-paper">
      <SideNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-8 sm:px-6 lg:max-w-6xl lg:px-10">
          <Suspense fallback={<Loading />}>
            <div key={activeTab}>{screenFor(activeTab, setActiveTab)}</div>
          </Suspense>
        </main>

        <BottomNav />
      </div>

      <Suspense fallback={null}>
        <RAGAssistantModal isOpen={isRagOpen} onClose={() => setIsRagOpen(false)} />
      </Suspense>
    </div>
  );
};

export default AppShell;
