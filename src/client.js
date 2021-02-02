
const net = require("net");
const { EventEmitter } = require("events");
const { SocketStatus, SocketError, SocketMessage } = require("./socket_tools");

/**
 * 本地socket - 客户端
 * @function send 发送消息到服务端
 * @function destroy !!!销毁对象,销毁后无法再次使用
 */
class Client {
  //  事件触发对象<EventEmitter>, 用来进行"连接"通知
  _emitter = new EventEmitter();
  //  连接超时定时器<Timer>
  _connect_timer = null;


  /**
   * 创建本地socket[客户端]对象
   * @param {String} socket_file 本地socket文件
   * @param {Function} msg_handle 消息处理函数
   * @param {Object} options 选择配置项
   * ```
   * {
   *   "uid": <String>客户端标识,
   *   "reconnect": <Boolean>是否启用重连(true:启用,false:禁用)(默认:true),
   *   "interval": <Number>尝试重连的间隔时长(ms)(默认:1000)
   * }
   * ```
   */
  constructor(socket_file, msg_handle, options) {
    //  初始化参数存储
    this.socket_file = socket_file;
    this.msg_handle  = msg_handle || new Function();
    this.options     = options || {};
    this.uid         = this.options.uid || `${Date.now()}`;
    //  对象相关属性初始化(错误码,状态码)
    this.error  = SocketError.NORMAL;
    this.status = SocketStatus.UNSTART;
    this.client = null;
    
    //  启动自动重连机制(定时器)
    this._start_auto_connect();
  }

  /**
   * 发送消息到服务端
   * @param {String} msg 要发送的消息内容
   * @param {Object} options 其他选择配置
   * ```
   * {
   *   "broadcast": true     //true:请求广播, false:普通消息
   * }
   * ```
   * @param {Number} timeout 超时时长
   * @return {Number} 发送结果, 0:发送成功, !0:发送失败
   */
  async send(msg, options={}, timeout=5000) {
    //  对象已销毁无法再次使用
    if (this.status == SocketStatus.DESTROYED) {
      //  更新错误状态码,"已销毁对象无法再使用"
      return this.error = SocketError.IS_DESTROYED;
    }
    
    //  对象错误或未连接, 需要重新尝试建立连接, 然后进行消息发送
    if (this.status != SocketStatus.WORKING) {
      //  对客户端socket尝试进行重新连接
      let result = await this._connect(timeout);
      //  连接失败/错误,更新错误状态码,"对象未连接,无法进行此操作"
      if (result != 0) { return this.error = SocketError.IS_UNCONNECT; }
    }

    //  可选项 broadcast:是否广播
    let { broadcast } = options;

    //  将消息发送给服务端, 注意携带options是否广播
    (broadcast == true)
      ? this.client.write(SocketMessage.serialize("broadcast", msg))
      : this.client.write(SocketMessage.serialize("data",      msg));

    //  发送成功,更新错误状态码,"操作成功"
    return this.error = SocketError.NORMAL;
  }

  /**
   * 关闭/销毁当前对象, 释放本地socket文件
   * @return {Number} 操作结果, 0:销毁成功, !0:销毁失败/出错
   */
  destroy() {
    //  已经销毁的对象无法再次使用
    if (this.status == SocketStatus.DESTROYED) {
      //  更新错误状态码,"操作成功"
      return this.error = SocketError.NORMAL;
    }
    //  清除自动重连定时器
    if (this._connect_timer != null) {
      clearInterval(this._connect_timer);
      this._connect_timer = null;
    }

    //  主动关闭服务
    this._close();
    //  更新对象状态
    this.client = null;
    this.error  = SocketError.NORMAL;
    this.status = SocketStatus.DESTROYED;

    //  销毁成功
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
   * 连接socket
   * @param {Number} timeout 超时时长(ms), 默认5s
   * @return {Number} 0:连接成功, !0:连接失败/出错
   */
  async _connect(timeout=5000) {
    //  已处在"工作状态",直接返回启动成功,更新错误状态码,"操作成功"
    if (this.status == SocketStatus.WORKING) {
      return this.error = SocketError.NORMAL;
    }  
    //  "已销毁"的对象,无法再次使用,直接返回错误状态码,"对象已销毁,无法再使用"
    if (this.status == SocketStatus.DESTROYED) {
      return this.error = SocketError.IS_DESTROYED;
    }
    //  "正在启动中"的对象无法进行重复操作,直接返回错误状态码,"对象正在启动中,请等待启动结果"
    if (this.status == SocketStatus.STARTING) {
      return this.error = SocketError.IS_STARTING;
    } 
    //  更新状态为"启动中"
    this.status = SocketStatus.STARTING;

    //  创建socket对象,绑定相关事件处理方法,并设置监听
    this.client = net.createConnection(`\\\\?\\pipe\\${this.socket_file}`);
    this.client.on("connect", this._connect_handle.bind(this));
    this.client.on("data",    this._data_handle.bind(this));
    this.client.on("close",  () => { 
      //  工作中如果断开了连接, 则再次启动重连机制
      if (this.status==SocketStatus.WORKING) {
        this.status = SocketStatus.UNSTART
        this._start_auto_connect();
      }
    });
    this.client.on("drain",  () => { });
    this.client.on("end",    () => { });
    this.client.on("error", err => { });
    this.client.on("lookup", () => { });
    this.client.on("ready",  () => { });
    this.client.on("timeout",() => { });
    this.client.setEncoding("utf8");


    //  连接事件 Promise
    const connect_promise = new Promise((res, rej) => {
      this._emitter.on("connect", res);
    })
    //  连接超时 Promise
    const timeout_promise = new Promise((res, rej) => {
      this._connect_timer = setTimeout(() => {
        //  更新错误状态码,"连接失败/超时"
        this.error = SocketError.CONNECT_TIMEOUT;
        //  返回连接失败/超时结果(false)
        res(false);
      }, timeout);
    })

    //  等待 连接超时/连接成功 2个条件谁先成立
    return Promise.race([ timeout_promise, connect_promise ]).then(result => {
      //  清除连接事件监听 和 连接超时定时器
      this._emitter.removeAllListeners("connect");
      if (this._connect_timer != null) {
        clearTimeout(this._connect_timer);
        this._connect_timer = null;
      }

      //  false:连接失败/超时, true:连接成功
      (result == false) 
        ? this._close()
        : this.error = SocketError.NORMAL;

      //  返回连接结果, true:连接成功, false:连接失败
      return result ? 0 : -1;
    });
  }

  /**
   * 断开连接
   * @return {Number} 关闭操作结果, 0:关闭成功
   */
  async _close() {
    if (this.client) {
      this.client.removeAllListeners();
      this.client.unref();
      this.client.destroy();
    }
    
    this.client = null;
    this.status = SocketStatus.UNSTART;
    //  断开成功,"操作成功"
    return this.error = SocketError.NORMAL;
  }

  /**
   * 启动自动重连机制(定时器)
   * @return {Boolean} 启动结果, true:启动成功, false:启动失败
   */ 
  _start_auto_connect() {
    //  如果当前对象处于 已销毁(DESTROYED)或启动中(STARTING)
    //  则直接返回, 不再进行后边的操作.
    if ((this.status==SocketStatus.DESTROYED)
    ||  (this.status==SocketStatus.STARTING)) {
      return false;
    }

    //  如果重连定时器存在则表示重连机制启动中
    if (this.reconnect_timer) 
      return false;

    //  连接控制参数, reconnect:是否重连, interval:重连间隔时间
    let { reconnect=true, interval=1000 } = this.options;
    if ((typeof reconnect) != "boolean")     reconnect = true;
    if ((typeof interval)  != "number")      interval  = 1000;
    if (interval<200 || interval>1000*60*60) interval  = 1000;
    //  尝试重连的定时器
    this.reconnect_timer = setInterval(async () => {
      //  每次连接的等待时长(ms)
      let timeout = interval < 1000 ? interval : 1000;
      //  连接服务器
      let result = await this._connect(timeout);
      //  连接成功 或 未启用重连机制
      //  则 删除重连定时器.
      if ((result==0) || (reconnect==false)) {
        clearInterval(this.reconnect_timer);
        this.reconnect_timer = null;
      }
    }, interval);

    return true;
  }

  /**
   * 连接成功事件处理函数
   */
  //  更新客户端状态
  _connect_handle() {
    this.status = SocketStatus.WORKING;
    //  连接成功后自动发送自身标识消息到服务端
    this.client.write(SocketMessage.serialize("connect", this.uid));

    //  触发事件 "connect":连接成功
    this._emitter.emit("connect", true);
  }

  /**
   * 消息事件处理函数
   * @param {String} msg 消息内容
   * ```
   * 数据样例:
   * '{"type":"消息类型","value":"消息内容"}'
   * ```
   */
  _data_handle(msgs) {
    //  解析msg消息
    msgs = SocketMessage.unserialize(msgs);

    for (let msg of msgs) {
      if (msg == null) return;


      //  解析msg, type:消息类型, value:消息值
      let { type, value } = msg;
      //  根据消息类型进行相应操作
      switch (type) {
        //  普通消息, 将数据拆分并通过msg_handle进行传出给用户
        case "data": {
          this.msg_handle(value);
        } break;
  
        //  退出消息, 主动断开当前连接
        case "exit": {
          this._close();
        } break;
      }
    }
  }
}


module.exports = {
  Client
}
