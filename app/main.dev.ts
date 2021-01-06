/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import knex from './database/knex';
import WebpackMigrationSource from './database/WebpackMigrationSource';

/**
 * Runs the knex migrations for the embedded sqlite database. This ensures that the
 * database is up-to-date before the application opens. If a migration fails, then
 * an error prompt is displayed to the user, and the application is terminated.
 */
async function migrate() {
    let config: { migrationSource: WebpackMigrationSource };
    if (process.env.NODE_ENV === 'production') {
        config = {
            migrationSource: new WebpackMigrationSource(
                require.context('./database/migrations', false, /.ts$/)
            ),
        };
    } else {
        config = require('./database/knexfile.ts').development;
    }

    knex()
        .then((db) => {
            return db.migrate.latest(config).catch((error: Error) => {
                dialog.showErrorBox(
                    'Migration error',
                    `An unexpected error occurred during migration of the database. ${error}`
                );
                process.nextTick(() => {
                    process.exit(0);
                });
            });
        })
        .catch((error: Error) => {
            dialog.showErrorBox(
                'Database error',
                `An unexpected error occurred while attempting to access the database. ${error}`
            );
            process.nextTick(() => {
                process.exit(0);
            });
        });
}

export default class AppUpdater {
    constructor() {
        log.transports.file.level = 'info';
        autoUpdater.logger = log;

        // Disable automatic updates for now.
        // autoUpdater.checkForUpdatesAndNotify();
    }
}

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
    const sourceMapSupport = require('source-map-support');
    sourceMapSupport.install();
}

if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
) {
    require('electron-debug')();
}

const installExtensions = async () => {
    const installer = require('electron-devtools-installer');
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
    const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

    return installer
        .default(
            extensions.map((name) => installer[name]),
            forceDownload
        )
        .catch(console.log);
};

const createWindow = async () => {
    if (
        process.env.NODE_ENV === 'development' ||
        process.env.DEBUG_PROD === 'true'
    ) {
        await installExtensions();
    }

    const RESOURCES_PATH = app.isPackaged
        ? path.join(process.resourcesPath, 'resources')
        : path.join(__dirname, '../resources');

    const getAssetPath = (...paths: string[]): string => {
        return path.join(RESOURCES_PATH, ...paths);
    };

    mainWindow = new BrowserWindow({
        show: false,
        width: 4096,
        height: 2912,
        icon: getAssetPath('icon.png'),
        webPreferences:
            (process.env.NODE_ENV === 'development' ||
                process.env.E2E_BUILD === 'true') &&
            process.env.ERB_SECURE !== 'true'
                ? {
                      nodeIntegration: true,
                  }
                : {
                      preload: path.join(__dirname, 'dist/renderer.prod.js'),
                  },
    });

    mainWindow.loadURL(`file://${__dirname}/app.html`);

    // @TODO: Use 'ready-to-show' event
    //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
    mainWindow.webContents.on('did-finish-load', () => {
        if (!mainWindow) {
            throw new Error('"mainWindow" is not defined');
        }
        if (process.env.START_MINIMIZED) {
            mainWindow.minimize();
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.setMenuBarVisibility(false);

    // Remove this if your app does not use auto updates
    // eslint-disable-next-line
    new AppUpdater();

    // Migrate database to ensure it is always up-to-date before opening the
    // application.
    migrate();
};

// Provides access to the userData path from renderer processes.
ipcMain.handle('APP_GET_PATH', () => {
    return app.getPath('userData');
});

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
    // Respect the OSX convention of having the application in memory even
    // after all windows have been closed
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

if (process.env.E2E_BUILD === 'true') {
    // eslint-disable-next-line promise/catch-or-return
    app.whenReady().then(createWindow);
} else {
    app.on('ready', createWindow);
}

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) createWindow();
});
