import { IInputs } from './interface/index';
import { Domain } from './impl/domain';
import command_help from './impl/command_help';
import GLogger from './common/logger';
import * as fs from 'fs';
import path from 'path';
import * as _ from 'lodash';
import FCClient, * as $fc20230330 from '@alicloud/fc20230330';
import * as $OpenApi from '@alicloud/openapi-client';
import * as $Util from '@alicloud/tea-util';
import { parseArgv } from '@serverless-devs/utils';
import { checkRegion } from './impl/region';
import { tableShow } from './impl/util';
import {
  FC_CLIENT_CONNECT_TIMEOUT,
  FC_CLIENT_READ_TIMEOUT,
  getCustomEndpoint,
} from './common/constants';

export default class ComponentFc3Domain {
  protected commands: any;
  constructor({ logger }: any) {
    GLogger.setLogger(logger || console);
    this.commands = command_help;
  }

  public async deploy(inputs: IInputs): Promise<void> {
    GLogger.getLogger().debug(`deploy ==> input: ${JSON.stringify(inputs)}`);
    const credential = await inputs.getCredential();
    inputs.credential = credential;
    const domainObj = new Domain(inputs);
    return await domainObj.deploy();
  }

  public async remove(inputs: IInputs): Promise<void> {
    GLogger.getLogger().debug(`remove ==> input: ${JSON.stringify(inputs)}`);
    const credential = await inputs.getCredential();
    inputs.credential = credential;
    const domainObj = new Domain(inputs);
    return await domainObj.remove();
  }

  public async info(inputs: IInputs): Promise<any> {
    GLogger.getLogger().debug(`info ==> input: ${JSON.stringify(inputs)}`);
    const credential = await inputs.getCredential();
    inputs.credential = credential;
    const domainObj = new Domain(inputs);
    return await domainObj.info();
  }

  public async plan(inputs: IInputs): Promise<void> {
    GLogger.getLogger().debug(`info ==> input: ${JSON.stringify(inputs)}`);
    const credential = await inputs.getCredential();
    inputs.credential = credential;
    const domainObj = new Domain(inputs);
    return await domainObj.plan();
  }

  public async sync(inputs: IInputs): Promise<any> {
    GLogger.getLogger().debug(`sync ==> input: ${JSON.stringify(inputs)}`);
    const credential = await inputs.getCredential();
    inputs.credential = credential;
    const domainObj = new Domain(inputs);
    return await domainObj.sync();
  }

  public async list(inputs: IInputs): Promise<any> {
    const opts = parseArgv(inputs.args, {
      alias: { help: 'h' },
      boolean: ['help', 'table'],
      string: ['region', 'prefix', 'limit', 'next-token'],
    });

    const region = opts.region || _.get(inputs, 'props.region');
    checkRegion(region);

    const credential = await inputs.getCredential();
    const {
      AccountID: accountID,
      AccessKeyID: accessKeyId,
      AccessKeySecret: accessKeySecret,
      SecurityToken: securityToken,
    } = credential;

    const { endpoint, protocol } = getCustomEndpoint(
      _.get(inputs, 'props.endpoint'),
      accountID,
      region,
    );

    const config = new $OpenApi.Config({
      accessKeyId,
      accessKeySecret,
      securityToken,
      protocol,
      endpoint,
      readTimeout: FC_CLIENT_READ_TIMEOUT,
      connectTimeout: FC_CLIENT_CONNECT_TIMEOUT,
    });
    const client = new FCClient(config);

    const limit = opts.limit ? parseInt(opts.limit) : 100;
    const req = new $fc20230330.ListCustomDomainsRequest({ limit });
    if (opts.prefix) req.prefix = opts.prefix;
    if (opts['next-token']) req.nextToken = opts['next-token'];

    const result = await client.listCustomDomainsWithOptions(req, {}, new $Util.RuntimeOptions({}));
    const body = result.toMap().body;

    if (opts.table) {
      const showKey = ['domainName', 'protocol', 'createdTime', 'lastModifiedTime'];
      tableShow(body.customDomains || [], showKey);
      return;
    }
    return body;
  }

  public async getSchema(inputs: IInputs) {
    const SCHEMA_FILE_PATH = path.join(__dirname, 'schema.json');
    return fs.readFileSync(SCHEMA_FILE_PATH, 'utf-8');
  }
}
