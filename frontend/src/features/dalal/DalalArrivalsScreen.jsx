import React, { useState } from "react";
import { Truck, Search, CheckCircle } from "lucide-react";
import { useT } from "../../i18n/useT";
import { SectionHead } from "../../design/primitives/SectionHead";

const MOCK_ARRIVALS = [
  { id: "1", farmer: "Kiran Thorat", crop: "Onion",  qty: 2500, vehicle: "MH 15 AB 1234", status: "Waiting", time: "10:30 AM" },
  { id: "2", farmer: "Ramesh Singh", crop: "Tomato", qty: 1200, vehicle: "MH 12 CD 5678", status: "Graded",  time: "11:15 AM" },
];

export const DalalArrivalsScreen = () => {
  const { t } = useT();
  
  return (
    <div className="space-y-6 py-4">
      <SectionHead
        title="Live Arrivals"
        note="Track shipments arriving at the mandi gate"
      />
      
      <div className="space-y-3">
        {MOCK_ARRIVALS.map((a) => (
          <div key={a.id} className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm flex items-start justify-between">
            <div>
              <p className="font-bold text-ink">{a.farmer}</p>
              <p className="text-sm text-ink-soft">{a.crop} · {a.qty.toLocaleString()} kg</p>
              <p className="flex items-center gap-1.5 text-xs text-ink-faint mt-1">
                <Truck className="h-3 w-3" /> {a.vehicle}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                a.status === "Waiting" ? "bg-turmeric-100 text-turmeric-800" : "bg-forest-100 text-forest-800"
              }`}>
                {a.status}
              </span>
              <span className="text-xs text-ink-faint mt-1">{a.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DalalArrivalsScreen;
