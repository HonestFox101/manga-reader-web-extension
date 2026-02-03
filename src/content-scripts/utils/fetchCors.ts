import { sendMessage } from "webext-bridge/content-script";

/**
 * 绕过禁止跨域HTTP的请求，在Content Script中使用
 */
export async function fetchCors(
  url: string,
  returnType: "text",
  init?: RequestInit,
): Promise<string>;
export async function fetchCors(
  url: string,
  returnType: "base64",
  init?: RequestInit,
): Promise<string>;
export async function fetchCors(
  url: string,
  returnType: "text" | "base64",
  init?: RequestInit,
): Promise<string> {
  const { data } = await sendMessage("just-cors", { url, returnType, init }, "background");
  return data;
}
