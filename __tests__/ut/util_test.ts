import { resolveCname } from '../../src/impl/util';

describe('resolveCname', () => {
    test('should return true if domainName is resolved', async () => {
        const ret = await resolveCname('docs.serverless-devs.com', 'serverless-devs-docs-hongkong.oss-cn-hongkong.aliyuncs.com', console);
        expect(ret).toBe(true);
    });

    test('should return true if domainName is resolved but not equal expected', async () => {
        const ret = await resolveCname('docs.serverless-devs.com', 'no-exist.oss-cn-hongkong.aliyuncs.com', console);
        expect(ret).toBe(false);
    });

    test('should return true if domainName is not resolved', async () => {
        const ret = await resolveCname('no-exit.serverless-devs.com', 'serverless-devs-docs-hongkong.oss-cn-hongkong.aliyuncs.com', console);
        expect(ret).toBe(false);
    });
  }
);
