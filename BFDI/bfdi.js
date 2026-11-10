(function () {
  'use strict';

  /* ================= constantes ================= */
  const W = 480, H = 720;
  const ROAD_L = 96, ROAD_R = 384;
  const LANE_W = (ROAD_R - ROAD_L) / 3;
  const CAR_W = 46, CAR_H = 82;
  const PLAYER_Y = H - 132;
  const MIN_X = ROAD_L + CAR_W / 2 + 4;
  const MAX_X = ROAD_R - CAR_W / 2 - 4;
  const BEST_KEY = 'bfdi-tesla-best';

  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const laneX = (i) => ROAD_L + LANE_W * (i + 0.5);

  /* ================= helpers de desenho ================= */
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function ell(c, x, y, rx, ry, rot) {
    c.beginPath();
    c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, Math.PI * 2);
    c.fill();
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    const r = Math.round(((n >> 16) & 255) + (t - ((n >> 16) & 255)) * p);
    const g = Math.round(((n >> 8) & 255) + (t - ((n >> 8) & 255)) * p);
    const b = Math.round((n & 255) + (t - (n & 255)) * p);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  // olhos + boca à BFDI
  function face(c, cx, cy, s, o) {
    o = o || {};
    const spread = o.spread == null ? 0.34 : o.spread;
    const ey = o.ey == null ? 0 : o.ey;
    const er = o.er == null ? 0.15 : o.er;
    const ink = o.pupilColor || '#16181d';
    c.save();
    if (o.brow) {
      c.strokeStyle = ink;
      c.lineWidth = Math.max(1.4, s * 0.09);
      c.lineCap = 'round';
      for (const d of [-1, 1]) {
        c.beginPath();
        c.moveTo(cx + d * s * (spread - 0.13), cy + s * (ey - 0.36));
        c.lineTo(cx + d * s * (spread + 0.13), cy + s * (ey - 0.24));
        c.stroke();
      }
    }
    c.fillStyle = '#fff';
    for (const d of [-1, 1]) ell(c, cx + d * s * spread, cy + s * ey, s * er * 1.1, s * er * 1.45);
    c.fillStyle = ink;
    for (const d of [-1, 1]) ell(c, cx + d * s * spread + s * 0.02, cy + s * ey, s * er * 0.48, s * er * 0.72);
    if (o.mouth !== false) {
      c.strokeStyle = ink;
      c.lineWidth = Math.max(1.3, s * 0.08);
      c.lineCap = 'round';
      const my = cy + s * (o.my == null ? 0.52 : o.my);
      const mw = s * (o.mw == null ? 0.3 : o.mw);
      c.beginPath();
      if (o.frown) c.arc(cx, my + s * 0.16, mw, Math.PI * 1.15, Math.PI * 1.85);
      else c.arc(cx, my - s * 0.12, mw, Math.PI * 0.18, Math.PI * 0.82);
      c.stroke();
    }
    c.restore();
  }

  /* ================= personagens ================= */
  const CHARS = [];
  CHARS.push(
    {
      id: 'firey', name: 'Firey', car: '#ff5a1f',
      draw(c, cx, cy, s) {
        const g = c.createLinearGradient(cx, cy - s, cx, cy + s);
        g.addColorStop(0, '#ffe066'); g.addColorStop(.5, '#ffa41b'); g.addColorStop(1, '#ff4d00');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(cx, cy - s * 1.05);
        c.bezierCurveTo(cx + s * .95, cy - s * .15, cx + s * .8, cy + s, cx, cy + s);
        c.bezierCurveTo(cx - s * .8, cy + s, cx - s * .95, cy - s * .15, cx, cy - s * 1.05);
        c.fill();
        c.fillStyle = 'rgba(255,255,210,.55)';
        c.beginPath();
        c.moveTo(cx, cy - s * .45);
        c.bezierCurveTo(cx + s * .4, cy + s * .05, cx + s * .32, cy + s * .62, cx, cy + s * .62);
        c.bezierCurveTo(cx - s * .32, cy + s * .62, cx - s * .4, cy + s * .05, cx, cy - s * .45);
        c.fill();
        face(c, cx, cy + s * .16, s * .72);
      }
    },
    {
      id: 'leafy', name: 'Leafy', car: '#2fbf4a',
      draw(c, cx, cy, s) {
        const g = c.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
        g.addColorStop(0, '#8ef07a'); g.addColorStop(.55, '#35c94a'); g.addColorStop(1, '#127a30');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(cx, cy + s * 1.02);
        c.bezierCurveTo(cx - s * 1.15, cy + s * .15, cx - s * .75, cy - s * 1.15, cx, cy - s * .98);
        c.bezierCurveTo(cx + s * .75, cy - s * 1.15, cx + s * 1.15, cy + s * .15, cx, cy + s * 1.02);
        c.fill();
        c.strokeStyle = 'rgba(6,70,30,.45)';
        c.lineWidth = Math.max(1, s * .07);
        c.beginPath();
        c.moveTo(cx, cy + s * .95);
        c.quadraticCurveTo(cx + s * .12, cy, cx, cy - s * .75);
        c.stroke();
        face(c, cx, cy + s * .22, s * .6);
      }
    },
    {
      id: 'coiny', name: 'Coiny', car: '#e0a800',
      draw(c, cx, cy, s) {
        const g = c.createRadialGradient(cx - s * .3, cy - s * .4, s * .1, cx, cy, s);
        g.addColorStop(0, '#fff3b0'); g.addColorStop(.55, '#ffd23f'); g.addColorStop(1, '#b07c00');
        c.fillStyle = g; ell(c, cx, cy, s, s);
        c.strokeStyle = 'rgba(140,95,0,.6)';
        c.lineWidth = Math.max(1, s * .08);
        c.beginPath(); c.arc(cx, cy, s * .9, 0, Math.PI * 2); c.stroke();
        face(c, cx, cy - s * .02, s * .7);
      }
    },
    {
      id: 'bubble', name: 'Bubble', car: '#3fc9e8',
      draw(c, cx, cy, s) {
        const g = c.createRadialGradient(cx - s * .35, cy - s * .45, s * .1, cx, cy, s * 1.05);
        g.addColorStop(0, 'rgba(215,255,255,.95)');
        g.addColorStop(.5, 'rgba(95,215,235,.92)');
        g.addColorStop(1, 'rgba(18,140,175,.95)');
        c.fillStyle = g; ell(c, cx, cy, s, s);
        c.fillStyle = 'rgba(255,255,255,.85)';
        ell(c, cx - s * .38, cy - s * .42, s * .22, s * .13, -0.6);
        face(c, cx, cy + s * .02, s * .66);
      }
    },
    {
      id: 'icecube', name: 'Ice Cube', car: '#8fd8f0',
      draw(c, cx, cy, s) {
        const g = c.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
        g.addColorStop(0, '#eafaff'); g.addColorStop(.5, '#a9e4f7'); g.addColorStop(1, '#59aecf');
        c.fillStyle = g;
        rr(c, cx - s * .86, cy - s * .86, s * 1.72, s * 1.72, s * .28); c.fill();
        c.fillStyle = 'rgba(255,255,255,.75)';
        rr(c, cx - s * .62, cy - s * .66, s * .5, s * .26, s * .1); c.fill();
        face(c, cx, cy + s * .08, s * .6);
      }
    },
    {
      id: 'eraser', name: 'Eraser', car: '#ff6fa8',
      draw(c, cx, cy, s) {
        const g = c.createLinearGradient(cx - s, cy, cx + s, cy);
        g.addColorStop(0, '#ff9ec7'); g.addColorStop(.5, '#ff6fa8'); g.addColorStop(1, '#cf3a74');
        c.fillStyle = g;
        rr(c, cx - s, cy - s * .74, s * 2, s * 1.48, s * .3); c.fill();
        c.fillStyle = 'rgba(255,255,255,.85)';
        rr(c, cx - s * .98, cy + s * .16, s * 1.96, s * .5, s * .12); c.fill();
        face(c, cx, cy - s * .26, s * .54, { my: .5, mw: .22 });
      }
    },
    {
      id: 'pen', name: 'Pen', car: '#2f6fd0',
      draw(c, cx, cy, s) {
        const g = c.createLinearGradient(cx - s * .6, cy, cx + s * .6, cy);
        g.addColorStop(0, '#3f7fe0'); g.addColorStop(.5, '#6fb2ff'); g.addColorStop(1, '#1b4796');
        c.fillStyle = g;
        rr(c, cx - s * .6, cy - s, s * 1.2, s * 2, s * .45); c.fill();
        c.fillStyle = 'rgba(255,255,255,.55)';
        rr(c, cx - s * .44, cy - s * .9, s * .17, s * 1.45, s * .08); c.fill();
        c.fillStyle = '#cfd8e6';
        rr(c, cx + s * .2, cy - s * .95, s * .16, s * .55, s * .08); c.fill();
        face(c, cx, cy + s * .16, s * .52);
      }
    },
    {
      id: 'blocky', name: 'Blocky', car: '#e8542c',
      draw(c, cx, cy, s) {
        const g = c.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
        g.addColorStop(0, '#ff9a4d'); g.addColorStop(.55, '#f2673a'); g.addColorStop(1, '#a8301a');
        c.fillStyle = g;
        rr(c, cx - s * .92, cy - s * .92, s * 1.84, s * 1.84, s * .22); c.fill();
        c.fillStyle = 'rgba(255,255,255,.18)';
        rr(c, cx - s * .74, cy - s * .74, s * .68, s * .36, s * .12); c.fill();
        face(c, cx, cy + s * .06, s * .6, { brow: true });
      }
    }
  );
  CHARS.push(
    {
      id: 'snowball', name: 'Snowball', car: '#dfe9f5',
      draw(c, cx, cy, s) {
        const g = c.createRadialGradient(cx - s * .3, cy - s * .4, s * .15, cx, cy, s);
        g.addColorStop(0, '#ffffff'); g.addColorStop(.7, '#e8f4ff'); g.addColorStop(1, '#a9cbe6');
        c.fillStyle = g; ell(c, cx, cy, s, s);
        face(c, cx, cy + s * .02, s * .66, { brow: true });
      }
    },
    {
      id: 'yellowface', name: 'Yellow Face', car: '#ffd23f',
      draw(c, cx, cy, s) {
        const g = c.createRadialGradient(cx - s * .3, cy - s * .35, s * .1, cx, cy, s);
        g.addColorStop(0, '#fff3a0'); g.addColorStop(.6, '#ffd93b'); g.addColorStop(1, '#d49b00');
        c.fillStyle = g; ell(c, cx, cy, s, s);
        face(c, cx, cy, s * .78, { spread: .36, er: .17, my: .62, mw: .38 });
      }
    },
    {
      id: 'donut', name: 'Donut', car: '#d9873f',
      draw(c, cx, cy, s) {
        const g = c.createRadialGradient(cx - s * .3, cy - s * .4, s * .2, cx, cy, s);
        g.addColorStop(0, '#ffd9a0'); g.addColorStop(.6, '#e0a055'); g.addColorStop(1, '#a86a28');
        c.fillStyle = g;
        c.beginPath();
        c.arc(cx, cy, s, 0, Math.PI * 2);
        c.arc(cx, cy, s * .38, 0, Math.PI * 2, true);
        c.fill();
        c.fillStyle = '#ff8fc0';
        c.beginPath();
        c.arc(cx, cy, s * .88, 0, Math.PI * 2);
        c.arc(cx, cy, s * .38, 0, Math.PI * 2, true);
        c.fill();
        const sp = [[-.5, -.62, '#fff'], [-.06, -.76, '#4fd1ff'], [.44, -.58, '#fff'],
                    [.68, .06, '#ffd23f'], [-.7, .16, '#4fd1ff'], [.32, .66, '#fff'],
                    [-.24, .72, '#ffd23f']];
        for (const q of sp) {
          c.save();
          c.translate(cx + q[0] * s, cy + q[1] * s);
          c.rotate(q[0] * 2.4);
          c.fillStyle = q[2];
          rr(c, -s * .1, -s * .032, s * .2, s * .064, s * .03);
          c.fill();
          c.restore();
        }
        face(c, cx, cy - s * .52, s * .38, { er: .16, spread: .4, my: .95, mw: .22 });
      }
    },
    {
      id: 'gelatin', name: 'Gelatin', car: '#7fd94f',
      draw(c, cx, cy, s) {
        const g = c.createLinearGradient(cx, cy - s, cx, cy + s);
        g.addColorStop(0, 'rgba(196,255,130,.96)');
        g.addColorStop(.5, 'rgba(122,225,92,.93)');
        g.addColorStop(1, 'rgba(38,150,68,.96)');
        c.fillStyle = g;
        rr(c, cx - s * .88, cy - s * .88, s * 1.76, s * 1.76, s * .3); c.fill();
        c.fillStyle = 'rgba(255,255,255,.4)';
        rr(c, cx - s * .62, cy - s * .66, s * .44, s * .24, s * .1); c.fill();
        face(c, cx, cy + s * .05, s * .58);
      }
    },
    {
      id: 'teardrop', name: 'Teardrop', car: '#2bb8d8',
      draw(c, cx, cy, s) {
        const g = c.createLinearGradient(cx, cy - s, cx, cy + s);
        g.addColorStop(0, '#9ff3ff'); g.addColorStop(.6, '#37c7e8'); g.addColorStop(1, '#0d6e93');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(cx, cy - s);
        c.bezierCurveTo(cx + s * .85, cy + s * .05, cx + s * .62, cy + s * .95, cx, cy + s * .95);
        c.bezierCurveTo(cx - s * .62, cy + s * .95, cx - s * .85, cy + s * .05, cx, cy - s);
        c.fill();
        face(c, cx, cy + s * .22, s * .52, { my: .6, mw: .18 });
      }
    },
    {
      id: 'puffball', name: 'Puffball', car: '#e56fd8',
      draw(c, cx, cy, s) {
        const g = c.createRadialGradient(cx - s * .3, cy - s * .4, s * .15, cx, cy, s);
        g.addColorStop(0, '#ffd6f5'); g.addColorStop(.6, '#f78be0'); g.addColorStop(1, '#ab35a2');
        c.fillStyle = g;
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          ell(c, cx + Math.cos(a) * s * .76, cy + Math.sin(a) * s * .76, s * .3, s * .3);
        }
        ell(c, cx, cy, s * .92, s * .92);
        face(c, cx, cy, s * .56);
      }
    },
    {
      id: 'ruby', name: 'Ruby', car: '#ef2f4d',
      draw(c, cx, cy, s) {
        const g = c.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
        g.addColorStop(0, '#ff9aa8'); g.addColorStop(.45, '#ef2f4d'); g.addColorStop(1, '#7d0b1e');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(cx, cy - s);
        c.lineTo(cx + s * .82, cy - s * .3);
        c.lineTo(cx + s * .6, cy + s);
        c.lineTo(cx - s * .6, cy + s);
        c.lineTo(cx - s * .82, cy - s * .3);
        c.closePath();
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,.4)';
        c.lineWidth = Math.max(1, s * .07);
        c.beginPath();
        c.moveTo(cx - s * .82, cy - s * .3); c.lineTo(cx + s * .82, cy - s * .3);
        c.moveTo(cx, cy - s); c.lineTo(cx, cy + s);
        c.stroke();
        face(c, cx, cy + s * .16, s * .48, { my: .8, mw: .18 });
      }
    },
    {
      id: 'woody', name: 'Woody', car: '#b9834a',
      draw(c, cx, cy, s) {
        const g = c.createLinearGradient(cx, cy - s, cx, cy + s);
        g.addColorStop(0, '#e6bd88'); g.addColorStop(.5, '#c98f52'); g.addColorStop(1, '#8d5a26');
        c.fillStyle = g;
        rr(c, cx - s * .9, cy - s * .9, s * 1.8, s * 1.8, s * .2); c.fill();
        c.strokeStyle = 'rgba(90,55,20,.45)';
        c.lineWidth = Math.max(1, s * .06);
        for (let i = 1; i < 4; i++) {
          c.beginPath();
          c.moveTo(cx - s * .8, cy - s * .9 + i * s * .45);
          c.lineTo(cx + s * .8, cy - s * .9 + i * s * .45);
          c.stroke();
        }
        face(c, cx, cy + s * .04, s * .56, { brow: true });
      }
    }
  );

  /* ================= personagens extra (wiki) ================= */
  CHARS.push(
    {
      id: 'rocky', name: 'Rocky', car: '#8b9098', special: 'vomit',
      draw(c, cx, cy, s) {
        const g = c.createRadialGradient(cx - s * .3, cy - s * .4, s * .15, cx, cy, s * 1.05);
        g.addColorStop(0, '#d2d6dc'); g.addColorStop(.55, '#9ba0a8'); g.addColorStop(1, '#5b6068');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(cx - s * .74, cy - s * .58);
        c.quadraticCurveTo(cx - s * .2, cy - s * 1.06, cx + s * .36, cy - s * .92);
        c.quadraticCurveTo(cx + s * .99, cy - s * .68, cx + s * .9, cy - s * .04);
        c.quadraticCurveTo(cx + s * .96, cy + s * .82, cx + s * .14, cy + s * .93);
        c.quadraticCurveTo(cx - s * .76, cy + s * .96, cx - s * .91, cy + s * .18);
        c.quadraticCurveTo(cx - s * .99, cy - s * .26, cx - s * .74, cy - s * .58);
        c.fill();
        c.strokeStyle = 'rgba(55,60,68,.4)';
        c.lineWidth = Math.max(1, s * .05);
        c.beginPath();
        c.moveTo(cx - s * .5, cy - s * .5); c.lineTo(cx - s * .08, cy - s * .2); c.lineTo(cx - s * .34, cy + s * .36);
        c.stroke();
        c.beginPath();
        c.moveTo(cx + s * .46, cy - s * .54); c.lineTo(cx + s * .26, cy - s * .04);
        c.stroke();
        face(c, cx, cy + s * .06, s * .58);
      }
    },
    {
      id: 'barfbag', name: 'Barf Bag', car: '#d9c48c', special: 'vomit',
      draw(c, cx, cy, s) {
        const g = c.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
        g.addColorStop(0, '#fbf3d9'); g.addColorStop(.55, '#e6d3a3'); g.addColorStop(1, '#b39a63');
        c.fillStyle = g;
        rr(c, cx - s * .8, cy - s * .82, s * 1.6, s * 1.74, s * .24); c.fill();
        c.strokeStyle = 'rgba(140,115,70,.5)';
        c.lineWidth = Math.max(1, s * .06);
        c.beginPath();
        c.moveTo(cx - s * .8, cy - s * .52); c.lineTo(cx + s * .8, cy - s * .52);
        c.stroke();
        c.fillStyle = 'rgba(120,95,55,.3)';
        ell(c, cx, cy - s * .82, s * .68, s * .12);
        face(c, cx, cy + s * .2, s * .54);
      }
    },
    {
      id: 'pencil', name: 'Pencil', car: '#f2c200',
      draw(c, cx, cy, s) {
        const g = c.createLinearGradient(cx - s * .5, cy, cx + s * .5, cy);
        g.addColorStop(0, '#e0ab00'); g.addColorStop(.45, '#ffe066'); g.addColorStop(1, '#c99a00');
        c.fillStyle = g;
        rr(c, cx - s * .44, cy - s * .3, s * .88, s * 1.22, s * .1); c.fill();
        c.fillStyle = '#f0dcae';
        c.beginPath();
        c.moveTo(cx - s * .44, cy - s * .3);
        c.lineTo(cx + s * .44, cy - s * .3);
        c.lineTo(cx, cy - s * 1.04);
        c.closePath(); c.fill();
        c.fillStyle = '#2b2b2b';
        c.beginPath();
        c.moveTo(cx - s * .15, cy - s * .64);
        c.lineTo(cx + s * .15, cy - s * .64);
        c.lineTo(cx, cy - s * 1.02);
        c.closePath(); c.fill();
        c.fillStyle = '#ff8fb0';
        rr(c, cx - s * .44, cy + s * .78, s * .88, s * .26, s * .1); c.fill();
        c.fillStyle = '#b9c4d4';
        rr(c, cx - s * .44, cy + s * .7, s * .88, s * .09, 2); c.fill();
        face(c, cx, cy + s * .26, s * .46, { my: .55, mw: .22 });
      }
    },
    {
      id: 'match', name: 'Match', car: '#d94a2a',
      draw(c, cx, cy, s) {
        const g = c.createLinearGradient(cx - s * .3, cy, cx + s * .3, cy);
        g.addColorStop(0, '#c99a5c'); g.addColorStop(.45, '#f7e0b8'); g.addColorStop(1, '#b98a4c');
        c.fillStyle = g;
        rr(c, cx - s * .22, cy - s * .2, s * .44, s * 1.18, s * .1); c.fill();
        const hg = c.createRadialGradient(cx - s * .2, cy - s * .6, s * .1, cx, cy - s * .45, s * .65);
        hg.addColorStop(0, '#ff9a7a'); hg.addColorStop(.6, '#e0341c'); hg.addColorStop(1, '#8e1a0c');
        c.fillStyle = hg;
        ell(c, cx, cy - s * .46, s * .55, s * .6);
        face(c, cx, cy + s * .34, s * .46, { my: .5, mw: .22 });
      }
    },
    {
      id: 'spongy', name: 'Spongy', car: '#e8d24a',
      draw(c, cx, cy, s) {
        const g = c.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
        g.addColorStop(0, '#fff9b0'); g.addColorStop(.5, '#ffe14a'); g.addColorStop(1, '#c9a800');
        c.fillStyle = g;
        rr(c, cx - s * .9, cy - s * .8, s * 1.8, s * 1.6, s * .2); c.fill();
        c.fillStyle = 'rgba(160,120,0,.22)';
        const holes = [[-.52, -.44, .16], [-.12, -.58, .12], [.44, -.3, .14],
                       [-.6, .24, .13], [.56, .34, .15], [.1, .54, .12]];
        for (const h of holes) ell(c, cx + h[0] * s, cy + h[1] * s, h[2] * s, h[2] * s);
        face(c, cx, cy - s * .02, s * .54);
      }
    },
    {
      id: 'golfball', name: 'Golf Ball', car: '#eef2f8',
      draw(c, cx, cy, s) {
        const g = c.createRadialGradient(cx - s * .3, cy - s * .4, s * .1, cx, cy, s);
        g.addColorStop(0, '#ffffff'); g.addColorStop(.7, '#eef2f7'); g.addColorStop(1, '#bfc9d6');
        c.fillStyle = g; ell(c, cx, cy, s, s);
        c.fillStyle = 'rgba(150,165,185,.45)';
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          ell(c, cx + Math.cos(a) * s * .74, cy + Math.sin(a) * s * .74, s * .07, s * .07);
        }
        face(c, cx, cy, s * .6);
      }
    },
    {
      id: 'tennisball', name: 'Tennis Ball', car: '#c8e04a',
      draw(c, cx, cy, s) {
        const g = c.createRadialGradient(cx - s * .3, cy - s * .4, s * .1, cx, cy, s);
        g.addColorStop(0, '#eaffb0'); g.addColorStop(.6, '#c6e34a'); g.addColorStop(1, '#82a41a');
        c.fillStyle = g; ell(c, cx, cy, s, s);
        c.strokeStyle = 'rgba(255,255,255,.9)';
        c.lineWidth = Math.max(1.5, s * .1);
        c.beginPath(); c.arc(cx - s * .6, cy, s * .85, -0.75, 0.75); c.stroke();
        c.beginPath(); c.arc(cx + s * .6, cy, s * .85, Math.PI - 0.75, Math.PI + 0.75); c.stroke();
        face(c, cx, cy, s * .52);
      }
    },
    {
      id: 'flower', name: 'Flower', car: '#c14fd1',
      draw(c, cx, cy, s) {
        c.fillStyle = '#ff7bd5';
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
          ell(c, cx + Math.cos(a) * s * .58, cy + Math.sin(a) * s * .58, s * .4, s * .4);
        }
        const g = c.createRadialGradient(cx - s * .2, cy - s * .2, s * .1, cx, cy, s * .7);
        g.addColorStop(0, '#fff3a0'); g.addColorStop(1, '#e8b400');
        c.fillStyle = g; ell(c, cx, cy, s * .66, s * .66);
        face(c, cx, cy, s * .42, { er: .2 });
      }
    },
    {
      id: 'lollipop', name: 'Lollipop', car: '#ff5fa2',
      draw(c, cx, cy, s) {
        c.fillStyle = '#f0e6d2';
        rr(c, cx - s * .09, cy + s * .08, s * .18, s * 1.02, s * .08); c.fill();
        const g = c.createRadialGradient(cx - s * .3, cy - s * .6, s * .1, cx, cy - s * .35, s * .9);
        g.addColorStop(0, '#ffe1f0'); g.addColorStop(.5, '#ff7ab8'); g.addColorStop(1, '#c22c74');
        c.fillStyle = g; ell(c, cx, cy - s * .35, s * .72, s * .72);
        c.strokeStyle = 'rgba(255,255,255,.8)';
        c.lineWidth = Math.max(1.5, s * .1);
        c.beginPath(); c.arc(cx, cy - s * .35, s * .44, 0, Math.PI * 1.55); c.stroke();
        face(c, cx, cy - s * .35, s * .4, { er: .18, my: .9, mw: .18 });
      }
    }
  );

  /* ================= som ================= */
  let actx = null, soundOn = true;
  function beep(freq, dur, type, vol) {
    if (!soundOn) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = actx || new AC();
      if (actx.state === 'suspended') actx.resume();
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, actx.currentTime);
      g.gain.setValueAtTime(vol == null ? 0.05 : vol, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (dur || 0.08));
      o.connect(g); g.connect(actx.destination);
      o.start();
      o.stop(actx.currentTime + (dur || 0.08) + 0.02);
    } catch (e) { /* sem som, sem drama */ }
  }
  /* ================= DOM ================= */
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * DPR;
  canvas.height = H * DPR;

  const hudEl = document.getElementById('hud');
  const menuEl = document.getElementById('menu');
  const overEl = document.getElementById('over');
  const gridEl = document.getElementById('charGrid');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const batteryFill = document.getElementById('batteryFill');
  const batteryPct = document.getElementById('batteryPct');
  const boostTag = document.getElementById('boostTag');
  const finalScoreEl = document.getElementById('finalScore');
  const overWhoEl = document.getElementById('overWho');
  const overBestEl = document.getElementById('overBest');
  const muteBtn = document.getElementById('mute');
  const abilityBtn = document.getElementById('ability');
  const abilityCd = document.getElementById('abilityCd');

  const show = (el) => el.classList.remove('hidden');
  const hide = (el) => el.classList.add('hidden');

  let best = 0;
  try { best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch (e) { best = 0; }
  bestEl.textContent = best;

  /* ================= estado ================= */
  let mode = 'menu';
  let G = null;
  let lastChar = CHARS[0];
  let menuScroll = 0;
  let dragging = false;
  let pointerX = 0;
  const keys = { left: false, right: false, boost: false };

  function newGame(ch) {
    return {
      ch,
      x: laneX(1), targetX: laneX(1),
      speed: 340, boosting: false,
      battery: 100, score: 0,
      obstacles: [], pickups: [], parts: [],
      spawn: 0.9, pspawn: 1.1,
      scroll: 0, shake: 0, t: 0,
      startT: 2.0, goT: 0, vomitCd: 0,
      globs: [], combo: 0, comboT: 0
    };
  }

  function startGame(ch) {
    lastChar = ch;
    G = newGame(ch);
    mode = 'playing';
    abilityBtn.hidden = !ch.special;
    hide(menuEl); hide(overEl); show(hudEl);
    updateHUD(G);
    beep(520, 0.09, 'triangle', 0.045);
  }

  function endGame() {
    mode = 'over';
    G.boosting = false;
    G.shake = 0;
    const sc = Math.floor(G.score);
    const isNew = sc > best;
    if (isNew) {
      best = sc;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
    }
    bestEl.textContent = best;
    finalScoreEl.textContent = sc;
    overWhoEl.textContent = G.ch.name + ' ficou sem bateria a meio da autoestrada.';
    overBestEl.textContent = isNew ? 'NOVO RECORDE!' : 'Recorde: ' + best;
    overBestEl.className = 'muted' + (isNew ? ' new' : '');
    hide(hudEl); show(overEl);
    beep(150, 0.55, 'sawtooth', 0.06);
  }

  function updateHUD(g) {
    scoreEl.textContent = Math.floor(g.score);
    const p = Math.max(0, Math.min(100, g.battery));
    batteryFill.style.width = p + '%';
    batteryFill.style.background = p > 55
      ? 'linear-gradient(90deg,#3ddc84,#6ff0ff)'
      : p > 25
        ? 'linear-gradient(90deg,#ffb020,#ffd166)'
        : 'linear-gradient(90deg,#ff3b3b,#ff7a7a)';
    batteryPct.textContent = Math.round(p) + '%';
    boostTag.classList.toggle('on', !!g.boosting);
    if (g.ch.special) {
      const cd = Math.max(0, g.vomitCd);
      abilityBtn.classList.toggle('cool', cd > 0);
      abilityCd.textContent = cd > 0 ? String(Math.ceil(cd)) : '';
    }
  }

  /* ================= partículas ================= */
  function burst(g, x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(40, 250);
      g.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.25, 0.6), max: 0.6, color, size: rand(1.5, 3.6)
      });
    }
  }

  /* ================= spawns ================= */
  const OBSTACLE_COLORS = ['#e9edf4', '#38455c', '#c0392b', '#2f6fd0', '#8e99ac', '#1f8a63'];

  function spawnObstacle(g) {
    const busy = new Set(g.obstacles.filter((o) => o.y < 230).map((o) => o.lane));
    const free = [0, 1, 2].filter((l) => !busy.has(l));
    if (free.length <= 1) return;
    const lane = free[randInt(0, free.length - 1)];
    const cone = Math.random() < 0.3;
    g.obstacles.push({
      lane,
      type: cone ? 'cone' : 'car',
      x: laneX(lane) + (cone ? rand(-18, 18) : 0),
      y: -110,
      w: cone ? 26 : 44,
      h: cone ? 30 : 78,
      color: cone ? '#ff7a1a' : pick(OBSTACLE_COLORS),
      drift: !cone && Math.random() < 0.35 ? rand(-45, 45) : 0,
      rel: cone ? 0 : rand(0.25, 0.5)
    });
  }

  function spawnPickup(g) {
    const lane = randInt(0, 2);
    g.pickups.push({ lane, x: laneX(lane), y: -90, w: 26, h: 34, bob: rand(0, 6.28) });
  }

  function hitObstacle(g, o) {
    o.dead = true;
    const cone = o.type === 'cone';
    g.battery -= cone ? 9 : 26;
    g.combo = 0;
    g.comboT = 0;
    g.shake = Math.min(24, g.shake + (cone ? 7 : 15));
    burst(g, o.x, o.y, cone ? '#ff9a3c' : '#ffd166', cone ? 12 : 18);
    beep(cone ? 200 : 95, 0.16, 'sawtooth', 0.055);
  }

  function tryVomit() {
    const g = G;
    if (!g || mode !== 'playing' || !g.ch.special) return;
    if (g.startT > 0 || g.vomitCd > 0 || g.battery <= 7) return;
    g.battery -= 6;
    g.vomitCd = 4.5;
    for (let i = 0; i < 3; i++) {
      g.globs.push({
        x: g.x + (i - 1) * 8,
        y: PLAYER_Y - CAR_H * 0.42,
        vx: (i - 1) * 95,
        vy: -640 - i * 30,
        r: 7 + i * 1.5
      });
    }
    burst(g, g.x, PLAYER_Y - 46, '#8ef07a', 14);
    beep(200, 0.2, 'sawtooth', 0.05);
  }

  /* ================= update ================= */
  function update(dt) {
    const g = G;
    g.t += dt;

    if (g.startT > 0) {
      g.startT -= dt;
      g.scroll += 120 * dt;
      if (g.startT <= 0) {
        g.goT = 0.7;
        beep(880, 0.12, 'triangle', 0.05);
      }
      updateHUD(g);
      return;
    }
    g.goT = Math.max(0, g.goT - dt);
    g.vomitCd = Math.max(0, g.vomitCd - dt);
    g.comboT = Math.max(0, g.comboT - dt);

    g.boosting = keys.boost && g.battery > 3;
    const spd = g.speed * (g.boosting ? 1.6 : 1);

    g.scroll += spd * dt;
    g.speed = Math.min(880, g.speed + dt * 15);
    g.score += spd * dt * (g.boosting ? 0.23 : 0.13);
    g.battery -= dt * (2.9 + ((g.speed - 340) / 900) * 1.4 + (g.boosting ? 7 : 0));

    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (dir) g.targetX = clamp(g.targetX + dir * 620 * dt, MIN_X, MAX_X);
    g.x = lerp(g.x, g.targetX, Math.min(1, dt * 13));

    g.spawn -= dt;
    if (g.spawn <= 0) {
      spawnObstacle(g);
      g.spawn = clamp(1.0 - (g.speed - 340) / 1100, 0.44, 1.0) + rand(-0.08, 0.22);
    }
    g.pspawn -= dt;
    if (g.pspawn <= 0) {
      spawnPickup(g);
      g.pspawn = rand(1.15, 2.4);
    }

    const mv = spd * dt;
    for (const o of g.obstacles) {
      o.y += mv * (1 - o.rel);
      if (o.drift) o.x = clamp(o.x + o.drift * dt, ROAD_L + o.w * 0.55, ROAD_R - o.w * 0.55);
    }
    for (const p of g.pickups) p.y += mv;

    const pw = CAR_W * 0.78, ph = CAR_H * 0.8;
    for (const o of g.obstacles) {
      if (o.dead) continue;
      if (Math.abs(o.x - g.x) < (pw + o.w) * 0.42 && Math.abs(o.y - PLAYER_Y) < (ph + o.h) * 0.42) {
        hitObstacle(g, o);
      }
    }
    for (const p of g.pickups) {
      if (p.dead) continue;
      if (Math.abs(p.x - g.x) < (pw + p.w) * 0.5 && Math.abs(p.y - PLAYER_Y) < (ph + p.h) * 0.5) {
        p.dead = true;
        g.battery = Math.min(100, g.battery + 15);
        g.score += 20;
        burst(g, p.x, p.y, '#6ff0ff', 12);
        beep(920, 0.07, 'triangle', 0.04);
      }
    }

    // quase-acidentes -> combo
    for (const o of g.obstacles) {
      if (o.dead || o.passed) continue;
      if (o.y > PLAYER_Y + 26) {
        o.passed = true;
        const dx = Math.abs(o.x - g.x);
        if (dx < 84 && dx > (pw + o.w) * 0.42) {
          g.combo = Math.min(9, g.combo + 1);
          g.comboT = 1.5;
          g.score += 8 * g.combo;
          beep(1150 + g.combo * 80, 0.05, 'sine', 0.028);
        }
      }
    }

    // vómito (Rocky / Barf Bag)
    for (const b of g.globs) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 460 * dt;
      b.vx *= 0.985;
      for (const o of g.obstacles) {
        if (o.dead) continue;
        if (Math.abs(b.x - o.x) < o.w * 0.5 + b.r && Math.abs(b.y - o.y) < o.h * 0.5 + b.r) {
          o.dead = true;
          b.dead = true;
          g.score += 45;
          burst(g, o.x, o.y, '#8ef07a', 16);
          beep(280, 0.1, 'sawtooth', 0.045);
          break;
        }
      }
    }
    g.globs = g.globs.filter((b) => !b.dead && b.y > -90 && b.x > -40 && b.x < W + 40);

    g.obstacles = g.obstacles.filter((o) => !o.dead && o.y < H + 160);
    g.pickups = g.pickups.filter((p) => !p.dead && p.y < H + 120);

    for (const p of g.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy = p.vy * 0.98 + 220 * dt;
      p.life -= dt;
    }
    g.parts = g.parts.filter((p) => p.life > 0);
    if (g.parts.length > 220) g.parts.splice(0, g.parts.length - 220);

    g.shake = Math.max(0, g.shake - dt * 55);

    updateHUD(g);
    if (g.battery <= 0) {
      g.battery = 0;
      updateHUD(g);
      endGame();
    }
  }
  /* ================= render ================= */
  function drawRoad(scroll) {
    const gnd = ctx.createLinearGradient(0, 0, 0, H);
    gnd.addColorStop(0, '#0b1220'); gnd.addColorStop(1, '#080d16');
    ctx.fillStyle = gnd; ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#0e1822';
    ctx.fillRect(0, 0, ROAD_L - 12, H);
    ctx.fillRect(ROAD_R + 12, 0, W - ROAD_R - 12, H);

    const per = 120, off = scroll % per;
    ctx.fillStyle = 'rgba(79,209,255,.045)';
    for (let y = -per + off; y < H + per; y += per) {
      ctx.fillRect(0, y, ROAD_L - 12, per * 0.5);
      ctx.fillRect(ROAD_R + 12, y, W - ROAD_R - 12, per * 0.5);
    }

    const rg = ctx.createLinearGradient(ROAD_L, 0, ROAD_R, 0);
    rg.addColorStop(0, '#151a24');
    rg.addColorStop(0.5, '#1d232e');
    rg.addColorStop(1, '#151a24');
    ctx.fillStyle = rg;
    ctx.fillRect(ROAD_L, 0, ROAD_R - ROAD_L, H);

    ctx.fillStyle = 'rgba(230,240,255,.5)';
    ctx.fillRect(ROAD_L + 5, 0, 4, H);
    ctx.fillRect(ROAD_R - 9, 0, 4, H);

    const dp = 70, doff = scroll % dp;
    ctx.fillStyle = 'rgba(230,240,255,.3)';
    for (let y = -dp + doff; y < H + dp; y += dp) {
      ctx.fillRect(ROAD_L + LANE_W - 2, y, 4, dp * 0.5);
      ctx.fillRect(ROAD_L + LANE_W * 2 - 2, y, 4, dp * 0.5);
    }
  }

  function drawCarShape(x, y, w, h, color, isPlayer) {
    const hw = w / 2, hh = h / 2;

    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ell(ctx, x, y + hh * 0.95, hw * 0.95, hh * 0.17);

    ctx.fillStyle = '#0c0f14';
    rr(ctx, x - hw - 4, y - hh * 0.62, 8, hh * 0.34, 3); ctx.fill();
    rr(ctx, x + hw - 4, y - hh * 0.62, 8, hh * 0.34, 3); ctx.fill();
    rr(ctx, x - hw - 4, y + hh * 0.22, 8, hh * 0.34, 3); ctx.fill();
    rr(ctx, x + hw - 4, y + hh * 0.22, 8, hh * 0.34, 3); ctx.fill();

    const bg = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
    bg.addColorStop(0, shade(color, -0.45));
    bg.addColorStop(0.35, shade(color, 0.1));
    bg.addColorStop(0.62, shade(color, 0.28));
    bg.addColorStop(1, shade(color, -0.45));
    ctx.fillStyle = bg;
    rr(ctx, x - hw, y - hh, w, h, w * 0.3); ctx.fill();

    ctx.fillStyle = 'rgba(8,12,18,.72)';
    rr(ctx, x - hw * 0.66, y - hh * 0.18, w * 0.66, hh * 0.5, w * 0.16); ctx.fill();

    ctx.fillStyle = 'rgba(150,210,255,.3)';
    rr(ctx, x - hw * 0.58, y - hh * 0.74, w * 0.58, hh * 0.3, w * 0.12); ctx.fill();

    ctx.fillStyle = 'rgba(150,210,255,.22)';
    rr(ctx, x - hw * 0.56, y + hh * 0.38, w * 0.56, hh * 0.22, w * 0.1); ctx.fill();

    ctx.fillStyle = 'rgba(230,245,255,.9)';
    rr(ctx, x - hw * 0.78, y - hh * 0.93, w * 0.22, hh * 0.08, 3); ctx.fill();
    rr(ctx, x + hw * 0.56, y - hh * 0.93, w * 0.22, hh * 0.08, 3); ctx.fill();

    ctx.save();
    ctx.shadowColor = 'rgba(255,60,60,.9)';
    ctx.shadowBlur = isPlayer ? 16 : 10;
    ctx.fillStyle = '#ff3b3b';
    rr(ctx, x - w * 0.37, y + hh * 0.86, w * 0.74, hh * 0.1, 3); ctx.fill();
    ctx.restore();
  }

  function drawObstacleCar(o) {
    drawCarShape(o.x, o.y, o.w, o.h, o.color, false);
    ctx.fillStyle = 'rgba(10,14,20,.5)';
    ell(ctx, o.x, o.y - o.h * 0.1, o.w * 0.2, o.h * 0.09);
  }

  function drawCone(x, y) {
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ell(ctx, x, y + 14, 16, 5);
    ctx.fillStyle = '#ff7a1a';
    ctx.beginPath();
    ctx.moveTo(x, y - 16);
    ctx.lineTo(x + 12, y + 13);
    ctx.lineTo(x - 12, y + 13);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 7, y - 2, 14, 5);
    ctx.fillStyle = '#c95300';
    rr(ctx, x - 16, y + 10, 32, 6, 3);
    ctx.fill();
  }

  function drawBattery(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = 'rgba(111,240,255,.85)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#0e2a33';
    rr(ctx, -13, -17, 26, 34, 7); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(111,240,255,.9)';
    ctx.lineWidth = 2;
    rr(ctx, -13, -17, 26, 34, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(111,240,255,.9)';
    rr(ctx, -5, -21, 10, 5, 2); ctx.fill();
    ctx.fillStyle = '#8ff6ff';
    ctx.beginPath();
    ctx.moveTo(2, -12); ctx.lineTo(-8, 2); ctx.lineTo(-1, 2);
    ctx.lineTo(-3, 13); ctx.lineTo(8, -3); ctx.lineTo(1, -3);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawPlayer(g, t) {
    const tilt = clamp((g.targetX - g.x) * 0.004, -0.13, 0.13);
    ctx.save();
    ctx.translate(g.x, PLAYER_Y);
    ctx.rotate(tilt);

    if (g.boosting) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const hgt = 46 + Math.sin(t * 40) * 8 + Math.random() * 14;
      const gr = ctx.createLinearGradient(0, CAR_H * 0.42, 0, CAR_H * 0.42 + hgt);
      gr.addColorStop(0, 'rgba(150,240,255,.8)');
      gr.addColorStop(1, 'rgba(70,110,255,0)');
      ctx.fillStyle = gr;
      rr(ctx, -CAR_W * 0.3, CAR_H * 0.4, CAR_W * 0.6, hgt, 12);
      ctx.fill();
      ctx.restore();
    }

    drawCarShape(0, 0, CAR_W, CAR_H, g.ch.car, true);
    g.ch.draw(ctx, 0, -CAR_H * 0.1, CAR_W * 0.34);
    ctx.restore();
  }

  function drawBigText(txt, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : Math.max(0, Math.min(1, alpha));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 92px "Arial Black", Impact, system-ui, sans-serif';
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 30;
    ctx.fillText(txt, W / 2, H * 0.42);
    ctx.restore();
  }

  function drawSpeedLines(t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(140,220,255,.15)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const x = 16 + ((i * 97) % (W - 32));
      const y = ((t * 950 + i * 137) % (H + 200)) - 100;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 62);
      ctx.stroke();
    }
    ctx.restore();
  }

  function render(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const shake = G ? G.shake : 0;
    ctx.save();
    if (shake > 0.2) ctx.translate(rand(-1, 1) * shake * 0.35, rand(-1, 1) * shake * 0.35);

    drawRoad(!G || mode === 'menu' ? menuScroll : G.scroll);

    if (G && mode !== 'menu') {
      for (const p of G.pickups) drawBattery(p.x, p.y + Math.sin(t * 4 + p.bob) * 3);
      for (const o of G.obstacles) {
        if (o.type === 'cone') drawCone(o.x, o.y);
        else drawObstacleCar(o);
      }
      for (const b of G.globs) {
        ctx.fillStyle = 'rgba(140,235,110,.95)';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(225,255,200,.9)';
        ctx.beginPath();
        ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.36, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const p of G.parts) {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      drawPlayer(G, t);
      if (G.comboT > 0 && G.combo > 1) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, G.comboT / 0.8);
        ctx.textAlign = 'center';
        ctx.font = '900 20px "Arial Black", Impact, system-ui, sans-serif';
        ctx.fillStyle = '#8ff6ff';
        ctx.shadowColor = '#4fd1ff';
        ctx.shadowBlur = 16;
        ctx.fillText('QUASE ×' + G.combo, G.x, PLAYER_Y - 80);
        ctx.restore();
      }
    }
    ctx.restore();

    if (G && G.startT > 0) drawBigText(String(Math.ceil(G.startT)), '#6ff0ff', 1);
    else if (G && G.goT > 0) drawBigText('VAI!', '#8ef07a', G.goT / 0.7);

    if (G && G.boosting && mode === 'playing') drawSpeedLines(t);
  }

  /* ================= input ================= */
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'Space') e.preventDefault();
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    else if (e.code === 'Space') keys.boost = true;
    else if (e.code === 'KeyE' || e.code === 'KeyV') tryVomit();
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    else if (e.code === 'Space') keys.boost = false;
  });
  window.addEventListener('blur', () => {
    keys.left = keys.right = keys.boost = false;
    dragging = false;
  });

  function pointerToX(e) {
    const r = canvas.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * W;
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (mode !== 'playing') return;
    dragging = true;
    pointerX = pointerToX(e);
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !G) return;
    const x = pointerToX(e);
    G.targetX = clamp(G.targetX + (x - pointerX) * 1.4, MIN_X, MAX_X);
    pointerX = x;
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });

  document.getElementById('again').addEventListener('click', () => startGame(lastChar));
  document.getElementById('change').addEventListener('click', () => {
    hide(overEl); hide(hudEl); show(menuEl);
    mode = 'menu';
  });
  muteBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    muteBtn.textContent = soundOn ? '🔊' : '🔇';
    if (soundOn) beep(660, 0.08, 'triangle', 0.04);
  });
  abilityBtn.addEventListener('click', tryVomit);

  /* ================= menu ================= */
  CHARS.forEach((ch) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card';
    b.setAttribute('aria-label', 'Conduzir com ' + ch.name);
    const cv = document.createElement('canvas');
    cv.width = 56 * DPR;
    cv.height = 56 * DPR;
    const c2 = cv.getContext('2d');
    c2.scale(DPR, DPR);
    ch.draw(c2, 28, 28, 20);
    const label = document.createElement('span');
    label.textContent = ch.name;
    b.appendChild(cv);
    b.appendChild(label);
    if (ch.special) {
      const badge = document.createElement('i');
      badge.className = 'badge';
      badge.textContent = 'VOMITA';
      b.appendChild(badge);
    }
    b.addEventListener('click', () => startGame(ch));
    gridEl.appendChild(b);
  });

  /* ================= loop ================= */
  let last = 0;
  function loop(ts) {
    if (!last) last = ts;
    let dt = (ts - last) / 1000;
    last = ts;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;

    if (mode === 'playing') update(dt);
    else if (mode === 'menu') menuScroll += 130 * dt;
    else if (mode === 'over' && G) G.scroll += 70 * dt;

    render(ts / 1000);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
