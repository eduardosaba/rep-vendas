import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import {
  processFullCatalog,
  internalizeSingleImage,
} from '@/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processFullCatalog, internalizeSingleImage],
});
