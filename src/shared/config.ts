import * as Sequelize from "sequelize"

export type MigrationLogger = (msg: string) => void

export type MigrationConfig = {
    migrationFolder?: string
    extension?: "js" | "sql"
    logger?: MigrationLogger
    database?: Sequelize.Options
} | undefined

export const config: MigrationConfig = {
    migrationFolder: "migrations",
    extension: "sql",
    database: {
        dialect: "mysql",
        host: "localhost",
        username: "root",
        password: undefined,
        database: "test",
        define: {
            timestamps: false
        }
    } as Sequelize.Options
}