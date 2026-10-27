
import React, { useEffect, useRef } from "react";
import CodeMirror from "codemirror";
import "codemirror/mode/javascript/javascript";
import "codemirror/theme/dracula.css";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/lib/codemirror.css";

function Editor({ socketRef, socket, roomId, codeMirrorRef }) {
    const editorRef = useRef(null);

    useEffect(() => {
        const editor = CodeMirror.fromTextArea(editorRef.current, {
                mode: { name: "javascript", json: true },
                theme: "dracula",
                autoCloseTags: true,
                autoCloseBrackets: true,
                lineNumbers: true,
                lineWrapping: window.matchMedia("(max-width: 767.98px)").matches,
            });
        editorRef.current = editor;
        codeMirrorRef.current = editor;

        editor.setSize(null, "100%");

        const mobileViewport = window.matchMedia("(max-width: 767.98px)");
        const updateLineWrapping = (event) => {
            editor.setOption("lineWrapping", event.matches);
            editor.refresh();
        };
        mobileViewport.addEventListener("change", updateLineWrapping);

        editor.on("change", (instance, changes) => {
            if (changes.origin !== "setValue") {
                socketRef.current?.emit("code-change", {
                    roomId,
                    code: instance.getValue(),
                });
            }
        });

        return () => {
            mobileViewport.removeEventListener("change", updateLineWrapping);
            codeMirrorRef.current = null;
            editor.toTextArea();
        };
    }, [codeMirrorRef, roomId, socketRef]);

    useEffect(() => {
        if (!socket) {
            return;
        }

        const applyCode = ({ code }) => {
            const editor = editorRef.current;
            if (typeof code === "string" && editor && editor.getValue() !== code) {
                editor.setValue(code);
            }
        };

        socket.on("code-change", applyCode);
        socket.on("sync-code", applyCode);
        socket.emit("request-code", { roomId });

        return () => {
            socket.off("code-change", applyCode);
            socket.off("sync-code", applyCode);
        };
    }, [roomId, socket]);

    return (
        <div className="editor-container">
            <textarea id="realTimeEditor" ref={editorRef} />
        </div>
    );
}

export default Editor;
