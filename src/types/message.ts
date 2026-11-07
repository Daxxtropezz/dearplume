/** Locally stored original image. Each picture has a stable selection ID. */
export type MessagePhoto = { id: string; blob: Blob; name?: string };
export const MAX_NOTE_PHOTOS = 8;
export const MAX_LOCAL_PHOTO_BYTES = 6_000_000;
export const MAX_TOTAL_LOCAL_PHOTO_BYTES = 24_000_000;
export type Message = {
  id: string;
  title: string;
  message: string;
  createdAt: number;
  updatedAt: number;
  /** Legacy v0.1.8 single photo; still readable without a migration. */
  photo?: Blob;
  /** Ordered image collection for v0.1.9 and later. */
  photos?: MessagePhoto[];
  /** ID of the image that gets the ASCII treatment first. */
  mainPhotoId?: string;
  music?: Blob;
  musicName?: string;
  musicLink?: string;
};
export type BackupPhoto = { id: string; photoDataUrl: string; name?: string };
export type MessageBackup = Omit<Message, "photo" | "photos" | "music"> & {
  /** Kept for old JSON backup compatibility. */
  photoDataUrl?: string;
  photos?: BackupPhoto[];
  musicDataUrl?: string;
};
/** A v0.1.8 single photo is automatically presented as the first gallery item. */
export function messagePhotos(note: Message): MessagePhoto[] {
  if (note.photos?.length) return note.photos;
  return note.photo ? [{ id: "legacy-main", blob: note.photo, name: "Original picture" }] : [];
}
export function selectedMainPhoto(note: Message): MessagePhoto | undefined {
  const photos = messagePhotos(note);
  return photos.find((photo) => photo.id === note.mainPhotoId) ?? photos[0];
}
