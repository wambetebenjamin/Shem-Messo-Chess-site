#!/usr/bin/env python3
"""Build assets/sprites/capture-sheet.svg — the 8-frame stop-motion sheet used
by EFFECT-31 (bento card 10).

    python3 tools/build-sprite-sheet.py

The knight silhouette is mirrored so it faces the direction it travels. Frame
geometry lives in FRAMES, so the timing of the capture can be retuned without
touching the artwork code. Output is 8 frames of 200x200 → 1600x200.
"""
import math
import os

KN = ["43% 0%", "51% 8%", "64% 12%", "78% 22%", "89% 38%", "94% 57%", "74% 61%",
      "65% 54%", "59% 60%", "67% 82%", "84% 100%", "11% 100%", "19% 76%", "30% 54%",
      "26% 40%", "19% 28%", "27% 10%"]
PW = ["50% 0%", "60% 6%", "64% 16%", "57% 27%", "55% 31%", "68% 53%", "77% 76%",
      "83% 100%", "17% 100%", "23% 76%", "32% 53%", "45% 31%", "43% 27%", "36% 16%",
      "40% 6%"]

# (knight x, knight y, vertical lift, pawn state, impact burst)
#   pawn state: 0 intact · 1 tipping · 2 airborne · 3 captured
FRAMES = [
    (6, 92, 0, 0, 0),
    (24, 84, -6, 0, 0),
    (44, 70, -14, 0, 0),
    (66, 54, -22, 0, 0),
    (92, 60, -12, 1, 1),
    (110, 74, -2, 2, 1),
    (124, 86, 0, 3, 0),
    (126, 84, 0, 3, 0),
]

W = H = 200


def poly(points, box_w, box_h, fill, stroke=None):
    pts = []
    for p in points:
        px, py = p.split()
        pts.append("%.1f,%.1f" % (float(px[:-1]) / 100 * box_w, float(py[:-1]) / 100 * box_h))
    extra = ""
    if stroke:
        extra = ' fill="none" stroke="%s" stroke-width="2"' % stroke
    else:
        extra = ' fill="%s"' % fill
    return "<polygon points=\"%s\"%s/>" % (" ".join(pts), extra)


def main():
    out = []
    out.append('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="200" '
               'viewBox="0 0 %d 200" role="img" '
               'aria-label="Eight frame sprite sheet of a knight capturing a pawn">'
               % (W * len(FRAMES), W * len(FRAMES)))
    out.append("  <title>Knight captures pawn — 8 frame sprite sheet</title>")

    for i, (kx, ky, rise, pstate, burst) in enumerate(FRAMES):
        ox = i * W
        g = ['  <g transform="translate(%d,0)">' % ox]
        g.append('    <rect x="0" y="0" width="200" height="200" fill="#12395c"/>')
        g.append('    <rect x="0" y="0" width="100" height="200" fill="#dfe9f2"/>')
        g.append('    <rect x="0.5" y="0.5" width="199" height="199" fill="none" '
                 'stroke="rgba(10,28,51,.35)"/>')
        g.append('    <rect x="104" y="96" width="88" height="88" fill="none" '
                 'stroke="rgba(253,166,56,.75)" stroke-width="3" stroke-dasharray="6 5"/>')

        if pstate == 0:
            g.append('    <g transform="translate(126,96) scale(0.8,0.82)">'
                     + poly(PW, 100, 100, "#1b2430") + "</g>")
        elif pstate == 1:
            g.append('    <g transform="translate(132,120) rotate(-28) scale(0.8,0.82)">'
                     + poly(PW, 100, 100, "#1b2430") + "</g>")
        elif pstate == 2:
            g.append('    <g opacity="0.55" transform="translate(150,52) rotate(-72) '
                     'scale(0.7,0.72)">' + poly(PW, 100, 100, "#1b2430") + "</g>")

        # Mirrored so the knight faces the square it is taking.
        g.append('    <g transform="translate(%d,%d) scale(-0.92,0.92)">%s</g>'
                 % (kx + 92, ky + rise, poly(KN, 100, 100, "#f6f1e6")))
        g.append('    <g transform="translate(%d,%d) scale(-0.92,0.92)">%s</g>'
                 % (kx + 92, ky + rise, poly(KN, 100, 100, None, stroke="#7a6a4f")))

        if burst:
            g.append('    <g stroke="#fda638" stroke-width="4" stroke-linecap="round" opacity="0.95">')
            for a in (30, 78, 126, 174, 222):
                r = 16
                x1 = 148 + math.cos(math.radians(a)) * r
                y1 = 132 + math.sin(math.radians(a)) * r
                x2 = 148 + math.cos(math.radians(a)) * (r + 14)
                y2 = 132 + math.sin(math.radians(a)) * (r + 14)
                g.append('      <line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"/>' % (x1, y1, x2, y2))
            g.append("    </g>")
        if pstate == 3 and i == len(FRAMES) - 1:
            g.append('    <g fill="#fda638" opacity="0.5">')
            g.append('      <circle cx="118" cy="168" r="5"/>'
                     '<circle cx="176" cy="150" r="3.5"/>'
                     '<circle cx="150" cy="182" r="3"/>')
            g.append("    </g>")

        g.append("  </g>")
        out.extend(g)

    out.append("</svg>")

    dest = os.path.join(os.path.dirname(__file__), "..", "assets", "sprites", "capture-sheet.svg")
    dest = os.path.normpath(dest)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w") as fh:
        fh.write("\n".join(out) + "\n")
    print("wrote %s (%d frames)" % (dest, len(FRAMES)))


if __name__ == "__main__":
    main()
