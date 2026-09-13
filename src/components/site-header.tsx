import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronDown,
  Facebook,
  FileSearch,
  Flag,
  Instagram,
  Menu,
  MoonStar,
  Star,
  Sun,
  X,
  Youtube,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Wordmark } from "@/components/brand";

type MenuKey = "reviews" | "reports" | "platforms" | "how";

const platformItems = [
  { name: "Google Reviews", note: "Live scanning today", glyph: "G", color: "#4285f4", live: true },
  { name: "Facebook", note: "Link detected, scanning soon", icon: Facebook, color: "#1877f2", live: false },
  { name: "Instagram", note: "Coming next", icon: Instagram, color: "#e1306c", live: false },
  { name: "YouTube", note: "Coming next", icon: Youtube, color: "#ff0000", live: false },
  { name: "Trustpilot", note: "Coming next", icon: Star, color: "#00b67a", live: false },
];

const reviewItems = [
  { label: "All reviews", to: "/dashboard", hint: "Everything you have scanned" },
  { label: "Possible violations", to: "/dashboard", hint: "Flagged by the AI policy check" },
  { label: "Needs a look", to: "/dashboard", hint: "Waiting on your decision" },
  { label: "Reported", to: "/reports", hint: "Sent to the platform" },
];

const reportItems = [
  { label: "Active reports", to: "/reports", hint: "Submitted and in progress" },
  { label: "Pending", to: "/reports", hint: "Awaiting a platform decision" },
  { label: "Resolved", to: "/reports", hint: "Outcome recorded" },
];

const howSteps = [
  { n: "01", label: "Paste a review link" },
  { n: "02", label: "AI scans the review" },
  { n: "03", label: "Policy check" },
  { n: "04", label: "Evidence built" },
  { n: "05", label: "Report it" },
  { n: "06", label: "Track the outcome" },
];

export function SiteHeader({
  signedIn,
  onScanClick,
  lightMode,
  onToggleAppearance,
}: {
  signedIn: boolean;
  onScanClick: () => void;
  lightMode?: boolean;
  onToggleAppearance?: () => void;
}) {
  const [open, setOpen] = useState<MenuKey | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(null);
        setMobileOpen(false);
      }
    }
    function onClick(event: MouseEvent) {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(null);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  function toggle(key: MenuKey) {
    setOpen((current) => (current === key ? null : key));
  }

  const menuProps = { open, onToggle: toggle, onOpen: setOpen, onClose: () => setOpen(null) };

  function scan() {
    setMobileOpen(false);
    setOpen(null);
    onScanClick();
  }

  return (
    <header ref={headerRef} className={`rw-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="rw-header-inner">
        <Link to="/" className="rw-logo" aria-label="Removal Work home">
          <Wordmark />
        </Link>

        <nav className="rw-nav" aria-label="Main">
          <button type="button" className="rw-nav-link" onClick={scan}>
            Scan Review
          </button>

          <MenuTrigger label="Reviews" id="reviews" {...menuProps}>
            <ul className="rw-menu-list">
              {reviewItems.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} onClick={() => setOpen(null)}>
                    <FileSearch className="size-4" />
                    <span>
                      <b>{item.label}</b>
                      <small>{item.hint}</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </MenuTrigger>

          <MenuTrigger label="Reports" id="reports" {...menuProps}>
            <ul className="rw-menu-list">
              {reportItems.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} onClick={() => setOpen(null)}>
                    <Flag className="size-4" />
                    <span>
                      <b>{item.label}</b>
                      <small>{item.hint}</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </MenuTrigger>

          <MenuTrigger label="Platforms" id="platforms" {...menuProps}>
            <ul className="rw-menu-list rw-menu-platforms">
              {platformItems.map((item) => (
                <li key={item.name}>
                  <button type="button" onClick={scan}>
                    <span className="rw-plat-icon" style={{ color: item.color }}>
                      {item.icon ? <item.icon className="size-4" /> : <b>{item.glyph}</b>}
                    </span>
                    <span>
                      <b>{item.name}</b>
                      <small>{item.note}</small>
                    </span>
                    {item.live ? <em className="rw-live">Live</em> : null}
                  </button>
                </li>
              ))}
            </ul>
          </MenuTrigger>

          <MenuTrigger label="How It Works" id="how" {...menuProps} wide>
            <ol className="rw-flow">
              {howSteps.map((step) => (
                <li key={step.n}>
                  <span>{step.n}</span>
                  {step.label}
                </li>
              ))}
            </ol>
          </MenuTrigger>
        </nav>

        <div className="rw-actions">
          {onToggleAppearance ? (
            <button
              type="button"
              className="rw-icon-btn"
              onClick={onToggleAppearance}
              aria-label={lightMode ? "Use dark appearance" : "Use light appearance"}
              title={lightMode ? "Dark mode" : "Light mode"}
            >
              {lightMode ? <MoonStar className="size-4" /> : <Sun className="size-4" />}
            </button>
          ) : null}
          <Link to={signedIn ? "/dashboard" : "/auth"} className="rw-ghost-btn">
            {signedIn ? "Dashboard" : "Login"}
          </Link>
          <button type="button" className="rw-cta" onClick={scan}>
            Scan a Review <ArrowRight className="size-4" />
          </button>
          <button
            type="button"
            className="rw-burger"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="rw-mobile">
          <button type="button" onClick={scan}>Scan Review</button>
          <Link to="/dashboard" onClick={() => setMobileOpen(false)}>Reviews</Link>
          <Link to="/reports" onClick={() => setMobileOpen(false)}>Reports</Link>
          <a href="#platforms" onClick={() => setMobileOpen(false)}>Platforms</a>
          <a href="#how" onClick={() => setMobileOpen(false)}>How It Works</a>
          <Link to={signedIn ? "/dashboard" : "/auth"} onClick={() => setMobileOpen(false)}>
            {signedIn ? "Dashboard" : "Login"}
          </Link>
          <button type="button" className="rw-cta rw-cta-block" onClick={scan}>
            Scan a Review <ArrowRight className="size-4" />
          </button>
        </div>
      ) : null}
    </header>
  );
}

function MenuTrigger({
  label,
  id,
  open,
  onToggle,
  onOpen,
  onClose,
  children,
  wide,
}: {
  label: string;
  id: MenuKey;
  open: MenuKey | null;
  onToggle: (key: MenuKey) => void;
  onOpen: (key: MenuKey) => void;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const isOpen = open === id;
  return (
    <div
      className="rw-nav-item"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") onOpen(id);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") onClose();
      }}
    >
      <button
        type="button"
        className={`rw-nav-link ${isOpen ? "is-open" : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        onPointerDown={(event) => {
          // Mouse users already opened the menu on hover; a click must not close it again.
          if (event.pointerType === "mouse") onOpen(id);
        }}
        onClick={(event) => {
          if ((event as unknown as { nativeEvent: PointerEvent }).nativeEvent.pointerType === "mouse") return;
          onToggle(id);
        }}
      >
        {label} <ChevronDown className="size-3.5" />
      </button>
      {isOpen ? <div className={`rw-menu ${wide ? "rw-menu-wide" : ""}`}>{children}</div> : null}
    </div>
  );
}
