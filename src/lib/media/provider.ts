import { CloudinaryMediaProvider } from "./cloudinary";
import type { MediaProvider } from "./types";
export function getMediaProvider(): MediaProvider { return new CloudinaryMediaProvider(); }
