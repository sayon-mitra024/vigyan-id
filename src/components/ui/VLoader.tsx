import type { CSSProperties } from "react";

type VLoaderProps = {
  size?: number;
  background?: string;
  foreground?: string;
  duration?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
};

export default function VLoader({
  size = 96,
  background = "transparent",
  foreground = "#C8102E",
  duration = 2.4,
  label,
  className = "",
  style,
}: VLoaderProps) {
  const cycle = `${duration}s`;
  return (
    <div className={`vloader-root ${className}`} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 12, ...style }} role="status" aria-live="polite" aria-label={label || "Loading"}>
      <div className="vloader-badge" style={{ width: size, height: size, borderRadius: size * 0.26, background, display: "flex", alignItems: "center", justifyContent: "center", animation: `vloader-breathe ${cycle} cubic-bezier(0.65,0,0.35,1) infinite` }}>
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <path className="vloader-stroke" d="M27 21 L47 63 L78 15" stroke={foreground} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" pathLength="1" style={{ animation: `vloader-draw ${cycle} cubic-bezier(0.65,0,0.35,1) infinite` }} />
          <circle className="vloader-dot" cx="47" cy="83" r="6" fill={foreground} style={{ transformOrigin: "47px 83px", animation: `vloader-dot ${cycle} cubic-bezier(0.34,1.56,0.64,1) infinite` }} />
        </svg>
      </div>
      {label ? <span style={{ fontSize: 13, letterSpacing: "0.02em", color: "rgba(128,128,128,.85)", animation: `vloader-label-fade ${cycle} ease-in-out infinite` }}>{label}</span> : null}
      <style>{`@keyframes vloader-draw{0%{stroke-dashoffset:1;stroke-dasharray:1;opacity:1}38%{stroke-dashoffset:0;stroke-dasharray:1;opacity:1}80%{stroke-dashoffset:0;opacity:1}92%,100%{opacity:0;stroke-dashoffset:1}}@keyframes vloader-dot{0%,34%{opacity:0;transform:scale(0)}46%{opacity:1;transform:scale(1.25)}54%{transform:scale(.9)}60%,80%{opacity:1;transform:scale(1)}92%,100%{opacity:0;transform:scale(.6)}}@keyframes vloader-breathe{0%,46%,100%{transform:scale(1)}63%{transform:scale(1.04)}80%{transform:scale(1)} }@keyframes vloader-label-fade{0%,100%{opacity:.35}50%{opacity:.9}}@media(prefers-reduced-motion:reduce){.vloader-badge,.vloader-stroke,.vloader-dot,.vloader-root span{animation:none!important}.vloader-stroke{stroke-dashoffset:0}.vloader-dot{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}
