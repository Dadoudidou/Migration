import * as program from "commander"
import * as path from "path"
import { Migration } from "../migration";
import { config, MigrationConfig } from "../shared/config";
import * as moment from "moment";


const updateConfig = (config: MigrationConfig, params: any) => {
  let _config = { ...config };
  if(params.sqlFile) _config = { ..._config, extension: "sql" }
  if(params.migrationDir) _config = { ..._config, migrationFolder: params.migrationDir }
  if(params.databaseHost) _config = { ..._config, database: { ..._config.database, host: params.databaseHost } }
  if(params.databasePort) _config = { ..._config, database: { ..._config.database, port: params.databasePort } }
  if(params.databaseUsername) _config = { ..._config, database: { ..._config.database, username: params.databaseUsername } }
  if(params.databasePassword) _config = { ..._config, database: { ..._config.database, password: params.databasePassword } }
  if(params.databaseName) _config = { ..._config, database: { ..._config.database, database: params.databaseName } }
  return _config;
}

program
  .version('0.1.0', '-v, --version')
  .option('-c, --config <path>', 'set config file.')
  .option('-m, --migration-dir <path>', 'set migration dir. [defaults:"./migrations"]')
  .option('-db-host, --database-host <host>', 'set database host')
  .option('-db-port, --database-port <host>', 'set database port')
  .option('-db-user, --database-username <username>', 'set database username')
  .option('-db-pass, --database-password <password>', 'set database password')
  .option('-db-name, --database-name <name>', 'set database name')
  .option('--sql-file', 'create sql files for up and down')

program
  .command('create [names...]')
  .description('create a migration')
  .action((names, options) => {
      Migration.getInstance().setup(updateConfig(config, program)).createMigration(names);
  });

  program
  .command('up')
  .description('update database')
  .option("-d, --date <date>", "update database to date (YYYY-MM-DDTHH:mm:ss)")
  .action(async (names, options) => {
      let _date: Date = undefined
      if(options.date){
        let __date = moment(options.date);
        if(__date.isValid()) _date = __date.toDate();
      }
      await Migration.getInstance().setup(updateConfig(config, program)).up({
        toDate: _date
      });
      process.exit();
  });

  program
  .command('down')
  .description('restore database')
  .action(async (names, options) => {
      await Migration.getInstance().setup(updateConfig(config, program)).down();
      process.exit();
  });

/*
program
  .command('exec <cmd>')
  .alias('ex')
  .description('execute the given remote cmd')
  .option("-e, --exec_mode <mode>", "Which exec mode to use")
  .action(function(cmd, options){
    console.log('exec "%s" using %s mode', cmd, options.exec_mode);
  }).on('--help', function() {
    console.log('  Examples:');
    console.log();
    console.log('    $ deploy exec sequential');
    console.log('    $ deploy exec async');
    console.log();
  });

program
  .command('*')
  .action(function(env){
    console.log('deploying "%s"', env);
  });*/

program.parse(process.argv);

if (!program.args.length) program.help();
