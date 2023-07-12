#!/usr/bin/env node
import { Command } from 'commander';
import { cosmiconfigSync } from 'cosmiconfig';
import ejs from 'ejs';
import recursive from 'recursive-readdir';
import userhome from 'userhome';
import tmp from 'tmp-promise';
import prompts from 'prompts';
import fs from 'fs-extra';
import ora from 'ora';
import chalk from 'chalk';
import isEqual from 'lodash.isequal';
import downloadNpmPackage from 'download-npm-package';
import { downloadGit, getErrorMessage } from './utils';

const program = new Command();
const packageJson = require('../package.json');

const spinner = ora();

program
  .name('fly')
  .name(packageJson.name)
  .version(packageJson.version)
  .description(packageJson.description);

program
  .command('init')
  .description('Initialize Project')
  .option('-r, --remote')
  .action(async options => {
    const { remote } = options;

    const { templateSource, templateName } = await prompts([
      {
        type: 'select',
        name: 'templateSource',
        message: 'Pick template source',
        choices: [
          { title: 'Git', value: 'git' },
          { title: 'NPM', value: 'npm' },
        ],
      },
      {
        type: 'text',
        name: 'templateName',
        message: 'Input template name',
      },
    ]);
    if (!templateSource || !templateName) {
      process.exit(0);
    }
    let templateDirPath;
    if (templateSource === 'git') {
      templateDirPath = userhome(`.fly/templates/${templateName}`);
    } else if (templateSource === 'npm') {
      templateDirPath = userhome(`.fly/templates/${templateName}`);
    }

    if (fs.existsSync(templateDirPath) && remote) {
      fs.removeSync(templateDirPath);
    }

    if (!fs.existsSync(templateDirPath) || remote) {
      spinner.start(chalk.blackBright(`Downloading template`));
      fs.ensureDirSync(userhome(`.fly`));
      try {
        if (templateSource === 'git') {
          await downloadGit(templateName, templateDirPath);
        } else if (templateSource === 'npm') {
          await downloadNpmPackage({
            arg: templateName,
            dir: userhome(`.fly/templates/`),
          });
        }
        spinner.succeed(chalk.greenBright(`Downloaded template`));
      } catch (error) {
        spinner.fail(chalk.red(getErrorMessage(error)));
        process.exit(0);
      }
    }

    const explorerSync = cosmiconfigSync('fly');
    const fly = explorerSync.search(templateDirPath);

    if (fly?.config?.prompts) {
      spinner.start(chalk.blackBright(`Rendering template`));
      const tmpDir = await tmp.dir({ unsafeCleanup: true });
      fs.copySync(`${templateDirPath}/template`, tmpDir.path);
      const promptKeys = fly.config.prompts.map(item => item.name);
      const data = await prompts(fly.config.prompts);

      if (isEqual(Object.keys(data), promptKeys)) {
        const files = await recursive(tmpDir.path, [
          (file, stats) => {
            return stats.isDirectory() || !file.endsWith('.ejs');
          },
        ]);
        files.forEach(file => {
          const fileTemplate = fs.readFileSync(file).toString();
          const content = ejs.render(fileTemplate, data);
          fs.writeFileSync(file, content);
          fs.renameSync(file, file.replace('.ejs', ''));
        });
      }
      spinner.succeed(chalk.greenBright(`Rendered template`));
      fs.copySync(tmpDir.path, process.cwd());
      await tmpDir.cleanup();
    } else {
      fs.copySync(`${templateDirPath}/template`, process.cwd());
    }
    spinner.succeed(chalk.greenBright(`The project has been generated!`));
  });
program.parse();
