import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";
import { fetchCategories, fetchResources, type CategoryCount, type Resource, type ResourceKind } from "../api/resources";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: Resource[]; total: number; page: number; pages: number; loadingMore: boolean; moreError: boolean };

const messageOf = (e: unknown) => (e instanceof ApiError ? e.message : "The resources service could not be reached.");

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Server-side search/filter. Typing is debounced; `loadMore` appends the next page. */
export function useResources(kind: ResourceKind, search: string, category: string, location: string = "") {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const debouncedSearch = useDebounced(search, 300);
  const debouncedLocation = useDebounced(location, 300);
  const moreCtrl = useRef<AbortController | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    moreCtrl.current?.abort();
    setState({ status: "loading" });
    fetchResources({ kind, search: debouncedSearch, category, location: debouncedLocation }, ctrl.signal)
      .then((r) => setState({ status: "ready", items: r.items, total: r.total, page: r.page, pages: r.pages, loadingMore: false, moreError: false }))
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setState({ status: "error", message: messageOf(e) });
      });
    return () => {
      ctrl.abort();
      moreCtrl.current?.abort();
    };
  }, [kind, debouncedSearch, category, debouncedLocation, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  const loadMore = useCallback(() => {
    if (state.status !== "ready" || state.loadingMore || state.page >= state.pages) return;
    const ctrl = new AbortController();
    moreCtrl.current = ctrl;
    setState({ ...state, loadingMore: true, moreError: false });
    fetchResources({ kind, search: debouncedSearch, category, location: debouncedLocation, page: state.page + 1 }, ctrl.signal)
      .then((r) =>
        setState((cur) =>
          cur.status === "ready"
            ? { ...cur, items: [...cur.items, ...r.items.filter((n) => !cur.items.some((o) => o.id === n.id))], page: r.page, pages: r.pages, total: r.total, loadingMore: false, moreError: false }
            : cur,
        ),
      )
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setState((cur) => (cur.status === "ready" ? { ...cur, loadingMore: false, moreError: true } : cur));
      });
  }, [state, kind, debouncedSearch, category, debouncedLocation]);

  return { state, retry, loadMore, searching: search !== debouncedSearch || location !== debouncedLocation };
}


export function useCategories(kind: ResourceKind) {
  const [cats, setCats] = useState<CategoryCount[]>([]);
  useEffect(() => {
    const ctrl = new AbortController();
    setCats([]);
    fetchCategories(kind, ctrl.signal)
      .then(setCats)
      .catch(() => {
        /* chips are optional; the main list shows any error */
      });
    return () => ctrl.abort();
  }, [kind]);
  return cats;
}
