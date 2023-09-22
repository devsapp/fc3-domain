import { IInputs } from '@serverless-devs/component-interface';
import * as _ from 'lodash';
import GLogger from '../common/logger';
import FCClient, * as $fc20230330 from '@alicloud/fc20230330';
import * as $OpenApi from '@alicloud/openapi-client';
import { ICredentials } from '@serverless-devs/component-interface';
import { diffConvertPlanYaml, diffConvertYaml } from '@serverless-devs/diff';
import { parseArgv } from '@serverless-devs/utils';
import { promptForConfirmOrDetails, promptForConfirmOK, sleep } from './util';
import { CustomDomain } from './custom_domain';
import { IRegion, checkRegion } from './region';

export enum FC_API_ERROR_CODE {
  DomainNameNotFound = 'DomainNameNotFound', // 自定义域名不存在
  DomainNameAlreadyExists = 'DomainNameAlreadyExists', // 自定义域名已存在
}

const FC_DEPLOY_RETRY_COUNT = 3;
const FC_CLIENT_CONNECT_TIMEOUT: number =
  parseInt(process.env.FC_CLIENT_CONNECT_TIMEOUT || '5') * 1000;
const FC_CLIENT_READ_TIMEOUT: number = parseInt(process.env.FC_CLIENT_READ_TIMEOUT || '10') * 1000;

export class Domain {
  region: IRegion;
  readonly fc20230330Client: FCClient;
  yes: boolean = false;
  customDomain: CustomDomain;

  constructor(readonly inputs: IInputs, readonly credentials: ICredentials) {
    const opts = parseArgv(inputs.args, {
      alias: { help: 'h', 'assume-yes': 'y' },
      boolean: ['help', 'y'],
      string: ['region', 'domain-name'],
    });
    this.region = opts.region || _.get(inputs, 'props.region');
    checkRegion(this.region);

    const domainName = opts['domain-name'] || _.get(inputs, 'props.domainName');
    if (_.isEmpty(domainName)) {
      throw new Error('domainName not specified, please specify --domain-name');
    }

    _.set(inputs, 'props.region', this.region);
    _.set(inputs, 'props.domainName', domainName);

    const {
      AccountID: accountID,
      AccessKeyID: accessKeyId,
      AccessKeySecret: accessKeySecret,
      SecurityToken: securityToken,
    } = credentials;

    const endpoint = `${accountID}.${this.region}.fc.aliyuncs.com`;
    const protocol = 'https';

    const config = new $OpenApi.Config({
      accessKeyId,
      accessKeySecret,
      securityToken,
      protocol,
      endpoint,
      readTimeout: FC_CLIENT_READ_TIMEOUT,
      connectTimeout: FC_CLIENT_CONNECT_TIMEOUT,
      userAgent: 'serverless-devs',
    });

    this.fc20230330Client = new FCClient(config);
    this.yes = !!opts.y;

    this.customDomain = new CustomDomain(inputs, credentials);
  }

  getProps = (): any => {
    return this.customDomain.getProps();
  };

  getDomainName = (): string => {
    return this.customDomain.getDomainName();
  };

  public async deploy(): Promise<void> {
    this.customDomain.checkPropsValid();
    const logger = GLogger.getLogger();
    await this.preDeploy();

    if (!this.yes) {
      logger.debug('Detection does not require deployment of custom domain, skipping deployment');
      return;
    }
    let needUpdate = false;
    try {
      await this.getCustomDomain();
      needUpdate = true;
    } catch (err) {
      if (err.code !== FC_API_ERROR_CODE.DomainNameNotFound) {
        logger.debug(
          `Checking domain ${this.getDomainName()} error: ${err.message}, retrying create`,
        );
      }
    }

    const autoCnameCheck = await this.customDomain.cnameCheck();
    let retry = 0;
    let retryTime = 3;
    let maxRetryCount = FC_DEPLOY_RETRY_COUNT;

    // 如果域名是 auto, 并且使用相同 region cname check 为 false,  重试次数拉长
    if (autoCnameCheck) {
      maxRetryCount = 10;
    }

    while (true) {
      try {
        if (!needUpdate) {
          logger.debug(`Need create custom domain ${this.getDomainName()}`);
          try {
            await this.createCustomDomain();
            return;
          } catch (ex) {
            logger.debug(`Create custom domain error: ${ex.message}`);
            if (ex.code !== FC_API_ERROR_CODE.DomainNameAlreadyExists) {
              throw ex;
            }
            logger.debug('Create custom domain already exists, retry update');
            needUpdate = true;
          }
        }
        logger.debug(`Update custom domain ${this.getDomainName()} ...`);
        await this.updateCustomDomain();
        break;
      } catch (ex) {
        logger.debug(`Deploy custom domain error: ${ex}`);

        if (retry > maxRetryCount) {
          throw ex;
        }
        retry += 1;

        logger.spin(
          'retrying',
          'custom-domain',
          needUpdate ? 'update' : 'create',
          `${this.region}/${this.getDomainName()}`,
          retry,
        );
        await sleep(retryTime);
      }
    }
  }

  public async remove(): Promise<void> {
    await this.customDomain.tryHandleAutoDomain();
    const logger = GLogger.getLogger();
    logger.write(`Remove custom domain: ${this.getDomainName()}`);
    console.log();
    if (this.yes) {
      await this.fc20230330Client.deleteCustomDomain(this.getDomainName());
      logger.debug(`delete custom domain ${(this, this.getDomainName())} success`);
      return;
    }
    const msg = `Do you want to delete this custom domain ${this.getDomainName()}`;
    if (await promptForConfirmOrDetails(msg)) {
      await this.fc20230330Client.deleteCustomDomain(this.getDomainName());
      logger.debug(`delete custom domain ${(this, this.getDomainName())} success`);
    }
  }

  public async info(): Promise<any> {
    await this.customDomain.tryHandleAutoDomain();
    let r = await this.getCustomDomain();
    _.unset(r, 'certConfig');
    return r;
  }

  public async plan(): Promise<void> {
    this.customDomain.checkPropsValid();
    await this.customDomain.tryHandleAutoDomain();
    const logger = GLogger.getLogger();
    const { remote, local } = await this.getLocalRemote();
    const customDomainConfig = diffConvertPlanYaml(remote, local, { deep: 1, complete: true });

    let showDiff = `
region: ${this.region}
function:
${customDomainConfig.show}
`;
    logger.write(showDiff);
  }

  private async preDeploy(): Promise<void> {
    const logger = GLogger.getLogger();
    await this.customDomain.tryHandleAutoDomain();
    const { remote, local } = await this.getLocalRemote();
    if (!remote) {
      // remote 不存在
      this.yes = true;
      return;
    }
    const { diffResult, show } = diffConvertYaml(remote, local);

    logger.debug(`diff result: ${JSON.stringify(diffResult)}`);
    logger.debug(`diff show:\n${show}`);

    // 没有差异，直接部署
    if (_.isEmpty(diffResult)) {
      this.yes = true;
      return;
    }
    logger.write(
      `CustomDomain ${local.domainName} was changed, please confirm before deployment:\n`,
    );
    logger.write(show);
    // 用户指定了 --yes 或者 --no-yes，不再交互
    if (this.yes) {
      return;
    }
    logger.write(
      `\n* You can also specify to use local configuration through --yes/-y during deployment`,
    );

    const message = `Deploy it with local config or skip deploy custom domain?`;
    this.yes = await promptForConfirmOK(message);
  }

  private async getLocalRemote(): Promise<any> {
    const logger = GLogger.getLogger();
    let remote = {};
    try {
      remote = await this.getCustomDomain();
    } catch (ex) {
      logger.debug(`Get remote custom domain config error: ${ex.message}`);
      if (ex.code === FC_API_ERROR_CODE.DomainNameNotFound) {
        remote = {};
      }
    }
    // local 填充 default 值
    let local = _.cloneDeep(this.getProps());
    local.domainName = this.getDomainName();
    if (_.isEmpty(local.wafConfig)) {
      local.wafConfig = { enableWAF: false };
    }
    let routes = _.get(_.get(local, 'routeConfig'), 'routes');
    for (const key in routes) {
      const val = routes[key];
      if (_.isEmpty(val.qualifier)) {
        val.qualifier = 'LATEST';
      }
    }
    local['certConfig'] = await this.customDomain.getICertConfig();
    _.unset(local['certConfig'], 'privateKey');
    _.unset(local['certConfig'], 'certificate');
    _.unset(remote['certConfig'], 'certificate');
    if (local['certConfig'] === null) {
      _.unset(local, 'certConfig');
    }

    return { remote, local };
  }

  private async getCustomDomain(): Promise<any> {
    //const logger = GLogger.getLogger();
    const result = await this.fc20230330Client.getCustomDomain(this.getDomainName());
    const body = result.toMap().body;

    if (_.isEmpty(body.tlsConfig)) {
      _.unset(body, 'tlsConfig');
    }
    if (_.isEmpty(body.certConfig)) {
      _.unset(body, 'certConfig');
    }
    if (_.isEmpty(body.authConfig)) {
      _.unset(body, 'authConfig');
    }
    if (_.isEmpty(body.wafConfig)) {
      _.unset(body, 'wafConfig');
    }
    const r = _.omit(body, ['accountId', 'apiVersion', 'createdTime', 'lastModifiedTime']);
    return r;
  }

  private async createCustomDomain(): Promise<void> {
    const logger = GLogger.getLogger();
    let createCustomDomainInput = new $fc20230330.CreateCustomDomainInput({
      domainName: this.getDomainName(),
      protocol: _.get(this.getProps(), 'protocol'),
    });

    if (_.get(this.getProps(), 'certConfig')) {
      createCustomDomainInput.certConfig = await this.customDomain.getCertConfig();
    }
    if (_.get(this.getProps(), 'routeConfig')) {
      createCustomDomainInput.routeConfig = this.customDomain.getRouteConfig();
    }
    if (_.get(this.getProps(), 'tlsConfig')) {
      createCustomDomainInput.tlsConfig = this.customDomain.getTLSConfig();
    }
    if (_.get(this.getProps(), 'authConfig')) {
      createCustomDomainInput.authConfig = this.customDomain.getAuthConfig();
    }
    if (_.get(this.getProps(), 'wafConfig')) {
      createCustomDomainInput.wafConfig = this.customDomain.getWafConfig();
    }
    logger.debug(
      `createCustomDomain inputs ==>\n${JSON.stringify(createCustomDomainInput.toMap())}`,
    );

    let createCustomDomainRequest = new $fc20230330.CreateCustomDomainRequest({
      body: createCustomDomainInput,
    });
    await this.fc20230330Client.createCustomDomain(createCustomDomainRequest);
    logger.debug(`createCustomDomain ${this.getDomainName()} success`);
  }

  private async updateCustomDomain(): Promise<void> {
    const logger = GLogger.getLogger();
    let updateCustomDomainInput = new $fc20230330.UpdateCustomDomainInput({
      protocol: _.get(this.getProps(), 'protocol'),
    });

    if (_.get(this.getProps(), 'certConfig')) {
      updateCustomDomainInput.certConfig = await this.customDomain.getCertConfig();
    }
    if (_.get(this.getProps(), 'routeConfig')) {
      updateCustomDomainInput.routeConfig = this.customDomain.getRouteConfig();
    }
    if (_.get(this.getProps(), 'tlsConfig')) {
      updateCustomDomainInput.tlsConfig = this.customDomain.getTLSConfig();
    }
    if (_.get(this.getProps(), 'authConfig')) {
      updateCustomDomainInput.authConfig = this.customDomain.getAuthConfig();
    }
    if (_.get(this.getProps(), 'wafConfig')) {
      updateCustomDomainInput.wafConfig = this.customDomain.getWafConfig();
    }

    logger.debug(
      `updateCustomDomain inputs ==>\n${JSON.stringify(updateCustomDomainInput.toMap())}`,
    );

    let updateCustomDomainRequest = new $fc20230330.UpdateCustomDomainRequest({
      body: updateCustomDomainInput,
    });
    await this.fc20230330Client.updateCustomDomain(this.getDomainName(), updateCustomDomainRequest);
    logger.debug(`updateCustomDomain ${this.getDomainName()} success`);
  }
}
