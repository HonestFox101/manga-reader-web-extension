import Emittery from "emittery";

export interface Page {
  url: string;
  size?: { width: number; height: number };
  cachBlob?: Blob;
}

export type MangaMetaEvent = { pageChanged: Page[] };

export interface MangaMeta {
  readonly pages: Page[];
  readonly pageCount: number;
  readonly loaded: boolean;
  readonly episodeName: string;
  readonly events: Pick<
    Emittery<MangaMetaEvent>,
    "on" | "off" | "once" | "emit"
  >;
  readonly loadImage: (pageIndex: number) => Promise<Blob | null>;
}
