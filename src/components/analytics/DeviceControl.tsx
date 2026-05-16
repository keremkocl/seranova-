"use client";

import { useState, useTransition } from "react";
import { Droplets, Wind, Lightbulb, Brain, Sliders } from "lucide-react";
import { toast } from "sonner";
import {
  toggleDeviceAction,
  setAutomationModeAction,
  type DeviceName,
} from "@/app/(dashboard)/dashboard/farmer/analytics/actions";

interface DeviceState {
  irrigationOn:  boolean;
  ventilationOn: boolean;
  lightingOn:    boolean;
}

interface Props {
  fieldId:   string;
  mode:      "AUTO" | "MANUAL";
  devices:   DeviceState; // Field's stored state for MANUAL mode
  aiDevices: DeviceState; // Engine-computed state for AUTO mode
}

const DEVICES = [
  { key: "irrigationOn"  as DeviceName, label: "Sulama Sistemi",   Icon: Droplets   },
  { key: "ventilationOn" as DeviceName, label: "Havalandırma",     Icon: Wind       },
  { key: "lightingOn"    as DeviceName, label: "Yapay Aydınlatma", Icon: Lightbulb  },
] as const;

function Toggle({
  on,
  disabled,
  onChange,
}: {
  on: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      aria-pressed={on}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 disabled:cursor-not-allowed ${
        on ? "bg-green-500" : "bg-gray-300"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function DeviceControl({ fieldId, mode, devices, aiDevices }: Props) {
  const [localMode, setLocalMode] = useState(mode);
  const [localDevices, setLocalDevices] = useState(devices);
  const [isPending, startTransition] = useTransition();

  const isAuto = localMode === "AUTO";
  const active  = isAuto ? aiDevices : localDevices;

  function handleModeToggle() {
    const next = isAuto ? "MANUAL" : "AUTO";
    setLocalMode(next);
    startTransition(async () => {
      const res = await setAutomationModeAction(fieldId, next);
      if (res.error) {
        setLocalMode(localMode);
        toast.error(res.error);
      } else {
        toast.success(next === "AUTO" ? "AI otomasyon aktif." : "Manuel mod aktif.");
      }
    });
  }

  function handleDeviceToggle(key: DeviceName, current: boolean) {
    if (isAuto) return;
    const next = !current;
    setLocalDevices((prev) => ({ ...prev, [key]: next }));
    startTransition(async () => {
      const res = await toggleDeviceAction(fieldId, key, next);
      if (res.error) {
        setLocalDevices((prev) => ({ ...prev, [key]: current }));
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle row */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isAuto ? "bg-green-100" : "bg-gray-100"}`}>
            {isAuto
              ? <Brain size={16} className="text-green-700" />
              : <Sliders size={16} className="text-gray-600" />
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {isAuto ? "AI Otomasyon" : "Manuel Kontrol"}
            </p>
            <p className="text-xs text-gray-400">
              {isAuto
                ? "Sensör verilerine göre AI cihazları yönetiyor"
                : "Cihazları kendiniz kontrol edin"}
            </p>
          </div>
        </div>
        <Toggle on={isAuto} disabled={isPending} onChange={handleModeToggle} />
      </div>

      {/* Device cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {DEVICES.map(({ key, label, Icon }) => {
          const on = active[key];
          return (
            <div
              key={key}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                on ? "border-green-200 bg-green-50" : "border-gray-100 bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${on ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {on && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                    <p className={`text-xs font-semibold ${on ? "text-green-600" : "text-gray-400"}`}>
                      {on ? "AÇIK" : "KAPALI"}
                    </p>
                    {isAuto && on && (
                      <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full ml-1">AI</span>
                    )}
                  </div>
                </div>
              </div>
              <Toggle
                on={on}
                disabled={isAuto || isPending}
                onChange={() => handleDeviceToggle(key, on)}
              />
            </div>
          );
        })}
      </div>

      {isAuto && (
        <p className="text-xs text-center text-gray-400">
          AI otomasyon aktif — manuel müdahale için modu değiştirin
        </p>
      )}
    </div>
  );
}
