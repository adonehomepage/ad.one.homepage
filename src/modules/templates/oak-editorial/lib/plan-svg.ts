/** HTML 시안과 동일한 평형 개념도 SVG (이미지 미업로드 시) */
const LAYOUTS: Record<string, Array<[number, number, number, number, string]>> = {
  "59A": [
    [40, 40, 150, 130, "침실 1"],
    [190, 40, 80, 70, "욕실 1"],
    [270, 40, 110, 70, "현관"],
    [380, 40, 140, 130, "침실 2"],
    [40, 170, 150, 165, "침실 3"],
    [190, 110, 190, 90, "주방 · 식당"],
    [190, 200, 190, 135, "거실"],
    [380, 170, 70, 80, "욕실 2"],
    [450, 170, 70, 80, "수납"],
    [380, 250, 140, 85, "드레스룸"],
  ],
  "84A": [
    [40, 40, 140, 140, "침실 1"],
    [180, 40, 80, 75, "욕실 1"],
    [260, 40, 100, 75, "현관"],
    [360, 40, 160, 140, "침실 2"],
    [40, 180, 140, 155, "침실 3"],
    [180, 115, 180, 85, "주방 · 식당"],
    [180, 200, 180, 135, "거실"],
    [360, 180, 80, 85, "욕실 2"],
    [440, 180, 80, 85, "수납"],
    [360, 265, 160, 70, "드레스룸"],
  ],
  "84B": [
    [40, 40, 150, 125, "침실 1"],
    [190, 40, 80, 80, "욕실 1"],
    [270, 40, 100, 80, "현관"],
    [370, 40, 150, 125, "침실 2"],
    [40, 165, 150, 170, "거실"],
    [190, 120, 180, 110, "주방 · 식당"],
    [370, 165, 150, 170, "침실 3"],
    [190, 230, 100, 105, "알파공간"],
    [290, 230, 80, 105, "욕실 2"],
  ],
  "110A": [
    [40, 40, 135, 130, "침실 1"],
    [175, 40, 90, 80, "욕실 1"],
    [265, 40, 120, 80, "현관"],
    [385, 40, 135, 130, "침실 2"],
    [40, 170, 135, 165, "침실 3"],
    [175, 120, 210, 90, "주방 · 식당"],
    [175, 210, 135, 125, "거실"],
    [310, 210, 75, 125, "욕실 2"],
    [385, 170, 135, 165, "침실 4"],
  ],
};

export function oakPlanSvg(type: string): string {
  const rooms = LAYOUTS[type] ?? LAYOUTS["84A"];
  return (
    `<svg viewBox="0 0 560 430" role="img" aria-label="${type} 타입 가상 공간 개념도">` +
    `<g fill="none" stroke="#403a34" stroke-width="2">` +
    rooms.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`).join("") +
    `<rect x="40" y="335" width="480" height="42"/><rect x="40" y="40" width="480" height="337" stroke-width="4"/></g>` +
    `<g fill="#403a34" text-anchor="middle">` +
    rooms
      .map(
        ([x, y, w, h, label]) =>
          `<text x="${x + w / 2}" y="${y + h / 2 + 6}" style="font-size:16px">${label}</text>`,
      )
      .join("") +
    `<text x="280" y="362" style="font-size:14px">발코니</text>` +
    `<text x="280" y="411" style="font-size:12px;letter-spacing:2px">${type} / CONCEPT ONLY — NOT TO SCALE</text></g></svg>`
  );
}

export function oakDefaultLocationMapSvg(): string {
  return `<svg viewBox="0 0 600 500" role="img" aria-label="현장과 가상의 역, 공원, 학교를 보여주는 입지 개념도"><defs><pattern id="oak-mapgrid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" fill="none" stroke="#403a34" opacity=".15"/></pattern></defs><rect width="600" height="500" fill="url(#oak-mapgrid)"/><path d="M-20 390L620 150M120-20L420 520" fill="none" stroke="#f6f1eb" stroke-width="44"/><path d="M-20 390L620 150M120-20L420 520" fill="none" stroke="#403a34" stroke-width="1"/><circle cx="300" cy="255" r="145" fill="none" stroke="#403a34" stroke-dasharray="4 8"/><rect x="220" y="205" width="160" height="80" fill="#403a34"/><text x="300" y="240" text-anchor="middle" style="fill:#f6f1eb;font-size:13px">노을정원 하버포레</text><text x="300" y="263" text-anchor="middle" class="map-small" style="fill:#f6f1eb">SAMPLE</text><circle cx="125" cy="330" r="7" fill="#403a34"/><text x="70" y="365">인근역</text><circle cx="425" cy="130" r="7" fill="#403a34"/><text x="390" y="105">중앙공원</text><circle cx="440" cy="350" r="7" fill="#403a34"/><text x="400" y="387">인근초교</text><text x="24" y="35" class="map-small">ILLUSTRATIVE MAP / NOT TO SCALE</text><path d="M555 60V25M548 36L555 25L562 36" fill="none" stroke="#403a34"/><text x="550" y="83" class="map-small">N</text></svg>`;
}
