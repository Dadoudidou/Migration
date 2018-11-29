import * as program from "commander"
import * as path from "path"
import * as fs from "fs"
import { Migration } from "../migration";
import { config, MigrationConfig } from "../shared/config";
import * as moment from "moment";
import * as deepExtend from "deepextend"
import * as requireFromString from "require-from-string"

const readJSONFile = async (file: string): Promise<any> => {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(file, undefined, (err, data: string) => {
      if(err){
        if(err.code == "ENOENT"){
          reject(new Error(`"${file}" does not exist`));
          return;
        }
        reject(err);
      }
      try {
        var content = JSON.parse(data);
        resolve(content);
      } catch(err){
        reject(err);
      }
    })
  })
}

const readJSFile = async (file: string): Promise<any> => {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(file, { encoding: "utf8" }, (err, data: string) => {
      if(err){
        if(err.code == "ENOENT"){
          reject(new Error(`"${file}" does not exist`));
          return;
        }
        reject(err);
      }
      try {
        var content = requireFromString(data);
        resolve(content);
      } catch(err){
        reject(err);
      }
    })
  })
}

const updateConfig = async (config: MigrationConfig, params: any) => {
  let _config = { ...config };

  if(params.config){
    if(path.extname(params.config).toUpperCase() == ".JSON"){
      let _p = await readJSONFile(params.config);
      _config = deepExtend({}, _config, _p);
    } else if(path.extname(params.config).toUpperCase() == ".JS"){
      let _p = await readJSFile(params.config);
      _config = deepExtend({}, _config, _p);
    } else {
      throw new Error("Config file must be JSON or JS file");
    }
  }

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
  .action(async (names, options) => {
    let _config = await updateConfig(config, program);
    Migration
      .getInstance()
      .setup(_config)
      .createMigration(names);
  });

  program
  .command('up')
  .description('update database')
  .option("-d, --date <date>", "update database to date (YYYY-MM-DDTHH:mm:ss)")
  .action(async (names, options) => {
      let _date: Date = undefined
      if(options && options.date){
        let __date = moment(options.date);
        if(__date.isValid()) _date = __date.toDate();
      }
      let _config = await updateConfig(config, program);
      await Migration
        .getInstance()
        .setup(_config)
        .up({
          toDate: _date
        });
      process.exit();
  });

  program
  .command('down')
  .description('restore database')
  .action(async (names, options) => {
    let _config = await updateConfig(config, program);
    await Migration
      .getInstance()
        .setup(_config)
        .down();
    process.exit();
  });

  program
  .command("show-config")
  .description("show configuration")
  .action(async (names, options) => {
    let _config = await updateConfig(config, program);
    console.log(_config);
    return _config;
  })



program.parse(process.argv);

if (!program.args.length) program.help();
