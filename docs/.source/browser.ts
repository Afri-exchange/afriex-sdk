// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"getting-started.mdx": () => import("../content/getting-started.mdx?collection=docs"), "index.mdx": () => import("../content/index.mdx?collection=docs"), "api/balance.mdx": () => import("../content/api/balance.mdx?collection=docs"), "api/checkout.mdx": () => import("../content/api/checkout.mdx?collection=docs"), "api/customers.mdx": () => import("../content/api/customers.mdx?collection=docs"), "api/index.mdx": () => import("../content/api/index.mdx?collection=docs"), "api/payment-methods.mdx": () => import("../content/api/payment-methods.mdx?collection=docs"), "api/rates.mdx": () => import("../content/api/rates.mdx?collection=docs"), "api/transactions.mdx": () => import("../content/api/transactions.mdx?collection=docs"), "api/webhooks.mdx": () => import("../content/api/webhooks.mdx?collection=docs"), }),
};
export default browserCollections;