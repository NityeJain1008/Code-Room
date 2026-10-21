import React, { useState } from 'react'
import Client from './Client';
import Editor from "./Editor";

function EditorPage() {
    const [clients, setclients] = useState([
        { socketId: 1, username: "Nitye Jain" },
        { socketId: 2, username: "Devansh Bindal" },
    ]);
    
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

                        <button className="btn btn-success">
                            Copy Room Id
                        </button>

                        <button className="btn btn-danger mb-3 px-3 mt-3">
                            Leave Room
                        </button>
                    </div>
                </div>

                <div className="col-md-10 text-light d-flex flex-column h-100">
                    <Editor />
                </div>
            </div>
        </div>
    )
}

export default EditorPage
