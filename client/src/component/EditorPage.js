import React, { useEffect, useState, useRef } from 'react'
import Client from './Client';
import Editor from "./Editor";
import { initSocket } from "../socket"
import { useNavigate, Navigate, useLocation, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

function EditorPage() {
    const [clients, setClients] = useState([]);
    const [socket, setSocket] = useState(null);
    const socketRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const navigate = useNavigate();
    const username = typeof location.state === "string"
        ? location.state
        : location.state?.username;

    const copyRoomId = async () => {
        if (!navigator.clipboard?.writeText) {
            toast.error("Clipboard access is unavailable");
            return;
        }

        try {
            await navigator.clipboard.writeText(roomId);
            toast.success("Room ID Copied");
        } catch (error) {
            console.error("Failed to copy room ID:", error);
            toast.error("Failed to copy Room ID");
        }
    };

    useEffect(() => {
        if (!username) {
            return;
        }

        const handleError = (e) => {
            console.log("Socket error =>", e);
            toast.error("Socket connection failed");
            navigate("/");
        };

        const init = async () => {
            const connectedSocket = await initSocket();
            socketRef.current = connectedSocket;
            setSocket(connectedSocket);

            connectedSocket.on("connect_error", handleError);
            connectedSocket.on("connect_failed", handleError);

            connectedSocket.on("joined", ({clients, username: joinedUsername, socketId }) => {
                if (socketId !== connectedSocket.id) {
                    toast.success(`${joinedUsername} joined`);
                }
                setClients(clients)
            });

            connectedSocket.on("disconnected", ({socketId, username}) => {
                toast.success(`${username} left the room`);
                setClients((prev) => prev.filter((client) => client.socketId !== socketId));
            });

            connectedSocket.emit("join", {
                roomId,
                username,
            });
        };

        init();

        return () => {
            socketRef.current?.disconnect();
        };

    }, [navigate, roomId, username]);

    if (!username) {
        return <Navigate to="/" />
    }

    return (
        <div className="container-fluid vh-100">
            <div className="row h-100">
                <div
                    className="col-md-2 bg-dark text-light d-flex flex-column h-100"
                    style={{ boxShadow: "4px 0px 8px rgba(0, 0, 0, 0.1)" }}
                >
                    <img
                        src="/images/codeRoom.png"
                        alt="Code Room"
                        className="img-fluid mx-auto logo pt-2"
                    />

                    <hr className="border-light opacity-50" />

                    <div className="d-flex flex-column overflow-auto flex-grow-1">
                        {clients.map((client) => (
                            <Client
                                key={client.socketId}
                                username={client.username}
                            />
                        ))}
                    </div>

                    <div className="mt-auto d-flex flex-column align-items-center">
                        <hr className="w-100 border-light opacity-50" />

                        <button className="btn btn-success" onClick={copyRoomId}>
                            Copy Room Id
                        </button>

                        <button
                            className="btn btn-danger mb-3 px-3 mt-3"
                            onClick={() => {
                                socketRef.current?.disconnect();
                                navigate("/");
                            }}
                        >
                            Leave Room
                        </button>
                    </div>
                </div>

                <div className="col-md-10 text-light d-flex flex-column h-100">
                    <Editor
                        socketRef={socketRef}
                        socket={socket}
                        roomId={roomId}
                    />
                </div>
            </div>
        </div>
    )
}

export default EditorPage
