import { IInputs } from '@serverless-devs/component-interface';
import { Domain } from './impl/domain';
import GLogger from './common/logger';

export default class ComponentRos {
  protected commands: any;
  constructor({ logger }: any) {
    GLogger.setLogger(logger || console);
    this.commands = {
      deploy: {
        help: {
          description: 'deploy fc custom domain',
          summary: 'deploy fc custom domain',
          option: [
            [
              '-y, --assume-yes',
              'Assume that the answer to any question which would be asked is yes',
            ],
          ],
        },
      },
      remove: {
        help: {
          description: 'remove fc custom domain',
          summary: 'remove fc custom domain',
          option: [
            [
              '-y, --assume-yes',
              'Assume that the answer to any question which would be asked is yes',
            ],
          ],
        },
      },
      info: {
        help: {
          description: 'get fc custom domain information',
          summary: 'get fc custom domain information',
        },
      },
      plan: {
        help: {
          description: 'show the differences between the local and remote',
          summary: 'show the differences between the local and remote',
        },
      },
    };
  }

  public async deploy(inputs: IInputs): Promise<void> {
    GLogger.getLogger().debug(`deploy ==> input: ${JSON.stringify(inputs)}`);
    const credential = await inputs.getCredential();
    const domainObj = new Domain(inputs, credential);
    return await domainObj.deploy();
  }

  public async remove(inputs: IInputs): Promise<void> {
    GLogger.getLogger().debug(`remove ==> input: ${JSON.stringify(inputs)}`);
    const credential = await inputs.getCredential();
    const domainObj = new Domain(inputs, credential);
    return await domainObj.remove();
  }

  public async info(inputs: IInputs): Promise<any> {
    GLogger.getLogger().debug(`info ==> input: ${JSON.stringify(inputs)}`);
    const credential = await inputs.getCredential();
    const domainObj = new Domain(inputs, credential);
    return await domainObj.info();
  }

  public async plan(inputs: IInputs): Promise<void> {
    GLogger.getLogger().debug(`info ==> input: ${JSON.stringify(inputs)}`);
    const credential = await inputs.getCredential();
    const domainObj = new Domain(inputs, credential);
    return await domainObj.plan();
  }
}
