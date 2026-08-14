type EditorialLineFieldProps = {
  variant: "explore" | "project";
};

export function EditorialLineField({ variant }: EditorialLineFieldProps) {
  if (variant === "explore") {
    return (
      <div className="fr-line-field fr-line-field--explore" aria-hidden="true">
        <svg viewBox="0 0 1600 1000" preserveAspectRatio="none">
          <g className="fr-line-field__base fr-line-field__drift-a">
            <path className="fr-line-field__wire fr-line-field__wire--major" d="M-120 142 C 220 66 430 298 760 222 S 1232 52 1715 176" pathLength={1} />
            <path className="fr-line-field__wire" d="M-86 782 C 270 690 408 468 748 508 S 1190 820 1694 684" pathLength={1} />
            <path className="fr-line-field__wire fr-line-field__wire--quiet" d="M82 1004 C 248 742 514 716 706 546 C 890 382 1032 188 1326 -72" pathLength={1} />
            <path className="fr-line-field__wire fr-line-field__wire--quiet" d="M1510 -64 C 1390 158 1320 296 1384 468 C 1442 628 1378 808 1190 1056" pathLength={1} />
          </g>

          <g className="fr-line-field__construction fr-line-field__drift-b">
            <path d="M-40 336 L268 336 L322 304 L486 304" />
            <path d="M1178 124 L1394 124 L1434 164 L1640 164" />
            <path d="M1120 852 L1308 852 L1354 806 L1640 806" />
            <path d="M148 876 L326 876 L376 918 L554 918" />
            <line x1="126" y1="180" x2="126" y2="276" />
            <line x1="118" y1="228" x2="134" y2="228" />
            <line x1="1490" y1="438" x2="1490" y2="572" />
            <line x1="1482" y1="505" x2="1498" y2="505" />
          </g>

          <g className="fr-line-field__micro">
            <circle cx="322" cy="304" r="2.2" />
            <circle cx="760" cy="222" r="2.2" />
            <circle cx="1384" cy="468" r="2.2" />
            <circle cx="1354" cy="806" r="2.2" />
            <rect x="482" y="300" width="8" height="8" rx="1" />
            <rect x="1174" y="120" width="8" height="8" rx="1" />
          </g>

          <path className="fr-line-field__trace fr-line-field__trace--a" d="M-120 142 C 220 66 430 298 760 222 S 1232 52 1715 176" pathLength={1} />
          <path className="fr-line-field__trace fr-line-field__trace--b" d="M-86 782 C 270 690 408 468 748 508 S 1190 820 1694 684" pathLength={1} />
          <circle className="fr-line-field__beacon fr-line-field__beacon--a" cx="760" cy="222" r="4" />
          <circle className="fr-line-field__beacon fr-line-field__beacon--b" cx="1354" cy="806" r="3.2" />
        </svg>
      </div>
    );
  }

  return (
    <div className="fr-line-field fr-line-field--project" aria-hidden="true">
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="none">
        <g className="fr-line-field__base">
          <path className="fr-line-field__wire fr-line-field__wire--quiet" d="M-110 860 C 220 720 360 558 644 538 C 930 518 1162 686 1710 462" pathLength={1} />
          <path className="fr-line-field__wire fr-line-field__wire--quiet" d="M214 -80 C 336 174 538 254 770 236 C 1032 214 1220 38 1540 -42" pathLength={1} />
          <path className="fr-line-field__wire fr-line-field__wire--quiet" d="M1518 1036 C 1324 824 1328 650 1192 554 C 1040 446 794 468 612 336 C 430 206 346 88 246 -64" pathLength={1} />
        </g>

        <g className="fr-line-field__project-stage fr-line-field__project-stage--capture">
          <path className="fr-line-field__wire fr-line-field__wire--major" d="M982 -58 C 1170 64 1242 170 1196 292 C 1148 416 1244 500 1668 508" pathLength={1} />
          <path className="fr-line-field__wire" d="M-82 610 C 208 570 366 416 586 390 C 772 368 866 428 1010 442" pathLength={1} />
          <path className="fr-line-field__trace" d="M982 -58 C 1170 64 1242 170 1196 292 C 1148 416 1244 500 1668 508" pathLength={1} />
          <circle className="fr-line-field__beacon" cx="1196" cy="292" r="3.6" />
        </g>

        <g className="fr-line-field__project-stage fr-line-field__project-stage--evidence">
          <path className="fr-line-field__wire fr-line-field__wire--major" d="M-100 246 L232 246 C 394 246 438 314 596 314 L1042 314 C 1204 314 1250 252 1700 252" pathLength={1} />
          <path className="fr-line-field__wire" d="M-60 702 L306 702 C 476 702 518 640 704 640 L1180 640 C 1320 640 1390 704 1660 704" pathLength={1} />
          <path className="fr-line-field__trace" d="M-100 246 L232 246 C 394 246 438 314 596 314 L1042 314 C 1204 314 1250 252 1700 252" pathLength={1} />
          <rect className="fr-line-field__beacon" x="590" y="308" width="12" height="12" rx="2" />
        </g>

        <g className="fr-line-field__project-stage fr-line-field__project-stage--interrogation">
          <path className="fr-line-field__wire fr-line-field__wire--major" d="M-74 884 C 280 764 402 596 654 520 C 932 436 1164 468 1670 194" pathLength={1} />
          <path className="fr-line-field__wire fr-line-field__wire--signal" d="M286 -42 C 422 188 560 282 824 374 C 1050 454 1268 628 1578 1018" pathLength={1} />
          <path className="fr-line-field__trace fr-line-field__trace--signal" d="M286 -42 C 422 188 560 282 824 374 C 1050 454 1268 628 1578 1018" pathLength={1} />
          <circle className="fr-line-field__beacon fr-line-field__beacon--signal" cx="824" cy="374" r="3.6" />
        </g>

        <g className="fr-line-field__project-stage fr-line-field__project-stage--resolution">
          <path className="fr-line-field__wire fr-line-field__wire--major" d="M-120 492 C 246 420 476 500 716 442 C 990 374 1116 204 1690 228" pathLength={1} />
          <path className="fr-line-field__wire" d="M142 1048 C 288 812 494 728 716 730 C 968 732 1162 830 1502 1034" pathLength={1} />
          <path className="fr-line-field__trace" d="M-120 492 C 246 420 476 500 716 442 C 990 374 1116 204 1690 228" pathLength={1} />
          <circle className="fr-line-field__beacon" cx="716" cy="442" r="3.6" />
        </g>

        <g className="fr-line-field__project-stage fr-line-field__project-stage--build">
          <path className="fr-line-field__wire fr-line-field__wire--major" d="M-102 822 C 226 738 402 664 596 546 C 772 438 976 296 1174 188 C 1356 90 1482 36 1682 -6" pathLength={1} />
          <path className="fr-line-field__wire" d="M140 1010 L140 884 L188 838 L414 838 C 548 838 612 782 702 720" pathLength={1} />
          <path className="fr-line-field__trace" d="M-102 822 C 226 738 402 664 596 546 C 772 438 976 296 1174 188 C 1356 90 1482 36 1682 -6" pathLength={1} />
          <circle className="fr-line-field__beacon" cx="1174" cy="188" r="3.6" />
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
