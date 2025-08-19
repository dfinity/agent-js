import { docsSchema } from "@astrojs/starlight/schema";
import type { z } from "astro/zod";

export type Frontmatter = Partial<
  z.infer<ReturnType<ReturnType<typeof docsSchema>>>
>;
