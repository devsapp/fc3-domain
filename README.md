通过该组件，快速部署函数计算自定义域名

- [测试](#测试)
- [完整配置](#完整配置)
  - [参数详情](#参数详情)
- [命令相关](#命令相关)
  - [Deploy命令](#Deploy命令)
  - [Remove命令](#Remove命令)
  - [Plan命令](#Plan命令)
  - [Info命令](#Info命令)

## 快速使用

1. 在本地创建`s.yaml`

```yaml
edition: 3.0.0 #  命令行YAML规范版本，遵循语义化版本（Semantic Versioning）规范
name: fcDomainApp #  项目名称
access: quanxi #  秘钥别名

resources:
  fc-domain-test: #  服务名称
    component: fc3-domain
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

```yaml
edition: 3.0.0 #  命令行YAML规范版本，遵循语义化版本（Semantic Versioning）规范
name: fcDomainApp #  项目名称
access: quanxi #  秘钥别名

resources:
  fc-domain-test:
    component: fc3-domain
    props: #  组件的属性值
      region: cn-huhehaote
      # domainName: auto
      domainName: xiliu-test.shoushuai.top # 可以使用 auto 自动获取一个临时测试域名
      protocol: HTTP,HTTPS  # HTTP | HTTPS | HTTP,HTTPS
      routeConfig:
        routes:
          - functionName: test-serverless-devs-custom-domain-ci-1
            methods:
              - GET
            path: /a
            qualifier: LATEST
            rewriteConfig:
              equalRules:
                - match: /equalRules
                  replacement: /xxxx
              regexRules:
                - match: ^/old/[a-z]+/
                  replacement: /xxxx
              wildcardRules:
                - match: /api/*
                  replacement: /$1
          - functionName: test-serverless-devs-custom-domain-ci-2
            methods:
              - GET
            path: /bb
            qualifier: LATEST

      wafConfig:
        enableWAF: false
      
      tlsConfig:
        cipherSuites:
          - TLS_RSA_WITH_RC4_128_SHA
        maxVersion: TLSv1.3
        minVersion: TLSv1.0
     
      certConfig:
        certName: test-cert
        certificate: oss://cn-huhehaote/serverless-devs-fc3-ci-test/xiliu-test.shoushuai.top.pem
        privateKey: oss://cn-huhehaote/serverless-devs-fc3-ci-test/xiliu-test.shoushuai.top.key
	  
      # certConfig:
      #   certName: test-cert
      #   certificate: /Users/songluo/work/code-inc/domain/examples/xiliu-test.shoushuai.top.pem
      #   privateKey: /Users/songluo/work/code-inc/domain/examples/xiliu-test.shoushuai.top.key

      # certConfig:
      #   certName: test-cert
      #   certificate: https://images.devsapp.cn/test/xiliu-test-cert/xiliu-test.shoushuai.top.pem
      #   privateKey: https://images.devsapp.cn/test/xiliu-test-cert/xiliu-test.shoushuai.top.key


      # certConfig:
      #   certId: 7246639

      # authConfig:
      #   authInfo: xxx
      #   authType: jwt || function || anonymous

```

其中针对 certConfig 可以支持如下四种方式：

- 1. 本地文件形式
- 2. http url 形式 
- 3. oss object 地址形式
- 4. 阿里云数字证书管理服务中的ssl证书 id

### 参数详情

| 参数名     | 必填  | 类型   | 参数描述 |
| ---------- | ----- | ------ | ------------------- |
| region     | True  | enum   | 地域 |       
| domainName | True  | string | 已在阿里云备案或接入备案的自定义域名名称 |
| protocol	 | True  | enum | 域名支持的协议类型：</br> HTTP：仅支持HTTP协议 </br> HTTPS：仅支持HTTPS协议</br> HTTP,HTTPS：支持HTTP及HTTPS协议|
| routeConfig | True | object| 路由表：自定义域名访问时的PATH到Function的映射 |  
| certConfig | False | object| HTTPS证书的信息 | 
| tlsConfig | False | object| TLS配置信息 | 
| wafConfig | False | object| Web应用防火墙配置信息 |                                                                 

## 命令相关

- [Deploy命令](#Deploy命令)
- [Remove命令](#Remove命令)
- [Plan命令](#Plan命令)
- [Info命令](#Info命令)

### Deploy命令

进行函数计算自定义域名部署

| 参数全称   | 参数缩写 | Yaml 模式下必填 | 参数含义  |
| ---------- | -------- | --------------- | -------------- |             
| assume-yes | y        | 选填            | 在交互时，默认选择`y` |
| access     | a        | 选填            | 本次请求使用的密钥，可以使用通过[config 命令](https://github.com/Serverless-Devs/Serverless-Devs/tree/master/docs/zh/command/config.md#config-add-命令) 配置的密钥信息，以及[配置到环境变量的密钥信息](https://github.com/Serverless-Devs/Serverless-Devs/tree/master/docs/zh/command/config.md#通过环境变量配置密钥信息) |
| debug      | -        | 选填            | 打开`debug`模式，将会输出更多日志信息 |
| help       | h        | 选填            | 查看帮助信息 |

### Remove命令

移除函数计算自定义域名

| 参数全称   | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义 |
| ---------- | -------- | --------------- | --------------- | -------------|
| region     | -        | 选填            | 必填            | 地区，取值范围请参考: [函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| domain-name | -        | 选填            | 必填           | 自定义域名名字，比如 `myabc.com` |
| assume-yes | y        | 选填            | 选填            |在交互时，默认选择`y`|
| access     | a        | 选填            | 必填            |本次请求使用的密钥，可以使用通过[config 命令](https://github.com/Serverless-Devs/Serverless-Devs/tree/master/docs/zh/command/config.md#config-add-命令) 配置的密钥信息，以及[配置到环境变量的密钥信息](https://github.com/Serverless-Devs/Serverless-Devs/tree/master/docs/zh/command/config.md#通过环境变量配置密钥信息) |
| debug      | -        | 选填            | 选填            |打开`debug`模式，将会输出更多日志信息 |
| help       | h        | 选填            | 选填            |查看帮助信息  |

### Plan命令

展示函数计算自定义域名本地yaml配置和线上自定义域名配置差异

| 参数全称   | 参数缩写 | Yaml 模式下必填 | 参数含义 |
| ---------- | -------- | --------------- | ------------- | 
| access     | a        | 选填            | 本次请求使用的密钥，可以使用通过[config 命令](https://github.com/Serverless-Devs/Serverless-Devs/tree/master/docs/zh/command/config.md#config-add-命令) 配置的密钥信息，以及[配置到环境变量的密钥信息](https://github.com/Serverless-Devs/Serverless-Devs/tree/master/docs/zh/command/config.md#通过环境变量配置密钥信息) |
| debug      | -        | 选填            | 打开`debug`模式，将会输出更多日志信息 |
| help       | h        | 选填            | 查看帮助信息 |


### Info命令

显示已经部署到线上的自定义域名配置信息

| 参数全称   | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义 |
| ---------- | -------- | --------------- |  --------------- | ----------  |
| region     | -        | 选填            | 必填            | 地区，取值范围请参考: [函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| domain-name | -        | 选填            | 必填           | 自定义域名名字，比如 `myabc.com` |
| access     | a        | 选填            | 必填            |本次请求使用的密钥，可以使用通过[config 命令](https://github.com/Serverless-Devs/Serverless-Devs/tree/master/docs/zh/command/config.md#config-add-命令) 配置的密钥信息，以及[配置到环境变量的密钥信息](https://github.com/Serverless-Devs/Serverless-Devs/tree/master/docs/zh/command/config.md#通过环境变量配置密钥信息) |
| debug      | -        | 选填            | 选填            |打开`debug`模式，将会输出更多日志信息 |
| help       | h        | 选填            | 选填            |查看帮助信息 |