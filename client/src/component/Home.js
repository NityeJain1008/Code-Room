import React, { useState } from "react";
import toast from "react-hot-toast";
import {v4 as uuid}  from "uuid";

function Home() {
    const [roomId, setRoomId] = useState("");
    const [username, setUsername] = useState("") ;

    const generateRoomId = (e) =>{
        e.preventDefault() ; 
        const id = uuid();
        setRoomId(id) ; 
        toast.success("Room Id is Generated");
    }

    return (
        <div className="container-fluid">
            <div className="row justify-content-center align-items-center min-vh-100">
                <div className="col-12 col-md-6">
                    <div className="card shadow-sm p-2 mb-5 bg-secondary rounded">
                        <div className="card-body text-center bg-dark">
                            <img
                                className="img-fluid mx-auto d-block py-custom"
                                src="/images/codeRoom.png"
                                alt="CodeRoom"
                                style={{ maxWidth: 220 }}
                            />

                            <h4 className="text-light">Enter Your Room ID</h4>

                            <div className="form-group pt-3">
                                <input
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    type="text"
                                    className="form-control mb-2"
                                    placeholder="Room ID"
                                />
                            </div>

                            <div className="form-group pb-2">
                                <input
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    type="text"
                                    className="form-control mb-2"
                                    placeholder="Username"
                                />
                            </div>

                            <button className="btn btn-success btn-lg btn-block">
                                Join Room
                            </button>

                            <p className="mt-3 text-light">
                                Don't have a Room ID?
                                <span
                                    className="text-success p-2"
                                    style={{ cursor: "pointer" }}
                                    onClick={generateRoomId}
                                >
                                    New Room
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Home;
