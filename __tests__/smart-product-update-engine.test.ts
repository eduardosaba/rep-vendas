import { ALLOWED_TARGET_FIELDS } from '@/domain/commercial/smart-update-parsers';

describe('Smart Product Update Engine Governance Rules', () => {
  it('deve permitir apenas os campos da whitelist na V1 (is_active e price)', () => {
    const fields = Object.keys(ALLOWED_TARGET_FIELDS);
    expect(fields).toContain('is_active');
    expect(fields).toContain('price');
    expect(fields).not.toContain('image_url');
    expect(fields).not.toContain('user_id');
    expect(fields).not.toContain('organization_id');
    expect(fields).not.toContain('name');
  });
});
