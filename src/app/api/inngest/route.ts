import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import {
  processFullCatalog,
  internalizeSingleImage,
  cloneCatalog,
  copyImageOnWrite,
  copyBrandImageOnWrite,
  processPendingImages,
} from '@/inngest/functions';

export const { GET, POST } = serve({
  client: inngest,
  functions: [
    processFullCatalog,
    internalizeSingleImage,
    cloneCatalog,
    copyImageOnWrite,
    processPendingImages,
  ],
});
