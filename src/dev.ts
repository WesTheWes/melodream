// Dev tools (free roam, reveal lick, skip lick) are hidden unless the page is
// opened with ?dev=me, e.g. https://…/melodream/?dev=me#/play
export const DEV_ALLOWED: boolean = (() => {
  try {
    return new URLSearchParams(window.location.search).get('dev') === 'me';
  } catch {
    return false;
  }
})();
