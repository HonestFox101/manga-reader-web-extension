type RunOnContentScriptParams<R, P extends unknown[]> = {
  func: (...args: P) => R | Promise<R>;
  env?: "content script";
  args?: P;
};

type RunOnBackgroundParams<R, P extends unknown[]> = {
  func: (...args: P) => R | Promise<R>;
  env: "background";
  tabId: number;
  args?: P;
};

/**
 * 在某个网页执行代码，通常用于操控DOM元素
 */
export async function executeOnWebpage<R, P extends unknown[]>(
  params: RunOnContentScriptParams<R, P>
): Promise<R | null>;
export async function executeOnWebpage<R, P extends unknown[]>(
  params: RunOnBackgroundParams<R, P>
): Promise<R | null>;
export async function executeOnWebpage<R, P extends unknown[]>(
  params: RunOnContentScriptParams<R, P> | RunOnBackgroundParams<R, P>
): Promise<R | null> {
  params = { env: "content script", args: [] as unknown as P, ...params };
  let res: R | null = null;
  if (params.env === "background" && params.tabId) {
    const injectResults = await browser.scripting.executeScript({
      func: params.func,
      args: params.args,
      target: { tabId: params.tabId },
    });
    const injectResult = injectResults.pop()!;
    if (!injectResult.error) {
      res = injectResults.pop()!.result as R;
    }
  } else {
    res = await params.func(...(params.args as P));
  }
  return res;
}

/**
 * 从Blob对象获取图片的尺寸
 */
export function getImageSizeFromBlob(
  blob: Blob
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image from Blob"));
    };
    img.src = url;
  });
}

/**
 * base64字符串转Blob
 */
export function base64ToBlob(
  base64: string,
  type: string = "image/webp"
): Blob {
  // 去掉 Base64 字符串的头部信息（data URL）
  const byteCharacters = atob(base64.split(",")[1]); // 只保留数据部分
  const byteNumbers = new Uint8Array(byteCharacters.length);

  // 将 Base64 字符串转换为字节数组
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  // 创建 Blob 对象
  return new Blob([byteNumbers], { type: type });
}

/**
 * Blob转base64字符串
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (reader.result) {
        resolve(reader.result as string); // 确保结果是字符串
      } else {
        reject(new Error("Failed to convert Blob to Base64"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Error reading Blob"));
    };

    reader.readAsDataURL(blob); // 将 Blob 转换为 Base64
  });
}