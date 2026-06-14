"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AlertCircle, Inbox, Loader2, RefreshCw } from "lucide-react";
import {
  EMAIL_AUTHORIZATION_CHANGE_EVENT,
  EMAIL_AUTHORIZATION_STORAGE_KEY,
} from "@/lib/settings";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GmailSummary {
  short_summary: string;
  long_summary: string;
  emailCount: number;
  generatedAt: string;
}

interface BusinessEmail {
  id: number;
  title: string;
  senderName: string;
  senderAddress: string;
  date: string;
  read: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EMAIL_KEY_ERROR = "Please set a valid email key in the settings";
const UNREAD_RING_COLOR = "#3b82f6"; // blue-500
const READ_RING_COLOR = "rgba(255,255,255,0.10)";

/* ------------------------------------------------------------------ */
/*  Auth store                                                         */
/* ------------------------------------------------------------------ */

const getEmailAuthorizationSnapshot = () => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(EMAIL_AUTHORIZATION_STORAGE_KEY) ?? "";
};

const subscribeToEmailAuthorization = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(EMAIL_AUTHORIZATION_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(EMAIL_AUTHORIZATION_CHANGE_EVENT, onStoreChange);
  };
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeSummary = (value: unknown): GmailSummary | null => {
  if (!isRecord(value)) return null;
  if (typeof value.short_summary !== "string") return null;
  return {
    short_summary: value.short_summary,
    long_summary:
      typeof value.long_summary === "string" ? value.long_summary : "",
    emailCount: typeof value.emailCount === "number" ? value.emailCount : 0,
    generatedAt:
      typeof value.generatedAt === "string" ? value.generatedAt : "",
  };
};

const normalizeBusinessEmails = (value: unknown): BusinessEmail[] => {
  if (!isRecord(value) || !Array.isArray(value.emails)) return [];
  return value.emails.filter(isRecord).map((item) => ({
    id: typeof item.id === "number" ? item.id : 0,
    title:
      typeof item.title === "string" && item.title.trim()
        ? item.title
        : "Untitled email",
    senderName:
      typeof item.senderName === "string" && item.senderName.trim()
        ? item.senderName
        : "Unknown Sender",
    senderAddress:
      typeof item.senderAddress === "string" ? item.senderAddress : "",
    date: typeof item.date === "string" ? item.date : "",
    read: typeof item.read === "boolean" ? item.read : true,
  }));
};

const getResponseErrorMessage = (value: unknown, fallback: string) => {
  if (!isRecord(value)) return fallback;

  const upstreamStatus =
    typeof value.upstreamStatus === "number" ? value.upstreamStatus : null;
  const prefix = upstreamStatus ? `Email service returned ${upstreamStatus}` : null;

  if (typeof value.error === "string" && value.error.trim()) {
    return prefix ? `${prefix}: ${value.error}` : value.error;
  }

  if (typeof value.details === "string" && value.details.trim()) {
    return prefix ? `${prefix}: ${value.details}` : value.details;
  }

  return prefix || fallback;
};

const getSenderInitial = (name: string) => {
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() || "?";
};

type SenderBrand = "google" | "apple" | "formsubmit" | null;

const getSenderBrand = (address: string): SenderBrand => {
  const domain = address.split("@")[1]?.toLowerCase() ?? "";
  if (domain.includes("google")) return "google";
  if (domain.includes("apple")) return "apple";
  if (domain.includes("formsubmit")) return "formsubmit";
  return null;
};

const BRAND_ICONS: Record<Exclude<SenderBrand, null>, string> = {
  google: "/icons/google-icon.svg",
  apple: "/icons/apple-icon.svg",
  formsubmit: "/icons/form-icon.svg",
};

const formatRelativeDate = (dateStr: string): string => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EmailWidget() {
  const savedEmailAuthorizationToken = useSyncExternalStore(
    subscribeToEmailAuthorization,
    getEmailAuthorizationSnapshot,
    () => ""
  );

  const [summary, setSummary] = useState<GmailSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [businessEmails, setBusinessEmails] = useState<BusinessEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const showSpinner = loading || !minTimeElapsed;
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [hoveredLongSummary, setHoveredLongSummary] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const latestRequestId = useRef(0);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({
    canScrollUp: false,
    canScrollDown: false,
  });

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const canScrollUp = el.scrollTop > 2;
    const canScrollDown = el.scrollHeight - el.scrollTop - el.clientHeight > 2;
    setScrollState({ canScrollUp, canScrollDown });
  }, []);

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = latestRequestId.current + 1;
      latestRequestId.current = requestId;
      const token = savedEmailAuthorizationToken.trim();

      if (!token) {
        setSummary(null);
        setSummaryError(null);
        setBusinessEmails([]);
        setError(EMAIL_KEY_ERROR);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setSummaryError(null);

      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [summaryRes, emailsRes] = await Promise.all([
          fetch("/api/email-summary", { headers, signal }),
          fetch("/api/business-emails", { headers, signal }),
        ]);

        const summaryData: unknown = await summaryRes.json();
        const emailsData: unknown = await emailsRes.json();

        // Check for auth errors from either endpoint
        if (
          (isRecord(summaryData) && summaryData.error === "Unauthorized") ||
          (isRecord(emailsData) && emailsData.error === "Unauthorized")
        ) {
          throw new Error(EMAIL_KEY_ERROR);
        }

        if (!emailsRes.ok) {
          throw new Error(
            getResponseErrorMessage(emailsData, "Failed to load business emails")
          );
        }

        if (latestRequestId.current !== requestId || signal?.aborted) return;

        if (summaryRes.ok) {
          setSummary(normalizeSummary(summaryData));
          setSummaryError(null);
        } else {
          setSummary(null);
          setSummaryError(
            getResponseErrorMessage(summaryData, "Failed to load email summary")
          );
        }

        setBusinessEmails(normalizeBusinessEmails(emailsData));

        const now = new Date();
        const formattedTime = now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const formattedDate = now.toLocaleDateString([], {
          month: "short",
          day: "numeric",
        });
        setLastUpdated(`${formattedDate}, ${formattedTime}`);
      } catch (requestError) {
        if (signal?.aborted || latestRequestId.current !== requestId) return;
        setSummary(null);
        setSummaryError(null);
        setBusinessEmails([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load email data"
        );
      } finally {
        if (signal?.aborted || latestRequestId.current !== requestId) return;
        setLoading(false);
      }
    },
    [savedEmailAuthorizationToken]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    handleScroll();
    el.addEventListener("scroll", handleScroll);

    const resizeObserver = new ResizeObserver(() => {
      handleScroll();
    });
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [summary, businessEmails, handleScroll, loading]);

  const getMaskStyle = () => {
    const { canScrollUp, canScrollDown } = scrollState;
    const topPart = canScrollUp ? "transparent 0%, black 16px" : "black 0%";
    const bottomPart = canScrollDown
      ? "black calc(100% - 16px), transparent 100%"
      : "black 100%";
    return {
      maskImage: `linear-gradient(to bottom, ${topPart}, ${bottomPart})`,
      WebkitMaskImage: `linear-gradient(to bottom, ${topPart}, ${bottomPart})`,
    };
  };

  const hasContent = summary || summaryError || businessEmails.length > 0;
  const unreadCount = businessEmails.filter((e) => !e.read).length;

  /* ---- Tooltip portal (reuses existing style) ---- */
  const tooltipPortal =
    hoveredLongSummary && typeof document !== "undefined"
      ? createPortal(
          <>
            <div
              className="fixed w-72 rounded-lg border border-white/10 bg-zinc-950/95 p-3 text-[11px] font-medium leading-relaxed text-zinc-300 shadow-2xl backdrop-blur-md"
              style={{
                left: hoveredLongSummary.x + 14,
                top: hoveredLongSummary.y - 8,
                transform: "translateY(-100%)",
                zIndex: 999999,
                pointerEvents: "none",
                animation:
                  "tooltip-fade-in 150ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                Detailed Summary
              </p>
              <p>{hoveredLongSummary.text}</p>
            </div>
            <style jsx global>{`
              @keyframes tooltip-fade-in {
                from {
                  opacity: 0;
                  transform: translateY(-96%) scale(0.97);
                }
                to {
                  opacity: 1;
                  transform: translateY(-100%) scale(1);
                }
              }
            `}</style>
          </>,
          document.body
        )
      : null;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-md transition-all duration-300 dark:border-zinc-800/30 dark:bg-zinc-900/20">
      {/* Widget Header */}
      <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
        <div className="flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Email Feed
          </h3>
          {lastUpdated && (
            <p className="mt-0.5 text-[9px] font-semibold tracking-wider text-white uppercase">
              Updated at: {lastUpdated}
            </p>
          )}
        </div>
        {!loading && !error && unreadCount > 0 && (
          <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-400">
            {unreadCount} new
          </span>
        )}
      </div>

      {/* Loading overlay */}
      {showSpinner && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm dark:bg-zinc-900/20">
          <Loader2 size={24} className="animate-spin text-zinc-400" />
        </div>
      )}

      {/* Widget Content Area */}
      <div
        ref={scrollerRef}
        style={getMaskStyle()}
        className="email-scroller -mr-2 flex-1 overflow-y-auto pr-2"
      >
        {!showSpinner && (
          <>
            {error ? (
              error === EMAIL_KEY_ERROR ? (
                /* Auth key warning */
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-4">
                  <div className="grid size-12 place-items-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                    <AlertCircle size={22} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-300">
                      Authorization Required
                    </h4>
                    <p className="max-w-[13rem] text-[11px] leading-relaxed text-zinc-500">
                      Provide a valid access token in dashboard settings to
                      fetch summaries.
                    </p>
                  </div>
                </div>
              ) : (
                /* Generic error */
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-4">
                  <div className="grid size-12 place-items-center rounded-2xl border border-rose-500/25 bg-rose-500/10 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                    <AlertCircle size={22} />
                  </div>
                  <div className="space-y-2">
                    <p className="max-w-[13rem] text-[11px] leading-relaxed text-zinc-400">
                      {error}
                    </p>
                    <button
                      type="button"
                      onClick={() => fetchData()}
                      className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )
            ) : !hasContent ? (
              /* Empty state */
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="grid size-12 place-items-center rounded-2xl border border-white/5 bg-white/[0.01] text-zinc-500">
                  <Inbox size={22} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                    Inbox Clear
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    No email data yet.
                  </p>
                </div>
              </div>
            ) : (
              /* Main content: summary card + business email list */
              <div className="space-y-2 py-0.5">
                {/* Summary Error Card */}
                {summaryError && (
                  <div
                    className="relative rounded-xl border border-rose-500/15 bg-rose-500/[0.06] px-3 transition-all duration-300"
                    style={{ paddingTop: 10, paddingBottom: 10 }}
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <AlertCircle
                        size={12}
                        className="shrink-0 text-rose-400"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300/80">
                        Summary Unavailable
                      </span>
                    </div>
                    <p className="text-[11px] font-medium leading-relaxed text-rose-100/70">
                      {summaryError}
                    </p>
                  </div>
                )}

                {/* Gmail Summary Card */}
                {summary && (
                  <div
                    className="relative rounded-xl border border-white/5 bg-white/[0.015] px-3 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]"
                    style={{ paddingTop: 10, paddingBottom: 10 }}
                    onMouseMove={(e) => {
                      if (summary.long_summary) {
                        setHoveredLongSummary({
                          text: summary.long_summary,
                          x: e.clientX,
                          y: e.clientY,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredLongSummary(null)}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Personal Summary
                      </span>
                      {summary.emailCount > 0 && (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-px font-mono text-[9px] font-bold text-zinc-500">
                          {summary.emailCount} emails
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-medium leading-relaxed text-zinc-300">
                      {summary.short_summary}
                    </p>
                  </div>
                )}

                {/* Business Email List */}
                {businessEmails.map((email) => (
                  <div
                    key={email.id}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.015] px-3 text-left"
                    style={{ paddingTop: 8, paddingBottom: 8 }}
                  >
                    {/* Avatar with read/unread ring */}
                    {(() => {
                      const brand = getSenderBrand(email.senderAddress);
                      return (
                        <span
                          aria-hidden="true"
                          className="grid size-7 shrink-0 place-items-center rounded-full border-[1.5px]"
                          style={{
                            background: "transparent",
                            borderColor: email.read ? READ_RING_COLOR : UNREAD_RING_COLOR,
                          }}
                        >
                          {brand ? (
                            <Image
                              src={BRAND_ICONS[brand]}
                              alt={brand}
                              width={13}
                              height={13}
                              style={{ filter: email.read ? "invert(1) opacity(0.35)" : "invert(1)" }}
                            />
                          ) : (
                            <span
                              className="text-[10px] font-black"
                              style={{ color: email.read ? "rgba(255,255,255,0.35)" : "#ffffff" }}
                            >
                              {getSenderInitial(email.senderName)}
                            </span>
                          )}
                        </span>
                      );
                    })()}

                    {/* Email details */}
                    <div className="min-w-0 flex-1 pl-0.5">
                      <h4
                        className="truncate text-xs leading-tight"
                        style={{
                          fontWeight: email.read ? 500 : 700,
                          color: email.read
                            ? "rgba(255,255,255,0.5)"
                            : "rgba(244,244,245,1)",
                        }}
                      >
                        {email.title}
                      </h4>
                      <p className="mt-0.5 truncate text-[10px] font-medium text-zinc-500">
                        {email.senderName}
                      </p>
                    </div>

                    {/* Date */}
                    {email.date && (
                      <span className="shrink-0 text-[9px] font-semibold tracking-wide text-zinc-600">
                        {formatRelativeDate(email.date)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Refresh button */}
      <button
        type="button"
        onClick={() => fetchData()}
        aria-label="Refresh email data"
        title="Refresh email data"
        className="absolute bottom-4 right-4 rounded-full bg-black/40 p-2 text-zinc-400 opacity-0 backdrop-blur-md transition-all duration-300 hover:rotate-180 hover:text-white group-hover:opacity-100"
      >
        <RefreshCw size={14} />
      </button>

      {/* Hover tooltip portal */}
      {tooltipPortal}

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .email-scroller::-webkit-scrollbar {
          width: 4px;
        }
        .email-scroller::-webkit-scrollbar-track {
          background: transparent;
        }
        .email-scroller::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
        }
        .email-scroller::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.16);
        }
      `}</style>
    </div>
  );
}
