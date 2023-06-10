import { createRoot } from "react-dom/client";
import React, { useEffect, useRef, useState } from "react";
import Figma from "./components/Editor";

function Editor() {
    const fileInput = useRef<HTMLInputElement>(null)
    const [image, setImage] = useState<Blob|null>(null)
    const updateSelectedFile = (filepath: string) => {
        const input = fileInput.current
        if (!input || !input.files) return
        const files = Array.from(input.files)
        const file = files[0]
        if (file) setImage(file)
    }
    useEffect(() => {
        const loadImage = async () => {
            const response = await fetch("/demo.jpg")
            const data = await response.blob()
            setImage(data)
        }
        loadImage()
    }, [])

    return (
        <div className="editor">
            <input className="file-selector" ref={fileInput} accept="image/png, image/jpeg" onChange={e => updateSelectedFile(e.target.value)} type="file" />
            {image ?  <Figma image={image} initialShowAd={false} /> : null}
        </div>
    )

}

function Page() {
    const root = document.getElementById("root");
    if (!root) {
      return;
    }
    createRoot(root).render(
      <>
        <style type="text/css">
          {`
          body {
            margin: 0;
          }

          .editor {
            display: flex;
            padding: 2em;
            flex-direction: column;
          }

          .editor > div {
            margin: auto;
          }

          .editor .file-selector {
            margin: auto;
            margin-top: 1em;
          }
          
          .magic-copy-toolbar {
            background: white;
            border-radius: 6px;
          }
  
          .magic-copy-toolbar button {
            background: white;
            color: black;
            border: none;
            padding: 0 8px;
            font: 14px sans-serif;
            cursor: pointer;
            outline: inherit;
            border-radius: 6px;
            display: inline-flex;
            align-items: center;
            height: 42px;
          }
  
          .magic-copy-toolbar button svg {
            margin-right: 8px;
          }
  
          .magic-copy-toolbar button:disabled {
            color: #9f9f9f;
          }
  
          .magic-copy-toolbar button:hover {
            background: #eeeeee;
          }
          
          .magic-copy-loading {
            color: black;
            font: 14px sans-serif;
          }
          
          .magic-copy-ad {
            color: black;
            padding: 16px;
            background-color: #eeeeee;
            font: 14px sans-serif;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 52px;
            box-sizing: border-box;
          }
  
          .magic-copy-ad a {
            color: black;
            font-weight: bold
          }
          `}
        </style>
        <Editor />
      </>
    );
}

Page()