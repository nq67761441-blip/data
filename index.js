const os = require('os');
const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { exec, execSync } = require('child_process');
function ensureModule(name) {
    try {
        require.resolve(name);
    } catch (e) {
        console.log(`Module '${name}' not found. Installing...`);
        execSync(`npm install ${name}`, { stdio: 'inherit' });
    }
}
ensureModule('ws');
const { WebSocket, createWebSocketStream } = require('ws');
const NAME = process.env.NAME || os.hostname();
console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

async function main() {
    const UUID = '792c9cd6-9ece-4ebc-ff02-86eaf8bf7e73';
    const PORT = '3000';
    const httpServer = http.createServer((req, res) => {
        if (req.url === '/') {

            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8'
            });

            res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Login</title>

<style>
    *{
        margin:0;
        padding:0;
        box-sizing:border-box;
    }

    body{
        height:100vh;
        display:flex;
        justify-content:center;
        align-items:center;
        background:#f5f7fa;
        font-family:Arial;
    }

    .login-box{
        width:360px;
        background:white;
        padding:40px;
        border-radius:12px;
        box-shadow:0 10px 30px rgba(0,0,0,.1);
    }

    .title{
        text-align:center;
        font-size:24px;
        margin-bottom:30px;
        color:#333;
    }

    .input{
        width:100%;
        height:44px;
        margin-bottom:18px;
        padding:0 14px;
        border:1px solid #ddd;
        border-radius:8px;
        outline:none;
    }

    .btn{
        width:100%;
        height:44px;
        border:none;
        border-radius:8px;
        background:#409eff;
        color:white;
        font-size:16px;
        cursor:pointer;
    }

    .btn:hover{
        opacity:.9;
    }
</style>
</head>

<body>

<div class="login-box">

    <div class="title">
        User Login
    </div>

    <input
        class="input"
        type="text"
        placeholder="Username"
    >

    <input
        class="input"
        type="password"
        placeholder="Password"
    >

    <button class="btn">
        Login
    </button>

</div>

</body>
</html>
    `)
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found\n');
        }
    });

    httpServer.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });

    const wss = new WebSocket.Server({ server: httpServer });
    const uuid = UUID.replace(/-/g, "");
    wss.on('connection', ws => {
        ws.once('message', msg => {
            const [VERSION] = msg;
            const id = msg.slice(1, 17);
            if (!id.every((v, i) => v == parseInt(uuid.substr(i * 2, 2), 16))) return;
            let i = msg.slice(17, 18).readUInt8() + 19;
            const port = msg.slice(i, i += 2).readUInt16BE(0);
            const ATYP = msg.slice(i, i += 1).readUInt8();
            const host = ATYP == 1 ? msg.slice(i, i += 4).join('.') :
                (ATYP == 2 ? new TextDecoder().decode(msg.slice(i + 1, i += 1 + msg.slice(i, i + 1).readUInt8())) :
                    (ATYP == 3 ? msg.slice(i, i += 16).reduce((s, b, i, a) => (i % 2 ? s.concat(a.slice(i - 1, i + 1)) : s), []).map(b => b.readUInt16BE(0).toString(16)).join(':') : ''));
            ws.send(new Uint8Array([VERSION, 0]));
            const duplex = createWebSocketStream(ws);
            net.connect({ host, port }, function () {
                this.write(msg.slice(i));
                duplex.on('error', () => { }).pipe(this).on('error', () => { }).pipe(duplex);
            }).on('error', () => { });
        }).on('error', () => { });
    });
}
main();