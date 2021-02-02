
const { Client } = require("../index");

//  创建客户端对象, 并连接到'example'服务端
let client = new Client("example", (msg) => {
    console.log(`服务端发来的消息: ${msg}`);
});


// let i = 0;
// setInterval(() => {
//     if (++i > 10) return;
//     client.send(`你好啊, 服务端, 我是小明, 这是我第${i}次发来消息`, { broadcast:true });
// }, 2)

let i = 0;
setInterval(() => {
    client.send("hello");
    client.send("world");
}, 1000);

setTimeout(() => {
    client.destroy();
    client.send("hello").then(result => {
        console.log(`result = ${result}`);
    })
}, 10000);