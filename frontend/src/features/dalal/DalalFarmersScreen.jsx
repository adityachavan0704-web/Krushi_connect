import React from "react";
import { useT } from "../../i18n/useT";
import { SectionHead } from "../../design/primitives/SectionHead";

export const DalalFarmersScreen = () => {
  return (
    <div className="space-y-6 py-4">
      <SectionHead
        title="My Farmers"
        note="Farmers you have transacted with at the mandi"
      />
      <div className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm text-center">
         <p className="text-ink-faint">Farmer list coming soon.</p>
      </div>
    </div>
  );
};
export default DalalFarmersScreen;
