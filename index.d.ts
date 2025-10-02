import { type QueryClient } from "@tanstack/react-query";

declare global {
  interface Window {

    /**
     * Allows the Chrome devtools extension to work
     * @see https://chromewebstore.google.com/detail/tanstack-query-devtools/annajfchloimdhceglpgglpeepfghfai
     */
    __TANSTACK_QUERY_CLIENT__: QueryClient;
  }
}

export { };