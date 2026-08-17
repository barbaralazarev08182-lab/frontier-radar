type EditorialLineFieldProps = {
  variant: "explore" | "project";
};

export function EditorialLineField({ variant }: EditorialLineFieldProps) {
  if (variant === "explore") {
    return (
      <div className="fr-explore-surface" aria-hidden="true">
        <svg viewBox="0 0 1600 1000" preserveAspectRatio="none">
          <defs>
            <linearGradient id="explore-plate-a" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#315efb" stopOpacity=".055" />
              <stop offset=".7" stopColor="#315efb" stopOpacity=".012" />
              <stop offset="1" stopColor="#315efb" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="explore-plate-b" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1c1c1a" stopOpacity=".04" />
              <stop offset="1" stopColor="#1c1c1a" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g className="fr-explore-surface__plates">
            <path className="fr-explore-surface__plate fr-explore-surface__plate--a" d="M1185 -40 H1640 V310 L1508 366 L1280 286 Z" fill="url(#explore-plate-a)" />
            <path className="fr-explore-surface__plate fr-explore-surface__plate--b" d="M-60 716 L212 648 L342 758 L264 1040 H-60 Z" fill="url(#explore-plate-b)" />
            <path className="fr-explore-surface__plate fr-explore-surface__plate--c" d="M1458 620 L1640 548 V1040 H1352 L1410 840 Z" />
          </g>

          <g className="fr-explore-surface__edge-frame">
            <path d="M18 128 V54 H96" />
            <path d="M1504 54 H1582 V132" />
            <path d="M18 872 V946 H96" />
            <path d="M1504 946 H1582 V868" />
            <path d="M20 484 H64" />
            <path d="M1536 484 H1580" />
          </g>

          <g className="fr-explore-surface__calibration fr-explore-surface__calibration--right">
            {Array.from({ length: 11 }, (_, index) => (
              <line key={index} x1={1510 + (index % 2) * 9} x2={1540} y1={188 + index * 31} y2={188 + index * 31} />
            ))}
          </g>

          <g className="fr-explore-surface__calibration fr-explore-surface__calibration--bottom">
            {Array.from({ length: 13 }, (_, index) => (
              <line key={index} x1={178 + index * 26} x2={178 + index * 26} y1={900} y2={index % 4 === 0 ? 930 : 918} />
            ))}
          </g>

          <g className="fr-explore-surface__dots fr-explore-surface__dots--a">
            {Array.from({ length: 32 }, (_, index) => {
              const col = index % 8;
              const row = Math.floor(index / 8);
              return <circle key={index} cx={1310 + col * 28} cy={126 + row * 25} r={index % 7 === 0 ? 2.1 : 1.25} />;
            })}
          </g>

          <g className="fr-explore-surface__dots fr-explore-surface__dots--b">
            {Array.from({ length: 24 }, (_, index) => {
              const col = index % 6;
              const row = Math.floor(index / 6);
              return <circle key={index} cx={48 + col * 24} cy={744 + row * 27} r={index % 5 === 0 ? 1.9 : 1.15} />;
            })}
          </g>

          <text className="fr-explore-surface__ghost-index" x="1538" y="862" textAnchor="end">02</text>
          <text className="fr-explore-surface__ghost-label" x="1514" y="892" textAnchor="end">FRONTIER FIELD</text>

          <g className="fr-explore-surface__scan fr-explore-surface__scan--top">
            <rect x="1216" y="54" width="116" height="2" rx="1" />
            <circle cx="1338" cy="55" r="3" />
          </g>
          <g className="fr-explore-surface__scan fr-explore-surface__scan--right">
            <rect x="1578" y="612" width="2" height="88" rx="1" />
            <circle cx="1579" cy="706" r="2.6" />
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div className="fr-line-field fr-line-field--project" aria-hidden="true">
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="none">
        <defs>
          <linearGradient id="project-plate-blue" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#315efb" stopOpacity=".075" />
            <stop offset="1" stopColor="#315efb" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="project-plate-ink" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1c1c1a" stopOpacity=".05" />
            <stop offset="1" stopColor="#1c1c1a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="project-plate-signal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f5572f" stopOpacity=".06" />
            <stop offset="1" stopColor="#f5572f" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g className="fr-line-field__base">
          <path className="fr-line-field__wire fr-line-field__wire--quiet" d="M-110 860 C 220 720 360 558 644 538 C 930 518 1162 686 1710 462" pathLength={1} />
          <path className="fr-line-field__wire fr-line-field__wire--quiet" d="M214 -80 C 336 174 538 254 770 236 C 1032 214 1220 38 1540 -42" pathLength={1} />
          <path className="fr-line-field__wire fr-line-field__wire--quiet" d="M1518 1036 C 1324 824 1328 650 1192 554 C 1040 446 794 468 612 336 C 430 206 346 88 246 -64" pathLength={1} />
        </g>

        <g className="fr-line-field__project-stage fr-line-field__project-stage--capture">
          <path className="fr-line-field__plate" d="M1038 -40 H1640 V492 L1486 556 L1180 402 Z" fill="url(#project-plate-blue)" />
          <path className="fr-line-field__wire fr-line-field__wire--major" d="M982 -58 C 1170 64 1242 170 1196 292 C 1148 416 1244 500 1668 508" pathLength={1} />
          <path className="fr-line-field__wire" d="M-82 610 C 208 570 366 416 586 390 C 772 368 866 428 1010 442" pathLength={1} />
          <path className="fr-line-field__wire fr-line-field__wire--dash" d="M1026 110 L1424 110 L1490 176 L1608 176" pathLength={1} />
          <path className="fr-line-field__trace" d="M982 -58 C 1170 64 1242 170 1196 292 C 1148 416 1244 500 1668 508" pathLength={1} />
          <path className="fr-line-field__trace fr-line-field__trace--secondary" d="M-82 610 C 208 570 366 416 586 390 C 772 368 866 428 1010 442" pathLength={1} />
          <circle className="fr-line-field__beacon" cx="1196" cy="292" r="3.8" />
        </g>

        <g className="fr-line-field__project-stage fr-line-field__project-stage--evidence">
          <path className="fr-line-field__plate" d="M-60 178 H660 L748 278 H-60 Z" fill="url(#project-plate-ink)" />
          <path className="fr-line-field__wire fr-line-field__wire--major" d="M-100 246 L232 246 C 394 246 438 314 596 314 L1042 314 C 1204 314 1250 252 1700 252" pathLength={1} />
          <path className="fr-line-field__wire" d="M-60 702 L306 702 C 476 702 518 640 704 640 L1180 640 C 1320 640 1390 704 1660 704" pathLength={1} />
          <path className="fr-line-field__wire fr-line-field__wire--dash" d="M124 820 H462 L510 772 H716" pathLength={1} />
          <path className="fr-line-field__trace" d="M-100 246 L232 246 C 394 246 438 314 596 314 L1042 314 C 1204 314 1250 252 1700 252" pathLength={1} />
          <rect className="fr-line-field__beacon" x="590" y="308" width="12" height="12" rx="2" />
        </g>

        <g className="fr-line-field__project-stage fr-line-field__project-stage--interrogation">
          <path className="fr-line-field__plate" d="M-60 650 L462 472 L720 554 L346 1028 H-60 Z" fill="url(#project-plate-signal)" />
          <path className="fr-line-field__wire fr-line-field__wire--major" d="M-74 884 C 280 764 402 596 654 520 C 932 436 1164 468 1670 194" pathLength={1} />
          <path className="fr-line-field__wire fr-line-field__wire--signal" d="M286 -42 C 422 188 560 282 824 374 C 1050 454 1268 628 1578 1018" pathLength={1} />
          <path className="fr-line-field__trace fr-line-field__trace--signal" d="M286 -42 C 422 188 560 282 824 374 C 1050 454 1268 628 1578 1018" pathLength={1} />
          <path className="fr-line-field__trace fr-line-field__trace--secondary" d="M-74 884 C 280 764 402 596 654 520 C 932 436 1164 468 1670 194" pathLength={1} />
          <circle className="fr-line-field__beacon fr-line-field__beacon--signal" cx="824" cy="374" r="3.8" />
        </g>

        <g className="fr-line-field__project-stage fr-line-field__project-stage--resolution">
          <path className="fr-line-field__plate" d="M1070 80 H1640 V430 L1470 520 L1144 406 Z" fill="url(#project-plate-blue)" />
          <path className="fr-line-field__wire fr-line-field__wire--major" d="M-120 492 C 246 420 476 500 716 442 C 990 374 1116 204 1690 228" pathLength={1} />
          <path className="fr-line-field__wire" d="M142 1048 C 288 812 494 728 716 730 C 968 732 1162 830 1502 1034" pathLength={1} />
          <path className="fr-line-field__wire fr-line-field__wire--dash" d="M1020 706 H1380 L1448 638 H1620" pathLength={1} />
          <path className="fr-line-field__trace" d="M-120 492 C 246 420 476 500 716 442 C 990 374 1116 204 1690 228" pathLength={1} />
          <circle className="fr-line-field__beacon" cx="716" cy="442" r="3.8" />
        </g>

        <g className="fr-line-field__project-stage fr-line-field__project-stage--build">
          <path className="fr-line-field__plate" d="M-60 768 L382 618 L646 720 L510 1040 H-60 Z" fill="url(#project-plate-ink)" />
          <path className="fr-line-field__wire fr-line-field__wire--major" d="M-102 822 C 226 738 402 664 596 546 C 772 438 976 296 1174 188 C 1356 90 1482 36 1682 -6" pathLength={1} />
          <path className="fr-line-field__wire" d="M140 1010 L140 884 L188 838 L414 838 C 548 838 612 782 702 720" pathLength={1} />
          <path className="fr-line-field__trace" d="M-102 822 C 226 738 402 664 596 546 C 772 438 976 296 1174 188 C 1356 90 1482 36 1682 -6" pathLength={1} />
          <path className="fr-line-field__trace fr-line-field__trace--secondary" d="M140 1010 L140 884 L188 838 L414 838 C 548 838 612 782 702 720" pathLength={1} />
          <circle className="fr-line-field__beacon" cx="1174" cy="188" r="3.8" />
        </g>

        <g className="fr-line-field__construction fr-line-field__construction--project">
          <path d="M60 152 H286 L326 118 H484" />
          <path d="M1164 846 H1394 L1434 806 H1620" />
          <line x1="60" y1="138" x2="60" y2="166" />
          <line x1="1394" y1="832" x2="1394" y2="860" />
          <circle cx="326" cy="118" r="2" />
          <circle cx="1434" cy="806" r="2" />
        </g>
      </svg>
    </div>
  );
}
