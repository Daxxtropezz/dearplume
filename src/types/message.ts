export type Message = {
  id: string;
  title: string;
  message: string;
  createdAt: number;
  updatedAt: number;
  photo?: Blob;
  music?: Blob;
  musicName?: string;
  /** Canonical YouTube or Spotify track URL; no audio is downloaded. */
  musicLink?: string;
};
export type MessageBackup = Omit<Message, "photo" | "music"> & { photoDataUrl?: string; musicDataUrl?: string };
