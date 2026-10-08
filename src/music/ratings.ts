import data from './data/ratings.json';

// Your verdicts on licks: hidden ones are never picked, liked ones come up
// about three times as often. They live in data/ratings.json, which ships with
// the game. While running the local dev server (npm run dev), marking a lick in
// the lick browser or on the Play screen (?dev=me) writes straight into that
// file; commit it to publish the change.

export type Rating = 'liked' | 'hidden' | null;

const liked = new Set<string>(data.liked);
const hidden = new Set<string>(data.hidden);
const listeners = new Set<() => void>();

export function ratingOf(id: string): Rating {
  return liked.has(id) ? 'liked' : hidden.has(id) ? 'hidden' : null;
}
export const isHidden = (id: string) => hidden.has(id);
export const isLiked = (id: string) => liked.has(id);
export const ratingCounts = () => ({ liked: liked.size, hidden: hidden.size });

export function subscribeRatings(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Set or clear a rating. Resolves to whether it was saved to the project file.
export async function setRating(id: string, rating: Rating): Promise<boolean> {
  liked.delete(id);
  hidden.delete(id);
  if (rating === 'liked') liked.add(id);
  if (rating === 'hidden') hidden.add(id);
  listeners.forEach((fn) => fn());
  if (!import.meta.env.DEV) return false;
  try {
    const res = await fetch('/__dev/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ liked: [...liked].sort(), hidden: [...hidden].sort() }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
