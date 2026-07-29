import { getBlockDisplayName } from './node';

describe('getBlockDisplayName', () => {
  it('should return the _name when it exists', () => {
    const data = { _name: 'My Block', _type: 'Box', tag: 'section' };
    expect(getBlockDisplayName(data)).toBe('My Block');
  });

  it('should return the formatted tag name for Box type when tag is not div', () => {
    const data = { _type: 'Box', tag: 'section' };
    expect(getBlockDisplayName(data)).toBe('Section');
  });

  it('should not return tag name for Box type when tag is div', () => {
    const data = { _type: 'Box', tag: 'div' };
    expect(getBlockDisplayName(data)).toBe('Box');
  });

  it('should return the type name when no _name or special handling is needed', () => {
    const data = { _type: 'Custom/Button' };
    expect(getBlockDisplayName(data)).toBe('Button');
  });

  it('should handle Box type with no tag', () => {
    const data = { _type: 'Box' };
    expect(getBlockDisplayName(data)).toBe('Box');
  });

  it('should handle empty data object', () => {
    expect(getBlockDisplayName({})).toBe('');
  });

  it('should handle null or undefined input', () => {
    expect(getBlockDisplayName(null as any)).toBe('');
    expect(getBlockDisplayName(undefined as any)).toBe('');
  });
});
