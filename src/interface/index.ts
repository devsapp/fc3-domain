import { IInputs as _IInputs, ICredentials } from '@serverless-devs/component-interface';

export interface IInputs extends _IInputs {
  baseDir: string;
  credential?: ICredentials;
  userAgent?: string;
}
