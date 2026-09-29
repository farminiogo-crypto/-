// هندسة الزقورة الإيزومترية: كل طبقة لوح مربع يصغر كلما ارتفع، والدرج يصعد على الوجه الأيسر.
const C = Math.cos(Math.PI / 6);
const S = 0.5;

type Pt = [number, number];
const pt = (a: number, b: number, z: number): Pt => [(a - b) * C, (a + b) * S - z];
const poly = (pts: Pt[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

export interface TierGeom {
  index: number;
  top: string;
  left: string;
  right: string;
  stair: string;
  steps: string; // خطوط الدرجات
  labelAt: Pt; // موضع رقم الطبقة على الوجه الأيمن
  center: Pt; // مركز الوجه العلوي (هدف الحروف المتطايرة)
}

export interface ZigguratGeom {
  tiers: TierGeom[];
  stairLine: string; // مسار الضوء الصاعد
  viewBox: string;
  shadow: { cx: number; cy: number; rx: number; ry: number };
}

export function ziggurat(count = 7, base = 300, shrink = 36, height = 30, stairW = 20): ZigguratGeom {
  const tiers: TierGeom[] = [];
  const line: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const s = base - i * shrink;
    const h = s / 2;
    const z0 = i * height;
    const z1 = z0 + height;
    const top = [pt(-h, -h, z1), pt(h, -h, z1), pt(h, h, z1), pt(-h, h, z1)];
    const left = [pt(-h, h, z1), pt(h, h, z1), pt(h, h, z0), pt(-h, h, z0)];
    const right = [pt(h, h, z1), pt(h, -h, z1), pt(h, -h, z0), pt(h, h, z0)];
    const w = stairW / 2;
    const stair = [pt(-w, h, z1), pt(w, h, z1), pt(w, h, z0), pt(-w, h, z0)];
    const stepsCount = 4;
    const steps: string[] = [];
    for (let k = 1; k < stepsCount; k++) {
      const z = z0 + (height * k) / stepsCount;
      const [x1, y1] = pt(-w, h, z);
      const [x2, y2] = pt(w, h, z);
      steps.push(`M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`);
    }
    // مسار الدرج: صعود على الوجه ثم عبور السطح نحو الطبقة التالية
    line.push(pt(0, h, z0), pt(0, h, z1));
    if (i < count - 1) line.push(pt(0, h - shrink / 2, z1));
    tiers.push({
      index: i,
      top: poly(top),
      left: poly(left),
      right: poly(right),
      stair: poly(stair),
      steps: steps.join(''),
      labelAt: pt(h, 0, z0 + height / 2),
      center: pt(0, 0, z1),
    });
  }
  const topS = base - (count - 1) * shrink;
  const minY = -(topS / 2 + count * height) - 20;
  const maxY = base / 2 + 30;
  const maxX = base * C + 20;
  return {
    tiers,
    stairLine: 'M' + line.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L'),
    viewBox: `${(-maxX).toFixed(0)} ${minY.toFixed(0)} ${(maxX * 2).toFixed(0)} ${(maxY - minY).toFixed(0)}`,
    shadow: { cx: 0, cy: base / 2 - 4, rx: base * C * 0.95, ry: base * 0.2 },
  };
}
