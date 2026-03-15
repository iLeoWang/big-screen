const clamp = (value: number, min: number, max: number): number => {
    if (value < min) return min;
    if (value > max) return max;
    return value;
};

export const hexToRgba = (hex: string, alpha: number): string => {
    const safeAlpha = clamp(alpha, 0, 1);
    const normalized = hex.replace("#", "").trim();
    const parsedHex =
        normalized.length === 3
            ? normalized
                  .split("")
                  .map((char) => `${char}${char}`)
                  .join("")
            : normalized;

    if (!/^[\da-fA-F]{6}$/.test(parsedHex)) {
        return hex;
    }

    const r = Number.parseInt(parsedHex.slice(0, 2), 16);
    const g = Number.parseInt(parsedHex.slice(2, 4), 16);
    const b = Number.parseInt(parsedHex.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
};

export { clamp };
