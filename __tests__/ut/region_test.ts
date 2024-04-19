import {
  checkRegion,
  IRegion,
  RegionList
} from '../../src/impl/region'

describe('checkRegion', () => {
  it('should Error when r is undefind', () => {

    expect(() => checkRegion('' as IRegion)).toThrow('Region not specified, please specify --region');
  });

  it('should throw an error if region is invalid', () => {

    expect(() => checkRegion('invalid-region' as IRegion)).toThrow(`Invalid region, The allowed regions are ${RegionList}`);
  });

  it('should true when r is cn-hangzhou', () => {
    const result = checkRegion('cn-hangzhou');

    expect(result).toBe(true)
  })
});