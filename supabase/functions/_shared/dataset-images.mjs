// Pictures are distributed in the dataset's GitHub release (MIT); npm omits them.
// Read the ZIP directory once, then fetch only the requested compressed entry.
import { inflateRawSync } from 'node:zlib';

export const datasetReference = (card) => 'storage:dataset/' + card.set + '/' + String(card.number).padStart(3, '0');
export async function retry(operation) {
  for (let attempt = 1; ; attempt++) {
    try { return await operation(); }
    catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
}
async function request(url, headers = {}) {
  return retry(async () => {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
    if (!response.ok) { await response.body?.cancel(); throw new Error(url + ': HTTP ' + response.status); }
    return response;
  });
}
export function createDatasetImageSource() {
  let directory;
  async function open() {
    const release = await (await request('https://api.github.com/repos/flibustier/pokemon-tcg-pocket-database/releases/latest')).json();
    const asset = release.assets.find((item) => item.name === 'dist.zip');
    if (!asset || asset.size < 22) throw new Error('Dataset release has no dist.zip');
    const range = async (start, end) => {
      const response = await request(asset.browser_download_url, { Range: 'bytes=' + start + '-' + end });
      if (response.status !== 206 || response.headers.get('content-range') !== 'bytes ' + start + '-' + end + '/' + asset.size) {
        await response.body?.cancel(); throw new Error('Dataset host did not honor ZIP byte range');
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length !== end - start + 1) throw new Error('Truncated ZIP range');
      return bytes;
    };
    const tail = await range(Math.max(0, asset.size - 65557), asset.size - 1);
    const view = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
    let eocd = tail.length - 22;
    while (eocd >= 0 && (view.getUint32(eocd, true) !== 0x06054b50 || eocd + 22 + view.getUint16(eocd + 20, true) !== tail.length)) eocd--;
    if (eocd < 0) throw new Error('ZIP directory not found');
    const size = view.getUint32(eocd + 12, true), offset = view.getUint32(eocd + 16, true);
    if (size > 16 * 1024 * 1024 || offset + size > asset.size || view.getUint16(eocd + 4, true)) throw new Error('Unsupported ZIP directory');
    const bytes = await range(offset, offset + size - 1);
    const entries = new Map();
    const central = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < bytes.length;) {
      if (central.getUint32(i, true) !== 0x02014b50) throw new Error('Invalid ZIP entry');
      const nameLength = central.getUint16(i + 28, true);
      const name = new TextDecoder().decode(bytes.subarray(i + 46, i + 46 + nameLength));
      entries.set(name, { method: central.getUint16(i + 10, true), compressed: central.getUint32(i + 20, true), size: central.getUint32(i + 24, true), offset: central.getUint32(i + 42, true) });
      i += 46 + nameLength + central.getUint16(i + 30, true) + central.getUint16(i + 32, true);
    }
    return { entries, range };
  }
  return async (card) => {
    directory ??= open();
    const { entries, range } = await directory;
    const entry = [...entries].find(([name]) => name.endsWith('/images/cards/' + card.image) || name === 'images/cards/' + card.image)?.[1];
    if (!entry || entry.size > 2 * 1024 * 1024 || ![0, 8].includes(entry.method)) throw new Error('Missing or unsupported dataset image: ' + card.image);
    const header = await range(entry.offset, entry.offset + 29);
    const local = new DataView(header.buffer, header.byteOffset, header.byteLength);
    if (local.getUint32(0, true) !== 0x04034b50) throw new Error('Invalid ZIP local header');
    const start = entry.offset + 30 + local.getUint16(26, true) + local.getUint16(28, true);
    const compressed = await range(start, start + entry.compressed - 1);
    const image = entry.method === 8 ? new Uint8Array(inflateRawSync(compressed, { maxOutputLength: 2 * 1024 * 1024 })) : compressed;
    if (image.length !== entry.size || new TextDecoder().decode(image.subarray(0, 4)) !== 'RIFF' || new TextDecoder().decode(image.subarray(8, 12)) !== 'WEBP') throw new Error('Invalid WebP: ' + card.image);
    return image;
  };
}
export async function ensureDatasetBucket(client) {
  const { data, error } = await client.storage.listBuckets();
  if (error) throw error;
  const bucket = data.find((item) => item.id === 'card-images');
  if (!bucket || !bucket.public) {
    const settings = { public: true, fileSizeLimit: 2 * 1024 * 1024, allowedMimeTypes: ['image/webp'] };
    const { error } = bucket ? await client.storage.updateBucket('card-images', settings) : await client.storage.createBucket('card-images', settings);
    if (error) throw error;
  }
}
export async function storeDatasetImage(client, card, download, force = false) {
  const reference = datasetReference(card), prefix = reference.slice('storage:'.length);
  const storage = client.storage.from('card-images');
  const { data, error } = await retry(async () => {
    const result = await storage.list(prefix, { limit: 100 });
    if (result.error) throw result.error;
    return result;
  });
  if (error) throw error;
  const missing = ['low', 'high'].filter((quality) => force || !data.some((item) => item.name === quality + '.webp' && item.id));
  if (missing.length) {
    const bytes = await download(card);
    for (const quality of missing) await retry(async () => {
      const { error } = await storage.upload(prefix + '/' + quality + '.webp', bytes, { contentType: 'image/webp', cacheControl: '31536000', upsert: true });
      if (error) throw error;
    });
  }
  return { reference, uploaded: missing.length, already: 2 - missing.length };
}
