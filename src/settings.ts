import * as vscode from 'vscode';
import * as fs from 'fs';

export class Settings{

    private static readonly _instance: Settings = new Settings();
    private _settings: any = null;
    private _timestramp: number = 0;

    public static Instance() {
        Settings._instance.loadSettings();
        return Settings._instance;
    }

    public getHost(): string {
        return this._settings["Host"];
    }

    public getPort(): number {
        return this._settings["Port"];
    }

    public getUser(): string {
        return this._settings["User"];
    }

    public getPassword(): string {
        return this._settings["Password"];
    }

    public getHexoRoot(): string {
        return this._settings["HexoRoot"];
    }

    private Settings(){
 
    }

    private loadSettings() {
        const timestramp: number = Date.now();
        if (timestramp === this._timestramp) {
            return;
        }
        this._settings = timestramp;

		const settingfile: string = `${vscode.workspace.rootPath}/hexoproj.json`;
		if ( fs.existsSync(settingfile) ) {
			const json:string = fs.readFileSync(settingfile, 'utf-8');
			try {
				this._settings = JSON.parse(json);
			}
			catch(e) {
				vscode.window.showWarningMessage("配置文件.rdevproj.json有语法错误,请检查: " + e);
			}
		}
	}

}