/**
 * Parse a string of line numbers and ranges into an array of line numbers.
 * Accepts formats like "1, 3, 5-10" and returns an array of numbers.
 * Invalid inputs are filtered out.
 */
export function parseLineNumbers(input: string): number[] {
  if (!input.trim()) {
    return [];
  }

  if (!/^[\d,\s-]*$/.test(input)) {
    return [];
  }

  return input
    .split(/[,\s]+/)
    .flatMap((part) => {
      const range = part.trim().split("-");
      if (range.length === 2) {
        const start = parseInt(range[0]);
        const end = parseInt(range[1]);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          return Array.from({ length: end - start + 1 }, (_, i) => start + i);
        }
      }
      return parseInt(part);
    })
    .filter((n) => !isNaN(n) && n > 0);
}
