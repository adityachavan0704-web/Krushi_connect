import React from "react";
import { useT } from "../../i18n/useT";
import { SectionHead } from "../../design/primitives/SectionHead";

export const DalalAnalyticsScreen = () => {
  return (
    <div className="space-y-6 py-4">
      <SectionHead
        title="Mandi Analytics"
        note="Your 7-day deal activity at the mandi gate"
      />
      <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm text-center">
         <p className="text-ink-faint">Analytics coming soon.</p>
      </div>
    </div>
  );
};
export default DalalAnalyticsScreen;
