const dns = require('dns');
const { promisify } = require('util');
import inquirer from 'inquirer';

const resolveCnameAsync = promisify(dns.resolveCname);

export async function resolveCname(domain: string, logger: any) {
  try {
    const cnameRecords = await resolveCnameAsync(domain);
    logger.debug(`${domain} is already CNAME  to ${cnameRecords}`);
    return true;
  } catch (error) {
    logger.info(`can't resolving ${domain} CNAME: ${error.message}`);
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
