import { MigrationConfig, MigrationLogger } from "../shared/config";
import * as Sequelize from "sequelize"
import * as Path from "path"
import * as moment from "moment"
import * as deepExtend from "deepextend"
import * as fs from "fs"

export interface IPlugin {
    name: string
    setup: (config: MigrationConfig) => void
    up: (options: UpProps) => Promise<any>
    down: (options: DownProps) => Promise<any>
}

type CreateMigrationFiles = {
    path: string
    filename: string
    content: string
}

export type UpProps = {
    toDate?: Date
}

export type DownProps = {

}

export class Migration {

    static __instance: Migration;
    static getInstance = () => {
        if(Migration.__instance == undefined) Migration.__instance = new Migration();
        return Migration.__instance;
    }
    static defaultOptions: MigrationConfig = {
        database: {
            dialectOptions: {
                multipleStatements: true
            }
        },
        migrationFolder: Path.resolve("migrations"),
        extension: "js",
        logger: console.log
    }

    private _config: MigrationConfig = undefined;
    private _sequelize: Sequelize.Sequelize = undefined;
    private _migrationFolder: string = undefined

    

    setup(options: MigrationConfig){
        this._config = deepExtend( Migration.defaultOptions, options);
        this.init();
        return this;
    }

    getConfig(){
        return this._config;
    }

    private init(){
        this._sequelize = new Sequelize(this._config.database);
        this._migrationFolder = Path.resolve(this._config.migrationFolder);
    }

    private async connectToDatabase(){
        await this._sequelize
            .authenticate()
            .then(() => {})
            .catch(err => this.onError(err));
    }

    private async getDatabaseMigrationTime(nb?: number): Promise<string[]>{
        try {

            if(!nb) nb = 1;

            // -- connection database
            await this.connectToDatabase();

            // -- create table if not exist
            let _sqlCreate = `
            CREATE TABLE IF NOT EXISTS migrations (
                id int(11) NOT NULL AUTO_INCREMENT,
                name varchar(255) NOT NULL,
                run_on datetime NOT NULL,
                PRIMARY KEY (id)
            )`;
            await this._sequelize.query(_sqlCreate);

            // -- get last migration
            let _lastMigration = undefined;
            let _queryLastMigration = await this._sequelize.query(`SELECT * FROM migrations order by run_on, id desc limit ${nb}`, { type: Sequelize.QueryTypes.SELECT });
            if(_queryLastMigration) return _queryLastMigration.map(x => x.name);
            return [];

        } catch(err){ this.onError(err); }
    }

    private createSqlMigration(path: string, file: string): CreateMigrationFiles[]{
        return [
            { path: path, filename: `${file}_up.sql`, content: "" },
            { path: path, filename: `${file}_down.sql`, content: "" }
        ];
    }

    private createJsMigration(path: string, file: string): CreateMigrationFiles[]{
        let _setupScript = `
exports.setup = async function(db){
    return null;
}
        `;
        let _upScript = `
exports.up = async function(db){
    return null;
}
        `;
        let _downScript = `
exports.down = async function(db){
    return null;
}
        `;
        let _script = `
            ${_setupScript}
            ${_upScript}
            ${_downScript}
        `;
        return [
            {
                path: path,
                filename: `${file}.js`,
                content: _script
            }
        ];
    }

    private createFile(file: CreateMigrationFiles){
        let _path = Path.join(file.path, file.filename);
        if (!fs.existsSync(file.path)) fs.mkdirSync(file.path);
        fs.writeFileSync(_path, file.content);
        this._config.logger(`Create file ${_path}`);
    }

    private onError(err: Error){
        this._config.logger(`Error : ${err.message}`);
    }

    private migrationNameToDate(migrationName: string){
        let _reg = new RegExp(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/i);
        let matchs = migrationName.match(_reg);
        if(matchs.length != 7) return undefined;
        let _date = new Date(parseInt(matchs[1]), parseInt(matchs[2]) - 1, parseInt(matchs[3]), parseInt(matchs[4]), parseInt(matchs[5]), parseInt(matchs[6]))
        return _date;
    }

    private dateToMigrationName(date: Date){
        return moment(date).format("YYYYMMDDHHmmss");
    }


    private async execSQLFile(file: string){
        this._config.logger(`Execute [${file}]`);
        let _content = fs.readFileSync(Path.join(this._migrationFolder, file)).toString();
        let _requests = _content.replace(/\r\n/gm, "").split(";")

        // -- execute sql file
        for(let i=0; i<_requests.length; i++){
            let _request = _requests[i];
            if(_request.trim() == "") continue;
            try {
                await this._sequelize.query(_request);
            } catch(err){ this.onError(err);}
        }

        

        return true;
    }

    private async execJSFile(file: string){
        this._config.logger(`Execute [${file}]`);
        return true;
    }

    createMigration(name?: string | string[], extension?: string){
        try {
            let _path = this._migrationFolder;
            let _uniqueId = moment().format("YYYYMMDDHHmmss");

            let _file = _uniqueId;
            if(typeof(name) == "string") _file += "-" + name;
            if(Array.isArray(name)) _file += "-" + name.join("-");

            let _extension = extension;
            if(!_extension) _extension = this._config.extension;

            let _migrations = [];
            if(_extension == "js") _migrations = this.createJsMigration(_path, _file);
            if(_extension == "sql") _migrations = this.createSqlMigration(_path, _file);

            _migrations.forEach(x => this.createFile(x));
        } catch(err){ this.onError(err); }
    }

    async up(props?: UpProps){
        try {

            if(!props) props = {};

            // -- date de dernière migration bdd
            await this.connectToDatabase();
            let _lastMigration = await this.getDatabaseMigrationTime(1);
            let _lastDate: Date = new Date(1900,1,1,0,0,0);
            let _newDate = props.toDate || new Date();
            if(_lastMigration && _lastMigration.length > 0){
                _lastDate = this.migrationNameToDate(_lastMigration[0]);
            }
            
            // -- liste des fichiers pour la migrations
            let _filesToMigrate: string[] = [];
            fs.readdirSync(this._migrationFolder).forEach(file => {
                let _date = this.migrationNameToDate(file);
                if(!_date) return;
                if(moment(_date).isAfter(moment(_lastDate)) && moment(_date).isBefore(_newDate) ){
                    _filesToMigrate.push(file);
                }
            });

            // -- execution des fichiers
            for(let i=0; i<_filesToMigrate.length; i++){
                let _insertInDatabase = false;
                if(_filesToMigrate[i].match(/\.js$/g)){
                    await this.execJSFile(_filesToMigrate[i]);
                    _insertInDatabase = true;
                } else if(_filesToMigrate[i].match(/_up\.sql$/g)){
                    await this.execSQLFile(_filesToMigrate[i]);
                    _insertInDatabase = true;
                }
                // -- store migration in database
                if(_insertInDatabase){
                    let _sql = `INSERT INTO migrations (name, run_on) VALUES ('${_filesToMigrate[i]}', '${moment().format("YYYY-MM-DD HH:mm:ss")}')`;
                    await this._sequelize.query(_sql);
                }

            }

            return true;

        } catch(err){ this.onError(err); }
    }

    async down(props?: DownProps){
        try {
            if(!props) props = {};

            let nb = 1;
            // -- date de dernière migration bdd
            await this.connectToDatabase().catch(err => {throw err});
            let _lastMigration = await this.getDatabaseMigrationTime(nb);
            
            // -- liste des fichiers pour la migrations
            let _filesToMigrate: string[] = [];
            fs.readdirSync(this._migrationFolder).forEach(file => {
                if(_lastMigration.find(x => x.replace("_up.sql","_down.sql") == file)){
                    _filesToMigrate.push(file);
                }
            });

            // -- execution des fichiers
            for(let i=0; i<_filesToMigrate.length; i++){

                if(_filesToMigrate[i].match(/\.js$/g)){
                    await this.execJSFile(_filesToMigrate[i]).catch(err => {throw err});
                } else if(_filesToMigrate[i].match(/_down\.sql$/g)){
                    await this.execSQLFile(_filesToMigrate[i]).catch(err => {throw err});
                }
                // -- remove migration in database
                let _sql = `DELETE FROM migrations where name like '${_filesToMigrate[i].replace("_down.sql","_up.sql")}'`;
                await this._sequelize.query(_sql).catch(err => {throw err});

            }

            return true;

        } catch(err){ this.onError(err); }
    }

}