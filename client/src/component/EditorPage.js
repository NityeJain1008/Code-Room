import React, { useEffect, useState, useRef } from 'react'
import axios from "axios";
import Client from './Client';
import Editor from "./Editor";
import { initSocket } from "../socket"
import { useNavigate, Navigate, useLocation, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const MIN_OUTPUT_HEIGHT = 100;

const getMaximumOutputHeight = (editorColumnRef) => Math.max(
    MIN_OUTPUT_HEIGHT,
    (editorColumnRef.current?.clientHeight || 600) - 140
);

function EditorPage() {
    const [clients, setClients] = useState([]);
    const [socket, setSocket] = useState(null);
    const [language, setLanguage] = useState("javascript");
    const [result, setResult] = useState(null);
    const [executionError, setExecutionError] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const [outputHeight, setOutputHeight] = useState(() => (
        window.matchMedia("(max-width: 767.98px)").matches ? 180 : 280
    ));
    const [isResizingOutput, setIsResizingOutput] = useState(false);
    const socketRef = useRef(null);
    const codeMirrorRef = useRef(null);
    const editorColumnRef = useRef(null);
    const resizeStartRef = useRef({ y: 0, height: 0 });
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

    const runCode = async () => {
        if (!codeMirrorRef.current) {
            setExecutionError("The editor is not ready yet.");
            return;
        }

        setIsRunning(true);
        setResult(null);
        setExecutionError("");

        try {
            const backendUrl = process.env.REACT_APP_BACKEND_URL?.replace(/\/$/, "") || "";
            const response = await axios.post(`${backendUrl}/api/execute`, {
                language,
                sourceCode: codeMirrorRef.current.getValue(),
            });
            setResult(response.data);
            socketRef.current?.emit("compiler-output", {
                roomId,
                output: { result: response.data, error: "" },
            });
        } catch (error) {
            console.error("Code execution failed:", error);
            const message =
                error.response?.data?.error
                    || (error.response?.status === 404
                        ? "Compiler API not found. Check that the backend is running and REACT_APP_BACKEND_URL points to it."
                        : error.code === "ERR_NETWORK"
                            ? "Unable to reach the compiler backend. Start the server on port 5001, or set REACT_APP_BACKEND_URL to its reachable HTTPS address, then restart or rebuild the client."
                        : error.message)
                    || "Unable to run code.";
            setExecutionError(message);
            socketRef.current?.emit("compiler-output", {
                roomId,
                output: { result: null, error: message },
            });
        } finally {
            setIsRunning(false);
        }
    };

    const startOutputResize = (event) => {
        resizeStartRef.current = { y: event.clientY, height: outputHeight };
        setIsResizingOutput(true);
        event.preventDefault();
    };

    const resizeOutputWithKeyboard = (event) => {
        const heightChange = event.key === "ArrowUp" ? 24
            : event.key === "ArrowDown" ? -24
                : event.key === "PageUp" ? 80
                    : event.key === "PageDown" ? -80
                        : 0;

        if (heightChange) {
            event.preventDefault();
            const maxHeight = getMaximumOutputHeight(editorColumnRef);
            setOutputHeight((height) => Math.min(
                maxHeight,
                Math.max(MIN_OUTPUT_HEIGHT, height + heightChange)
            ));
        }
    };

    useEffect(() => {
        const fitOutput = () => {
            const maxHeight = getMaximumOutputHeight(editorColumnRef);
            setOutputHeight((height) => Math.min(maxHeight, height));
        };

        window.addEventListener("resize", fitOutput);
        return () => window.removeEventListener("resize", fitOutput);
    }, []);

    useEffect(() => {
        if (!isResizingOutput) {
            return undefined;
        }

        const resizeOutput = (event) => {
            const maxHeight = getMaximumOutputHeight(editorColumnRef);
            const nextHeight = resizeStartRef.current.height
                + resizeStartRef.current.y - event.clientY;
            setOutputHeight(Math.min(maxHeight, Math.max(MIN_OUTPUT_HEIGHT, nextHeight)));
        };
        const stopResizing = () => setIsResizingOutput(false);

        window.addEventListener("pointermove", resizeOutput);
        window.addEventListener("pointerup", stopResizing);
        window.addEventListener("pointercancel", stopResizing);

        return () => {
            window.removeEventListener("pointermove", resizeOutput);
            window.removeEventListener("pointerup", stopResizing);
            window.removeEventListener("pointercancel", stopResizing);
        };
    }, [isResizingOutput]);

    useEffect(() => {
        if (!username) {
            return;
        }

        const handleError = (e) => {
            console.log("Socket error =>", e);
            toast.error("Socket connection failed");
            navigate("/");
        };

        const handleCompilerOutput = ({ result: sharedResult, error }) => {
            setResult(sharedResult || null);
            setExecutionError(typeof error === "string" ? error : "");
        };

        const init = async () => {
            const connectedSocket = await initSocket();
            socketRef.current = connectedSocket;
            setSocket(connectedSocket);

            connectedSocket.on("compiler-output", handleCompilerOutput);
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
            socketRef.current?.off("compiler-output", handleCompilerOutput);
            socketRef.current?.disconnect();
        };

    }, [navigate, roomId, username]);

    if (!username) {
        return <Navigate to="/" />
    }

    return (
        <div className="container-fluid vh-100 room-page">
            <div className="row h-100 room-layout">
                <div
                    className="col-12 col-md-3 col-lg-2 bg-dark text-light d-flex flex-column h-100 room-sidebar"
                    style={{ boxShadow: "4px 0px 8px rgba(0, 0, 0, 0.1)" }}
                >
                    <img
                        src={`${process.env.PUBLIC_URL}/images/codeRoom.png`}
                        alt="Code Room"
                        className="img-fluid mx-auto logo pt-2"
                    />

                    <hr className="border-light opacity-50" />

                    <div className="d-flex flex-column overflow-auto flex-grow-1 room-client-list">
                        {clients.map((client) => (
                            <Client
                                key={client.socketId}
                                username={client.username}
                            />
                        ))}
                    </div>

                    <div className="mt-auto d-flex flex-column align-items-center room-actions">
                        <div className="compiler-controls">
                            <div className="compiler-title">Online compiler</div>
                            <label className="visually-hidden" htmlFor="compiler-language">
                                Programming language
                            </label>
                            <select
                                id="compiler-language"
                                className="form-select form-select-sm mb-2"
                                value={language}
                                onChange={(event) => setLanguage(event.target.value)}
                                disabled={isRunning}
                            >
                                <option value="javascript">JavaScript</option>
                                <option value="python">Python</option>
                                <option value="cpp">C++</option>
                                <option value="java">Java</option>
                            </select>
                            <button
                                className="btn btn-primary btn-sm w-100 mb-2"
                                onClick={runCode}
                                disabled={isRunning}
                            >
                                {isRunning ? (
                                    <>
                                        <span
                                            className="spinner-border spinner-border-sm me-2"
                                            role="status"
                                            aria-hidden="true"
                                        />
                                        Running...
                                    </>
                                ) : "Run code"}
                            </button>
                        </div>

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

                <div
                    ref={editorColumnRef}
                    className={`col-12 col-md-9 col-lg-10 text-light d-flex flex-column h-100 room-main${isResizingOutput ? " is-resizing-output" : ""}`}
                >
                    <div className="editor-workspace">
                        <Editor
                            socketRef={socketRef}
                            socket={socket}
                            roomId={roomId}
                            codeMirrorRef={codeMirrorRef}
                        />
                    </div>
                    <div
                        className="compiler-resize-handle"
                        role="separator"
                        aria-label="Resize output panel"
                        aria-orientation="horizontal"
                        aria-valuemin={MIN_OUTPUT_HEIGHT}
                        aria-valuemax={getMaximumOutputHeight(editorColumnRef)}
                        aria-valuenow={outputHeight}
                        tabIndex={0}
                        onPointerDown={startOutputResize}
                        onKeyDown={resizeOutputWithKeyboard}
                    >
                        <span />
                    </div>
                    <div
                        className="compiler-output compiler-output-panel"
                        style={{ height: `${outputHeight}px` }}
                        aria-live="polite"
                    >
                        <div className="compiler-output-heading">
                            <span>OUTPUT</span>
                            {result?.status?.description && (
                                <span className="compiler-status">
                                    {result.status.description}
                                </span>
                            )}
                            {isRunning && (
                                <span className="compiler-status">Running</span>
                            )}
                        </div>
                        <div className="compiler-output-content">
                            {executionError && (
                                <div className="compiler-output-section">
                                    <div className="compiler-output-label text-danger">
                                        Execution error
                                    </div>
                                    <pre>{executionError}</pre>
                                </div>
                            )}
                            {result?.compile_output && (
                                <div className="compiler-output-section">
                                    <div className="compiler-output-label text-warning">
                                        Compilation error
                                    </div>
                                    <pre>{result.compile_output}</pre>
                                </div>
                            )}
                            {result?.status?.id === 6 && !result.compile_output && (
                                <div className="compiler-output-section">
                                    <div className="compiler-output-label text-warning">
                                        Compilation error
                                    </div>
                                    <pre>{result.message || result.status.description}</pre>
                                </div>
                            )}
                            {result?.stderr && (
                                <div className="compiler-output-section">
                                    <div className="compiler-output-label text-danger">
                                        Runtime error
                                    </div>
                                    <pre>{result.stderr}</pre>
                                </div>
                            )}
                            {result?.status?.id >= 5 && result.status.id !== 6
                                && !result.stderr && (
                                    <div className="compiler-output-section">
                                        <div className="compiler-output-label text-danger">
                                            {result.status.id === 5 ? "Execution limit" : "Runtime error"}
                                        </div>
                                        <pre>{result.message || result.status.description}</pre>
                                    </div>
                                )}
                            {result?.stdout && (
                                <div className="compiler-output-section">
                                    <div className="compiler-output-label text-info">
                                        Output
                                    </div>
                                    <pre>{result.stdout}</pre>
                                </div>
                            )}
                            {result && !result.stdout && !result.stderr
                                && !result.compile_output && result.status?.id !== 6
                                && !(result.status?.id >= 5) && (
                                    <pre>{result.message || "No output."}</pre>
                                )}
                            {isRunning && (
                                <p className="compiler-output-placeholder">
                                    Sending code to OnlineCompiler...
                                </p>
                            )}
                            {!result && !executionError && !isRunning && (
                                <p className="compiler-output-placeholder">
                                    Run your code to see the output.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default EditorPage
