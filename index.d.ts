import { type QueryClient } from "@tanstack/react-query";

declare global {
	interface BeforeInstallPromptEvent extends Event {
		readonly platforms: string[];
		readonly userChoice: Promise<{
			outcome: "accepted" | "dismissed";
			platform: string;
		}>;
		prompt(): Promise<void>;
	}

	interface Window {
		/**
		 * Allows the Chrome devtools extension to work
		 * @see https://chromewebstore.google.com/detail/tanstack-query-devtools/annajfchloimdhceglpgglpeepfghfai
		 */
		__TANSTACK_QUERY_CLIENT__: QueryClient;
	}

	interface WindowEventMap {
		beforeinstallprompt: BeforeInstallPromptEvent;
	}
}
