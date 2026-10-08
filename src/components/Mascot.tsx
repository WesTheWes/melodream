// Luna, the mascot: four pixel-art sprites in public/luna, one per mood.
// Each PNG is stored at 1 pixel per art pixel and scaled up by a whole number
// so the pixels stay square and crisp.
export type LunaMood = 'curious' | 'happy' | 'excited' | 'sleep';

const SPRITES: Record<LunaMood, { w: number; h: number; label: string }> = {
  curious: { w: 72, h: 92, label: 'Luna, head tilted, listening' },
  happy: { w: 77, h: 90, label: 'Luna, smiling' },
  excited: { w: 84, h: 91, label: 'Luna, bounding forward with her tongue out' },
  sleep: { w: 95, h: 72, label: 'Luna, curled up asleep' },
};

export function Mascot({ mood = 'curious', scale = 2, className }: { mood?: LunaMood; scale?: number; className?: string }) {
  const s = SPRITES[mood];
  return (
    <img
      className={'luna' + (className ? ' ' + className : '')}
      src={`${import.meta.env.BASE_URL}luna/${mood}.png`}
      width={s.w * scale}
      height={s.h * scale}
      alt={s.label}
      draggable={false}
    />
  );
}

export function Stars() {
  const stars = [
    [6, 18, 1],
    [14, 62, 0.5],
    [23, 30, 1],
    [41, 12, 0.6],
    [57, 72, 1],
    [66, 22, 0.5],
    [78, 48, 1],
    [88, 14, 1],
    [93, 66, 0.6],
    [33, 84, 0.5],
  ];
  return (
    <>
      {stars.map(([x, y, o], i) => (
        <div key={i} className="star" style={{ left: `${x}%`, top: `${y}%`, opacity: o }} />
      ))}
    </>
  );
}

export function Lock({ size = 20, fill = '#1B1535' }: { size?: number; fill?: string }) {
  return (
    <svg className="px" width={size} height={size * 1.2} viewBox="0 0 10 12" aria-hidden="true">
      <rect x="2" y="0" width="6" height="1" fill={fill} />
      <rect x="1" y="1" width="1" height="4" fill={fill} />
      <rect x="8" y="1" width="1" height="4" fill={fill} />
      <rect x="0" y="5" width="10" height="7" fill={fill} />
      <rect x="4" y="7" width="2" height="3" fill="#FFF7E6" />
    </svg>
  );
}
