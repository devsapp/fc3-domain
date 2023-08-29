import { IInputs } from '@serverless-devs/component-interface';
import * as _ from 'lodash';
import GLogger from '../common/logger';
import * as $fc20230330 from '@xi-liu/fc20230330';
import { ICredentials } from '@serverless-devs/component-interface';
import { HttpsCertConfig, ICertConfig } from './https_cert_config';
import AutoDomainGenerator from '@serverless-cd/srm-aliyun-fc-domain';
import { resolveCname } from './util';

export class CustomDomain {
  input: IInputs;
  region: string;
  yes: boolean;
  domainName: string;

  constructor(input: IInputs, readonly credentials: ICredentials) {
    this.input = input;
    this.region = this.input.props.region;
    _.unset(this.input.props, 'region');
    this.domainName = _.get(this.getProps(), 'domainName');
    this.checkPropsValid();
  }

  public async tryHandleAutoDomain() {
    const logger = GLogger.getLogger();
    if (_.isEmpty(this.domainName)) {
      throw new Error('custom domain config must contain domainName');
    }
    if (!this.isAutoDomain()) {
      return;
    }

    // 取第一个 path 中的 functionName
    const functionName = this.getProps()['routeConfig']['routes'][0]['functionName'];
    const userId = this.credentials.AccountID;

    let autoDomainName = `${functionName}.fcV3.${userId}.${this.region}.fc.devsapp.net`;
    const isResolve = await resolveCname(autoDomainName, logger);
    if (isResolve) {
      this.domainName = autoDomainName;
      return;
    }

    // 调用后端下发域名逻辑
    let params = {
      type: 'fc',
      user: userId,
      region: this.region,
      service: 'fcV3',
      function: functionName,
    };
    this.domainName = await AutoDomainGenerator.genDomain(params, this.credentials);
    if (autoDomainName != this.domainName) {
      logger.warn(`genDomain ${this.domainName} != ${autoDomainName}`);
    }
    logger.info(`auto generate a new domain = ${this.domainName}`);
  }

  public async cnameCheck(): Promise<boolean> {
    if (this.isAutoDomain()) {
      return await AutoDomainGenerator.checkCname(this.getDomainName());
    }
    return true;
  }

  public isAutoDomain(): boolean {
    let domainName = _.get(this.getProps(), 'domainName');
    return domainName.toLowerCase() === 'auto';
  }

  public getProps(): any {
    return this.input.props;
  }

  public getDomainName(): string {
    return this.domainName;
  }

  public async getICertConfig(): Promise<ICertConfig> {
    const originCertConfig = _.get(this.getProps(), 'certConfig');
    if (originCertConfig) {
      let config: ICertConfig;
      const certId = _.get(originCertConfig, 'certId');
      if (certId) {
        config = await HttpsCertConfig.getUserCertificateDetail(certId, {
          credentials: this.credentials,
        });
      } else {
        config = await HttpsCertConfig.getCertContent(originCertConfig, {
          credentials: this.credentials,
        });
      }
      return config;
    }
    return null;
  }

  public async getCertConfig(): Promise<$fc20230330.CertConfig> {
    const config = await this.getICertConfig();
    if (config !== null) {
      return new $fc20230330.CertConfig(config);
    }
    return null;
  }

  public getRouteConfig(): $fc20230330.RouteConfig {
    const logger = GLogger.getLogger();
    let routes: $fc20230330.PathConfig[] = [];
    let inputRoutes = _.get(this.getProps(), 'routeConfig').routes;
    for (const key in inputRoutes) {
      const val = inputRoutes[key];
      logger.debug(`${key}: ${JSON.stringify(val)}`);
      let path = new $fc20230330.PathConfig({
        functionName: _.get(val, 'functionName'),
        methods: _.get(val, 'methods'),
        path: _.get(val, 'path'),
        qualifier: _.get(val, 'qualifier', 'LATEST'),
      });
      if (_.get(val, 'rewriteConfig')) {
        let rewriteConfig = new $fc20230330.RewriteConfig({});
        const rewriteC = _.get(val, 'rewriteConfig');
        const eRs = _.get(rewriteC, 'equalRules');
        const rRs = _.get(rewriteC, 'regexRules');
        const wRs = _.get(rewriteC, 'wildcardRules');
        if (eRs) {
          let newERs: $fc20230330.EqualRule[] = [];
          for (const key in eRs) {
            const eR = eRs[key];
            logger.debug(`${key}: ${JSON.stringify(eR)}`);
            newERs.push(
              new $fc20230330.EqualRule({
                match: eR['match'],
                replacement: eR['replacement'],
              }),
            );
          }
          rewriteConfig.equalRules = newERs;
        }
        if (rRs) {
          let newRRs: $fc20230330.RegexRule[] = [];
          for (const key in rRs) {
            const rR = rRs[key];
            logger.debug(`${key}: ${JSON.stringify(rR)}`);
            newRRs.push(
              new $fc20230330.RegexRule({
                match: rR['match'],
                replacement: rR['replacement'],
              }),
            );
          }
          rewriteConfig.regexRules = newRRs;
        }
        if (wRs) {
          let newWRs: $fc20230330.WildcardRule[] = [];
          for (const key in wRs) {
            const wR = wRs[key];
            logger.debug(`${key}: ${JSON.stringify(wR)}`);
            newWRs.push(
              new $fc20230330.WildcardRule({
                match: wR['match'],
                replacement: wR['replacement'],
              }),
            );
          }
          rewriteConfig.wildcardRules = newWRs;
        }
        path.rewriteConfig = rewriteConfig;
      }
      routes.push(path);
    }
    return new $fc20230330.RouteConfig({ routes: routes });
  }

  public getAuthConfig(): $fc20230330.AuthConfig {
    const originAuthConfig = _.get(this.getProps(), 'authConfig');
    if (originAuthConfig) {
      return new $fc20230330.AuthConfig({
        authInfo: originAuthConfig.authInfo,
        authType: originAuthConfig.authType,
      });
    }
    return null;
  }

  public getTLSConfig(): $fc20230330.TLSConfig {
    const originTLSConfig = _.get(this.getProps(), 'tlsConfig');
    if (originTLSConfig) {
      return new $fc20230330.TLSConfig({
        cipherSuites: originTLSConfig.cipherSuites,
        maxVersion: originTLSConfig.maxVersion,
        minVersion: originTLSConfig.minVersion,
      });
    }
    return null;
  }

  public getWafConfig(): $fc20230330.WAFConfig {
    const originWAFConfig = _.get(this.getProps(), 'wafConfig');
    if (originWAFConfig) {
      return new $fc20230330.WAFConfig({
        enableWAF: originWAFConfig['enableWAF'],
      });
    }
    return null;
  }

  public checkPropsValid(): void {
    const data = this.getProps();
    if (!('domainName' in data && 'protocol' in data && 'routeConfig' in data)) {
      throw new Error(
        'custom domain config must contain domainName, protocol and routeConfig simultaneously',
      );
    }
    const originCertConfig = _.get(this.getProps(), 'certConfig');
    if (originCertConfig && originCertConfig.certId === undefined) {
      if (
        !(
          'certName' in originCertConfig &&
          'certificate' in originCertConfig &&
          'privateKey' in originCertConfig
        )
      ) {
        throw new Error(
          'certConfig must contain certName, certificate and privateKey simultaneously',
        );
      }
    }
  }
}
