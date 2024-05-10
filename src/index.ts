import { IInputs } from './interface/index';
import { Domain } from './impl/domain';
import command_help from './impl/command_help';
import GLogger from './common/logger';
import * as fs from 'fs';
import path from 'path';

export default class ComponentRos {
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

  public async getSchema(inputs: IInputs) {
    const SCHEMA_FILE_PATH = path.join(__dirname, 'schema.json');
    return fs.readFileSync(SCHEMA_FILE_PATH, 'utf-8');
  }
}
