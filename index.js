const electron = require('electron');
const { ChronoTray } = require('./app/chronotray');
const ws = require('windows-shortcut-maker');
const { app, BrowserWindow, ipcMain, autoUpdater, dialog } = electron;

const isDev = require('electron-is-dev');
const server = 'http://download.localhost:4000';
const feed = `${server}/update/${process.platform}/${app.getVersion()}`;

let mainWindow;
let tray;

// ======================= Util by install app =======================
// handling squirrel events
if (require('electron-squirrel-startup')) return;
 
// this should be placed at top of main.js to handle setup events quickly
if (handleSquirrelEvent()) {
   // squirrel event handled and app will exit in 1000ms, so don't do anything else
   return;
}
function handleSquirrelEvent() {
   if (process.argv.length === 1) {
     return false;
   }
   const ChildProcess = require('child_process');
   const path = require('path');
   const appFolder = path.resolve(process.execPath, '..');
   const rootAtomFolder = path.resolve(appFolder, '..');
   const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
   const exeName = path.basename(process.execPath);
   const spawn = function(command, args) {
      let spawnedProcess, error;
      try {
        spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
      } catch (error) {}
        return spawnedProcess;
      };
   const spawnUpdate = function(args) {
     return spawn(updateDotExe, args);
   };
   const squirrelEvent = process.argv[1];
   switch (squirrelEvent) {
     case '--squirrel-install':
     case '--squirrel-updated':
       // Optionally do things such as:
       // - Add your .exe to the PATH
       // - Write to the registry for things like file associations and
       //   explorer context menus
        // Install desktop and start menu shortcuts
       spawnUpdate(['--createShortcut', exeName]);
        setTimeout(app.quit, 1000);
       return true;
      case '--squirrel-uninstall':
       // Undo anything you did in the --squirrel-install and
       // --squirrel-updated handlers
        // Remove desktop and start menu shortcuts
       spawnUpdate(['--removeShortcut', exeName]);
        setTimeout(app.quit, 1000);
       return true;
      case '--squirrel-obsolete':
       // This is called on the outgoing version of your app before
       // we update to the new version - it's the opposite of
       // --squirrel-updated
        app.quit();
       return true;
   }
};
// =================================================

app.on('ready', function() {
    mainWindow = new BrowserWindow({ 
        webPreferences: { nodeIntegration: true },
        resizable: false,
        frame: false, // remover controles da janela e menus
        height: 180,
        width: 350,
        show: false,
        skipTaskbar: true
    });
    mainWindow.loadURL(`file://${__dirname}/app/index.html`);
    mainWindow.on('blur', function() {
        setTimeout(() => {
            mainWindow.hide();
        }, 100);
    });
    tray = new ChronoTray(`${__dirname}/app/icon.ico`, mainWindow);
    if (process.env.NODE_ENV !== 'production' && process.platform === 'win32'){
        ws.makeSync({ filepath: process.execPath });
        app.setAppUserModelId(process.execPath);
    }
    if (!isDev) {
      autoUpdater.setFeedURL(feed);
      setInterval(() => {
        autoUpdater.checkForUpdates();
      }, 60000);
    }
});

ipcMain.on('timeUpdate', function(event, time) {
    tray.setToolTip(time);
});

autoUpdater.on('update-downloaded', (ev, releaseNotes, releaseName) => {
  const dialogOptions = {
    type: 'info',
    buttons: ['Reiniciar', 'Mais Tarde'],
    title: 'Atualizações da Aplicação',
    message: `Versão: ${releaseName}, Nota: ${releaseNotes}`,
    detail: 'Uma nova versão foi recebida. Reinicie a aplicação para aplicar a atualização.'
  };

  dialog.showErrorBox(dialogOptions, rs => {
    if (rs === 0) autoUpdater.quitAndInstall();
  });
});

autoUpdater.on('error', msg => {
  console.error('Houve um problema nao atualizar a aplicação');
  console.error(msg);
});
