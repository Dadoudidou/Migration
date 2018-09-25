# Migration Command Line

```
Usage: migration-cli [options] [command]

  Options:

    -v, --version                             output the version number
    -c, --config <path>                       set config file.
    -m, --migration-dir <path>                set migration dir. [defaults:"./migrations"]
    -db-host, --database-host <host>          set database host
    -db-port, --database-port <host>          set database port
    -db-user, --database-username <username>  set database username
    -db-pass, --database-password <password>  set database password
    -db-name, --database-name <name>          set database name
    --sql-file                                create sql files for up and down
    -h, --help                                output usage information

  Commands:

    create [names...]                         create a migration
    up [options]                              update database
    down                                      restore database
```