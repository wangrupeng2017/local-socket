
/**
 * 本地socket状态码
 */
class SocketStatus {
    static UNSTART   = 0;  //未启动
    static STARTING  = 1;  //正在启动中
    static WORKING   = 2;  //工作中
    static ERROR     = 3;  //出错的
    static DESTROYED = 4;  //已销毁的
}


/**
 * 错误状态码
 * @function get_describe 获取错误描述
 */
class SocketError {
    static NORMAL          = 0;     //"正常的"
    static IS_DESTROYED    = 1001;  //"对象已销毁,无法再使用"
    static IS_UNCONNECT    = 1002;  //"对象未连接,无法进行此操作"
    static IS_STARTING     = 1003;  //"对象正在启动中,请等待启动结果"
    static CONNECT_TIMEOUT = 1004;  //"连接失败/超时"
    static IS_UNWORKING    = 1005;  //"未工作状态,无法执行此操作"
    static CLIENT_OFFLINE  = 1006;  //"客户端未在线,发送消息失败"
    static START_TIMEOUT   = 1007;  //"启动失败/超时"
    static ADDRESS_REPEAT  = 1008;  //"监听失败,地址已经被使用"

    static get_describe(code) {
        switch(code) {
            case SocketError.NORMAL:  
                return "操作成功";
            case SocketError.IS_DESTROYED:
                return "对象已销毁,无法再使用";
            case SocketError.IS_UNCONNECT:
                return "对象未连接,无法进行此操作";
            case SocketError.IS_STARTING:
                return "对象正在启动中,请稍后尝试操作";
            case SocketError.CONNECT_TIMEOUT:
                return "连接失败/超时";
            case SocketError.IS_UNWORKING:
                return "未工作状态,无法执行此操作";
            case SocketError.CLIENT_OFFLINE:
                return "客户端未在线,发送消息失败";
            case SocketError.START_TIMEOUT:
                return "启动失败/超时";
            case SocketError.ADDRESS_REPEAT:
                return "监听失败,地址已经被使用";

            default:
                return "未知错误";
        }   
    }
}


/**
 * socket消息 - 协议
 * @function serialize 消息序列化
 * @function unserialize 消息反序列化
 */
class SocketMessage {
    /**
     * 消息序列化
     * @param {String} type 消息类型
     * @param {Any} value 消息值
     * @return {String} 序列化后的消息内容
     */
    static serialize(type, value) {
        let msg = JSON.stringify({ type, value });
        return msg.length.toString().padStart(8, '0') + msg;
    }

    /**
     * 消息反序列化
     * @param {String} msg 序列化的消息内容
     * @return {Array<Object>} 消息结构体数组
     * ```
     * [{
     *   "type":"消息类型",
     *   "value":<Any>消息内容
     * }]
     * ```
     */
    static unserialize(msg) {
        let ok_msgs = [];
        let str_p  = 0;
        
        while(str_p < msg.length) {
            let length = parseInt(msg.slice(str_p, str_p+8));
            str_p += 8;

            let item = msg.slice(str_p, str_p+length);
            str_p += length;
            
            try {
                let ok_msg = JSON.parse(item);
                ok_msgs.push(ok_msg);
            } catch(err) {
                ok_msgs.push(null);
            }
        }

        return ok_msgs;
    }
}


module.exports = {
    SocketStatus,
    SocketError,
    SocketMessage
}
