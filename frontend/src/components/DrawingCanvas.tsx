import { useEffect, useRef } from "react";

interface DrawingCanvasProps {
  isDrawer: boolean;
}

export function DrawingCanvas({ isDrawer }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    if (!isDrawer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    function getPos(event: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function onMouseDown(event: MouseEvent) {
      isDrawing.current = true;
      const { x, y } = getPos(event);
      ctx!.beginPath();
      ctx!.moveTo(x, y);
    }

    function onMouseMove(event: MouseEvent) {
      if (!isDrawing.current) return;
      const { x, y } = getPos(event);
      ctx!.lineTo(x, y);
      ctx!.stroke();
    }

    function onMouseUp() {
      isDrawing.current = false;
    }

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseUp);
    };
  }, [isDrawer]);

  function handleClear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  if (!isDrawer) {
    return (
      <div className="canvas-placeholder" style={{ minHeight: "500px", backgroundColor: "#ffffff", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#6b7280" }}>Waiting for drawing...</p>
      </div>
    );
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={600}
        height={500}
        style={{ border: "1px solid #e5e7eb", backgroundColor: "#ffffff", cursor: "crosshair", display: "block", maxWidth: "100%" }}
      />
      <div className="button-row button-row--compact" style={{ marginTop: "0.5rem" }}>
        <button className="button button--secondary" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>
    </div>
  );
}
