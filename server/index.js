require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");

const app = express();
const server = http.createServer(app);
app.use((req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});
app.use(express.json({ limit: "1mb" }));

const languageIds = {
    javascript: 63,
    python: 71,
    cpp: 54,
    java: 62,
};

app.post("/api/execute", async (req, res) => {
    const { language, sourceCode } = req.body ?? {};

    if (typeof language !== "string" || !Object.hasOwn(languageIds, language)) {
        return res.status(400).json({ error: "Choose a supported programming language." });
    }

    if (typeof sourceCode !== "string") {
        return res.status(400).json({ error: "Source code must be a string." });
    }

    const apiKey = process.env.ONLINECOMPILER_API_KEY || process.env.JUDGE0_API_KEY;
    if (!apiKey) {
        return res.status(503).json({
            error: "OnlineCompiler is not configured. Set ONLINECOMPILER_API_KEY in server/.env.",
        });
    }

    const configuredBaseUrl = process.env.ONLINECOMPILER_BASE_URL
        || process.env.JUDGE0_API_HOST
        || "https://api.onlinecompiler.io";
    const baseUrl = configuredBaseUrl.replace(/\/+$/, "");
    const judge0BaseUrl = baseUrl.endsWith("/api/judge0")
        ? baseUrl
        : `${baseUrl}/api/judge0`;

    try {
        const { data } = await axios.post(
            `${judge0BaseUrl}/submissions?base64_encoded=false&wait=true`,
            {
                source_code: sourceCode,
                language_id: languageIds[language],
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: apiKey,
                },
                timeout: 30000,
            }
        );

        return res.json({
            stdout: data.stdout,
            stderr: data.stderr,
            compile_output: data.compile_output,
            message: data.message,
            status: data.status,
            time: data.time,
            memory: data.memory,
        });
    } catch (error) {
        console.error("OnlineCompiler request failed:", error.message);
        const upstreamMessage = error.response?.data?.error
            || error.response?.data?.message
            || error.message;
        return res.status(502).json({
            error: typeof upstreamMessage === "string"
                ? upstreamMessage
                : "OnlineCompiler is unavailable. Please try again.",
        });
    }
});

const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

const userSocketMap = {};
const roomCodeMap = new Map();
const roomOutputMap = new Map();

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

        const roomOutput = roomOutputMap.get(roomId);
        if (roomOutput) {
            socket.emit("compiler-output", roomOutput);
        }

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

    socket.on("compiler-output", ({ roomId, output }) => {
        if (typeof roomId !== "string" || !socket.rooms.has(roomId)) {
            console.error("Rejected compiler output from socket outside its room");
            return;
        }

        if (!output || typeof output !== "object" || Array.isArray(output)) {
            console.error("Rejected invalid compiler output");
            return;
        }

        const result = output.result && typeof output.result === "object"
            && !Array.isArray(output.result)
            ? output.result
            : null;
        const status = result?.status && typeof result.status === "object"
            ? {
                id: typeof result.status.id === "number" ? result.status.id : undefined,
                description: typeof result.status.description === "string"
                    ? result.status.description
                    : undefined,
            }
            : undefined;
        const sharedOutput = {
            result: result
                ? {
                    stdout: typeof result.stdout === "string" ? result.stdout : undefined,
                    stderr: typeof result.stderr === "string" ? result.stderr : undefined,
                    compile_output: typeof result.compile_output === "string"
                        ? result.compile_output
                        : undefined,
                    message: typeof result.message === "string" ? result.message : undefined,
                    status,
                    time: typeof result.time === "string" ? result.time : undefined,
                    memory: typeof result.memory === "number" ? result.memory : undefined,
                }
                : null,
            error: typeof output.error === "string" ? output.error : "",
        };

        if (!sharedOutput.result && !sharedOutput.error) {
            console.error("Rejected empty compiler output");
            return;
        }

        roomOutputMap.set(roomId, sharedOutput);
        io.to(roomId).emit("compiler-output", sharedOutput);
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
