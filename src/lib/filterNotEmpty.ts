/**
 * Filters out null and undefined values from an array.
 * Commonly used with .filter() to remove empty values.
 *
 * @example
 * [1, 2, null, undefined].filter(filterNotEmpty);
 * [1, 2]
 */
export function filterNotEmpty<TValue>(
	value: TValue | null | undefined,
): value is TValue {
	return value !== null && value !== undefined;
}
