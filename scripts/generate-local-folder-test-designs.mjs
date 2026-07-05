import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outputDir = process.argv[2] || "C:\\data\\SaltyFactoryImageDrop";
const size = 3000;
const bg = "#FF00FF";

function svgWrap(content) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${bg}" />
    ${content}
  </svg>`;
}

const designs = [
  {
    name: "sf-local-drop-01-stay-salty-boho-retro-sun-waves.png",
    svg: svgWrap(`
      <circle cx="1500" cy="1120" r="520" fill="#F2C94C"/>
      <path d="M580 1330 C880 1180, 1120 1180, 1420 1330 C1680 1460, 1920 1460, 2240 1330 L2240 1740 L580 1740 Z" fill="#8CCAE8"/>
      <path d="M520 1560 C840 1410, 1140 1410, 1460 1560 C1720 1680, 1980 1680, 2360 1540 L2360 1930 L520 1930 Z" fill="#63A8D8"/>
      <path d="M1180 830 C1300 680, 1540 650, 1690 760 C1785 830, 1815 915, 1815 995 C1710 950, 1535 938, 1360 965 C1290 975, 1220 990, 1170 1010 C1140 940, 1145 875, 1180 830 Z" fill="#C69C6D"/>
      <path d="M1000 1050 C1210 950, 1780 950, 1990 1050 C1790 1125, 1200 1125, 1000 1050 Z" fill="#C69C6D"/>
      <text x="1500" y="2320" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="270" font-weight="800" fill="#18324A" letter-spacing="8">STAY SALTY</text>
      <text x="1500" y="2555" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="94" font-weight="700" fill="#1E516B" letter-spacing="10">BOHO RETRO SUN AND WAVES</text>
    `)
  },
  {
    name: "sf-local-drop-02-yee-claw-coastal-seafood-cowboy.png",
    svg: svgWrap(`
      <g transform="translate(1500 1320)">
        <ellipse cx="0" cy="0" rx="360" ry="430" fill="#F28C7A"/>
        <ellipse cx="-250" cy="-310" rx="110" ry="150" fill="#F28C7A" transform="rotate(-18)"/>
        <ellipse cx="250" cy="-310" rx="110" ry="150" fill="#F28C7A" transform="rotate(18)"/>
        <ellipse cx="-470" cy="-70" rx="150" ry="82" fill="#F28C7A" transform="rotate(-28)"/>
        <ellipse cx="470" cy="-70" rx="150" ry="82" fill="#F28C7A" transform="rotate(28)"/>
        <ellipse cx="-480" cy="230" rx="170" ry="68" fill="#F4A08F" transform="rotate(20)"/>
        <ellipse cx="480" cy="230" rx="170" ry="68" fill="#F4A08F" transform="rotate(-20)"/>
        <circle cx="-95" cy="-120" r="18" fill="#18324A"/>
        <circle cx="95" cy="-120" r="18" fill="#18324A"/>
        <path d="M-180 -460 C-60 -610, 140 -620, 280 -520 C360 -460, 395 -390, 395 -310 C240 -355, 40 -360, -140 -338 C-225 -326, -315 -302, -385 -270 C-400 -360, -340 -420, -180 -460 Z" fill="#F7F1E3"/>
        <path d="M-520 -265 C-250 -350, 240 -350, 520 -265 C280 -170, -280 -170, -520 -265 Z" fill="#F7F1E3"/>
      </g>
      <text x="1500" y="2470" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="320" font-weight="900" fill="#18324A" letter-spacing="10">YEE-CLAW</text>
    `)
  },
  {
    name: "sf-local-drop-03-wildflower-botanical-boho-cowboy-boots.png",
    svg: svgWrap(`
      <g transform="translate(965 760)">
        <path d="M0 0 L530 0 L560 720 C570 900, 505 1040, 290 1125 C160 1060, 110 940, 95 770 L70 480 L0 420 Z" fill="#88C2E8"/>
        <path d="M105 1030 C180 1180, 360 1215, 515 1180 C468 1320, 270 1395, 105 1330 Z" fill="#5E8FB6"/>
        <path d="M120 110 L425 110" stroke="#F7F1E3" stroke-width="24" stroke-linecap="round"/>
        <path d="M150 250 L410 250" stroke="#F7F1E3" stroke-width="18" stroke-linecap="round"/>
        <circle cx="250" cy="210" r="62" fill="#F2C94C"/>
        <circle cx="328" cy="190" r="42" fill="#EF8A7D"/>
        <circle cx="208" cy="340" r="44" fill="#F7F1E3"/>
        <circle cx="350" cy="330" r="58" fill="#F2C94C"/>
        <circle cx="270" cy="430" r="48" fill="#EF8A7D"/>
        <path d="M250 250 L250 135" stroke="#4E8E58" stroke-width="18" stroke-linecap="round"/>
        <path d="M325 250 L325 150" stroke="#4E8E58" stroke-width="16" stroke-linecap="round"/>
        <path d="M275 400 L275 300" stroke="#4E8E58" stroke-width="16" stroke-linecap="round"/>
      </g>
      <text x="1500" y="2455" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="190" font-weight="850" fill="#18324A" letter-spacing="6">WILDFLOWER BOTANICAL BOHO</text>
      <text x="1500" y="2665" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="150" font-weight="800" fill="#5E8FB6" letter-spacing="10">COWBOY BOOTS</text>
    `)
  },
  {
    name: "sf-local-drop-04-last-toast-on-the-coast-bachelorette-disco.png",
    svg: svgWrap(`
      <g transform="translate(1500 1210)">
        <circle cx="0" cy="0" r="480" fill="#DDF2FF"/>
        <g stroke="#79B5D9" stroke-width="18" fill="none" opacity="0.95">
          <ellipse cx="0" cy="0" rx="450" ry="140"/>
          <ellipse cx="0" cy="0" rx="450" ry="280"/>
          <ellipse cx="0" cy="0" rx="450" ry="400"/>
          <path d="M-350 -330 C-260 -120 -260 120 -350 330"/>
          <path d="M-160 -430 C-80 -160 -80 160 -160 430"/>
          <path d="M40 -460 C60 -160 60 160 40 460"/>
          <path d="M245 -400 C280 -160 280 160 245 400"/>
        </g>
        <path d="M-210 -525 C-40 -700, 215 -700, 385 -530 C470 -445, 505 -345, 500 -250 C365 -300, 160 -320, -55 -305 C-220 -293, -365 -255, -480 -190 C-475 -315, -410 -410, -210 -525 Z" fill="#D7C2A1"/>
        <path d="M-610 -225 C-330 -315, 310 -315, 585 -225 C340 -132, -360 -132, -610 -225 Z" fill="#D7C2A1"/>
      </g>
      <text x="1500" y="2345" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="196" font-weight="850" fill="#18324A" letter-spacing="7">LAST TOAST</text>
      <text x="1500" y="2555" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="196" font-weight="850" fill="#18324A" letter-spacing="7">ON THE COAST</text>
    `)
  },
  {
    name: "sf-local-drop-05-coastal-cowgirl-social-club-scallop-shell.png",
    svg: svgWrap(`
      <g transform="translate(1500 1250)">
        <path d="M0 -520 C-370 -520 -690 -230 -735 160 C-745 250 -690 305 -610 305 L610 305 C690 305 745 250 735 160 C690 -230 370 -520 0 -520 Z" fill="#F7F1E3"/>
        <g stroke="#D2B48C" stroke-width="22" stroke-linecap="round">
          <path d="M0 -475 L0 285"/>
          <path d="M-165 -448 L-120 285"/>
          <path d="M165 -448 L120 285"/>
          <path d="M-320 -375 L-235 285"/>
          <path d="M320 -375 L235 285"/>
          <path d="M-470 -255 L-350 285"/>
          <path d="M470 -255 L350 285"/>
        </g>
        <polygon points="370,-40 440,-10 520,-20 470,40 490,120 420,80 350,120 370,40 320,-20 400,-10" fill="#00A8B5"/>
      </g>
      <text x="1500" y="2360" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="168" font-weight="850" fill="#18324A" letter-spacing="10">COASTAL COWGIRL</text>
      <text x="1500" y="2560" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="148" font-weight="760" fill="#7A654C" letter-spacing="14">SOCIAL CLUB</text>
    `)
  }
];

await mkdir(outputDir, { recursive: true });

for (const design of designs) {
  const outPath = path.join(outputDir, design.name);
  const png = await sharp(Buffer.from(design.svg)).png().toBuffer();
  await writeFile(outPath, png);
  console.log(outPath);
}
