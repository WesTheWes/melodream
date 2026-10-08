// Dreamy, the sleeping cloud. 16×10 grid.
export function Mascot({ size = 128, awake = false }: { size?: number; awake?: boolean }) {
  const h = (size * 10) / 16;
  return (
    <svg className="px" width={size} height={h} viewBox="0 0 16 10" aria-label={awake ? 'Dreamy, awake' : 'Dreamy, asleep'}>
      <rect x="5" y="0" width="4" height="1" fill="#0E0B1F" />
      <rect x="4" y="1" width="1" height="1" fill="#0E0B1F" />
      <rect x="5" y="1" width="4" height="1" fill="#FFF7E6" />
      <rect x="9" y="1" width="1" height="1" fill="#0E0B1F" />
      <rect x="2" y="2" width="2" height="1" fill="#0E0B1F" />
      <rect x="4" y="2" width="6" height="1" fill="#FFF7E6" />
      <rect x="10" y="2" width="2" height="1" fill="#0E0B1F" />
      <rect x="1" y="3" width="1" height="1" fill="#0E0B1F" />
      <rect x="2" y="3" width="10" height="1" fill="#FFF7E6" />
      <rect x="12" y="3" width="1" height="1" fill="#0E0B1F" />
      <rect x="0" y="4" width="1" height="4" fill="#0E0B1F" />
      <rect x="1" y="4" width="12" height="4" fill="#FFF7E6" />
      <rect x="13" y="4" width="1" height="4" fill="#0E0B1F" />
      {awake ? (
        <>
          <rect x="3" y="4" width="2" height="2" fill="#0E0B1F" />
          <rect x="8" y="4" width="2" height="2" fill="#0E0B1F" />
          <rect x="5" y="7" width="4" height="1" fill="#0E0B1F" />
        </>
      ) : (
        <>
          <rect x="3" y="5" width="2" height="1" fill="#0E0B1F" />
          <rect x="8" y="5" width="2" height="1" fill="#0E0B1F" />
        </>
      )}
      <rect x="2" y="6" width="1" height="1" fill="#FF6FA5" />
      <rect x="11" y="6" width="1" height="1" fill="#FF6FA5" />
      <rect x="1" y="8" width="12" height="1" fill="#0E0B1F" />
      <rect x="3" y="9" width="2" height="1" fill="#0E0B1F" opacity=".35" />
      <rect x="9" y="9" width="2" height="1" fill="#0E0B1F" opacity=".35" />
      <rect x="14" y="0" width="1" height="1" fill="#FFD166" />
      <rect x="15" y="1" width="1" height="1" fill="#FFD166" />
      <rect x="14" y="2" width="1" height="1" fill="#FFD166" />
    </svg>
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
