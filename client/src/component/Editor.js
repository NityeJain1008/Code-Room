
import React, { useEffect, useRef } from "react";
import CodeMirror from "codemirror";
import "codemirror/mode/javascript/javascript";
import "codemirror/theme/dracula.css";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/lib/codemirror.css";

function Editor() {
    const editorRef = useRef(null);

    useEffect(() => {
        const editor = CodeMirror.fromTextArea(
            editorRef.current,
            {
                mode: { name: "javascript", json: true },
                theme: "dracula",
                autoCloseTags: true,
                autoCloseBrackets: true,
                lineNumbers: true,
            }
        );
        editor.setSize(null, "100%")
        return () => editor.toTextArea();
    }, []);

    return (
        <div style={{ height: "100%" }}>
            <textarea id="realTimeEditor" ref={editorRef} />
        </div>
    );
}

export default Editor;
