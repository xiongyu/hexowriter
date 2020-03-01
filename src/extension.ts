// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SshClient } from './myssh2';
import { Settings } from './settings';
import os = require('os');

function getFileName(o: string) {
    let splitflag: string = "/";
    if ( "win32" === os.platform() ) {
        splitflag = "\\";
    }
    var pos = o.lastIndexOf(splitflag);
    return o.substring(pos + 1);
}

function getDir(f: string) {
	const filename: string = getFileName(f);
	const d: string = f.replace(filename, "");
	return d;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let outputchannel: vscode.OutputChannel = vscode.window.createOutputChannel("HexoWriter");
	outputchannel.show();

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "hexowriter" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.hexowriter.commit', async () => {
		let e = vscode.window.activeTextEditor;
		let curfilename: string = "";
		if ( undefined !== e ) {
			let d = e.document;
			curfilename = d.fileName;
			if ("article.md" !== getFileName(curfilename)) {
				vscode.window.showInformationMessage(`请打开你准备上传的文章，再使用该功能1 ${curfilename}`);
				return;
			}
		} else {
			vscode.window.showInformationMessage(`请打开你准备上传的文章，再使用该功能2`);
			return;
		}

		const host: string = Settings.Instance().getHost();
		const port: number = Settings.Instance().getPort();
		const user: string = Settings.Instance().getUser();
		const pwd: string = Settings.Instance().getPassword();
		const hexoroot: string = Settings.Instance().getHexoRoot();

		const conn: any = await SshClient.Instance.connect(host, port, user, pwd);
		if ( null !== conn )
		{

			let progressfinished:any = null;
				vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: `上传文章中...`,
					cancellable: false
				},
				progress => {
					let promise = new Promise((resolve, reject) => {
						progressfinished = resolve;
					});
		
					return promise;
				});

			SshClient.Instance.commitFolder(conn, getDir(curfilename), hexoroot
			 , (msg: string, curstep: number, totalsetp: number, wrap: boolean) => {
				if ( true === wrap ) {
					outputchannel.appendLine(msg);
				} else {
					outputchannel.append(msg);
				}

				if ( curstep === totalsetp ) {
					outputchannel.appendLine("上传完成，你还需要发布才会真正在网页上看到");
					progressfinished();
					conn.end();
				}
			});
		}

	});

	let disposable2 = vscode.commands.registerCommand('extension.hexowriter.generate', async () => {
		const host: string = Settings.Instance().getHost();
		const port: number = Settings.Instance().getPort();
		const user: string = Settings.Instance().getUser();
		const pwd: string = Settings.Instance().getPassword();
		const hexoroot: string = Settings.Instance().getHexoRoot();

		const conn: any = await SshClient.Instance.connect(host, port, user, pwd);
		if ( null !== conn )
		{
			let progressfinished:any = null;
				vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: `生成静态网页...`,
					cancellable: false
				},
				progress => {
					let promise = new Promise((resolve, reject) => {
						progressfinished = resolve;
					});
		
					return promise;
				});

			outputchannel.appendLine("准备生成静态网页.");
			const buf: any = await SshClient.Instance.sendCommand(conn, `cd ${hexoroot} && hexo generate`);
			const buf2: string[] = <string[]>buf;
			for (let i = 0; i < buf2.length; i++) {
				if (-1 !== buf2[i].indexOf("INFO ")) {
					
					let nstr: string = buf2[i];
					
					// 实在太困了， 先暴力点， 明天再优化这里
					nstr = nstr.replace(/\x1b\[30m/g, "");
					nstr = nstr.replace(/\x1b\[31m/g, "");
					nstr = nstr.replace(/\x1b\[32m/g, "");
					nstr = nstr.replace(/\x1b\[33m/g, "");
					nstr = nstr.replace(/\x1b\[34m/g, "");
					nstr = nstr.replace(/\x1b\[35m/g, "");
					nstr = nstr.replace(/\x1b\[36m/g, "");
					nstr = nstr.replace(/\x1b\[37m/g, "");
					nstr = nstr.replace(/\x1b\[38m/g, "");
					nstr = nstr.replace(/\x1b\[39m/g, "");

					outputchannel.appendLine(nstr);
				}
			}
			progressfinished();
			outputchannel.appendLine("生成静态网页完成.");
		}
	});

	const sbi = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	sbi.text = `$(cloud-upload) 上传文章`;
	sbi.command = "extension.hexowriter.commit";
	sbi.show();

	const sbi2 = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	sbi2.text = `$(note) 发布文章`;
	sbi2.command = "extension.hexowriter.generate";
	sbi2.show();

	context.subscriptions.push(disposable);
	context.subscriptions.push(disposable2);
}

// this method is called when your extension is deactivated
export function deactivate() {}
