const KEY = 'w4nd3r3r_m0unt41n_tr41ls_g30rg14';

export function encodeMapData(data) {
  const json = JSON.stringify(data);
  const bytes = Buffer.from(json, 'utf-8');
  const encoded = Buffer.alloc(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    encoded[i] = bytes[i] ^ KEY.charCodeAt(i % KEY.length);
  }
  return encoded.toString('base64');
}
