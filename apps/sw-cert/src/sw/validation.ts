import {
  blobFromUint8Array,
  blobToUint8Array,
  Cbor as cbor,
  Certificate,
  HashTree,
  HttpAgent,
  reconstruct,
  Principal, hashTreeToString, blobToHex,
} from "@dfinity/agent";

/**
 * Validate whether a body is properly certified.
 * @param canisterId
 * @param body An asset body, unencoded (not compressed or transformed).
 * @param certificate The certificate to validate the .
 * @param tree The merkle tree returned by the canister.
 * @param agent A JavaScript agent that can validate certificates.
 * @returns True if the body is valid.
 */
export async function validateBody(
  canisterId: Principal,
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

  let isEqual = true;
  const witnessView = new Uint8Array(witness);
  reconstructed.forEach((byte, i) => {
    if (witnessView[i] !== byte) {
      isEqual = false;
    }
  });


  console.log(`Witness ${blobToHex(blobFromUint8Array(new Uint8Array(witness)))} isEqual? ${isEqual}`);

  return isEqual;
}
