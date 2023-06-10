import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { Vector2d } from "konva/lib/types";
import React, { useEffect, useRef, useState } from "react";
import { Layer, Stage, Image, Line } from "react-konva";
import { EditorMode } from "../lib/constants";
import { download } from "../lib/util";
import { MyImage } from "./hooks/MyImage";
import useFigmaEditor from "./hooks/useImageEditor";
import { LeftToolbar, RightFigmaToolbar } from "./Toolbars";

const UPLOAD_IMAGE_SIZE = 1024;

export default function Figma({
  image,
  initialShowAd,
}: {
  image: Blob;
  initialShowAd: boolean;
}) {
  const [mode, setMode] = React.useState<EditorMode>("edit");
  const [showAd, setShowAd] = React.useState(initialShowAd);

  const {
    bitmap,
    isLoading,
    traced,
    renderedImage,
    previewUrl,
    onClick,
    onUndo,
    isUndoable,
    onClear
  } = useFigmaEditor(image);

  useEffect(() => {
    onClear()
  }, [image])

  React.useEffect(() => {
    if (!bitmap) return;
    const scaleToFit = Math.min(800 / bitmap.width, 600 / bitmap.height);
    window.parent.postMessage(
      {
        pluginMessage: {
          action: "resize",
          width: Math.ceil(bitmap.width * scaleToFit),
          height:
            Math.ceil(bitmap.height * scaleToFit) + 52 + (showAd ? 52 : 0),
        },
      },
      "*"
    );
  }, [bitmap, showAd]);

  if (!bitmap) {
    return <div>Loading...</div>;
  }

  const scaleToFit = Math.min(800 / bitmap.width, 600 / bitmap.height);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexDirection: "row",
          padding: "5px 0",
        }}
      >
        <LeftToolbar mode={mode} onModeChange={setMode} />
        {isLoading && (
          <div className="magic-copy-loading">Loading embeddings...</div>
        )}
        <RightFigmaToolbar
          onClear={onClear}
          onUndo={onUndo}
          isUndoDisabled={!isUndoable}
          onApply={async () => {
            if (!renderedImage) return;
            download("demo.png", renderedImage)
          }}
          isApplyDisabled={!renderedImage}
        />
      </div>
      <Renderer
        traced={traced}
        image={bitmap}
        previewUrl={previewUrl}
        canvasScale={scaleToFit}
        svgScale={Math.max(bitmap.height, bitmap.width) / UPLOAD_IMAGE_SIZE}
        onMaskClick={(x, y) => {
          const w = bitmap.width;
          const h = bitmap.height;
          const IMAGE_SIZE = 500;
          const d = Math.min(w, h);
          let scale = IMAGE_SIZE / d;
          if (d * scale > 1333) {
            scale = 1333 / d;
          }
          onClick((x * scale) / scaleToFit, (y * scale) / scaleToFit, "left");
        }}
        mode={mode}
      />
    </>
  );
}

const DEFAULT_SCALE = 1.5

export enum DrawType {
  PEN,
  ERASER
}

export interface DrawData {
  tool: DrawType
  points: number[]
}

function Renderer({
  traced,
  image,
  canvasScale,
  svgScale,
  onMaskClick,
  mode,
  previewUrl
}: {
  traced: string[] | null;
  image: HTMLImageElement;
  previewUrl: string|null;
  canvasScale: number;
  svgScale: number;
  onMaskClick: (x: number, y: number) => void;
  mode: EditorMode;
}) {
  const layerRef = useRef<Konva.Layer>(null)
  const clipLayerRef = useRef<Konva.Layer>(null)
  const [tool, setTool] = React.useState<DrawType>(DrawType.PEN)
  const [lines, setLines] = React.useState<DrawData[]>([])
  const [paths, setPaths] = useState<Vector2d[][]>([])
  const clip = (layer: Konva.Layer) => {
    layer.clipFunc((ctx, shape) => {
      paths.forEach(path => {
        ctx.beginPath()
        path.forEach(({x, y}, i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))
        ctx.closePath()
      })
      ctx.clip()
    })
    layer.toBlob({
      callback: (blob: Blob) => {
        download("demo-clip.png", blob)
        layer.clipFunc((ctx, shape) => {
          ctx.rect(0, 0, width, height)
          ctx.clip()
        })
      }
    })
  }
  const draw = (canvas?: HTMLCanvasElement|null) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(canvasScale, 0, 0, canvasScale, 0, 0);
    if (mode === "edit") {
      ctx.drawImage(image, 0, 0);
      if (!traced) {
        ctx.restore();
        return;
      }
      ctx.fillStyle = "rgba(0, 255, 0, 0.4)";
      ctx.globalCompositeOperation = "multiply";
      for (const path of traced) {
        ctx.fill(new Path2D(path));
      }
    } else if (mode === "preview") {
      if (!traced) {
        ctx.drawImage(image, 0, 0);
        ctx.restore();
        return;
      }
      for (const path of traced) {
        ctx.fill(new Path2D(path));
      }
      ctx.fillStyle = "rgba(255, 255, 255, 1)";
      ctx.globalCompositeOperation = "source-in";
      ctx.drawImage(image, 0, 0);
    }
    ctx.restore();
  }

  React.useEffect(() => {
    const eles = [layerRef.current?.getNativeCanvasElement()]
    eles.forEach(canvas => {
      draw(canvas)
    })

  }, [image, traced, mode, canvasScale, svgScale]);

  const width = Math.round(image.width * canvasScale) / DEFAULT_SCALE;
  const height = Math.round(image.height * canvasScale) / DEFAULT_SCALE;

  const drawStart = (e: KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 0 && e.evt.buttons === 1) {
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return
      setLines([...lines, { tool, points: [pos.x, pos.y] }]);
      setPaths([...paths, [{x: pos.x, y: pos.y}]])
    }
  }

  const drawing = (e: KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 0 && e.evt.buttons === 1) {
      const stage = e.target.getStage();
      if (!stage) return
      const point = stage.getPointerPosition();
      if (!point) return
      let lastLine = lines[lines.length - 1];
      // add point
      lastLine.points = lastLine.points.concat([point.x, point.y]);
  
      // replace last
      lines.splice(lines.length - 1, 1, lastLine);
      setLines(lines.concat());
      setPaths(paths => {
        const path = paths.pop()
        if (path) {
          path.push({x: point.x, y: point.y})
          paths.push(path)
        }
        return paths
      })
    }
  }
  
  const drawEnd = (e: KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 0 && e.evt.buttons === 0) {
      setPaths(paths => {
        if (paths.length && paths[paths.length-1].length < 8) {
          paths.pop()
        }
        return paths
      })
      if (mode === "clip" && clipLayerRef.current) clip(clipLayerRef.current)
    }
  }

  const isClipMode = mode === "clip"

  return (
      <Stage width={width} height={height}
        onMouseDown={drawStart}
        onMouseMove={drawing}
        onMouseUp={drawEnd}
        onClick={(e) => {
          if (mode === "preview" || mode === "clip") return
          const {offsetX: x, offsetY: y} = e.evt
          onMaskClick(x*DEFAULT_SCALE, y*DEFAULT_SCALE)
        }}>
        <Layer visible={!isClipMode} key={"image-hit"} ref={layerRef}></Layer>
        <Layer ref={clipLayerRef} visible={isClipMode} key={"image-preview"}>
          {previewUrl ? <MyImage width={width} 
                            height={height} 
                            url={previewUrl} /> : null}
        </Layer>
        <Layer visible={isClipMode} key={"clip-line"}>
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke="#df4b26"
              strokeWidth={5}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={
                line.tool === DrawType.ERASER ? 'destination-out' : 'source-over'
              }
            />
          ))}
        </Layer>
      </Stage>
  )
}
