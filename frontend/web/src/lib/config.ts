/**
 * Centralized Non-Secret Frontend Configuration
 *
 * All runtime parameters have safe, explicit defaults.
 * The application operates cleanly without requiring .env or .env.local files.
 */

export const FRONTEND_CONFIG = {
  /** Backend API proxy target (used for Next.js server-side rewrites and direct API calls) */
  apiUrl:
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://api-atlas.progeni.live'
      : 'http://127.0.0.1:5000'),

  /** Base origin URL for companion app / pairing links */
  publicBaseUrl:
    process.env.NEXT_PUBLIC_PUBLIC_BASE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),

  /** MediaPipe Face Landmarker model asset path */
  mediaPipeFaceModelUrl:
    process.env.NEXT_PUBLIC_MEDIAPIPE_FACE_MODEL_URL ||
    '/mediapipe/models/face_landmarker.task',

  /** Remote image allowed hostnames */
  allowedImageHosts: (process.env.ALLOWED_IMAGE_HOSTS || 'res.cloudinary.com,app.progeni.live')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
} as const;

export default FRONTEND_CONFIG;
