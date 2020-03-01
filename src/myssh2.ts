import ssh2 = require('ssh2');
import fs = require('fs');
import vscode = require('vscode');
import path = require('path');
import os = require('os');

function getFileName(o: string) {
    let splitflag: string = "/";
    if ( "win32" === os.platform() ) {
        splitflag = "\\";
    }
    var pos = o.lastIndexOf(splitflag);
    return o.substring(pos + 1);
}

export class SshClient{

    public static readonly Instance: SshClient = new SshClient();

    private SshClient(){
 
    }

    /**
    * program：连接远程电脑
    * param：server 远程电脑凭证；cbfunc 回调函数
    * param：cbfunc(conn) 连接远程的client对象
    */
    public connect(host: string, port: number, user: string, password: string) {
        return new Promise(res => {

            const conn = new ssh2.Client();
            conn.on("ready", function(){
                res(conn);
            }).on('error', (err: string) => {
                console.log(`connect error! ${err}`);
                res(null);
            }).on('end', function() {
                console.log("connect end!");
            }).on('close', (err: string) => {
                console.log(`connect close ${err}`);
                res(null);
            }).connect({
                host: host,
                port: port,
                username: user,
                password: password,
            });

        });
    }


    /**
    * 描述：运行shell命令
    * 参数：server 远程电脑凭证；cmd 执行的命令；then 回调函数
    * 回调：then(err, data) ： data 运行命令之后的返回数据信息
    */
    public sendCommand(conn: any, cmd: string) {
        return new Promise( res => {
            conn.shell((err: any, stream: any) => {
                let isok: boolean = false;
                if(err){
                    console.log(`error：${err}`);
                    res("");
                }else{// end of if
                    let buf: string[] = [];
                    stream.on('close', function(){
                        console.log('close:' + buf);					
                        res(buf);
                    }).on('data', function(output: string) {
                        if(isok === false) {
                            isok = true;
                            stream.write(`${cmd}\r\n`);
                            stream.write(`echo @#CMD_FINISHED#@\r\n`);
                            stream.end();
                        }
                        let output2: string[] = `${output}`.split("\n");
                        for(let j = 0; j < output2.length; j++) {
                            if (0 === output2[j].length) {
                                continue;
                            }
                            buf.push(output2[j]);
                            console.log(`${output2[j]}`);
                            if ("@#CMD_FINISHED#@" === output2[j].substr(0, "@#CMD_FINISHED#@".length)) {
                                res(buf);
                            }
                        }
                        			
                    }).stderr.on('data', function(erroutput: string) {
                        console.log('stderr: ' + erroutput);
                        res(erroutput);
                    });
                }							
            });
        });
    }

    private async createRemoteFolder(conn: any, remotefolder: string) {
        console.log(`Create folder: ${remotefolder}`);
        return new Promise( async res => {
            const rls: any = await this.sendCommand(conn, `mkdir -p ${remotefolder}`);
            console.log(rls);
            res();
        });
    }

    private commitFile(conn: any, localfile: string, remotefilepath: string) {
        console.log(`Commit file: ${localfile} -> ${remotefilepath}`);
        return new Promise(res => {
            conn.sftp((err: any, sftp: any) => {
                if(err){
                    console.log(err);
                    res(false);
                }else{
                    sftp.fastPut(localfile, remotefilepath, (err: any, result: any) => {
                        res(true);
                    });
                }
            });
        });
    }

    public async commitFolder(conn: any, folder: string, hexoroot: string, stepfunc: any) {
        let splitflag: string = "/";
        if ( "win32" === os.platform() ) {
            splitflag = "\\";
        }
        if (splitflag === folder.substr(folder.length - 1)) {
            folder = folder.substr(0, folder.length - 1);
        }

        // 提取md里用到的图片
        const articlefile: string = path.join(folder, "article.md");
        var data = fs.readFileSync(articlefile, 'utf-8');
        const pattern = /!\[(.*?)\]\((.*?)\)/mg;
        const result = [];
        let matcher;

        while ((matcher = pattern.exec(data)) !== null) {
            const url: string = matcher[2]
            const imagefile: string = path.join(folder, url);

            result.push({
                url: url,
                local: imagefile
            });            
        }

        const totalstep: number = result.length * 2 + 3;
        let curstep: number = 1;

        const foldername: string = getFileName(folder);
        // 创建图片目录
        const remotefolder: string = path.join(hexoroot, `source/_posts`).replace(/\\/g, "/");;
        const remoteimagefolder: string = path.join(remotefolder, foldername).replace(/\\/g, "/");
        stepfunc(`Create remote folder ${remoteimagefolder}`, curstep++, totalstep, true);
        await this.createRemoteFolder(conn, remoteimagefolder);

        // 上传文章
        stepfunc(`Commit article `, curstep++, totalstep, false);
        const remotefilepath: string = path.join(remotefolder, `${foldername}.md`).replace(/\\/g, "/");
        const rls = await this.commitFile(conn, articlefile, remotefilepath);
        if ( true !== rls ) {
            stepfunc(`failed.`, curstep++, totalstep, true);
            console.log(`commit "${articlefile}" failed.`);
            return;
        }
        stepfunc(`successed.`, curstep++, totalstep, true);

        // 上传图片
        for(let i: number = 0; i < result.length; i++) {
            const remotefilepath: string = path.join(remoteimagefolder, result[i].url).replace(/\\/g, "/");
            stepfunc(`Commit image "${result[i].url}" `, curstep++, totalstep, false);
            const rls2 = await this.commitFile(conn, result[i].local, remotefilepath);
            if ( true !== rls2 ) {
                console.log(`commit "${articlefile}" failed.`);
                stepfunc(`failed.`, curstep++, totalstep, true);
            }else {
                console.log(`commit "${articlefile}" successed.`);
                stepfunc(`successed.`, curstep++, totalstep, true);
            }
        }
        // console.log(result);
    }

}