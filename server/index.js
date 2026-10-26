const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

const userSocketMap = {};
const roomCodeMap = new Map();

const getAllConnectedClients = (roomId) => {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
};

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join", ({ roomId, username }) => {
        console.log("Room ID:", roomId);
        console.log("Username received:", username);

        userSocketMap[socket.id] = username;
        socket.join(roomId);

        const clients = getAllConnectedClients(roomId);
        console.log("Connected clients:", clients);

        clients.forEach(({ socketId }) => {
            io.to(socketId).emit('joined', {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on("code-change", ({ roomId, code }) => {
        if (typeof roomId !== "string" || typeof code !== "string" || !socket.rooms.has(roomId)) {
            console.error("Rejected code change from socket outside its room");
            return;
        }

        roomCodeMap.set(roomId, code);
        socket.to(roomId).emit("code-change", { code });
    });

    socket.on("request-code", ({ roomId }) => {
        if (typeof roomId !== "string" || !socket.rooms.has(roomId)) {
            console.error("Rejected code sync request from socket outside its room");
            return;
        }

        socket.emit("sync-code", { code: roomCodeMap.get(roomId) ?? "" });
    });

    socket.on("disconnecting", () => {
        const username = userSocketMap[socket.id];
        console.log(`User disconnected: ${socket.id} with username ${username}`);

        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            if (roomId !== socket.id) {
                socket.to(roomId).emit("disconnected", {
                    socketId: socket.id,
                    username,
                });
            }
        });
    });

    socket.on("disconnect", () => {
        delete userSocketMap[socket.id];
    });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
