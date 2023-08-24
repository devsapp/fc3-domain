通过该组件，快速部署函数计算自定义域名

- [测试](#测试)
- [完整配置](#完整配置)
  - [参数详情](#参数详情)
- [命令相关](#命令相关)
  - [Deploy 命令](#Deploy命令)
  - [Remove 命令](#Remove命令)

## 测试

1. 在本地创建`s.yaml`

```yaml
edition: 3.0.0 #  命令行YAML规范版本，遵循语义化版本（Semantic Versioning）规范
name: fcDomainApp #  项目名称
access: quanxi #  秘钥别名

resources:
  fc-domain-test: #  服务名称
    component: ${path("../")}
    props: #  组件的属性值
      region: cn-huhehaote
      domainName: my.abc.com
      protocol: HTTP # HTTP | HTTPS 
      routeConfig:
        routes:
          - functionName: test-serverless-devs-custom-domain-ci-1
            methods:
              - GET
            path: /a
            qualifier: LATEST
          - functionName: test-serverless-devs-custom-domain-ci-2
            methods:
              - GET
            path: /bb
            qualifier: LATEST
```

2. 可以通过`s deploy`快速进行部署

## 完整配置

TODO ...

### 参数详情

| 参数名     | 必填  | 类型   | 参数描述                                                                                                             |
| ---------- | ----- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| region     | True  | Enum   | 地域                                                                                                                 |

...                                                                                      |

## 命令相关

- [Deploy 命令](#Deploy命令)
- [Remove 命令](#Remove命令)

### Deploy 命令

进行 ROS 项目部署

| 参数全称   | 参数缩写 | Yaml 模式下必填 | 参数含义                                                                                                                                                                                                                                                                                                                  |
| ---------- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name       | -        | 选填            | Stack name                                                                                                                                                                                                                                                                                                                |
| assume-yes | y        | 选填            | 在交互时，默认选择`y`                                                                                                                                                                                                                                                                                                     |
| access     | a        | 选填            | 本次请求使用的密钥，可以使用通过[config 命令](https://github.com/Serverless-Devs/Serverless-Devs/tree/master/docs/zh/command/config.md#config-add-命令) 配置的密钥信息，以及[配置到环境变量的密钥信息](https://github.com/Serverless-Devs/Serverless-Devs/tree/master/docs/zh/command/config.md#通过环境变量配置密钥信息) |
| debug      | -        | 选填            | 打开`debug`模式，将会输出更多日志信息                                                                                                                                                                                                                                                                                     |
| help       | h        | 选填            | 查看帮助信息                                                                                                                                                                                                                                                                                                              |

### Remove 命令

移除指的 ROS 项目部署

| 参数全称   | 参数缩写 | Yaml 模式下必填 | 参数含义                                                                                                                                                                                                                                                                                                                  |
| ---------- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name       | -        | 选填            | Stack name                                                                                                                                                                                                                                                                                                                |
| assume-yes | y        | 选填            | 在交互时，默认选择`y`                                                                                                                                                                                                                                                                                                     |
| access     | a        | 选填            | 本次请求使用的密钥，可以使用通过[config 命令](https://github.com/Serverless-Devs/Serverless-Devs/tree/master/docs/zh/command/config.md#config-add-命令) 配置的密钥信息，以及[配置到环境变量的密钥信息](https://github.com/Serverless-Devs/Serverless-Devs/tree/master/docs/zh/command/config.md#通过环境变量配置密钥信息) |
| debug      | -        | 选填            | 打开`debug`模式，将会输出更多日志信息                                                                                                                                                                                                                                                                                     |
| help       | h        | 选填            | 查看帮助信息                                                                                                                                                                                                                                                                                                              |
