import { sceneFor } from '../art/worlds';

// One world's pixel scene as a crisp SVG.
// - `contain`: the whole 40 × 24 picture.
// - `banner`: for wide strips. The scene is laid out five times side by side,
//   every other copy mirrored so the edges join seamlessly, then cropped to fill.
//   On a wide screen the whole height shows; narrower screens crop the sides.
const COPIES = 5;

export function WorldScene({ stageId, label, fit = 'contain' }: { stageId: number; label?: string; fit?: 'contain' | 'banner' }) {
  const px = sceneFor(stageId);
  const rects = px.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.c} className={r.k || undefined} />);
  const banner = fit === 'banner';
  return (
    <svg
      className="scene"
      viewBox={banner ? `0 0 ${40 * COPIES} 24` : '0 0 40 24'}
      preserveAspectRatio={banner ? 'xMidYMid slice' : 'xMidYMid meet'}
      shapeRendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {banner ? (
        Array.from({ length: COPIES }, (_, k) => (
          <g key={k} transform={k % 2 ? `translate(${40 * (k + 1)} 0) scale(-1 1)` : `translate(${40 * k} 0)`}>
            {rects}
          </g>
        ))
      ) : (
        rects
      )}
    </svg>
  );
}
