import type { ProtocolWithReturn } from "webext-bridge";

declare module "webext-bridge" {
  export interface ProtocolMap {
    // define message protocol types
    // see https://github.com/antfu/webext-bridge#type-safe-protocols
    "tab-prev": { title: string | undefined };
    "get-current-tab": ProtocolWithReturn<
      { tabId: number },
      { title?: string }
    >;
    "just-cors": ProtocolWithReturn<
      { url: string; returnType: "text" | "base64"; init?: RequestInit },
      { data: string }
    >;
  }
}
