import { HttpsCertConfig } from '../../src/impl/https_cert_config';
import fs from 'fs'
import GLogger from '../../src/common/logger';
import OssClient from 'ali-oss';
import Pop from '@alicloud/pop-core';

const fetch = require('node-fetch')
GLogger.setLogger(console)

jest.mock('@alicloud/pop-core')

jest.mock('node-fetch')

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}))

jest.mock('ali-oss')

describe('HttpsCertConfig', () => {

  describe('getCertKeyContent', () => {
    test('certKey starts with -', async () => {
      const certKey = '-test'

      const result = await HttpsCertConfig.getCertKeyContent(certKey)
      expect(result).toBe(certKey)
    })

    test('certKey starts with https://', async () => {
      (fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          text: () => Promise.resolve('https://test'),
        })
      );
      const certKey = 'https://test'

      const result = await HttpsCertConfig.getCertKeyContent(certKey)
      expect(result).toBe(certKey)
    })

    test('certKey is test', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('test')
      const certKey = 'test'

      const result = await HttpsCertConfig.getCertKeyContent(certKey)
      expect(result).toBe(certKey)
    })

    test('certKey starts with oss://,and not meeting the rules', () => {
      const certKey = 'oss://test'

      expect(async () => {
        await HttpsCertConfig.getCertKeyContent(certKey)
      }).rejects.toThrowError(`${certKey} does not meet expectations, e.g: oss://oss-cn-hangzhou/bucketName/objectName`)
    })

    test('certKey starts with oss://,and ops is {}', () => {
      const certKey = 'oss://test/bucketName/objectName'

      expect(async () => {
        await HttpsCertConfig.getCertKeyContent(certKey)
      }).rejects.toThrowError('You need to enter a key to get the content of OSS')
    })

    test('certKey starts with oss://,and meet all conditions', async () => {
      (OssClient as jest.Mock).mockImplementation(() => {
        return {
          get: jest.fn().mockImplementation(() => ({
            content: 'test',
          })),
        }
      })
      const certKey = 'oss://test/bucketName/objectName'
      const ops = {
        credentials: {
          AccountID: 'test',
          AccessKeyID: 'test',
          AccessKeySecret: 'test'
        }
      }

      const result = await HttpsCertConfig.getCertKeyContent(certKey, ops)
      expect(result).toEqual('test')
    })
  })

  describe('getUserCertificateDetail', () => {
    test('ops is empty object', () => {
      expect(async () => {
        await HttpsCertConfig.getUserCertificateDetail(1, {})
      }).rejects.toThrowError('You need to enter a key to get the information of the certificate')
    })

    test('should throw error when privateKey is null', async () => {
      (Pop as jest.Mock).mockImplementation(() => {
        return {
          request: async () => {
            return {
              RequestId: 'test'
            }
          }
        }
      })
      const ops = {
        credentials: {
          AccountID: 'test',
          AccessKeyID: 'test',
          AccessKeySecret: 'test',
          securityToken: 'test'
        }
      }
      expect(async () => {
        await HttpsCertConfig.getUserCertificateDetail(1, ops)
      }).rejects.toThrowError(`Key information not found according to certId: 1, DescribeUserCertificateDetail RequestId is: test`,)
    })

    test('should return result is success', async () => {
      (Pop as jest.Mock).mockImplementation(() => {
        return {
          request: async () => {
            return {
              RequestId: 'test1',
              Key: 'key1',
              Cert: 'test'
            }
          }
        }
      })
      const ops = {
        credentials: {
          AccountID: 'test',
          AccessKeyID: 'test',
          AccessKeySecret: 'test',
          securityToken: 'test'
        }
      }
      const result = await HttpsCertConfig.getUserCertificateDetail(1, ops)

      expect(result).toEqual({
        privateKey: 'key1',
        certificate: 'test',
        certName: 'cret-1'
      })
    })
  })

  describe('getCertContent', () => { 
    it('should get cert content', async () => {
      const certConfig = {
        privateKey: '-test',
        certName: 'test',
        certificate: '-test2'
      }

      const result = await HttpsCertConfig.getCertContent(certConfig)

      expect(result).toEqual({
        privateKey: '-test',
        certName: 'test',
        certificate: '-test2'
      })
    })
   })
})