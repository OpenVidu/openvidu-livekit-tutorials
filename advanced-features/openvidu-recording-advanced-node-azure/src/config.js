export const SERVER_PORT = process.env.SERVER_PORT || 6080;
export const APP_NAME = "openvidu-recording-advanced-node";

// LiveKit configuration
export const LIVEKIT_URL = process.env.LIVEKIT_URL || "http://localhost:7880";
export const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
export const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "secret";

// Azure Blob Storage configuration
export const AZURE_ACCOUNT_NAME = process.env.AZURE_ACCOUNT_NAME || "your_account_name";
export const AZURE_ACCOUNT_KEY = process.env.AZURE_ACCOUNT_KEY || "your_account_key";
export const AZURE_CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME || "openvidu-appdata";
export const AZURE_ENDPOINT = process.env.AZURE_ENDPOINT || `https://${AZURE_ACCOUNT_NAME}.blob.core.windows.net`;

export const RECORDINGS_PATH = process.env.RECORDINGS_PATH ?? "recordings/";
export const RECORDINGS_METADATA_PATH = ".metadata/";
export const RECORDING_PLAYBACK_STRATEGY = process.env.RECORDING_PLAYBACK_STRATEGY || "AZURE"; // PROXY or S3
export const RECORDING_FILE_PORTION_SIZE = 5 * 1024 * 1024; // 5MB
