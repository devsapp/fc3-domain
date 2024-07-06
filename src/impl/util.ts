const dns = require('dns');
const { promisify } = require('util');
import inquirer from 'inquirer';

const fetch = require('node-fetch');
const resolveCnameAsync = promisify(dns.resolveCname);

export async function resolveCname(domain: string, expectedRecord: string, logger: any) {
  try {
    let ret = false;
    const cnameRecords = await resolveCnameAsync(domain);
    for (const i in cnameRecords) {
      if (cnameRecords[i] === expectedRecord) {
        ret = true;
        break;
      }
    }
    logger.debug(`${domain} is already CNAME  to ${cnameRecords}, ret = ${ret}`);
    return ret;
  } catch (error) {
    logger.info(`can't resolving ${domain} CNAME to ${expectedRecord}, details: ${error.message}`);
  }
  return false;
}

export async function promptForConfirmOrDetails(message: string): Promise<boolean> {
  const answers: any = await inquirer.prompt([
    {
      type: 'list',
      name: 'prompt',
      message,
      choices: ['yes', 'no'],
    },
  ]);

  return answers.prompt === 'yes';
}

export async function promptForConfirmOK(message: string): Promise<boolean> {
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'ok',
      message,
    },
  ]);
  return answers.ok;
}

export const sleep = async (second: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, second * 1000));

export async function checkCname(region: string, payload: any): Promise<any> {
  const res = await fetch(
    `https://1767215449378635.${region}.fc.aliyuncs.com/2016-08-15/proxy/serverless-domain-check/checkCname/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  const resJson = await res.json();
  return resJson;
}
