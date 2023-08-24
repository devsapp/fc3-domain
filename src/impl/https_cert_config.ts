import OssClient from 'ali-oss';
// import path from 'path';
import { ICredentials } from '@serverless-devs/component-interface';
import GLogger from '../common/logger';
import * as _ from 'lodash';
const fs = require('fs');
import Pop from '@alicloud/pop-core';
const fetch = require('node-fetch');

interface Opt {
  credentials?: ICredentials;
}

export interface ICertConfig {
  privateKey: string;
  certificate: string;
  certName: string;
}

export class HttpsCertConfig {
  static async getCertContent(certConfig: any, opt?: Opt): Promise<ICertConfig> {
    const { certificate, privateKey, certName } = certConfig;
    const privateContent = await this.getCertKeyContent(privateKey, opt);
    const certContent = await this.getCertKeyContent(certificate, opt);

    return {
      certName,
      certificate: certContent,
      privateKey: privateContent,
    };
  }

  static async getCertKeyContent(certKey: string = '', opt: Opt = {}): Promise<string> {
    // 支持直接传递：-----BEGIN RSA PRIVATE KEY---- sdddfdf----END RSA PRIVATE KEY-----
    if (certKey.startsWith('-')) {
      return certKey.trim();
    }

    // 支持 http:// 和 https://
    if (certKey.startsWith('http://') || certKey.startsWith('https://')) {
      return await this.getHttpContent(certKey);
    }

    // 支持 oss oss://${region}/bucketName/objectName
    if (certKey.startsWith('oss://')) {
      return await this.getOSSContent(certKey, opt);
    }
    return fs.readFileSync(certKey).toString().trim();
  }

  static async getUserCertificateDetail(certId: number, opt: Opt = {}): Promise<ICertConfig> {
    const logger = GLogger.getLogger();
    const { credentials } = opt;
    if (_.isEmpty(credentials)) {
      throw new Error('You need to enter a key to get the information of the certificate');
    }
    const { AccessKeyID, AccessKeySecret, SecurityToken } = credentials;
    const client = new Pop({
      accessKeyId: AccessKeyID,
      accessKeySecret: AccessKeySecret,
      // @ts-ignore
      securityToken: SecurityToken, // use STS Token
      endpoint: 'https://cas.aliyuncs.com',
      apiVersion: '2018-07-13',
    });
    const {
      Key: privateKey,
      Cert: certificate,
      RequestId,
    } = await client.request<any>(
      'DescribeUserCertificateDetail',
      { CertId: certId },
      { method: 'POST' },
    );
    logger.debug(`Get User Certificate Details RequestId: ${RequestId || ''}`);
    if (_.isEmpty(privateKey)) {
      throw new Error(
        `Key information not found according to certId: ${certId}, DescribeUserCertificateDetail RequestId is: ${
          RequestId || ''
        }`,
      );
    }
    return { privateKey, certificate, certName: `cret-${certId}` };
  }

  private static async getOSSContent(certKey: string, opt: Opt): Promise<string> {
    const logger = GLogger.getLogger();
    // get oss client options
    const ossPath = certKey.substring(6);
    logger.debug(`ossPath: ${ossPath}`);
    const [region, bucketName, ...objectNameArr] = _.split(ossPath, '/');
    const objectName = objectNameArr.join('/');
    logger.debug(`oss config: ${region}, ${bucketName}, ${objectName}`);
    if (!(region && bucketName && objectName)) {
      throw new Error(
        `${certKey} does not meet expectations, e.g: oss://oss-cn-hangzhou/bucketName/objectName`,
      );
    }
    const ossRegion = region.startsWith('oss-') ? region : `oss-${region}`;

    // gen oss client
    const { credentials } = opt;
    if (_.isEmpty(credentials)) {
      throw new Error('You need to enter a key to get the content of OSS');
    }
    const { AccessKeyID, AccessKeySecret, SecurityToken } = credentials;
    const ossClient = new OssClient({
      accessKeyId: AccessKeyID,
      accessKeySecret: AccessKeySecret,
      stsToken: SecurityToken,
      region: ossRegion,
      bucket: bucketName,
    });
    return (await ossClient.get(objectName))?.content?.toString();
  }

  private static async getHttpContent(certKeyUrl: string) {
    return (await fetch(certKeyUrl)).text();
  }
}
