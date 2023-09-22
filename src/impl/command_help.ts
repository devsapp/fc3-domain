export default {
  deploy: {
    help: {
      description: `deploy fc custom domain

Examples:
  $ s3 deploy -y`,
      summary: 'deploy fc custom domain',
      option: [
        ['-y, --assume-yes', 'Assume that the answer to any question which would be asked is yes'],
      ],
    },
  },
  remove: {
    help: {
      description: `remove fc custom domain

Examples with Yaml:
  $ s3 remove
  $ s3 remove -y

Examples with CLI:
  $ s3 cli fc3-domain remove --region cn-hangzhou --domain-name test -a default`,
      summary: 'remove fc custom domain',
      option: [
        [
          '--region <region>',
          '[C-Required] Specify the fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
        ],
        ['--domain-name <domainName>', '[C-Required] Specify domain name'],
        ['-y, --assume-yes', 'Assume that the answer to any question which would be asked is yes'],
      ],
    },
  },
  info: {
    help: {
      description: `get fc custom domain information

Examples with Yaml:
  $ s3 info

Examples with CLI:
  $ s3 cli fc3-domain info --region cn-hangzhou --domain-name test -a default`,
      summary: 'get fc custom domain information',
      option: [
        [
          '--region <region>',
          '[C-Required] Specify the fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
        ],
        ['--domain-name <domainName>', '[C-Required] Specify domain name'],
      ],
    },
  },
  plan: {
    help: {
      description: `show the differences between the local and remote

Examples:
  $ s3 plan`,
      summary: 'show the differences between the local and remote',
    },
  },
};
