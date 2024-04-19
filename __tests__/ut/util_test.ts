import {
  resolveCname,
  promptForConfirmOrDetails,
  promptForConfirmOK,
  sleep
} from '../../src/impl/util';
import inquirer from 'inquirer';

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

jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));

describe('promptForConfirmOrDetails', () => {
  test('should return true if user input y', async () => {
    (inquirer.prompt as jest.Mock).mockResolvedValue({ prompt: 'yes' })

    const ret = await promptForConfirmOrDetails('test');
    expect(ret).toBe(true);
  });

  test('should return false if user input n', async () => {
    (inquirer.prompt as jest.Mock).mockResolvedValue({ prompt: 'no' })

    const ret = await promptForConfirmOrDetails('test');
    expect(ret).toBe(false);
  });
});

describe('promptForConfirmOK', () => { 
  test('should return true when user confirms',async () => {
    (inquirer.prompt as jest.Mock).mockResolvedValue({ ok: true })

    const res = await promptForConfirmOK('test');
    expect(res).toBe(true);
  })

  test('should return false when user cancels',async () => {
    (inquirer.prompt as jest.Mock).mockResolvedValue({ ok: false })

    const res = await promptForConfirmOK('test');
    expect(res).toBe(false);
  })
 })

 describe('sleep', () => {
  jest.useFakeTimers(); // 使用 Jest 的定时器模拟器

  it('should resolve after the specified number of seconds', async () => {
    const second = 2;
    const promise = sleep(second);

    // 快进并执行所有定时器
    jest.runAllTimers();

    await expect(promise).resolves.toBeUndefined();
  });

  it('should wait for the specified number of milliseconds before resolving', async () => {
    const second = 3;
    const promise = sleep(second);

    // 快进并执行所有定时器
    jest.runAllTimers();

    await expect(promise).resolves.toBeUndefined();
  });
});