import { docsSchema } from '@astrojs/starlight/schema';
import { type StarlightUserConfig } from '@astrojs/starlight/types';
import type { z } from 'astro/zod';

export type Frontmatter = Partial<z.infer<ReturnType<ReturnType<typeof docsSchema>>>>;

export type Sidebar = StarlightUserConfig['sidebar'];
