
const net = require("net");
const Stream = require("stream");
const { SocketStatus, SocketError, SocketMessage } = require("./socket_tools");


//  @todo
//  1.替换所有错误状态码
//  2.连接失败/重复连接的错误及异常处理, (计划在构造函数中返回新的Promise包裹对象与结果给客户去处理)


/**
 * 本地socket - 服务端
 * @function broadcast 发送广播消息
 * @function unicast 发送点对点消息
 * @function destroy !!!销毁对象,销毁后无法再次使用
 */
class Server {
  /**
   * 创建本地socket[服务端]对象
   * @param {String} socket_file 本地socket文件
   * @param {Function} msg_handle 消息处理函数
   * @param {Number} timeout 超时时长(ms), 传此参数说明Promise模式, 不传参数说明普通模式
   * @return {Promise<this>|this} 对象实例, 如果传入了timeout参数,则返回Promise<this>, 如果不传则返回this
   * @throws 监听启动失败/错误
   */
  constructor(socket_file, msg_handle, timeout) {
    //  初始化参数存储
    this.socket_file = socket_file;
    this.msg_handle  = msg_handle;
    //  对象相关属性初始化(状态,socket集合,错误状态码)
    this.error   = SocketError.NORMAL;
    this.status  = SocketStatus.UNSTART;
    this.server  = null;
    this.sockets = new Map();
    this.stream  = new Stream();
    this.stream.readable = true;

    //  启动监听
    //  创建socket对象,绑定相关事件处理方法,并设置监听
    this.server = net.createServer(this._connect_handle.bind(this));
    this.server.on("listening",      () => { this.status = SocketStatus.WORKING; });
    this.server.on("connection", socket => { this.stream.pipe(socket); });
    this.server.on("close",         ()  => { });
    this.server.on("error",         err => { this.status = SocketStatus.ERROR; });
    this.server.listen(`\\\\?\\pipe\\${this.socket_file}`);

    if (timeout > 0) {
      //  记录启动监听的开始时间,用来计算启动超时
      let start_time = Date.now();

      return new Promise(async (res, rej) => {
        this.server.once("error", err => rej(err));
        while (this.status != SocketStatus.WORKING) {
          if ((Date.now()-start_time) > timeout) {
            this._unlisten();
            rej(new Error("启动失败/超时"));
          }
          //  延时等待10ms
          await new Promise((res2, rej2) => setTimeout(res2, 10));
        }
        res(this);
      })
    } else {
      if (this.server.listening == false)
        throw new Error("监听启动失败");
      return this;
    }
  }

  /**
   * 发送广播消息
   * @param {Any} msg 要广播的消息内容
   * @return {Boolean} 广播结果, 0:广播成功, !0:广播失败/错误
   */
  async broadcast(msg) {
    //  判断对象状态
    if (this.status == SocketStatus.DESTROYED) {
      //  更新错误状态码,"对象已销毁,无法再使用"
      return this.error = SocketError.IS_DESTROYED;
    }
    if (this.status != SocketStatus.WORKING) {
      //  更新错误状态码,"未工作状态,无法执行此操作"
      return this.error = SocketError.IS_UNWORKING;
    }

    //  将消息发送到管道中, 流给所有的socket客户端
    let data = SocketMessage.serialize("data", msg);
    this.stream.emit("data", data);

    //  广播成功,"操作成功"
    return this.error = SocketError.NORMAL;
  }

  /**
   * 发送点对点消息
   * @param {String} client_uid 客户端标识
   * @param {Any} msg 要发送的消息内容
   * @return {Boolean} 发送结果, 0:表示发送成功, !0:表示发送失败/出错
   */
  async unicast(client_uid, msg) {
    //  判断对象状态
    if (this.status == SocketStatus.DESTROYED) {
      //  更新错误状态码,"对象已销毁,无法再使用"
      return this.error = SocketError.IS_DESTROYED;
    }
    if (this.status != SocketStatus.WORKING) {
      //  更新错误状态码,"未工作状态,无法执行此操作"
      return this.error = SocketError.IS_UNWORKING;
    }

    //  从socket集合中取出对应uid的socket连接
    //  不存在对应客户端标识的客户端连接
    if (this.sockets.has(client_uid) == false) {
      //  返回对应状态码,"客户端未在线,发送消息失败"
      return this.error = SocketError.CLIENT_OFFLINE;
    }

    //  将消息发送给该socket
    let dest_socket = this.sockets.get(client_uid);
    dest_socket.write(SocketMessage.serialize("data", msg));

    //  返回发送结果,"操作成功"
    return this.error = SocketError.NORMAL;
  }

  /**
   * 关闭/销毁当前对象, 释放本地socket文件
   * @return {Number} 操作结果, 0:销毁成功, !0:销毁失败/出错
   */
  destroy() {
    //  判断对象状态
    if (this.status == SocketStatus.DESTROYED) {
      return this.error = SocketError.NORMAL;
    }

    //  正在工作状态, 则发送广播通知所有客户端断开连接
    if (this.status == SocketStatus.WORKING) {
      this.stream.emit("data", SocketMessage.serialize("exit", null));
    }

    //  主动关闭服务对象,并更新状态
    this.server.close();
    this.server.unref();
    this.status  = SocketStatus.DESTROYED;
    this.error   = SocketError.NORMAL;
    this.sockets = null;
    this.stream  = null;

    //  返回操作结果
    return SocketError.NORMAL;
  }

  /**
   * 获取操作是否错误
   * @return {Boolean} true:发生了错误 false:没有错误
   */
  is_error() {
    return this.error != SocketError.NORMAL;
  }

  /**
   * 获取操作结果描述
   * @return {String} 操作结果描述字符串
   */
  result_describe() {
    return SocketError.get_describe(this.error);
  }
  
  /**
   * 消息事件处理函数
   * @param {String} msg 消息内容s
   * @param {Socket} socket 客户端对象
   */
  _data_handle(msgs, socket) {
    //  消息需要统一的格式协议(与server协定), 不符合统一协议的消息直接丢弃
    msgs = SocketMessage.unserialize(msgs);

    for (let msg of msgs) {
      //  非协议消息会在序列化之后返回null
      if (msg == null) return;


      

      //  解析msg, type:消息类型, value:消息值
      let { type, value } = msg;
      //  根据消息类型进行相应操作
      switch (type) {
        //  客户端首次连接消息, 将socket记录到this.sockets中
        case "connect": {
          socket.uid = value;
          this.sockets.set(value, socket);
        } break;

        //  请求广播, 调用广播方法对消息进行广播
        case "broadcast": {
          this.broadcast(value);
        } break;

        //  普通消息, 将消息发送给msg_handle处理
        case "data": {
          let replay = (data) => socket.write(SocketMessage.serialize("data", data));
          this.msg_handle(value, replay);
        } break;
      }
    }
  }

  /**
   * 服务连接处理函数
   * @param {Socket} socket 客户端对象
   */
  _connect_handle(socket) {
    socket.on("data", (msg) => this._data_handle(msg, socket));
    socket.on("connect", () => {  });
    socket.on("close",   () => { this.sockets.delete(socket.uid); });
    socket.on("ready",   () => {  });
    socket.on("drain",   () => {  });
    socket.on("end",     () => {  });
    socket.on("lookup",  () => {  });
    socket.on("timeout", () => {  });
    socket.on("error",  err => {  });
    socket.setEncoding("utf8");
  }

  /**
   * 停止监听
   * @return {Number} 操作结果, 0:停止监听成功
   */
  async _unlisten() {
    if (this.server) {
      this.server.removeAllListeners();
      this.server.close();
      this.server.unref();
    }

    this.server = null;
    this.status = SocketStatus.UNSTART;
    //  停止监听成功,"操作成功"
    return this.error = SocketError.NORMAL;
  }
}


module.exports = {
  Server
}
