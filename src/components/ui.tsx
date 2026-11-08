import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronsUpDown,
  Info,
} from "lucide-react";

export const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");

/** Grouped inset list: heading, rounded card with separated rows, optional footnote. */
export const Section: React.FC<{
  title: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
}> = ({ title, action, footer, children, bodyClassName }) => {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id={headingId} className="m-0 text-[13px] font-bold">
          {title}
        </h2>
        {action}
      </div>
      <Card className={bodyClassName}>{children}</Card>
      {footer && <p className="m-0 px-1 text-[11px] leading-[14px] text-secondary">{footer}</p>}
    </section>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cx(
      "flex flex-col overflow-hidden rounded-[10px] border border-separator bg-card divide-y divide-separator",
      className
    )}
  >
    {children}
  </div>
);

/** One settings row: label (+ description) on the left, control on the right. */
export const Row: React.FC<{
  label: React.ReactNode;
  description?: React.ReactNode;
  htmlFor?: string;
  strong?: boolean;
  children?: React.ReactNode;
}> = ({ label, description, htmlFor, strong, children }) => {
  const LabelTag: React.ElementType = htmlFor ? "label" : "span";
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-1.5">
      <span className="flex min-w-[160px] flex-1 flex-col gap-0.5 py-1">
        <LabelTag htmlFor={htmlFor} className={strong ? "font-semibold" : undefined}>
          {label}
        </LabelTag>
        {description && (
          <span className="text-xs leading-[15px] text-secondary">{description}</span>
        )}
      </span>
      {children}
    </div>
  );
};

/** Navigation row inside a Card (whole row is the target). */
export const NavRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  onClick: () => void;
}> = ({ icon, title, description, trailing, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-h-14 w-full items-center gap-3 border-0 bg-transparent px-3.5 py-2 text-left text-label hover:bg-fill-hover"
  >
    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-fill">
      {icon}
    </span>
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="font-semibold">{title}</span>
      {description && (
        <span className="truncate text-xs leading-[15px] text-secondary">{description}</span>
      )}
    </span>
    {trailing}
    <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 flex-none text-tertiary" strokeWidth={2.4} />
  </button>
);

export const Switch: React.FC<{
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}> = ({ checked, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cx(
      "relative flex h-[22px] w-[38px] flex-none items-center rounded-full border-0 p-0.5 transition-colors duration-150 disabled:opacity-50",
      "after:absolute after:-inset-x-1 after:-inset-y-[11px] after:content-['']",
      checked ? "bg-accent" : "bg-switch-off"
    )}
  >
    <span
      aria-hidden="true"
      className={cx(
        "h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-transform duration-150",
        checked ? "translate-x-4" : "translate-x-0"
      )}
    />
  </button>
);

type ButtonVariant = "default" | "primary" | "plain" | "destructive";

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
> = ({ variant = "default", className, type = "button", ...rest }) => (
  <button
    type={type}
    className={cx(
      "inline-flex h-7 flex-none items-center justify-center gap-1.5 rounded-md px-3 text-[13px] disabled:cursor-default disabled:opacity-50 [&>svg]:flex-none",
      variant === "default" && "border border-control-border bg-control text-label hover:bg-fill",
      variant === "primary" && "border-0 bg-accent font-semibold text-on-accent hover:brightness-110",
      variant === "plain" && "border-0 bg-transparent text-label hover:bg-fill",
      variant === "destructive" && "border border-control-border bg-control text-danger hover:bg-fill",
      className
    )}
    {...rest}
  />
);

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  disabled?: boolean;
}

/**
 * macOS-style pop-up button replacing the native `<select>` (whose menu can't be themed).
 * ARIA combobox + listbox pattern: focus stays on the button, the active option is announced
 * through `aria-activedescendant`. The list is portalled so card `overflow-hidden` can't clip it.
 */
export function Select<T extends string | number>({
  id,
  value,
  options,
  onChange,
  label,
  className,
}: {
  id?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  /** Accessible name when there is no `<label htmlFor>` for this control. */
  label?: string;
  className?: string;
}) {
  const reactId = useId();
  const listId = `${reactId}-list`;
  const optionId = (i: number) => `${reactId}-opt-${i}`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean }>();
  const typeahead = useRef({ text: "", at: 0 });

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];

  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const listHeight = Math.min(320, options.length * 28 + 10);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const up = spaceBelow < listHeight && rect.top > spaceBelow;
    setPos({ top: up ? rect.top - 4 : rect.bottom + 4, left: rect.left, width: rect.width, up });
  }, [options.length]);

  const openList = () => {
    setActive(selectedIndex);
    place();
    setOpen(true);
  };
  const close = () => setOpen(false);
  const commit = (i: number) => {
    const o = options[i];
    if (o && !o.disabled && o.value !== value) onChange(o.value);
    close();
  };

  // Reposition while open; close on outside click or when the window loses focus.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !listRef.current?.contains(t)) close();
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("blur", close);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("blur", close);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const step = (from: number, dir: 1 | -1) => {
    let i = from;
    for (let n = 0; n < options.length; n++) {
      i = (i + dir + options.length) % options.length;
      if (!options[i].disabled) return i;
    }
    return from;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => step(a, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => step(a, -1));
        break;
      case "Home":
        e.preventDefault();
        setActive(step(-1, 1));
        break;
      case "End":
        e.preventDefault();
        setActive(step(0, -1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(active);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close();
        break;
      default:
        if (e.key.length === 1 && e.key.trim()) {
          const now = Date.now();
          const t = typeahead.current;
          t.text = now - t.at < 600 ? t.text + e.key : e.key;
          t.at = now;
          const needle = t.text.toLocaleLowerCase();
          const hit = options.findIndex(
            (o) => !o.disabled && o.label.toLocaleLowerCase().startsWith(needle)
          );
          if (hit >= 0) setActive(hit);
        }
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? optionId(active) : undefined}
        aria-label={label}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={cx(
          "inline-flex h-7 min-w-[150px] max-w-full items-center gap-2 rounded-md border border-control-border bg-control pr-1.5 pl-2.5 text-left text-[13px] text-label",
          open && "border-focus",
          className
        )}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? ""}</span>
        <span
          aria-hidden="true"
          className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] bg-accent text-on-accent"
        >
          <ChevronsUpDown className="h-3 w-3" strokeWidth={2.75} />
        </span>
      </button>
      {open &&
        pos &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            style={{
              position: "fixed",
              left: pos.left,
              minWidth: pos.width,
              ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
            }}
            className="z-50 m-0 max-h-[320px] max-w-[calc(100vw-16px)] list-none overflow-y-auto rounded-lg border border-control-border bg-card p-1 text-[13px] text-label shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
          >
            {options.map((o, i) => {
              const isActive = i === active;
              const isSelected = o.value === value;
              return (
                <li
                  key={String(o.value)}
                  id={optionId(i)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={o.disabled || undefined}
                  onMouseMove={() => !o.disabled && setActive(i)}
                  onClick={() => commit(i)}
                  className={cx(
                    "flex h-7 cursor-default items-center gap-1.5 rounded-md pr-6 pl-1.5 whitespace-nowrap",
                    isActive && !o.disabled && "bg-accent text-on-accent",
                    o.disabled && "text-tertiary"
                  )}
                >
                  <span className="flex h-4 w-4 flex-none items-center justify-center">
                    {isSelected && <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                  {o.label}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </>
  );
}

export const TextField: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className,
  type = "text",
  ...rest
}) => (
  <input
    type={type}
    className={cx(
      "h-7 min-w-0 rounded-md border border-control-border bg-control px-2 text-[13px] text-label placeholder:text-tertiary",
      className
    )}
    {...rest}
  />
);

export const Slider: React.FC<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { valueText: string }
> = ({ valueText, className, ...rest }) => (
  <span className="flex max-w-full items-center gap-3">
    <input type="range" className={cx("h-6 w-[220px] max-w-[50vw]", className)} {...rest} />
    <span className="w-12 text-right text-secondary tabular-nums">{valueText}</span>
  </span>
);

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
}

/** macOS segmented control. `kind="tabs"` for view switching, `"radio"` for a value. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  kind = "radio",
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  kind?: "tabs" | "radio";
}) {
  const isTabs = kind === "tabs";
  return (
    <div
      role={isTabs ? "tablist" : "radiogroup"}
      aria-label={label}
      className="inline-flex max-w-full flex-wrap gap-0.5 rounded-lg border border-separator bg-segment p-0.5"
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role={isTabs ? "tab" : "radio"}
            aria-selected={isTabs ? on : undefined}
            aria-checked={isTabs ? undefined : on}
            onClick={() => onChange(o.id)}
            className={cx(
              "h-7 rounded-md border-0 px-3 text-[13px] text-label",
              on ? "bg-segment-on font-semibold shadow-sm" : "bg-transparent hover:bg-fill-hover"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export const StatusDot: React.FC<{ on: boolean }> = ({ on }) => (
  <span
    aria-hidden="true"
    className={cx("h-2 w-2 flex-none rounded-full", on ? "bg-success-dot" : "bg-tertiary")}
  />
);

export const ConnectionLabel: React.FC<{ connected: boolean }> = ({ connected }) => (
  <span className="flex flex-none items-center gap-1.5 text-xs text-secondary">
    <StatusDot on={connected} />
    {connected ? "Connected" : "Not connected"}
  </span>
);

export type Tone = "info" | "warning" | "success" | "error";

const toneIcon: Record<Tone, React.ReactNode> = {
  info: <Info aria-hidden="true" className="h-5 w-5 flex-none text-accent-text" />,
  warning: <AlertTriangle aria-hidden="true" className="h-5 w-5 flex-none text-warning" />,
  success: <CheckCircle2 aria-hidden="true" className="h-5 w-5 flex-none text-success" />,
  error: <AlertCircle aria-hidden="true" className="h-5 w-5 flex-none text-danger" />,
};

/** Banner card for page-level notices. */
export const Notice: React.FC<{
  tone: Tone;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ tone, title, children, actions }) => (
  <div
    role={tone === "error" ? "alert" : "status"}
    className="flex flex-wrap items-center gap-3 rounded-[10px] border border-separator bg-card px-3.5 py-3"
  >
    {toneIcon[tone]}
    <div className="flex min-w-[220px] flex-1 flex-col gap-0.5">
      <span className="font-semibold">{title}</span>
      {children && <span className="text-xs leading-[15px] text-secondary">{children}</span>}
    </div>
    {actions && <div className="flex gap-2">{actions}</div>}
  </div>
);

export interface StatusMessage {
  tone: "success" | "error";
  text: string;
}

/** Small inline result line next to an action button. */
export const InlineStatus: React.FC<{ message: StatusMessage | null }> = ({ message }) => (
  <p role="status" aria-live="polite" className="m-0 flex min-w-0 flex-1 items-center gap-1.5 text-xs">
    {message && (
      <>
        {message.tone === "success" ? (
          <CheckCircle2 aria-hidden="true" className="h-4 w-4 flex-none text-success" />
        ) : (
          <AlertCircle aria-hidden="true" className="h-4 w-4 flex-none text-danger" />
        )}
        <span className={message.tone === "success" ? "text-label" : "text-danger"}>
          {message.text}
        </span>
      </>
    )}
  </p>
);

/** Footer row inside a Card holding a status line and the section's primary action. */
export const ActionRow: React.FC<{ status?: StatusMessage | null; children: React.ReactNode }> = ({
  status = null,
  children,
}) => (
  <div className="flex min-h-11 flex-wrap items-center justify-end gap-3 px-3.5 py-2">
    <InlineStatus message={status} />
    {children}
  </div>
);

/**
 * Window-attached modal sheet built on the native <dialog> (focus trap, Esc, backdrop).
 * Set `dismissable={false}` while an operation must not be interrupted.
 */
export const Sheet: React.FC<{
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  alert?: boolean;
  dismissable?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ open, onClose, labelledBy, describedBy, alert, dismissable = true, className, children }) => {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      role={alert ? "alertdialog" : undefined}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissable) onClose();
      }}
      className={cx(
        "m-auto max-h-[calc(100vh-32px)] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-control-border bg-card p-0 text-[13px] text-label shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop:bg-black/40",
        className
      )}
    >
      {open && children}
    </dialog>
  );
};

/** Per-viewer UI preference stored in localStorage; falls back silently when storage is blocked. */
export function readPref(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(`havit-console:${key}`);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: boolean): void {
  try {
    localStorage.setItem(`havit-console:${key}`, value ? "1" : "0");
  } catch {
    /* storage unavailable: preference lasts for this session only */
  }
}
