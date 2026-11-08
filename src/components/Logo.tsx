import React from "react";

/**
 * The Havit Console mark: a slanted "H" whose two bars stand for two devices and the bridge
 * for the console that joins them. Same geometry as src-tauri/icons/source; `detail`
 * picks the simplified variants used at small sizes.
 */
export const LogoMark: React.FC<{
  size?: number;
  /** "full" adds the faint hexagon and the light notches; "small" is the bare mark. */
  detail?: "full" | "small";
  className?: string;
  title?: string;
}> = ({ size = 24, detail = size >= 40 ? "full" : "small", className, title }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 1024 1024"
    role={title ? "img" : undefined}
    aria-label={title}
    aria-hidden={title ? undefined : true}
    className={className}
  >
    <rect width="1024" height="1024" rx="229" fill="#1A1A1C" />
    {detail === "full" && (
      <polygon
        points="512,96 880,308 880,716 512,928 144,716 144,308"
        fill="none"
        stroke="#FF9230"
        strokeOpacity="0.16"
        strokeWidth="12"
      />
    )}
    <g fill="#FF9230">
      {detail === "full" ? (
        <>
          <polygon points="322,282 446,282 404,742 280,742" />
          <polygon points="578,282 702,282 660,742 536,742" />
          <polygon points="414,462 648,462 636,562 402,562" />
        </>
      ) : (
        <>
          <polygon points="306,262 456,262 410,762 260,762" />
          <polygon points="568,262 718,262 672,762 522,762" />
          <polygon points="408,452 652,452 638,572 394,572" />
        </>
      )}
    </g>
    <polygon points="712,282 768,282 748,410 692,410" fill="#FFFFFF" fillOpacity="0.9" />
    {detail === "full" && <polygon points="256,616 296,616 284,742 244,742" fill="#FFFFFF" fillOpacity="0.35" />}
  </svg>
);

/** Horizontal lockup for headers: mark + "HAVIT CONSOLE" wordmark. */
export const LogoLockup: React.FC<{ markSize?: number; className?: string }> = ({ markSize = 24, className }) => (
  <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
    <LogoMark size={markSize} />
    <span className="text-[13px] leading-none font-extrabold tracking-[-0.02em] italic">
      HAVIT <span className="text-accent-text">CONSOLE</span>
    </span>
  </span>
);
