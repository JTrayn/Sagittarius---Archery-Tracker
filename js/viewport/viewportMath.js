(function () {
  const App = window.ArcheryApp;

  function getCanvasRect(canvas) {
    if (canvas.__archeryRenderRect) return canvas.__archeryRenderRect;
    if (canvas.__archeryExportRect) return canvas.__archeryExportRect;
    const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
    if (rect && rect.width > 0 && rect.height > 0) return rect;
    return { width: canvas.width || 1, height: canvas.height || 1, left: 0, top: 0 };
  }

  function getCanvasCenter(canvas) {
    const rect = getCanvasRect(canvas);
    return { x: rect.width / 2, y: rect.height / 2 };
  }

  function worldToScreen(point, canvas, transform) {
    const center = getCanvasCenter(canvas);
    return {
      x: center.x + transform.currentPanX + point.xMm * transform.currentPxPerMm,
      y: center.y + transform.currentPanY + point.yMm * transform.currentPxPerMm
    };
  }

  function screenToWorld(point, canvas, transform) {
    const center = getCanvasCenter(canvas);
    return {
      xMm: (point.x - center.x - transform.currentPanX) / transform.currentPxPerMm,
      yMm: (point.y - center.y - transform.currentPanY) / transform.currentPxPerMm
    };
  }

  function screenToWorldWithTarget(point, canvas, transform) {
    const center = getCanvasCenter(canvas);
    return {
      xMm: (point.x - center.x - transform.targetPanX) / transform.targetPxPerMm,
      yMm: (point.y - center.y - transform.targetPanY) / transform.targetPxPerMm
    };
  }

  function getPointerPosition(event, canvas) {
    const rect = getCanvasRect(canvas);
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  App.ViewportMath = {
    getCanvasRect,
    getCanvasCenter,
    worldToScreen,
    screenToWorld,
    screenToWorldWithTarget,
    getPointerPosition
  };
})();
