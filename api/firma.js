import { imageAssetHandler } from "./_asset.js";

export const config = { api: { bodyParser: false } };

export default imageAssetHandler({
  prefix: "firmas",
  keyCol: "firma_key",
  typeCol: "firma_content_type",
  flag: "hasFirma",
  emptyReason: "no_firma",
});
