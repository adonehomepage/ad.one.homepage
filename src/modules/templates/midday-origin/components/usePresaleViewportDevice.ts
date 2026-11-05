"use client";

import { useEffect, useState } from "react";

export type PresaleViewportDevice = "desktop" | "tablet" | "mobile";

/** 편집기 프레임 우선, 없으면 실제 뷰포트로 디바이스 판별 */
export function usePresaleViewportDevice(
  previewDevice?: PresaleViewportDevice
): PresaleViewportDevice {
  const [autoDevice, setAutoDevice] = useState<PresaleViewportDevice>("desktop");

  useEffect(() => {
    if (previewDevice) return;

    const mobileMq = window.matchMedia("(max-width: 768px)");
    const tabletMq = window.matchMedia("(max-width: 1024px)");

    const sync = () => {
      if (mobileMq.matches) setAutoDevice("mobile");
      else if (tabletMq.matches) setAutoDevice("tablet");
      else setAutoDevice("desktop");
    };

    sync();
    mobileMq.addEventListener("change", sync);
    tabletMq.addEventListener("change", sync);
    return () => {
      mobileMq.removeEventListener("change", sync);
      tabletMq.removeEventListener("change", sync);
    };
  }, [previewDevice]);

  return previewDevice ?? autoDevice;
}
