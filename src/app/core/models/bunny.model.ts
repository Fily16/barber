// ==================== BUNNY STREAM MODELS ====================

export interface BunnyVideoResponse {
  guid: string;
  title: string;
  dateUploaded: string;
  views: number;
  isPublic: boolean;
  length: number; // Duración en segundos
  status: number; // 0=created, 1=uploaded, 2=processing, 3=transcoding, 4=finished, 5=error, 6=uploading
  framerate: number;
  width: number;
  height: number;
  availableResolutions: string;
  thumbnailCount: number;
  encodeProgress: number;
  storageSize: number;
  hasMP4Fallback: boolean;
  collectionId: string;
  thumbnailFileName: string;
  averageWatchTime: number;
  totalWatchTime: number;
  category: string;
}

export interface BunnyVideoListResponse {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  items: BunnyVideoResponse[];
}

export interface BunnyUploadUrlResponse {
  videoId: string;
  uploadUrl: string;
  libraryId: string;
  authorizationSignature: string;
  authorizationExpire: number;
  embedUrl: string;
  thumbnailUrl: string;
  directPlayUrl: string;
}

export interface BunnyVideoUrls {
  videoId: string;
  embedUrl: string;
  directPlayUrl: string;
  thumbnailUrl: string;
}

// Estados del video en Bunny
export const BunnyVideoStatus: { [key: number]: string } = {
  0: 'Creado',
  1: 'Subido',
  2: 'Procesando',
  3: 'Transcodificando',
  4: 'Listo',
  5: 'Error',
  6: 'Subiendo'
};

// Helper para verificar si el video está listo
export function isBunnyVideoReady(status: number): boolean {
  return status === 4;
}

// Helper para formatear duración de segundos a MM:SS o HH:MM:SS
export function formatBunnyDuration(seconds: number): string {
  if (!seconds || seconds === 0) return '00:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
