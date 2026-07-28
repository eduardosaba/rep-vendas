'use server';

import { SetupDemoService } from '../../../dev/setup-demo/setup-demo-service';
import { assertDevelopmentEnvironment } from '../../../dev/safety-guard';

export async function generateDemoEnvironment() {
  assertDevelopmentEnvironment();
  return await SetupDemoService.runSetup();
}
