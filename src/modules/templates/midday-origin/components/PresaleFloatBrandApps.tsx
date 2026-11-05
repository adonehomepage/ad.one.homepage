"use client";

const ZIGBANG_URL = "https://www.zigbang.com/";
const HOGANGNONO_URL = "https://hogangnono.com/";

function ZigbangMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 21 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M17.4089 5.52854C17.4089 5.18631 17.3059 5.00513 17.0329 4.80382L10.7235 0.158534C10.4453 -0.0528445 10.1569 -0.0528445 9.87879 0.158534L7.10778 2.20689C5.63987 1.72374 4.27497 1.48216 3.1676 1.48216C1.14858 1.48216 0 2.31761 0 3.76706C0 5.20141 1.18978 7.10381 3.1985 9.03641V13.1684C3.1985 13.4401 3.38907 13.6213 3.66205 13.6213H9.75002C12.6704 15.1412 15.4002 15.9515 17.3935 15.9515C19.4125 15.9515 20.5765 15.116 20.5765 13.6515C20.5765 12.2171 19.4125 10.3147 17.4089 8.38215V5.52854ZM17.1153 12.8513C17.1153 13.1231 16.9248 13.3042 16.6518 13.3042H9.82213C7.52498 12.1266 5.12996 10.4204 3.48693 8.90556V5.66946C3.48693 5.32723 3.58994 5.14605 3.86292 4.94474L7.15929 2.51892C10.3835 3.54058 14.6843 6.16771 17.1153 8.4979V12.8513Z"
        fill="currentColor"
      />
    </svg>
  );
}

function HogangnonoMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 23 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M11.2452 0L0 5.5955V6.52719H1.40836V17.579H3.04422V5.99709L11.2452 1.91693L19.4407 5.99709V17.579H21.082V6.52719H22.485V5.5955L11.2614 0.0107091L11.2452 0Z"
        fill="currentColor"
      />
      <path d="M12.2109 5.63281H10.2771V7.68896H5.73242V9.19358H16.7555V7.68896H12.2109V5.63281Z" fill="currentColor" />
      <path
        d="M13.764 13.204C13.764 14.1678 12.7023 14.8639 11.2343 14.8639C9.7664 14.8639 8.72097 14.1625 8.72097 13.204C8.72097 12.2402 9.77724 11.5387 11.2343 11.5387C12.6915 11.5387 13.764 12.2402 13.764 13.204ZM11.2343 10.0127C8.64513 10.0127 6.83594 11.3246 6.83594 13.204C6.83594 15.0834 8.64513 16.3953 11.2343 16.3953C13.8236 16.3953 15.6544 15.0513 15.6544 13.204C15.6544 11.3567 13.7965 10.0127 11.2343 10.0127Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Dock 내부용 직방/호갱노노. 스킨 뷰에서는 PresaleFloatDock만 쓸 것.
 */
export function PresaleFloatBrandApps({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`presale-float-brand-apps${compact ? " presale-float-brand-apps--compact" : ""}`}
      role="navigation"
      aria-label="직방·호갱노노"
    >
      <a
        className="presale-float-brand-btn presale-float-brand-btn--zigbang"
        href={ZIGBANG_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="직방 바로가기"
      >
        <span className="presale-float-brand-btn__icon" aria-hidden>
          <ZigbangMark />
        </span>
        <span className="presale-float-brand-btn__label">직방</span>
      </a>
      <a
        className="presale-float-brand-btn presale-float-brand-btn--hogang"
        href={HOGANGNONO_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="호갱노노 바로가기"
      >
        <span className="presale-float-brand-btn__icon" aria-hidden>
          <HogangnonoMark />
        </span>
        <span className="presale-float-brand-btn__label">호갱노노</span>
      </a>
    </div>
  );
}
