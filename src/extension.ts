// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SshClient } from './myssh2';
import { Settings } from './settings';
import os = require('os');
import fs = require('fs');
import path = require('path');

function formatDateTime(dt = -1) {
    let date;
    if ( -1 === dt ) {
        date = new Date();
    }
    else {
        date = new Date(dt);
    }
    let y = date.getFullYear();
    let m = date.getMonth() + 1;
    let d = date.getDate();
    let h = date.getHours();
    let minute = date.getMinutes();
    let second = date.getSeconds();

    const sm: string = m < 10 ? ('0' + m) : `${m}`;
    const sd: string = d < 10 ? ('0' + d) : `${d}`;
    const sh: string = h < 10 ? ('0' + h) : `${h}`;
    const sminute: string = minute < 10 ? ('0' + minute) : `${minute}`;
    const ssecond: string = second < 10 ? ('0' + second) : `${second}`;

    return `${y}-${sm}-${sd} ${sh}:${sminute}:${ssecond}`;
}

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

function makeDir(dirpath: string) {
	if (!fs.existsSync(dirpath)) {
		let pathtmp: string;
		let sp: string;
		if ( os.platform() === "win32" ) {
			sp = "\\";
		}
		else{
			sp = "/";
		}
		dirpath.split(sp).forEach(function(dirname) {
			if (pathtmp) {
				pathtmp = path.join(pathtmp, dirname);
			}
			else {
　　　　　　　　　 //如果在linux系统中，第一个dirname的值为空，所以赋值为"/"
				if(dirname){
					pathtmp = dirname;
				}else{
					pathtmp = "/";
				}
			}
			if (!fs.existsSync(pathtmp)) {
				fs.mkdirSync(pathtmp);
			}
		});
	}
	return true;
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

	let disposable3 = vscode.commands.registerCommand('extension.hexowriter.new', async () => {
		
		const opstions: any = {
			password:false, // 输入内容是否是密码
			ignoreFocusOut:false, // 默认false，设置为true时鼠标点击别的地方输入框不会消失
			placeHolder:'文章标题', // 在输入框内的提示信息
			prompt:'输入你这篇文章的标题', // 在输入框下方的提示信息
		};

		const cbfunc: any = (msg: string) => {
			console.log("用户输入："+msg);
			const newdir: string = `${vscode.workspace.rootPath}/${msg}`;
			makeDir(newdir);
			const articlefile: string = `${newdir}/article.md`;

			const headtitle: string = `---\n\
title: ${msg}\n\
date: ${formatDateTime()}\n\
tags:\n\
---\n`;

			fs.writeFile(articlefile, headtitle, () => {
				vscode.workspace.openTextDocument(articlefile).then((document)=>{
				vscode.window.showTextDocument(document, {
					preview: true
				});
				});
			});
		};

		vscode.window.showInputBox(opstions).then(cbfunc);
		
	});

	const sbi1 = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	sbi1.text = `$(file) 新建文章`;
	sbi1.command = "extension.hexowriter.new";
	sbi1.show();

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
	context.subscriptions.push(disposable3);
}

// this method is called when your extension is deactivated
export function deactivate() {}
