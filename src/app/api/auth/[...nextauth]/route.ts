// обязательно Node runtime
export const runtime = 'nodejs';
// и чтобы не кэшировалось
export const dynamic = 'force-dynamic';

import { handlers } from "@/lib/auth";

// стандартный shim — как и было
export const { GET, POST } = handlers;
