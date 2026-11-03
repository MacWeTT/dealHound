import type { ProductCategory, ProductCondition, ProductSpecs } from '@/domain/types';

const BRANDS = [
  'asus',
  'lenovo',
  'hp',
  'acer',
  'dell',
  'msi',
  'apple',
  'sony',
  'gigabyte',
  'zotac',
  'sapphire',
  'inno3d',
  'samsung',
  'lg',
];

const SERIES_PATTERNS: Array<{ canonical: string; regex: RegExp }> = [
  { canonical: 'tuf gaming a15', regex: /\btuf(?:\s+gaming)?\s+a15\b/i },
  { canonical: 'tuf gaming f15', regex: /\btuf(?:\s+gaming)?\s+f15\b/i },
  { canonical: 'rog strix g16', regex: /\b(?:rog\s+)?strix\s+g16\b/i },
  { canonical: 'loq', regex: /\bloq\b/i },
  { canonical: 'legion 5', regex: /\blegion\s+(?:pro\s+)?5i?\b/i },
  { canonical: 'victus', regex: /\bvictus\b/i },
  { canonical: 'omen', regex: /\bomen\b/i },
  { canonical: 'nitro v', regex: /\bnitro\s+v\b/i },
  { canonical: 'predator helios', regex: /\bpredator\s+helios\b/i },
  { canonical: 'macbook air', regex: /\bmacbook\s+air\b/i },
  { canonical: 'wh-1000xm5', regex: /\bwh[-\s]?1000xm5\b/i },
  { canonical: 'ps5 slim', regex: /\b(?:ps5|playstation\s*5)\s+slim\b/i },
];

const ACCESSORY_REGEX =
  /\b(?:charger|power\s+adapter|ac\s+adapter|power\s+cord|laptop\s+skin|screen\s+guard|screen\s+protector|tempered\s+glass|keyboard\s+cover|keypad\s+cover|cooling\s+pad|laptop\s+bag|laptop\s+sleeve|carrying\s+case|replacement\s+(?:battery|fan|screen|hinge))\b/i;

const MPN_STOP_PREFIXES = /^(?:RTX|GTX|DDR|SSD|FHD|QHD|UHD|WIN|USB|HDMI|WIFI|CORE|RYZEN|NVME|PCIE|GDDR)/i;

export const isAccessoryListing = (text: string): boolean => {
  return ACCESSORY_REGEX.test(text);
};

export const detectCondition = (text: string): ProductCondition => {
  if (/\b(?:renewed|refurbished|pre[-\s]?owned)\b/i.test(text)) {
    return 'refurbished';
  }

  if (/\b(?:open[-\s]?box|unboxed)\b/i.test(text)) {
    return 'open_box';
  }

  return 'new';
};

export const detectCategory = (text: string): ProductCategory | undefined => {
  if (/\b(?:laptop|notebook|macbook|ultrabook|tuf\s+gaming\s+[af]1\d|loq|legion|victus|nitro\s+v)\b/i.test(text)) {
    return 'laptop';
  }

  if (/\b(?:graphics\s+card|video\s+card|geforce\s+rtx\s+\d{4}.*(?:oc|twin\s+edge|windforce|ventus))\b/i.test(text)) {
    return 'gpu';
  }

  if (/\b(?:headphones|earbuds|wh[-\s]?1000xm\d|wf[-\s]?1000xm\d|airpods)\b/i.test(text)) {
    return 'audio';
  }

  if (/\b(?:ps5|playstation\s*5|xbox\s+series)\b/i.test(text)) {
    return 'console';
  }

  if (/\b(?:monitor|oled\s+gaming\s+display)\b/i.test(text)) {
    return 'monitor';
  }

  return undefined;
};

const extractGpuAndScrubVram = (text: string): { gpu?: string; vramGb?: number; scrubbed: string } => {
  let scrubbed = text;
  let vramGb: number | undefined;

  const preGraphicsMatch = scrubbed.match(/\b(\d{1,2})\s*GB\s+(?:GDDR\d+\s+)?(?:Graphics|VRAM)\b/i);

  if (preGraphicsMatch) {
    vramGb = Number(preGraphicsMatch[1]);
    scrubbed = scrubbed.replace(preGraphicsMatch[0], ' ');
  }

  const rtxMatch = scrubbed.match(
    /\b(?:geforce\s+)?(rtx\s+\d{4}(?:\s+(?:ti|super))?|rx\s+\d{4}(?:\s+xt)?)(?:\s+(\d{1,2})\s*gb(?:\s*gddr\d+)?)?/i,
  );

  if (rtxMatch) {
    const gpu = rtxMatch[1].toLowerCase().replace(/\s+/g, ' ').trim();

    if (rtxMatch[2]) {
      vramGb = Number(rtxMatch[2]);
    }

    scrubbed = scrubbed.replace(rtxMatch[0], ' ');

    return { gpu, vramGb, scrubbed };
  }

  const appleSilicon = scrubbed.match(/\bapple\s+(m[234](?:\s+(?:pro|max))?)\b|\b(m[34])\s+chip\b/i);

  if (appleSilicon) {
    const chip = (appleSilicon[1] ?? appleSilicon[2]).toLowerCase().replace(/\s+/g, ' ').trim();

    return { gpu: `apple ${chip}`, vramGb, scrubbed };
  }

  return { vramGb, scrubbed };
};

const extractCpu = (text: string): string | undefined => {
  const ryzen = text.match(/\bryzen\s+([3579])(?:\s+(?:octa|hexa)\s+core)?\s+(\d{4}[a-z]{1,3})\b/i);

  if (ryzen) {
    return `ryzen ${ryzen[1]} ${ryzen[2].toLowerCase()}`;
  }

  const intelCore = text.match(/\bcore\s+(i[3579])[-\s]+(\d{4,5}[a-z]{1,3})\b/i);

  if (intelCore) {
    return `core ${intelCore[1].toLowerCase()} ${intelCore[2].toLowerCase()}`;
  }

  const coreUltra = text.match(/\bcore\s+ultra\s+([579])\s+(\d{3}[a-z]{1,2})\b/i);

  if (coreUltra) {
    return `core ultra ${coreUltra[1]} ${coreUltra[2].toLowerCase()}`;
  }

  const appleChip = text.match(/\b(?:apple\s+)?(m[234](?:\s+(?:pro|max))?)\b/i);

  if (appleChip && /\bmacbook\b/i.test(text)) {
    return `apple ${appleChip[1].toLowerCase().replace(/\s+/g, ' ')}`;
  }

  return undefined;
};

const extractMpn = (text: string): string | undefined => {
  const candidates = text.match(
    /\b[A-Z0-9]{4,10}-[A-Z0-9]{4,10}\b|\b\d{2}[A-Z]{2}\d{3}[A-Z]{2,4}\b|\bM[A-Z0-9]{4}HN\/A\b/gi,
  );

  if (!candidates) {
    return undefined;
  }

  for (const token of candidates) {
    const hasLetter = /[A-Z]/i.test(token);
    const hasDigit = /\d/.test(token);

    if (hasLetter && hasDigit && !MPN_STOP_PREFIXES.test(token)) {
      return token.toUpperCase();
    }
  }

  return undefined;
};

export const extractSpecsFromText = (text: string): ProductSpecs => {
  const lower = text.toLowerCase();
  const brand = BRANDS.find(candidate => {
    return new RegExp(`\\b${candidate}\\b`, 'i').test(lower);
  });

  const seriesEntry = SERIES_PATTERNS.find(entry => {
    const { regex } = entry;

    return regex.test(lower);
  });

  const { gpu, vramGb, scrubbed: afterGpu } = extractGpuAndScrubVram(text);
  let working = afterGpu.replace(/\b\d{1,2}\s*gb\s*gddr\d+\b/gi, ' ');

  let storageGb: number | undefined;
  const tbStorage = working.match(/\b([124])\s*tb(?:\s*(?:ssd|nvme|pcie|hdd))?\b/i);

  if (tbStorage) {
    storageGb = Number(tbStorage[1]) * 1024;
    working = working.replace(tbStorage[0], ' ');
  } else {
    const gbStorage = working.match(/\b(256|512|1024)\s*gb(?:\s*(?:ssd|nvme|pcie|rom|storage))?\b/i);

    if (gbStorage) {
      storageGb = Number(gbStorage[1]);
      working = working.replace(gbStorage[0], ' ');
    }
  }

  let ramGb: number | undefined;
  const explicitRam = working.match(/\b(8|12|16|18|24|32|36|48|64)\s*gb\s*(?:ddr\d|lpddr\d\w*|ram|unified|memory)\b/i);

  if (explicitRam) {
    ramGb = Number(explicitRam[1]);
  } else {
    const standaloneRam = working.match(/\b(16|24|32|48|64)\s*gb\b/i);

    if (standaloneRam) {
      ramGb = Number(standaloneRam[1]);
    }
  }

  const cpu = extractCpu(text);
  const mpn = extractMpn(text);
  const condition = detectCondition(text);

  const specs: ProductSpecs = { condition };

  if (brand) {
    specs.brand = brand;
  }

  if (seriesEntry) {
    specs.series = seriesEntry.canonical;
  }

  if (mpn) {
    specs.mpn = mpn;
  }

  if (cpu) {
    specs.cpu = cpu;
  }

  if (gpu) {
    specs.gpu = gpu;
  }

  if (vramGb !== undefined) {
    specs.vramGb = vramGb;
  }

  if (ramGb !== undefined) {
    specs.ramGb = ramGb;
  }

  if (storageGb !== undefined) {
    specs.storageGb = storageGb;
  }

  return specs;
};
