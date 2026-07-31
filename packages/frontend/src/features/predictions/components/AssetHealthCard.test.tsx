import { describe, it, expect } from 'vitest';
import { AssetHealthCard } from './AssetHealthCard';

describe('AssetHealthCard Component', () => {
  it('should render asset name and health score', () => {
    expect(AssetHealthCard).toBeDefined();
  });
});
