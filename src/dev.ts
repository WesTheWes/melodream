// Dev tools (free roam, reveal lick, skip lick) are hidden unless the page is
// opened with ?dev=me, e.g. https://…/melodream/?dev=me#/play
// The lick browser can hand Play a specific lick to start with.
const FORCE_KEY = 'melodream.dev.forceLick';
export function forceNextLick(id: string): void {
  try {
    sessionStorage.setItem(FORCE_KEY, id);
  } catch {
    // storage unavailable; Play just picks as usual
  }
}
export function takeForcedLick(): string | null {
  try {
    const id = sessionStorage.getItem(FORCE_KEY);
    // Cleared a moment later rather than now: React's dev-mode double effect
    // runs the round start twice, and both runs should see the same lick.
    if (id) window.setTimeout(() => sessionStorage.removeItem(FORCE_KEY), 500);
    return id;
  } catch {
    return null;
  }
}

export const DEV_ALLOWED: boolean = (() => {
  try {
    return new URLSearchParams(window.location.search).get('dev') === 'me';
  } catch {
    return false;
  }
})();
