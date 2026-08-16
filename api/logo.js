import { imageAssetHandler } from "./_asset.js";

export const config = { api: { bodyParser: false } };

export default imageAssetHandler({
  prefix: "logos",
  keyCol: "logo_key",
  typeCol: "logo_content_type",
  flag: "hasLogo",
  emptyReason: "no_logo",
});
