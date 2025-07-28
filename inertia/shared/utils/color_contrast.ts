/**
 * Color contrast utilities for WCAG compliance
 */

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0

  if (0 <= h && h < 60) {
    r = c
    g = x
    b = 0
  } else if (60 <= h && h < 120) {
    r = x
    g = c
    b = 0
  } else if (120 <= h && h < 180) {
    r = 0
    g = c
    b = x
  } else if (180 <= h && h < 240) {
    r = 0
    g = x
    b = c
  } else if (240 <= h && h < 300) {
    r = x
    g = 0
    b = c
  } else if (300 <= h && h < 360) {
    r = c
    g = 0
    b = x
  }

  r = Math.round((r + m) * 255)
  g = Math.round((g + m) * 255)
  b = Math.round((b + m) * 255)

  return [r, g, b]
}

/**
 * Calculate relative luminance
 * @see https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Parse HSL string (e.g., "30 75% 34%") to numbers
 */
function parseHsl(hslString: string): { h: number; s: number; l: number } {
  const parts = hslString.trim().split(/\s+/)
  return {
    h: Number.parseFloat(parts[0]),
    s: Number.parseFloat(parts[1].replace('%', '')),
    l: Number.parseFloat(parts[2].replace('%', '')),
  }
}

/**
 * Calculate contrast ratio between two colors
 * @see https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
export function getContrastRatio(color1: string, color2: string): number {
  const hsl1 = parseHsl(color1)
  const hsl2 = parseHsl(color2)

  const rgb1 = hslToRgb(hsl1.h, hsl1.s, hsl1.l)
  const rgb2 = hslToRgb(hsl2.h, hsl2.s, hsl2.l)

  const lum1 = getLuminance(...rgb1)
  const lum2 = getLuminance(...rgb2)

  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)

  return (brightest + 0.05) / (darkest + 0.05)
}

/**
 * Check if contrast ratio meets WCAG AA standard
 */
export function meetsWCAG_AA(
  contrastRatio: number,
  fontSize: 'normal' | 'large' = 'normal'
): boolean {
  // Large text: 18pt (24px) or 14pt (18.66px) bold
  return fontSize === 'large' ? contrastRatio >= 3 : contrastRatio >= 4.5
}

/**
 * Check if contrast ratio meets WCAG AAA standard
 */
export function meetsWCAG_AAA(
  contrastRatio: number,
  fontSize: 'normal' | 'large' = 'normal'
): boolean {
  return fontSize === 'large' ? contrastRatio >= 4.5 : contrastRatio >= 7
}

/**
 * Get WCAG compliance level
 */
export function getWCAGLevel(
  contrastRatio: number,
  fontSize: 'normal' | 'large' = 'normal'
): 'AAA' | 'AA' | 'Fail' {
  if (meetsWCAG_AAA(contrastRatio, fontSize)) return 'AAA'
  if (meetsWCAG_AA(contrastRatio, fontSize)) return 'AA'
  return 'Fail'
}

/**
 * Format contrast ratio for display
 */
export function formatContrastRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`
}

/**
 * Get contrast recommendation
 */
export function getContrastRecommendation(ratio: number): string {
  if (ratio >= 7) return '✅ Excellent contrast for all text sizes'
  if (ratio >= 4.5) return '✅ Good for normal text, excellent for large text'
  if (ratio >= 3) return '⚠️ Only suitable for large text (18pt+)'
  return '❌ Insufficient contrast for accessibility'
}

/**
 * Test color combination
 */
export interface ColorContrastResult {
  ratio: number
  formattedRatio: string
  normalText: {
    aa: boolean
    aaa: boolean
  }
  largeText: {
    aa: boolean
    aaa: boolean
  }
  recommendation: string
}

export function testColorContrast(foreground: string, background: string): ColorContrastResult {
  const ratio = getContrastRatio(foreground, background)

  return {
    ratio,
    formattedRatio: formatContrastRatio(ratio),
    normalText: {
      aa: meetsWCAG_AA(ratio, 'normal'),
      aaa: meetsWCAG_AAA(ratio, 'normal'),
    },
    largeText: {
      aa: meetsWCAG_AA(ratio, 'large'),
      aaa: meetsWCAG_AAA(ratio, 'large'),
    },
    recommendation: getContrastRecommendation(ratio),
  }
}
