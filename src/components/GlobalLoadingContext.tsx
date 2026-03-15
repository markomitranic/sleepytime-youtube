"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

type GlobalLoadingContextValue = {
	isLoading: boolean;
	setLoading: (key: string, loading: boolean) => void;
};

const GlobalLoadingContext = createContext<GlobalLoadingContextValue | null>(
	null,
);

export function GlobalLoadingProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [keys, setKeys] = useState<Set<string>>(() => new Set());

	const setLoading = useCallback((key: string, loading: boolean) => {
		setKeys((prev) => {
			const next = new Set(prev);
			if (loading) next.add(key);
			else next.delete(key);
			return next;
		});
	}, []);

	const value = useMemo(
		() => ({ isLoading: keys.size > 0, setLoading }),
		[keys.size, setLoading],
	);

	return (
		<GlobalLoadingContext.Provider value={value}>
			{children}
		</GlobalLoadingContext.Provider>
	);
}

/**
 * Imperatively control the global loading indicator via a key-based registry.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { setLoading } = useGlobalLoadingApi();
 *
 *   async function handleSave() {
 *     setLoading("save-item-123", true);
 *     try {
 *       await saveItem();
 *     } finally {
 *       setLoading("save-item-123", false);
 *     }
 *   }
 * }
 * ```
 */
export function useGlobalLoadingApi() {
	const ctx = useContext(GlobalLoadingContext);
	if (!ctx)
		throw new Error(
			"useGlobalLoadingApi must be used within GlobalLoadingProvider",
		);
	return ctx;
}

/**
 * Declaratively sync a reactive boolean into the global loading indicator.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isFetching } = useQuery({ queryKey: ["items"], queryFn: fetchItems });
 *   useGlobalLoading("fetch-items", isFetching);
 * }
 * ```
 */
export function useGlobalLoading(key: string, isLoading: boolean) {
	const ctx = useContext(GlobalLoadingContext);
	if (!ctx)
		throw new Error(
			"useGlobalLoading must be used within GlobalLoadingProvider",
		);

	useEffect(() => {
		ctx.setLoading(key, isLoading);
		return () => ctx.setLoading(key, false);
	}, [ctx, key, isLoading]);
}
