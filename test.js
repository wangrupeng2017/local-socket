
const { Server, Client } = require("./index");

//  API - Server
/**
const test = async function() {
    //  普通模式创建对象
    let s1 = new Server("example1", (data, replay) => {});
    //  异步模式创建服务对象
    let s2 = await new Server("example2", (data, replay) => {}, 5000);
}
test();
**/

//  API - server.broadcast
/**
const test = function() {
    let s1 = new Server("example1", (data, replay) => {});

    let c1 = new Client("example1", (data) => { console.log(`c1:${data}`); });
    //  c1:hello everyone!!!
    let c2 = new Client("example1", (data) => { console.log(`c2:${data}`); });
    //  c2:hello everyone!!!
    setTimeout(async () => {
        await s1.broadcast("hello everyone!!!");
    }, 1000);
}
test();
**/

//  API - server.unicast
/**
const test = function() {
    let s1 = new Server("example1", (data, replay) => {});

    let c1 = new Client("example1", (data) => { console.log(`c1:${data}`); }, "小明");
    //  c1:hello 小明!!!
    let c2 = new Client("example1", (data) => { console.log(`c2:${data}`); }, "小红");
    
    setTimeout(async () => {
        await s1.unicast("小明", "hello 小明!!!");
    }, 1000);
}
test();
**/

//  API - server.destroy
/**
const test = async function() {
    let s1 = new Server("example1", (data, replay) => {});

    let c1 = new Client("example1", (data) => { console.log(`c1:${data}`); });
    let c2 = new Client("example1", (data) => { console.log(`c2:${data}`); });

    s1.destroy();
    //  无法再使用
    setTimeout(async () => {
        await s1.broadcast("hello everyone!!!");
    }, 1000);
}
test();
**/   

//  API - Client
/**
const test = async function() {
    //  自动生成uid
    let c1 = new Client("example1", (data) => {});
    //  指定uid
    let c2 = new Client("example1", (data) => {}, "小明");
}
test();
**/

//  API - client.send
/**
const test = async function() {
    let s1 = new Server("example1", (data, replay) => { console.log(`s1:${data}`); });
    //  s1:hello Server!!!

    let c1 = new Client("example1", (data) => { console.log(`c1:${data}`); });
    //  c1:hello everyone!!!
    let c2 = new Client("example1", (data) => { console.log(`c2:${data}`); });
    //  c2:hello everyone!!!

    setTimeout(async () => {
        await c1.send("hello Server!!!");
        await c2.send("hello everyone!!!", { broadcast:true });
    }, 1000);
}
test();
**/

//  API - client.destroy
/**
const test = async function() {
    let s1 = new Server("example1", (data, replay) => { console.log(`s1:${data}`); });

    let c1 = new Client("example1", (data) => {});

    c1.destroy();
    //  无法再使用
    setTimeout(async () => {
        await c1.send("hello Server!!!");
    }, 1000);
}
test();
**/



//  测试先打开client, 后打开server的情况
/**
let client = new Client("test", (data) => { console.log(`client:${data}`); })

setTimeout(() => {
    let server = new Server("test", (data, replay) => { console.log(`server:${data}`) });
    
    setInterval(() => {
        server.broadcast("hello client!");
    }, 1000);
}, 10000);
**/
