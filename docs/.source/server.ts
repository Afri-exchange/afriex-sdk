// @ts-nocheck
import * as __fd_glob_11 from "../content/api/webhooks.mdx?collection=docs"
import * as __fd_glob_10 from "../content/api/transactions.mdx?collection=docs"
import * as __fd_glob_9 from "../content/api/rates.mdx?collection=docs"
import * as __fd_glob_8 from "../content/api/payment-methods.mdx?collection=docs"
import * as __fd_glob_7 from "../content/api/index.mdx?collection=docs"
import * as __fd_glob_6 from "../content/api/customers.mdx?collection=docs"
import * as __fd_glob_5 from "../content/api/checkout.mdx?collection=docs"
import * as __fd_glob_4 from "../content/api/balance.mdx?collection=docs"
import * as __fd_glob_3 from "../content/index.mdx?collection=docs"
import * as __fd_glob_2 from "../content/getting-started.mdx?collection=docs"
import { default as __fd_glob_1 } from "../content/api/meta.json?collection=docs"
import { default as __fd_glob_0 } from "../content/meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docs("docs", "content", {"meta.json": __fd_glob_0, "api/meta.json": __fd_glob_1, }, {"getting-started.mdx": __fd_glob_2, "index.mdx": __fd_glob_3, "api/balance.mdx": __fd_glob_4, "api/checkout.mdx": __fd_glob_5, "api/customers.mdx": __fd_glob_6, "api/index.mdx": __fd_glob_7, "api/payment-methods.mdx": __fd_glob_8, "api/rates.mdx": __fd_glob_9, "api/transactions.mdx": __fd_glob_10, "api/webhooks.mdx": __fd_glob_11, });