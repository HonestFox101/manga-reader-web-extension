import Emittery from "emittery";

export interface Page {
  url: string;
  size?: { width: number; height: number };
  cachBlob?: Blob;
}

export type MangaWebPageWorkerEvent = {
  pageUpdated: Page[];
  pageLoaded: { page: Page; index: number };
};

export interface MangaWebPageWorker {
  readonly pages: Page[];
  readonly pageCount: number;
  readonly episodeName: string;

  readonly loaded: boolean;
  readonly events: Pick<
    Emittery<MangaWebPageWorkerEvent>,
    "on" | "off" | "once" | "emit"
  >;

  readonly loadImage: (pageIndex: number) => Promise<Page>;
  readonly bindReaderChannel: (chan: MangaReaderChannel) => void;
}

export type MangaReaderEvent = {
  jump: number | [number, number];
  mangaReaderToggled: boolean;
};

export type MangaReaderChannel = Pick<
  Emittery<MangaReaderEvent>,
  "on" | "off" | "once" | "emit"
>;
