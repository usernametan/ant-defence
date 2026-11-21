import React from 'react';

/**
 * Low-opacity freehand tactical map annotations (contour lines, flank arcs,
 * sketched zone markers) layered behind the landing page interface.
 */
export const TacticalSketchBackdrop: React.FC = () => (
  <svg
    className="zc-sketch-backdrop"
    viewBox="0 0 1440 900"
    preserveAspectRatio="xMidYMid slice"
    fill="none"
    aria-hidden="true"
  >
    {/* Soft freehand terrain elevation contours (left & upper-left) */}
    <path
      d="M-40 186 C 95 148, 210 212, 318 164 C 412 122, 468 48, 560 -18"
      stroke="#E8EBEF"
      strokeOpacity="0.065"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M-30 238 C 118 198, 232 258, 356 205 C 462 160, 526 78, 632 4"
      stroke="#5897BA"
      strokeOpacity="0.075"
      strokeWidth="1.35"
      strokeLinecap="round"
    />
    <path
      d="M-20 296 C 144 256, 266 310, 404 252 C 512 206, 586 116, 706 32"
      stroke="#E8EBEF"
      strokeOpacity="0.045"
      strokeWidth="1.2"
      strokeLinecap="round"
    />

    {/* Hand-sketched contour ridge (lower-right behind arena) */}
    <path
      d="M 880 918 C 964 824, 1086 842, 1188 762 C 1272 696, 1344 596, 1474 562"
      stroke="#D99A38"
      strokeOpacity="0.07"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M 962 924 C 1038 852, 1142 868, 1236 798 C 1318 738, 1384 654, 1480 626"
      stroke="#E8EBEF"
      strokeOpacity="0.05"
      strokeWidth="1.25"
      strokeLinecap="round"
    />

    {/* Freehand sketched Capture Zone ring + cross marks (top-right corner) */}
    <path
      d="M 1226 118 C 1264 98, 1326 108, 1346 148 C 1368 192, 1342 246, 1296 260 C 1248 274, 1196 248, 1184 202 C 1172 158, 1192 134, 1228 119"
      stroke="#5897BA"
      strokeOpacity="0.09"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeDasharray="10 7 4 6"
    />
    <path
      d="M 1238 140 C 1266 126, 1308 134, 1320 164 C 1332 194, 1314 228, 1284 236 C 1252 244, 1218 224, 1210 194 C 1204 168, 1216 150, 1240 139"
      stroke="#E8EBEF"
      strokeOpacity="0.055"
      strokeWidth="1.2"
      strokeLinecap="round"
    />

    {/* Hand-drawn flank route arrow sweeping toward Zone B */}
    <path
      d="M 152 698 C 248 648, 358 672, 466 632 C 556 598, 634 532, 718 504"
      stroke="#D99A38"
      strokeOpacity="0.085"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeDasharray="9 8"
    />
    <path
      d="M 696 496 C 708 500, 718 502, 726 502 C 718 510, 710 518, 704 526"
      stroke="#D99A38"
      strokeOpacity="0.095"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Secondary red-squad counter-flank sketch (lower-left / center-bottom) */}
    <path
      d="M 412 838 C 482 782, 574 794, 654 756 C 722 724, 774 674, 834 656"
      stroke="#C85D4C"
      strokeOpacity="0.08"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeDasharray="7 9"
    />
    <path
      d="M 816 650 C 826 653, 834 655, 841 655 C 834 662, 828 669, 822 677"
      stroke="#C85D4C"
      strokeOpacity="0.09"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Loose hand-drawn X & tactical cover ticks */}
    <path
      d="M 114 584 L 130 600 M 131 582 L 113 601"
      stroke="#C85D4C"
      strokeOpacity="0.09"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M 552 138 L 566 151 M 567 136 L 551 152"
      stroke="#E8EBEF"
      strokeOpacity="0.065"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M 294 748 C 306 742, 322 746, 328 758 C 334 770, 324 786, 310 788 C 296 790, 284 778, 286 764 C 287 756, 290 751, 296 747"
      stroke="#5897BA"
      strokeOpacity="0.08"
      strokeWidth="1.4"
      strokeLinecap="round"
    />

    {/* Loose hand-drawn sightline / boundary strokes */}
    <path
      d="M 618 74 C 668 124, 692 178, 744 218"
      stroke="#E8EBEF"
      strokeOpacity="0.05"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeDasharray="3 8"
    />
    <path
      d="M 48 432 C 88 424, 122 442, 162 430"
      stroke="#D99A38"
      strokeOpacity="0.07"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);
