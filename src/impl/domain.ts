import { IInputs } from '../interface/index';
import * as _ from 'lodash';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import GLogger from '../common/logger';
import FCClient, * as $fc20230330 from '@alicloud/fc20230330';
import * as $OpenApi from '@alicloud/openapi-client';
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
  yes: boolean = false;
  customDomain: CustomDomain;
  private target: string;

  constructor(readonly inputs: IInputs) {
    const opts = parseArgv(inputs.args, {
      alias: { help: 'h', 'assume-yes': 'y' },
      boolean: ['help', 'y'],
      string: ['region', 'domain-name', 'target-dir'],
    });
    this.region = opts.region || _.get(inputs, 'props.region');
    checkRegion(this.region);

    const domainName = opts['domain-name'] || _.get(inputs, 'props.domainName');
    if (_.isEmpty(domainName)) {
      throw new Error('domainName not specified, please specify --domain-name');
    }
    const target = opts['target-dir'];
    if (fs.existsSync(target) && !fs.statSync(target).isDirectory()) {
      throw new Error(`--target-dir "${target}" exists, but is not a directory`);
    }
    this.target = target;

    _.set(inputs, 'props.region', this.region);
    _.set(inputs, 'props.domainName', domainName);

    this.yes = !!opts.y;

    this.customDomain = new CustomDomain(inputs, inputs.credential);
  }

  getFcClient(command: string): FCClient {
    const {
      AccountID: accountID,
      AccessKeyID: accessKeyId,
      AccessKeySecret: accessKeySecret,
      SecurityToken: securityToken,
    } = this.inputs.credential;

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
      userAgent: `${
        this.inputs.userAgent ||
        `Component:fc3-domain;Nodejs:${process.version};OS:${process.platform}-${process.arch}`
      }command:${command}`,
    });
    return new FCClient(config);
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
      await this.getCustomDomain('deploy');
      needUpdate = true;
    } catch (err) {
      if (err.code !== FC_API_ERROR_CODE.DomainNameNotFound) {
        logger.debug(
          `Checking domain ${this.region}/${this.getDomainName()} error: ${
            err.message
          }, retrying create`,
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
          logger.debug(`Need create custom domain ${this.region}/${this.getDomainName()}`);
          try {
            await this.createCustomDomain();
            let r = await this.getCustomDomain('deploy');
            _.unset(r, 'certConfig');
            return r;
          } catch (ex) {
            logger.debug(`Create custom domain error: ${ex.message}`);
            if (ex.code !== FC_API_ERROR_CODE.DomainNameAlreadyExists) {
              throw ex;
            }
            logger.debug('Create custom domain already exists, retry update');
            needUpdate = true;
          }
        }
        logger.debug(`Update custom domain ${this.region}/${this.getDomainName()} ...`);
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

    const c = await this.getCustomDomain('deploy');
    _.unset(c, 'certConfig');
    const r = _.merge(
      {
        region: this.region,
      },
      c,
    );
    return r;
  }

  public async remove(): Promise<void> {
    await this.customDomain.tryHandleAutoDomain();
    const logger = GLogger.getLogger();
    logger.write(`Remove custom domain: ${this.region}/${this.getDomainName()}`);
    console.log();
    const client = this.getFcClient('remove');
    if (this.yes) {
      await client.deleteCustomDomain(this.getDomainName());
      logger.debug(`delete custom domain ${this.region}/${this.getDomainName()} success`);
      return;
    }
    const msg = `Do you want to delete this custom domain ${this.region}/${this.getDomainName()}`;
    if (await promptForConfirmOrDetails(msg)) {
      await client.deleteCustomDomain(this.getDomainName());
      logger.debug(`delete custom domain ${this.region}/${this.getDomainName()} success`);
    }
  }

  public async info(): Promise<any> {
    await this.customDomain.tryHandleAutoDomain();
    const c = await this.getCustomDomain('info');
    _.unset(c, 'certConfig');
    const r = _.merge(
      {
        region: this.region,
      },
      c,
    );
    return r;
  }

  public async plan(): Promise<void> {
    this.customDomain.checkPropsValid();
    await this.customDomain.tryHandleAutoDomain();
    const logger = GLogger.getLogger();
    const { remote, local } = await this.getLocalRemote('plan');
    const customDomainConfig = diffConvertPlanYaml(remote, local, { deep: 0, complete: true });

    let showDiff = `region: ${this.region}\n${customDomainConfig.show}`;
    showDiff = showDiff.replace(/^/gm, '    ');

    logger.write(`${this.inputs.resource.name}:\n${showDiff}`);
  }

  public async sync(): Promise<any> {
    await this.customDomain.tryHandleAutoDomain();
    const c = await this.getCustomDomain('sync');
    const r = _.merge(
      {
        region: this.region,
      },
      c,
    );
    return await this.write(r);
  }

  private async preDeploy(): Promise<void> {
    const logger = GLogger.getLogger();
    await this.customDomain.tryHandleAutoDomain();
    const { remote, local } = await this.getLocalRemote('deploy');
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

    const message = `Deploy it with local config?`;
    this.yes = await promptForConfirmOK(message);
  }

  private async getLocalRemote(command: string): Promise<any> {
    const logger = GLogger.getLogger();
    let remote = {};
    try {
      remote = await this.getCustomDomain(command);
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

  private async getCustomDomain(command: string): Promise<any> {
    //const logger = GLogger.getLogger();
    const result = await this.getFcClient(command).getCustomDomain(this.getDomainName());
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
    await this.getFcClient('deploy').createCustomDomain(createCustomDomainRequest);
    logger.debug(`createCustomDomain ${this.region}/${this.getDomainName()} success`);
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
    await this.getFcClient('deploy').updateCustomDomain(
      this.getDomainName(),
      updateCustomDomainRequest,
    );
    logger.debug(`updateCustomDomain ${this.region}/${this.getDomainName()} success`);
  }

  private async write(customDomainMeta: any) {
    const syncFolderName = 'sync-clone';

    const baseDir = this.target
      ? this.target
      : path.join(this.inputs.baseDir || process.cwd(), syncFolderName);
    const logger = GLogger.getLogger();
    logger.debug(`sync base dir: ${baseDir}`);
    const domainNameResourceId = this.getDomainName().replace(/\./g, '_');
    const ymlPath = path
      .join(baseDir, `${this.region}_${domainNameResourceId}.yaml`)
      .replace('$', '_');
    logger.debug(`sync yaml path: ${ymlPath}`);
    const config = {
      edition: '3.0.0',
      name: this.inputs.name,
      access: this.inputs.resource.access,
      resources: {
        [domainNameResourceId]: {
          component: 'fc3-domain',
          props: customDomainMeta,
        },
      },
    };
    logger.debug(`yaml config: ${JSON.stringify(config)}`);
    const configStr = yaml.dump(config);
    logger.debug(`yaml config str: ${configStr}`);

    fs.mkdirSync(baseDir, { recursive: true });
    logger.debug(`mkdir: ${baseDir}`);
    fs.writeFileSync(ymlPath, configStr);
    logger.debug(`write file: ${baseDir}`);

    return { ymlPath };
  }
}
