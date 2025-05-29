import type { ProtocolWithReturn } from "webext-bridge";

declare module "webext-bridge" {
  export interface ProtocolMap {
    // define message protocol types
    // see https://github.com/antfu/webext-bridge#type-safe-protocols
    "just-cors": ProtocolWithReturn<
      { url: string; returnType: "text" | "base64"; init?: RequestInit },
      { data: string }
    >;
  }
}
