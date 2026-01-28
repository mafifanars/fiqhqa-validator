import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string) {
  if (!name) return "";
  const names = name.split(' ');
  if (names.length === 1) return names[0].slice(0, 2).toUpperCase();
  const initials = names.map(n => n[0]).join('').toUpperCase();
  return initials.slice(0, 2);
}

/**
 * Generates all unique combinations of a specified size from an array.
 * @param array - The input array of elements.
 * @param size - The size of each combination.
 * @returns An array of arrays, where each inner array is a unique combination.
 */
export function combinations<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  function backtrack(startIndex: number, currentCombination: T[]) {
    if (currentCombination.length === size) {
      result.push([...currentCombination]);
      return;
    }
    for (let i = startIndex; i < array.length; i++) {
      currentCombination.push(array[i]);
      backtrack(i + 1, currentCombination);
      currentCombination.pop();
    }
  }
  backtrack(0, []);
  return result;
}
