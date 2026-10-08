// Pixel-art scenes for every world, drawn on a 40 × 24 grid out of flat
// blocks, back to front. Rendered by components/WorldScene.tsx. Blocks with
// k = 'tw' twinkle (see .tw in styles.css).

export interface Px {
  x: number;
  y: number;
  w: number;
  h: number;
  c: string;
  k: string;
}
type Art = Px | Art[];

const INK = '#0E0B1F';
const COL = ['#FFD166','#E0C8FF','#FF9F68','#FFA3C6','#FF6FA5','#C77DFF','#D8B4FF','#6EC6FF','#C8A2FF','#7CF5C8','#FFB0B0','#FF7B7B'];
const R = (x: number, y: number, w: number, h: number, c: string, k?: string): Px => ({ x, y, w, h, c, k: k || '' });
const band = (y: number, h: number, c: string) => R(0, y, 40, h, c);
function disc(cx: number, cy: number, r: number, c: string, k?: string): Px[] {
  const o: Px[] = [];
  for (let dy = -r; dy < r; dy++) {
    const yy = dy + 0.5;
    const half = Math.round(Math.sqrt(r * r - yy * yy));
    if (half > 0) o.push(R(cx - half, cy + dy, half * 2, 1, c, k));
  }
  return o;
}
function mound(cx: number, base: number, w: number, h: number, c: string): Px[] {
  const o: Px[] = [];
  for (let i = 0; i < h; i++) {
    const t = (i + 0.5) / h;
    const half = Math.round((w / 2) * Math.sqrt(1 - t * t));
    if (half > 0) o.push(R(cx - half, base - 1 - i, half * 2, 1, c));
  }
  return o;
}
function peak(cx: number, base: number, h: number, c: string, slope?: number, cap?: string, capRows = 0): Px[] {
  const s = slope || 1;
  const o: Px[] = [];
  for (let i = 0; i < h; i++) {
    const half = Math.max(1, Math.round((h - i) * s));
    o.push(R(cx - half, base - 1 - i, half * 2, 1, cap && i >= h - capRows ? cap : c));
  }
  return o;
}
function drip(cx: number, top: number, h: number, c: string): Px[] {
  const o: Px[] = [];
  for (let i = 0; i < h; i++) {
    const half = Math.max(1, Math.round((h - i) * 0.6));
    o.push(R(cx - half, top + i, half * 2, 1, c));
  }
  return o;
}
const cloud = (x: number, y: number, c: string) => [R(x + 2, y, 3, 1, c), R(x, y + 1, 8, 1, c), R(x + 1, y + 2, 6, 1, c)];
const stars = (pts: number[][], c?: string) => pts.map(([x, y]) => R(x, y, 1, 1, c || '#FFF7E6', 'tw'));
const pine = (cx: number, base: number, h: number, c: string, trunk?: string) => [R(cx - 1, base - 2, 2, 2, trunk || '#5A3428'), ...peak(cx, base - 2, h, c, 0.6)];

const WORLDS: Record<string, () => Art[]> = {
  steps: () => [
    band(0, 6, '#FFE7A8'), band(6, 5, '#FFD98A'), band(11, 5, '#FFC46B'),
    disc(20, 16, 6, '#FFF7E6'), disc(20, 16, 4, '#FFEFC4'),
    cloud(3, 3, '#FFF7E6'), cloud(28, 5, '#FFF7E6'),
    band(16, 8, '#7CCB7E'), band(20, 4, '#62B56B'),
    R(8, 21, 5, 1, '#FFF7E6'), R(8, 22, 5, 1, '#C9B99A'), R(15, 19, 4, 1, '#FFF7E6'), R(15, 20, 4, 1, '#C9B99A'), R(21, 17, 3, 1, '#FFF7E6'), R(21, 18, 3, 1, '#C9B99A'),
    R(30, 12, 6, 4, '#FF9F68'), peak(33, 12, 4, '#E85A8A', 1), R(32, 14, 2, 2, '#8C2F4B'), R(34, 13, 1, 1, '#FFF7E6'), R(30, 13, 1, 1, '#FFF7E6'),
    R(3, 17, 1, 1, '#4E9A5C'), R(27, 19, 1, 1, '#4E9A5C'), R(36, 21, 1, 1, '#4E9A5C'), R(13, 17, 1, 1, '#4E9A5C')
  ],
  meadow: () => {
    const fl: Art[] = [];
    const xs = [4, 10, 16, 22, 28, 34], ys = [19, 21, 18, 20, 22, 19];
    const cs = ['#FFD166', '#FF9F68', '#FF6FA5', '#6EC6FF', '#C77DFF', '#FFD166'];
    xs.forEach((x, i) => fl.push(R(x, ys[i] + 1, 1, 2, '#2E8F6A'), R(x - 1, ys[i], 3, 1, cs[i]), R(x, ys[i] - 1, 1, 1, cs[i]), R(x, ys[i], 1, 1, '#FFF7E6')));
    return [band(0, 8, '#8FD3FF'), band(8, 8, '#B5E4FF'), disc(33, 5, 3, '#FFE38A'), cloud(4, 3, '#FFFFFF'), cloud(17, 6, '#FFFFFF'),
      mound(10, 17, 30, 6, '#5FD9A9'), mound(31, 17, 26, 5, '#4FC89A'), band(16, 8, '#7CF5C8'), band(21, 3, '#5FE0B0'), fl];
  },
  leap: () => {
    const arc: Art[] = [];
    for (let t = 1; t <= 6; t++) arc.push(R(Math.round(7 + t * 3.1), Math.round(17 - Math.sin((Math.PI * t) / 7) * 9), 1, 1, '#FFF7E6', 'tw'));
    const pad = (x: number, y: number) => [R(x + 1, y, 3, 1, '#5FD9A9'), R(x, y + 1, 5, 1, '#5FD9A9'), R(x + 2, y, 1, 1, '#3B8FCC')];
    return [band(0, 7, '#9FD8FF'), band(7, 5, '#C2E8FF'), cloud(26, 2, '#FFFFFF'),
      mound(8, 13, 22, 4, '#7CC48A'), mound(32, 13, 20, 3, '#62B56B'),
      band(12, 12, '#4AA3DF'), band(17, 7, '#3B8FCC'),
      R(3, 14, 4, 1, '#8FD3FF'), R(26, 15, 5, 1, '#8FD3FF'), R(12, 21, 4, 1, '#8FD3FF'), R(33, 22, 3, 1, '#8FD3FF'),
      pad(4, 18), pad(29, 17), pad(15, 21), arc,
      R(19, 8, 4, 2, '#3FC08A'), R(19, 7, 1, 1, '#3FC08A'), R(22, 7, 1, 1, '#3FC08A'), R(19, 7, 1, 1, '#FFF7E6'), R(22, 7, 1, 1, '#FFF7E6'), R(18, 10, 1, 1, '#3FC08A'), R(23, 10, 1, 1, '#3FC08A'), R(20, 9, 2, 1, '#FFA3C6')];
  },
  hollow: () => [
    band(0, 6, '#2B1E52'), band(6, 6, '#3B2A6B'), band(12, 6, '#5A3F8F'),
    stars([[3, 2], [14, 4], [22, 1], [36, 10], [26, 7], [18, 9]]),
    disc(31, 5, 3, '#FFF1C9'), disc(32, 4, 3, '#2B1E52'),
    band(18, 6, '#2A1F4F'), mound(30, 19, 20, 3, '#33265E'),
    disc(8, 5, 6, '#3E2C66'), R(5, 7, 6, 12, '#4A3570'), R(3, 18, 10, 1, '#4A3570'),
    R(7, 11, 2, 4, '#140E2A'), R(6, 12, 4, 2, '#140E2A'), R(7, 12, 1, 1, '#FFD166', 'tw'), R(8, 12, 1, 1, '#FFD166', 'tw'),
    mound(22, 19, 6, 2, '#C77DFF'), R(21, 19, 2, 2, '#EBDDFF'), R(20, 18, 1, 1, '#FFF7E6'), R(23, 17, 1, 1, '#FFF7E6'),
    mound(28, 20, 4, 2, '#FF6FA5'), R(27, 20, 2, 1, '#EBDDFF'),
    R(15, 11, 1, 1, '#FFD166', 'tw'), R(25, 14, 1, 1, '#FFD166', 'tw'), R(35, 16, 1, 1, '#FFD166', 'tw')
  ],
  peaks: () => [
    band(0, 10, '#1B1535'), band(10, 8, '#2A2250'),
    stars([[2, 2], [6, 6], [11, 1], [17, 4], [24, 2], [29, 7], [35, 3], [38, 8], [14, 9]]),
    peak(8, 18, 11, '#5A5285', 1, '#E8E4FF', 3), peak(22, 18, 14, '#6B63A0', 0.9, '#FFF7E6', 4), peak(34, 18, 10, '#5A5285', 1, '#E8E4FF', 3),
    band(18, 6, '#241C47'), peak(14, 24, 8, '#3A3170', 1.3), peak(32, 24, 7, '#3A3170', 1.5)
  ],
  ridge: () => {
    const hs = [6, 6, 8, 8, 7, 10, 10, 9, 12, 12, 11, 8, 8, 10, 9, 7, 7, 9, 11, 11];
    const g = '#3E7A55';
    return [band(0, 5, '#FFD48A'), band(5, 4, '#FFB86B'), band(9, 4, '#FF9F68'), band(13, 11, '#FF7F5C'),
      disc(28, 13, 5, '#FFE9B8'),
      R(12, 4, 1, 1, INK), R(13, 5, 1, 1, INK), R(14, 4, 1, 1, INK), R(19, 6, 1, 1, INK), R(20, 7, 1, 1, INK), R(21, 6, 1, 1, INK),
      hs.map((h, i) => R(i * 2, 24 - h, 2, h, '#8C2F4B')), band(21, 3, '#6A2240'),
      R(7, 12, 2, 4, g), R(5, 13, 1, 2, g), R(6, 14, 1, 1, g), R(10, 12, 1, 2, g), R(9, 13, 1, 1, g),
      R(33, 14, 2, 3, g), R(35, 14, 1, 2, g), R(32, 15, 1, 1, g)];
  },
  forest: () => {
    const xs = [3, 9, 14, 20, 26, 31, 37], hs = [9, 12, 8, 13, 10, 12, 8];
    return [band(0, 8, '#FFE3EE'), band(8, 8, '#FFD0E2'), mound(10, 17, 30, 5, '#B4E3B0'), band(16, 8, '#5DBB7A'), band(21, 3, '#4BA368'),
      xs.map((x, i) => pine(x, 19 + (i % 2), hs[i] - 3, i % 2 ? '#FF6FA5' : '#3E9A62', '#7A4A3A')),
      R(6, 5, 1, 1, '#FF6FA5', 'tw'), R(17, 3, 1, 1, '#FF6FA5', 'tw'), R(28, 6, 1, 1, '#FF6FA5', 'tw'), R(35, 2, 1, 1, '#FF6FA5', 'tw')];
  },
  caves: () => {
    const cr: Art[] = [];
    for (let i = 0; i < 12; i++) {
      const x = 2 + i * 3, base = 20 - (i % 2), h = 3 + ((i * 5) % 4);
      cr.push(peak(x + 1, base, h, COL[i], 0.5), R(x, base - h + 1, 1, 1, '#FFF7E6'));
    }
    return [band(0, 24, '#0E0B1F'), band(0, 3, '#2A2250'),
      drip(5, 3, 5, '#2A2250'), drip(14, 3, 3, '#2A2250'), drip(27, 3, 6, '#2A2250'), drip(36, 3, 4, '#2A2250'),
      stars([[9, 9], [21, 7], [32, 11], [17, 13]], '#C8A2FF'),
      band(19, 5, '#2A2250'), mound(10, 20, 14, 2, '#352C63'), mound(30, 20, 16, 2, '#352C63'), cr];
  },
  modes: () => {
    const au: Art[] = [];
    for (let x = 0; x < 40; x += 2) {
      const y = 4 + Math.round(2 * Math.sin(x / 5));
      au.push(R(x, y, 2, 2, '#7CF5C8', 'tw'), R(x, y + 2, 2, 1, '#C77DFF'));
    }
    return [band(0, 6, '#0F1A38'), band(6, 6, '#16244A'), band(12, 8, '#1F3160'), stars([[3, 1], [12, 10], [33, 2], [24, 11]]), au,
      peak(10, 20, 12, '#8E9BC7', 1, '#FFFFFF', 5), peak(26, 20, 15, '#A4AFD6', 0.9, '#FFFFFF', 6), peak(37, 20, 9, '#8E9BC7', 1, '#FFFFFF', 4),
      band(19, 5, '#E8EEFF'), band(22, 2, '#C8D3F0'), pine(4, 21, 5, '#1F4D4A'), pine(33, 22, 4, '#1F4D4A')];
  },
  gardens: () => {
    const bunt: Art[] = [], beds: Art[] = [];
    for (let i = 0; i < 10; i++) bunt.push(R(1 + i * 4, 2 + (i % 2), 2, 1, COL[i]), R(1 + i * 4, 3 + (i % 2), 1, 1, COL[i]));
    for (let x = 1, i = 0; x < 40; x += 3, i++) beds.push(R(x, 19 + (i % 2) * 2, 1, 1, COL[(i * 5) % 12]));
    return [band(0, 7, '#FFE7A8'), band(7, 6, '#FFD9C2'), band(13, 4, '#FFC9D6'), bunt,
      peak(20, 10, 4, '#FF6FA5', 1.5), R(19, 5, 2, 1, '#FFD166'), R(15, 10, 1, 6, '#FFF7E6'), R(24, 10, 1, 6, '#FFF7E6'),
      R(20, 11, 1, 3, INK), R(19, 13, 2, 1, INK), R(21, 11, 1, 1, INK),
      band(16, 8, '#5DBB7A'), R(13, 16, 14, 1, '#C9604F'), mound(5, 17, 10, 2, '#3E9A62'), mound(35, 17, 10, 2, '#3E9A62'),
      R(3, 11, 1, 6, '#2A2250'), R(2, 10, 3, 1, '#FFD166', 'tw'), R(36, 11, 1, 6, '#2A2250'), R(35, 10, 3, 1, '#FFD166', 'tw'), beds];
  },
  tide: () => {
    const w: Art[] = [];
    for (let x = 0; x < 40; x += 6) w.push(R(x, 12, 3, 1, '#FFFFFF'), R(x + 3, 15, 3, 1, '#E0FFFB'));
    return [band(0, 8, '#BFF3FF'), band(8, 4, '#D9F8FF'), disc(8, 5, 3, '#FFF1A8'), cloud(26, 3, '#FFFFFF'),
      band(12, 6, '#4FD1C5'), band(14, 4, '#3BBFB3'), w, R(28, 10, 5, 1, '#C9604F'), R(30, 7, 1, 3, '#FFF7E6'), R(31, 8, 1, 2, '#FFF7E6'),
      band(18, 6, '#FFE2A8'), band(21, 3, '#F5D08A'), R(0, 18, 40, 1, '#EBC98A'),
      R(10, 20, 2, 1, '#FFA3C6'), R(25, 22, 2, 1, '#FF9F68'), R(31, 19, 1, 3, '#FF9F68'), R(30, 20, 3, 1, '#FF9F68')];
  },
  pier: () => {
    const rim: Art[] = [], cabins: Art[] = [];
    for (let a = 0; a < 28; a++) {
      const t = (a / 28) * Math.PI * 2;
      rim.push(R(27 + Math.round(6 * Math.cos(t)), 8 + Math.round(6 * Math.sin(t)), 1, 1, '#FFF7E6'));
    }
    for (let a = 0; a < 8; a++) {
      const t = (a / 8) * Math.PI * 2;
      cabins.push(R(26 + Math.round(6 * Math.cos(t)), 8 + Math.round(6 * Math.sin(t)), 2, 1, COL[(a * 3) % 12], 'tw'));
    }
    const posts = [16, 22, 28, 34, 39].map((x) => R(x, 15, 1, 5, '#5A3428'));
    return [band(0, 5, '#FFC48A'), band(5, 4, '#FFA86B'), band(9, 4, '#FF8A5C'), band(13, 2, '#FF7059'), disc(10, 14, 4, '#FFE38A'),
      band(14, 10, '#3A4E9A'), band(19, 5, '#2E3F80'), R(8, 15, 4, 1, '#FFC48A'), R(9, 17, 2, 1, '#FFC48A'),
      R(27, 2, 1, 12, '#FFF7E6'), R(21, 8, 13, 1, '#FFF7E6'), rim, cabins, R(24, 9, 1, 2, '#FFF7E6'), R(23, 11, 1, 3, '#FFF7E6'), R(30, 9, 1, 2, '#FFF7E6'), R(31, 11, 1, 3, '#FFF7E6'),
      R(14, 14, 26, 1, '#7A4A3A'), posts, R(19, 11, 1, 3, INK), R(18, 10, 3, 1, '#FFD166', 'tw')];
  },
  bayou: () => [
    band(0, 7, '#0F2747'), band(7, 6, '#163A63'), stars([[4, 2], [12, 1], [20, 4], [37, 3]]), disc(30, 5, 3, '#FFF1C9'),
    mound(8, 14, 20, 4, '#122E44'), mound(34, 14, 18, 3, '#122E44'),
    band(13, 11, '#0B1E38'), R(29, 14, 3, 1, '#FFF1C9'), R(30, 16, 2, 1, '#E8DFB8'), R(29, 18, 3, 1, '#C9C09A'), R(30, 20, 1, 1, '#C9C09A'),
    R(5, 6, 3, 10, '#1F4D4A'), R(4, 15, 5, 1, '#1F4D4A'), R(2, 5, 9, 2, '#1F4D4A'), R(3, 3, 7, 2, '#1F4D4A'), R(3, 7, 1, 3, '#3E7A6A'), R(9, 7, 1, 2, '#3E7A6A'), R(6, 8, 1, 2, '#3E7A6A'),
    R(14, 9, 2, 6, '#1F4D4A'), R(12, 8, 6, 2, '#1F4D4A'), R(13, 10, 1, 2, '#3E7A6A'),
    R(18, 15, 9, 1, '#3A2A20'), R(25, 11, 1, 4, '#3A2A20'), R(24, 11, 3, 2, '#FFD166', 'tw'),
    R(20, 9, 1, 1, '#E6FF8A', 'tw'), R(10, 12, 1, 1, '#E6FF8A', 'tw'), R(35, 11, 1, 1, '#E6FF8A', 'tw')
  ],
  junction: () => {
    const bs = [[1, 6, 6, 10], [8, 3, 5, 13], [14, 8, 7, 8], [22, 4, 6, 12], [29, 7, 5, 9], [35, 2, 4, 14]];
    const win: Art[] = [];
    bs.forEach(([x, y, w, h]) => {
      for (let wy = y + 1; wy < y + h - 1; wy += 2) for (let wx = x + 1; wx < x + w - 1; wx += 2) if ((wx * 7 + wy * 3) % 5 < 2) win.push(R(wx, wy, 1, 1, '#FFD166'));
    });
    return [band(0, 10, '#1B1535'), band(10, 6, '#2A2250'), disc(5, 3, 2, '#FFF1C9'), stars([[14, 2], [20, 1], [31, 3]]),
      bs.map(([x, y, w, h]) => R(x, y, w, h, '#3A3170')), win, disc(25, 7, 2, '#FFF7E6'), R(25, 6, 1, 1, INK), R(25, 7, 1, 1, INK),
      band(20, 4, '#241C47'), R(0, 20, 40, 1, '#8E86B8'),
      R(3, 16, 12, 4, '#FFD166'), R(16, 16, 12, 4, '#FF9F68'), R(29, 15, 9, 5, '#FF6FA5'), R(35, 13, 2, 2, INK),
      [4, 7, 10, 17, 20, 23].map((x) => R(x, 17, 2, 1, '#FFF7E6')), R(30, 16, 3, 2, '#FFF7E6'),
      [4, 12, 17, 25, 30, 35].map((x) => R(x, 20, 2, 1, INK)), R(36, 11, 2, 1, '#B9B0E0'), R(38, 9, 2, 1, '#B9B0E0')];
  },
  tower: () => {
    const st: Art[] = [];
    for (let k = 0; k < 9; k++) st.push(R(k % 2 ? 21 : 17, 5 + k * 2, 2, 1, '#FF6FA5'));
    return [band(0, 8, '#FFC2D9'), band(8, 8, '#FFA3C6'), band(16, 8, '#FF8AB8'), cloud(1, 6, '#FFF0F6'), cloud(30, 12, '#FFF0F6'), cloud(27, 3, '#FFF0F6'),
      R(16, 4, 8, 20, '#FFF7E6'), R(22, 4, 2, 20, '#E8DDC4'), st, R(19, 9, 2, 2, '#5A3F8F'), R(19, 15, 2, 2, '#5A3F8F'),
      R(15, 3, 10, 1, '#FFF7E6'), R(15, 2, 2, 1, '#FFF7E6'), R(19, 2, 2, 1, '#FFF7E6'), R(23, 2, 2, 1, '#FFF7E6'),
      R(20, 0, 1, 2, INK), R(21, 0, 3, 1, '#FFD166'), cloud(9, 19, '#FFF0F6'), cloud(22, 20, '#FFF0F6'), band(22, 2, '#FFF0F6')];
  },
  bridge: () => {
    const arch: Art[] = [], rail: Art[] = [];
    for (let x = 10; x < 30; x++) {
      const y = 12 + Math.round(5 * Math.pow((x - 19.5) / 10.5, 2));
      arch.push(R(x, y, 1, 1, '#E8DDC4'), R(x, 12, 1, Math.max(0, y - 12), '#FFF7E6'));
      if (x % 3 === 0) rail.push(R(x, 10, 1, 1, '#FFF7E6'));
    }
    return [band(0, 9, '#E6D4FF'), band(9, 8, '#D6BCFF'), cloud(15, 2, '#FFFFFF'), band(17, 7, '#6EC6FF'), band(20, 4, '#5AB0EC'), R(16, 19, 6, 1, '#B5E0FF'),
      R(0, 12, 10, 12, '#7A57B0'), R(0, 11, 8, 1, '#FFD166'), R(30, 12, 10, 12, '#7A57B0'), R(32, 11, 8, 1, '#C77DFF'),
      R(9, 11, 22, 1, '#FFF7E6'), arch, rail, R(17, 9, 4, 2, '#FF9F68'), R(17, 8, 1, 1, '#FF9F68')];
  },
  moors: () => {
    const heather = [[3, 17], [9, 20], [15, 18], [21, 22], [27, 19], [33, 21], [37, 17], [6, 22], [18, 21]].map(([x, y], i) => R(x, y, 2, 1, i % 2 ? '#C77DFF' : '#E0A7FF'));
    return [band(0, 8, '#A9A2CF'), band(8, 6, '#968EC0'), disc(30, 4, 2, '#EDEBFA'), mound(10, 15, 30, 4, '#7E76AE'), mound(32, 15, 24, 3, '#7E76AE'),
      band(14, 10, '#6B5F9A'), band(19, 5, '#5A4F88'),
      R(8, 9, 3, 6, '#C9C4E0'), R(10, 9, 1, 6, '#8E86B8'), R(13, 11, 2, 4, '#C9C4E0'),
      R(25, 8, 3, 7, '#C9C4E0'), R(31, 8, 3, 7, '#C9C4E0'), R(24, 7, 11, 1, '#C9C4E0'), R(27, 8, 1, 7, '#8E86B8'), R(33, 8, 1, 7, '#8E86B8'),
      heather, R(0, 12, 14, 1, '#C4BFE0'), R(20, 13, 12, 1, '#C4BFE0'), R(5, 17, 10, 1, '#B3ADD6')];
  },
  cliffs: () => [
    band(0, 6, '#FFE8D6'), band(6, 6, '#FFD6C2'), band(12, 4, '#FFC2AE'), disc(33, 6, 3, '#FFF7E6'),
    band(14, 10, '#3A6FB0'), band(19, 5, '#2F5C99'), R(26, 15, 3, 1, '#8FB8E8'), R(35, 18, 2, 1, '#8FB8E8'),
    R(0, 10, 18, 14, '#C9604F'), R(0, 8, 14, 2, '#C9604F'), R(18, 13, 4, 11, '#C9604F'), R(22, 17, 3, 7, '#B5503F'), R(14, 10, 4, 14, '#B5503F'),
    R(1, 5, 4, 3, '#FFF7E6'), R(1, 4, 4, 1, '#FF7B5C'), R(2, 6, 1, 2, '#3A6FB0'), R(6, 6, 3, 2, '#FFF7E6'), R(6, 5, 3, 1, '#FF7B5C'),
    R(10, 4, 4, 4, '#FFF7E6'), R(10, 3, 4, 1, '#FF7B5C'), R(11, 6, 1, 2, '#3A6FB0'), R(12, 5, 1, 1, '#3A6FB0'),
    R(14, 7, 3, 3, '#FFF7E6'), R(14, 6, 3, 1, '#6EC6FF'), R(15, 5, 1, 1, '#6EC6FF'),
    R(30, 13, 1, 3, '#FFF7E6'), R(31, 14, 2, 2, '#FFF7E6'), R(28, 16, 6, 1, '#8C2F4B')
  ],
  bebop: () => {
    const bs = [[0, 3, 8, 14], [9, 6, 7, 11], [26, 4, 7, 13], [34, 2, 6, 15]];
    const win: Art[] = [];
    bs.forEach(([x, y, w, h]) => {
      for (let wy = y + 1; wy < y + h - 1; wy += 2) for (let wx = x + 1; wx < x + w - 1; wx += 2) if ((wx * 5 + wy * 7) % 6 < 2) win.push(R(wx, wy, 1, 1, (wx + wy) % 3 ? '#6EC6FF' : '#FF6FA5'));
    });
    return [band(0, 9, '#0F1530'), band(9, 8, '#161E40'), stars([[12, 2], [20, 1], [24, 3]]),
      bs.map(([x, y, w, h]) => R(x, y, w, h, '#232B55')), win, R(16, 5, 10, 12, '#2A2250'),
      R(15, 7, 12, 4, '#0E0B1F'), R(15, 7, 12, 1, '#6EC6FF'), R(15, 10, 12, 1, '#6EC6FF'), R(15, 7, 1, 4, '#6EC6FF'), R(26, 7, 1, 4, '#6EC6FF'),
      R(17, 8, 1, 1, '#FF6FA5', 'tw'), R(19, 9, 1, 1, '#FFD166', 'tw'), R(21, 8, 1, 1, '#FF6FA5', 'tw'), R(23, 9, 1, 1, '#FFD166', 'tw'), R(25, 8, 1, 1, '#FF6FA5', 'tw'),
      R(19, 13, 4, 4, '#FFD166'), band(17, 7, '#1B1535'), band(17, 1, '#3A3170'), [2, 8, 14, 20, 26, 32, 38].map((x) => R(x, 21, 3, 1, '#FFD166')),
      R(4, 11, 1, 6, '#8E86B8'), R(3, 10, 3, 1, '#FFD166', 'tw'), R(2, 17, 5, 1, '#5A5285'),
      R(35, 11, 1, 6, '#8E86B8'), R(34, 10, 3, 1, '#FFD166', 'tw'), R(33, 17, 5, 1, '#5A5285'),
      R(37, 3, 1, 3, '#FF6FA5'), R(36, 5, 2, 1, '#FF6FA5'), R(38, 3, 1, 1, '#FF6FA5')];
  },
  funk: () => {
    const roof: Art[] = [], win: Art[] = [], floor: Art[] = [];
    for (let k = 0; k < 7; k++) roof.push(R(6 + 4 * k, 8, 4, 1, '#4A1F5C'), R(6 + 4 * k, 7, 3, 1, '#4A1F5C'), R(6 + 4 * k, 6, 2, 1, '#4A1F5C'), R(6 + 4 * k, 5, 1, 1, '#4A1F5C'));
    const wc = ['#FF6FA5', '#FFD166', '#7CF5C8', '#6EC6FF', '#C77DFF', '#FF9F68', '#FF6FA5'];
    for (let k = 0; k < 7; k++) win.push(R(7 + 4 * k, 11, 2, 2, wc[k], 'tw'));
    for (let y = 19; y < 24; y++) for (let x = 0; x < 40; x += 2) floor.push(R(x + (y % 2), y, 1, 1, '#C7468A'));
    return [band(0, 8, '#2B1240'), band(8, 11, '#3D1A57'), stars([[3, 3], [16, 1], [24, 2]], '#FFA3C6'),
      R(9, 1, 2, 4, '#3A1550'), R(28, 2, 2, 3, '#3A1550'), R(11, 0, 2, 1, '#FF6FA5'), R(12, 1, 1, 1, '#FFD166'), R(30, 0, 2, 1, '#7CF5C8'),
      R(6, 9, 28, 10, '#4A1F5C'), roof, win, R(17, 14, 6, 5, '#2B1240'), R(18, 15, 1, 4, '#FF6FA5'), R(20, 15, 1, 4, '#FFD166'), R(22, 15, 1, 4, '#7CF5C8'),
      R(37, 0, 1, 3, '#B9B0E0'), disc(37, 5, 2, '#D9D4F0'), R(36, 4, 1, 1, '#FFFFFF', 'tw'), R(37, 5, 1, 1, '#8E86B8'), R(38, 4, 1, 1, '#8E86B8'),
      band(19, 5, '#FF6FA5'), floor];
  }
};

// Stage id → world. 1–10 are the main road, 11–20 the Progression Paths.
const BY_STAGE = ['steps', 'meadow', 'leap', 'hollow', 'peaks', 'ridge', 'forest', 'caves', 'modes', 'gardens',
  'tide', 'pier', 'bayou', 'junction', 'tower', 'bridge', 'moors', 'cliffs', 'bebop', 'funk', 'junction', 'bebop'];

const cache = new Map<number, Px[]>();

export function sceneFor(stageId: number): Px[] {
  let px = cache.get(stageId);
  if (!px) {
    const draw = WORLDS[BY_STAGE[stageId - 1]] ?? WORLDS.meadow;
    px = (draw() as Art[]).flat(Infinity as 1) as Px[];
    cache.set(stageId, px);
  }
  return px;
}
