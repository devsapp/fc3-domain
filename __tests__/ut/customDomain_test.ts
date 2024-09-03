import { ICredentials } from '@serverless-devs/component-interface';
import { CustomDomain } from '../../src/impl/custom_domain'
import { IInputs } from '../../src/interface'
import GLogger from '../../src/common/logger';
import path from 'path';
GLogger.setLogger(console)

describe('CustomDomain', () => {
  let customDomainClass
  const inputs: IInputs = {
    // 当前执行路径
    cwd: __dirname,
    baseDir: __dirname,
    // 项目名称
    name: 'hello-world-app',
    props: {
      region: process.env.REGION === 'cn-hongkong' ? 'cn-hongkong' : 'cn-huhehaote',
      functionName: 'start-py',
      description: 'hello world by serverless devs',
      runtime: 'python3.9',
      code: './code',
      handler: 'index.handler',
      memorySize: 128,
      timeout: 60,
      routeConfig: {
        routes: [
          {
            functionName: "start-py",
            methods: [
              "GET",
              "POST"
            ],
            path: "/*",
            qualifier: "LATEST"
          }
        ]
      }
    },
    // 执行的方法
    command: 'deploy',
    args: ['-t', 's.yaml'],
    // yaml相关信息
    yaml: {
      path: path.join(__dirname, 's.yaml'),
    },
    // 当前业务模块相关信息
    resource: {
      name: 'hello_world',
      component: 'fc3',
      access: 'default',
    },
    // 已经执行完的业务模块的输出结果
    outputs: {},
    // 获取当前的密钥信息
    getCredential: async () => ({
      AccountID: process.env.DEVS_TEST_UID,
      AccessKeyID: process.env.DEVS_TEST_AK_ID,
      AccessKeySecret: process.env.DEVS_TEST_AK_SECRET,
    }),
  };
  const credentials: ICredentials = {
    AccountID: 'test',
    AccessKeyID: 'test',
    AccessKeySecret: 'test',
  }

  describe('tryHandleAutoDomain', () => {
    it('should throw error when domainName is null', () => {
      customDomainClass = new CustomDomain(inputs, credentials);

      expect(async () => {
        await customDomainClass.tryHandleAutoDomain()
      }).rejects.toThrowError('custom domain config must contain domainName')
    })

    it('should the second if return when domainName is not auto', async () => {
      inputs.props.domainName = 'test.com'
      customDomainClass = new CustomDomain(inputs, credentials);

      const result = await customDomainClass.tryHandleAutoDomain()

      expect(result).toBe(undefined)
    })
  })
})