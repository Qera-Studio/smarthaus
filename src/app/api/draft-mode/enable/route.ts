import { defineEnableDraftMode } from "next-sanity/draft-mode";
import { client } from "../../../../sanity/client";

/**
 * Where the Studio's Presentation tool turns preview on. next-sanity checks
 * the secret the Studio sends against Content Lake with the Viewer token, so
 * only a signed-in editor can enter draft mode; anyone else gets a 401 and the
 * published site.
 */
export const { GET } = defineEnableDraftMode({
  client: client.withConfig({ token: process.env.SANITY_API_TOKEN }),
});
