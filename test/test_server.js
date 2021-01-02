
const { Server } = require("../index");

//  创建服务对象,启动监听
let server = new Server("example", (data, reply) => {
    console.log(`收到消息:${data}`);
    
    reply("这里是回复给客户端的消息");
});

//  发送广播消息
server.broadcast("这里是广播的消息");

//  发送点对点消息
server.unicast("小明", "这里是专门发送给'小明'的消息");
