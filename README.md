
### local-socket
应用于本地进程间通信的一种方式, 本地socket(基于node.js基础模块的封装), 支持广播\点对点等通信方式

### 安装
```
npm i local-socket
```

### API
- #### Server
  - [Server(socket_name, msg_handle[, timeout])](#Server)
  - [server.broadcast(msg)](#server.broadcast)
  - [server.unicast(client_uid, msg)](#server.unicast)
  - [server.destroy()](#server.destroy)
- #### Client
  - [Client(socket_name, msg_handle[, uid])](#Client)
  - [client.send(msg[, options[, timeout]])](#client.send)
  - [client.destroy()](#client.destroy)


#### Server(socket_name, msg_handle[, timeout])<i id="Server"/>
- **服务对象构造方法**
- `socket_name` `<String>` 要绑定到的socket文件名
- `msg_handle` `<Function>` 消息处理函数
  - 函数格式:`void function(data, replay)`
    - `data` `<Any>` 接收到的消息
    - `replay` `<Function>` 对该消息进行回复的方法
      - 函数格式:`void function(data)`
        - `data` `<Any>` 回复的内容
- `timeout` `<Number>` 启动监听绑定的超时时长(ms), **如果不传此参数则立即返回结果, 如果传此参数则返回`Promise<this>`**
```javascript
const { Server } = require("local-socket");
//  普通模式创建对象
let s1 = new Server("example1", (data, replay) => {});
//  异步模式创建服务对象
let s2 = await new Server("example2", (data, replay) => {}, 5000);
```

#### server.broadcast(msg)<i id="server.broadcast"/>
- **广播消息(向所有连接到socket的客户端发送消息(msg))**
- `msg` `<Any>` 发送的消息内容
```javascript
const { Server, Client } = require("local-socket");

let s1 = new Server("example1", (data, replay) => {});

let c1 = new Client("example1", (data) => { console.log(`c1:${data}`); });
//  c1:hello everyone!!!
let c2 = new Client("example1", (data) => { console.log(`c2:${data}`); });
//  c2:hello everyone!!!

await s1.broadcast("hello everyone!!!");
```

#### server.unicast(client_uid, msg)<i id="server.unicast"/>
- **点对点通信(向client_uid对应的客户端发送消息(msg)**
- `client_uid` `<String>` 客户端对象创建时传入的uid
- `msg` `<Any>` 发送的消息内容
```javascript
const { Server, Client } = require("local-socket");

let s1 = new Server("example1", (data, replay) => {});

let c1 = new Client("example1", (data) => { console.log(`c1:${data}`); }, "小明");
//  c1:hello 小明!!!
let c2 = new Client("example1", (data) => { console.log(`c2:${data}`); }, "小红");

await s1.unicast("小明", "hello 小明!!!");
```

#### server.destroy()<i id="server.destroy"/>
- **销毁当前对象,释放绑定的socket文件(一旦释放对象无法再使用)**
```javascript
const { Server } = require("local-socket");

let s1 = new Server("example1", (data, replay) => {});

s1.destroy();
//  无法再使用
await s1.broadcast("hello everyone!!!");
```

#### Client(socket_name, msg_handle[, uid])<i id="Client"/>
- **服务对象构造方法**
- `socket_name` `<String>` 要连接到的socket文件名
- `msg_handle` `<Function>` 消息处理函数
  - 函数格式:`void function(data)`
    - `data` `<Any>` 接收到的消息
- `uid` `<String>` 用于被Server识别的uid
```javascript
const { Client } = require("local-socket");

//  自动生成uid
let c1 = new Client("example1", (data) => {});
//  指定uid
let c2 = new Client("example1", (data) => {}, "小明");
```

#### client.send(msg[, options[, timeout]])<i id="client.send"/>
- **发送消息到服务端**
- `msg` `<Any>` 发送的消息内容
- `options` `<Object>` 可选项
    - `broadcast` `<Boolean>` 是否广播
- `timeout` `Number` 超时时长(ms)
```javascript
const { Server, Client } = require("local-socket");

let s1 = new Server("example1", (data, replay) => { console.log(`s1:${data}`); });
//  s1:hello Server!!!

let c1 = new Client("example1", (data) => { console.log(`c1:${data}`); });
//  c1:hello everyone!!!
let c2 = new Client("example1", (data) => { console.log(`c2:${data}`); });
//  c2:hello everyone!!!

await c1.send("hello Server!!!");
await c2.send("hello everyone!!!", { broadcast:true });
```

#### client.destroy()<i id="client.destroy"/>
- **销毁当前对象(一旦释放对象无法再使用)**
```javascript
const { Client } = require("local-socket");

let c1 = new Client("example1", (data) => {});

c1.destroy();
//  无法再使用
await c1.send("hello Server!!!");
```
