/**
 * Standard ISO/IEC 18004 QR Code Matrix Generator (Byte Mode, Error Correction Level L).
 * Supports versions 1 to 6 automatically based on payload length (up to 134 bytes).
 * Produces a 2D boolean matrix (`true` = dark module, `false` = light module)
 * that can be scanned by any smartphone camera or QR scanner.
 */

interface VersionSpec {
  version: number;
  size: number;
  totalCodewords: number;
  ecCodewordsPerBlock: number;
  numBlocks: number;
  alignmentCenters: number[];
}

const VERSION_SPECS: readonly VersionSpec[] = [
  {
    version: 1,
    size: 21,
    totalCodewords: 26,
    ecCodewordsPerBlock: 7,
    numBlocks: 1,
    alignmentCenters: [],
  },
  {
    version: 2,
    size: 25,
    totalCodewords: 44,
    ecCodewordsPerBlock: 10,
    numBlocks: 1,
    alignmentCenters: [6, 18],
  },
  {
    version: 3,
    size: 29,
    totalCodewords: 70,
    ecCodewordsPerBlock: 15,
    numBlocks: 1,
    alignmentCenters: [6, 22],
  },
  {
    version: 4,
    size: 33,
    totalCodewords: 100,
    ecCodewordsPerBlock: 20,
    numBlocks: 1,
    alignmentCenters: [6, 26],
  },
  {
    version: 5,
    size: 37,
    totalCodewords: 134,
    ecCodewordsPerBlock: 26,
    numBlocks: 1,
    alignmentCenters: [6, 30],
  },
  {
    version: 6,
    size: 41,
    totalCodewords: 172,
    ecCodewordsPerBlock: 18,
    numBlocks: 2,
    alignmentCenters: [6, 34],
  },
];

// GF(256) log/exp tables with primitive polynomial 0x11D
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]!;
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[(GF_LOG[a]! + GF_LOG[b]!) % 255]!;
}

function getGeneratorPolynomial(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i]!;
    for (let j = 0; j < poly.length; j++) {
      next[j] = (next[j] ?? 0) ^ poly[j]!;
      next[j + 1] = (next[j + 1] ?? 0) ^ gfMul(poly[j]!, factor);
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomon(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = getGeneratorPolynomial(ecLen);
  const msg = new Uint8Array(data.length + ecLen);
  msg.set(data, 0);

  for (let i = 0; i < data.length; i++) {
    const coef = msg[i]!;
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] = (msg[i + j] ?? 0) ^ gfMul(gen[j]!, coef);
      }
    }
  }

  return msg.slice(data.length);
}

export function generateQrMatrix(text: string): boolean[][] {
  const utf8Bytes = new TextEncoder().encode(text || "RPI-ABSEN-2026");

  // Pick smallest version that fits utf8Bytes in Byte mode (4 bits mode + 8 bits len + 8*N + 4 bits terminator)
  const spec =
    VERSION_SPECS.find((s) => {
      const dataCapacity =
        s.totalCodewords - s.ecCodewordsPerBlock * s.numBlocks;
      return utf8Bytes.length + 2 <= dataCapacity;
    }) ?? VERSION_SPECS[VERSION_SPECS.length - 1]!;

  const dataCodewordsCount =
    spec.totalCodewords - spec.ecCodewordsPerBlock * spec.numBlocks;

  // Build bit stream
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  // Byte mode indicator (0100)
  pushBits(0b0100, 4);
  // Character count (8 bits for versions 1-9 in byte mode)
  const payloadBytes = utf8Bytes.slice(0, dataCodewordsCount - 2);
  pushBits(payloadBytes.length, 8);

  for (const b of payloadBytes) {
    pushBits(b, 8);
  }

  // Terminator (up to 4 zero bits)
  const maxBits = dataCodewordsCount * 8;
  const terminatorLen = Math.min(4, maxBits - bits.length);
  pushBits(0, terminatorLen);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Pad codewords alternating 0xEC and 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < maxBits) {
    pushBits(padBytes[padIdx % 2]!, 8);
    padIdx++;
  }

  const dataCodewords = new Uint8Array(dataCodewordsCount);
  for (let i = 0; i < dataCodewordsCount; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | (bits[i * 8 + b] ?? 0);
    }
    dataCodewords[i] = byteVal;
  }

  // Split into blocks and compute EC
  const blockSize = Math.floor(dataCodewordsCount / spec.numBlocks);
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];

  for (let b = 0; b < spec.numBlocks; b++) {
    const start = b * blockSize;
    const block = dataCodewords.slice(start, start + blockSize);
    dataBlocks.push(block);
    ecBlocks.push(computeReedSolomon(block, spec.ecCodewordsPerBlock));
  }

  // Interleave data and EC codewords
  const finalCodewords: number[] = [];
  for (let i = 0; i < blockSize; i++) {
    for (let b = 0; b < spec.numBlocks; b++) {
      finalCodewords.push(dataBlocks[b]![i]!);
    }
  }
  for (let i = 0; i < spec.ecCodewordsPerBlock; i++) {
    for (let b = 0; b < spec.numBlocks; b++) {
      finalCodewords.push(ecBlocks[b]![i]!);
    }
  }

  // Initialize matrix
  const size = spec.size;
  const modules: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false),
  );
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false),
  );

  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r]![c] = dark;
      isFunction[r]![c] = true;
    }
  };

  // Finder patterns + separators
  const drawFinder = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = top + dr;
        const c = left + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter =
          dr >= 0 &&
          dr <= 6 &&
          dc >= 0 &&
          dc <= 6 &&
          (dr === 0 || dr === 6 || dc === 0 || dc === 6);
        const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunctionModule(r, c, inOuter || inInner);
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  const centers = spec.alignmentCenters;
  for (const rCenter of centers) {
    for (const cCenter of centers) {
      // Skip if overlapping finder patterns
      if (
        (rCenter === 6 && cCenter === 6) ||
        (rCenter === 6 && cCenter === size - 7) ||
        (rCenter === size - 7 && cCenter === 6)
      ) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark =
            Math.max(Math.abs(dr), Math.abs(dc)) === 2 ||
            (dr === 0 && dc === 0);
          setFunctionModule(rCenter + dr, cCenter + dc, dark);
        }
      }
    }
  }

  // Dark module
  setFunctionModule(size - 8, 8, true);

  // Reserve format info areas
  for (let i = 0; i <= 8; i++) {
    if (!isFunction[8]![i]) setFunctionModule(8, i, false);
    if (!isFunction[i]![8]) setFunctionModule(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8]![size - 1 - i]) setFunctionModule(8, size - 1 - i, false);
    if (!isFunction[size - 1 - i]![8]) setFunctionModule(size - 1 - i, 8, false);
  }

  // Place data bits in upward/downward 2-column zig-zag
  const allBits: number[] = [];
  for (const cw of finalCodewords) {
    for (let b = 7; b >= 0; b--) {
      allBits.push((cw >>> b) & 1);
    }
  }

  let bitIdx = 0;
  let upward = true;
  for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5; // Skip vertical timing line
    for (let vert = 0; vert < size; vert++) {
      const r = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const c = rightCol - j;
        if (!isFunction[r]![c]) {
          const darkBit = bitIdx < allBits.length ? allBits[bitIdx] === 1 : false;
          bitIdx++;
          // Apply Mask 0: (r + c) % 2 === 0
          const maskInvert = (r + c) % 2 === 0;
          modules[r]![c] = darkBit !== maskInvert;
        }
      }
    }
    upward = !upward;
  }

  // Write Format Information for Level L (01) and Mask 0 (000) -> precomputed BCH bits = 0x77c4
  const formatBits = 0x77c4;
  const getFormatBit = (idx: number) => ((formatBits >>> idx) & 1) === 1;

  // Around top-left finder
  for (let i = 0; i <= 5; i++) setFunctionModule(8, i, getFormatBit(i));
  setFunctionModule(8, 7, getFormatBit(6));
  setFunctionModule(8, 8, getFormatBit(7));
  setFunctionModule(7, 8, getFormatBit(8));
  for (let i = 9; i < 15; i++) setFunctionModule(14 - i, 8, getFormatBit(i));

  // Around top-right and bottom-left finders
  for (let i = 0; i < 8; i++) {
    setFunctionModule(8, size - 1 - i, getFormatBit(i));
  }
  for (let i = 8; i < 15; i++) {
    setFunctionModule(size - 15 + i, 8, getFormatBit(i));
  }

  return modules;
}
