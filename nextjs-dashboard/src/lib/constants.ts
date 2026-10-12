// Public R2 bucket host. The site worker (gpuprice.becloudready.com) does not serve
// these paths, so data must be read from the bucket's own domain.
export const DATA_BASE_URL =
  process.env.NEXT_PUBLIC_DATA_BASE_URL ?? "https://freellm.org";

export const DATA_URL = `${DATA_BASE_URL}/latest/all.json`;
export const META_URL = `${DATA_BASE_URL}/latest/meta.json`;
export const HISTORY_BASE_URL = `${DATA_BASE_URL}/history`;

export const ITEMS_PER_PAGE = 10;
