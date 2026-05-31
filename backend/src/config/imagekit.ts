import ImageKit from 'imagekit';
import { env } from './env';

export function hasImageKitConfig(): boolean {
  return Boolean(
    env.IMAGEKIT_PUBLIC_KEY &&
    env.IMAGEKIT_PRIVATE_KEY &&
    env.IMAGEKIT_URL_ENDPOINT
  );
}

export function getImageKitClient(): ImageKit | null {
  if (!hasImageKitConfig()) return null;

  return new ImageKit({
    publicKey: env.IMAGEKIT_PUBLIC_KEY as string,
    privateKey: env.IMAGEKIT_PRIVATE_KEY as string,
    urlEndpoint: env.IMAGEKIT_URL_ENDPOINT as string,
  });
}

export const imageKitFolder = env.IMAGEKIT_FOLDER;
