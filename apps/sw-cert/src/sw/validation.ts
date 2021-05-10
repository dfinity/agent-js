import {
  blobFromUint8Array,
  blobToUint8Array,
  Cbor as cbor,
  Certificate,
  HashTree,
  HttpAgent,
  lookupPathEx,
  reconstruct,
  Principal, hashTreeToString,
} from "@dfinity/agent";

/**
 * Validate whether a body is properly certified.
 * @param canisterId The canister ID that provided the resource.
 * @param path The path of the resource requested to be validated (including the prefix `/`).
 * @param body An asset body, as it appears on the HTTP response (not decoded)
 * @param certificate The certificate to validate the .
 * @param tree The merkle tree returned by the canister.
 * @param agent A JavaScript agent that can validate certificates.
 * @returns True if the body is valid.
 */
export async function validateBody(
  canisterId: Principal,
  path: string,
  body: ArrayBuffer,
  certificate: ArrayBuffer,
  tree: ArrayBuffer,
  agent: HttpAgent,
): Promise<boolean> {
  const cert = new Certificate({ certificate: blobFromUint8Array(new Uint8Array(certificate)) }, agent);
  // Make sure the certificate is valid.
  if (!(await cert.verify())) {
    return false;
  }

  const hashTree: HashTree = cbor.decode(new Uint8Array(tree));
  const reconstructed = await reconstruct(hashTree);
  const witness = cert.lookupEx(["canister", blobToUint8Array(canisterId.toBlob()), "certified_data"]);

  if (!witness) {
    throw new Error('Could not find certified data for this canister in the certificate.');
  }

  // First validate that the Tree is as good as the certification.
  if (!equal(witness, reconstructed)) {
    console.error('Witness != Tree passed in ic-certification');
    return false;
  }

  // Next, calculate the SHA of the content.
  const sha = await crypto.subtle.digest("SHA-256", body);
  const treeSha = lookupPathEx(["http_assets", path], hashTree);

  // First check if treeSha is not undefined.
  if (!treeSha) {
    console.log('treeSha undefined??');
    console.log(hashTreeToString(hashTree));
    console.log(path);
  }

  return !!treeSha && equal(sha, treeSha);
}

function equal(buf1: ArrayBuffer, buf2: ArrayBuffer): boolean {
  if (buf1.byteLength !== buf2.byteLength) {
    return false;
  }

  const a1 = new Uint8Array(buf1);
  const a2 = new Uint8Array(buf2);
  for (let i = 0; i < a1.length; i++) {
    if (a1[i] != a2[i]) {
      return false;
    }
  }

  return true;
}
