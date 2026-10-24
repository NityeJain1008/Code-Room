import {io} from "socket.io-client";

export const initSocket = async () => {
    const option = {
        "force-new-connection" : true, 
        reconnectionAttempt: "infinity",
        timeout : 10000, 
        transports: ["websockets"],
    };
    return io(process.env.REACT_APP_BACKEND_URL, option) ;
};

