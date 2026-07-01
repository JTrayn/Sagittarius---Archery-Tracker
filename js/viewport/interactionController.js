(function () {
  const App = window.ArcheryApp;
  const { VIEWPORT } = App.Constants;

  function attachInteractions(viewport) {
    const canvas = viewport.canvas;
    let pointerDown = null;
    let dragging = false;
    let pendingArrowMove = null;
    let arrowMoveFrame = null;

    canvas.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      const state = App.State.getState();
      const point = App.ViewportMath.getPointerPosition(event, canvas);
      viewport.pointerScreen = point;
      viewport.requestDraw();

      const mode = state.viewport.interactionMode;
      const isEditMode = mode === "edit";
      const isLockedMode = mode === "locked";
      const canInspect = isEditMode || isLockedMode;
      const hit = canInspect ? App.ArrowRenderer.getArrowHitAt(point, canvas, viewport.transform, state.scorecard, { visibleEndIndex: state.viewport.visibleEndIndex }) : null;

      canvas.setPointerCapture(event.pointerId);
      const pointerWorld = App.ViewportMath.screenToWorld(point, canvas, viewport.transform);
      const targetFace = state.scorecard ? App.TargetFaces.getTargetFace(state.scorecard.activeViewTargetFaceId) : null;
      const startingScore = hit && hit.arrow && targetFace ? App.ScoringEngine.scoreArrow(hit.arrow, targetFace) : null;

      pointerDown = {
        point,
        mode,
        clientX: event.clientX,
        clientY: event.clientY,
        panX: viewport.transform.targetPanX,
        panY: viewport.transform.targetPanY,
        hit,
        lastScoreKey: scoreKey(startingScore),
        arrowOffset: hit && hit.arrow && hit.arrow.position ? {
          xMm: hit.arrow.position.xMm - pointerWorld.xMm,
          yMm: hit.arrow.position.yMm - pointerWorld.yMm
        } : { xMm: 0, yMm: 0 }
      };
      dragging = false;

      if (hit) {
        event.preventDefault();
        canvas.classList.add("hovering-arrow");
        App.Actions.selectArrow(hit.endIndex, hit.arrowIndex);
        App.State.setHoveredArrow(hit);
      }
    });

    canvas.addEventListener("pointermove", event => {
      const state = App.State.getState();
      const mode = state.viewport.interactionMode;
      const isEditMode = mode === "edit";
      const isLockedMode = mode === "locked";
      const point = App.ViewportMath.getPointerPosition(event, canvas);
      viewport.pointerScreen = point;
      viewport.requestDraw();

      if (!pointerDown) {
        updateHoverState(canvas, viewport, point, state, isEditMode || isLockedMode);
        return;
      }

      const dx = event.clientX - pointerDown.clientX;
      const dy = event.clientY - pointerDown.clientY;
      const moved = Math.hypot(dx, dy);
      if (moved > VIEWPORT.DRAG_THRESHOLD_PX) dragging = true;
      if (!dragging) return;

      if (isEditMode && pointerDown.hit) {
        event.preventDefault();
        canvas.classList.add("moving-arrow");
        const pointerWorld = App.ViewportMath.screenToWorld(point, canvas, viewport.transform);
        const world = {
          xMm: pointerWorld.xMm + pointerDown.arrowOffset.xMm,
          yMm: pointerWorld.yMm + pointerDown.arrowOffset.yMm
        };
        maybeShowScoreChangeFeedback(viewport, pointerDown, world, state);
        scheduleArrowMove(pointerDown.hit.endIndex, pointerDown.hit.arrowIndex, world);
        return;
      }

      if (isLockedMode && pointerDown.hit) {
        event.preventDefault();
        return;
      }

      viewport.transform.targetPanX = pointerDown.panX + dx;
      viewport.transform.targetPanY = pointerDown.panY + dy;
      viewport.transform.currentPanX = viewport.transform.targetPanX;
      viewport.transform.currentPanY = viewport.transform.targetPanY;
      canvas.classList.add("dragging");
      viewport.requestDraw();
    });

    canvas.addEventListener("pointerup", event => {
      if (!pointerDown) return;
      canvas.releasePointerCapture(event.pointerId);
      canvas.classList.remove("dragging", "moving-arrow");

      const state = App.State.getState();
      const mode = state.viewport.interactionMode;
      const isEditMode = mode === "edit";
      const isLockedMode = mode === "locked";

      if (!dragging) {
        if ((isEditMode || isLockedMode) && pointerDown.hit) {
          App.Actions.selectArrow(pointerDown.hit.endIndex, pointerDown.hit.arrowIndex);
        } else if (mode === "plot") {
          const point = App.ViewportMath.getPointerPosition(event, canvas);
          const world = App.ViewportMath.screenToWorld(point, canvas, viewport.transform);
          viewport.onPlot(world);
        }
      }

      pointerDown = null;
      dragging = false;
      const point = App.ViewportMath.getPointerPosition(event, canvas);
      viewport.pointerScreen = point;
      viewport.requestDraw();
      updateHoverState(canvas, viewport, point, App.State.getState(), isEditMode || isLockedMode);
    });

    canvas.addEventListener("pointercancel", () => {
      pointerDown = null;
      dragging = false;
      viewport.pointerScreen = null;
      viewport.requestDraw();
      canvas.classList.remove("dragging", "moving-arrow");
    });

    canvas.addEventListener("pointerleave", () => {
      if (pointerDown) return;
      viewport.pointerScreen = null;
      viewport.requestDraw();
      App.State.setHoveredArrow(null);
      canvas.classList.remove("hovering-arrow");
    });

    canvas.addEventListener("wheel", event => {
      event.preventDefault();
      const point = App.ViewportMath.getPointerPosition(event, canvas);
      const worldBefore = App.ViewportMath.screenToWorld(point, canvas, viewport.transform);
      const factor = Math.exp(-event.deltaY * 0.0017);
      const nextScale = App.Geometry.clamp(
        viewport.transform.targetPxPerMm * factor,
        VIEWPORT.MIN_PX_PER_MM,
        VIEWPORT.MAX_PX_PER_MM
      );
      const center = App.ViewportMath.getCanvasCenter(canvas);

      viewport.transform.targetPxPerMm = nextScale;
      viewport.transform.targetPanX = point.x - center.x - worldBefore.xMm * nextScale;
      viewport.transform.targetPanY = point.y - center.y - worldBefore.yMm * nextScale;
      viewport.requestDraw();
    }, { passive: false });

    function scheduleArrowMove(endIndex, arrowIndex, world) {
      pendingArrowMove = { endIndex, arrowIndex, world };
      if (arrowMoveFrame) return;
      arrowMoveFrame = window.requestAnimationFrame(() => {
        const next = pendingArrowMove;
        pendingArrowMove = null;
        arrowMoveFrame = null;
        if (!next) return;
        App.Actions.moveArrow(next.endIndex, next.arrowIndex, next.world, { reason: "moveArrow" });
      });
    }
  }



  function maybeShowScoreChangeFeedback(viewport, pointerDown, world, state) {
    if (!pointerDown || !pointerDown.hit || !state.scorecard) return;
    const targetFace = App.TargetFaces.getTargetFace(state.scorecard.activeViewTargetFaceId);
    if (!targetFace) return;
    const roundedWorld = {
      xMm: Math.round(world.xMm * 10) / 10,
      yMm: Math.round(world.yMm * 10) / 10
    };
    const nextScore = App.ScoringEngine.scorePosition(roundedWorld, targetFace);
    const nextKey = scoreKey(nextScore);
    if (!nextKey || nextKey === pointerDown.lastScoreKey) return;
    pointerDown.lastScoreKey = nextKey;
    viewport.showScoreChangeFeedback(roundedWorld, nextScore);
  }

  function scoreKey(score) {
    if (!score) return "empty";
    return [score.label, score.value, score.zoneId, score.isMiss ? "miss" : "hit"].join("|");
  }

  function updateHoverState(canvas, viewport, point, state, canInspectArrows) {
    if (!canInspectArrows || !state.scorecard) {
      App.State.setHoveredArrow(null);
      canvas.classList.remove("hovering-arrow");
      return;
    }

    const hit = App.ArrowRenderer.getArrowHitAt(point, canvas, viewport.transform, state.scorecard, { visibleEndIndex: state.viewport.visibleEndIndex });
    App.State.setHoveredArrow(hit);
    canvas.classList.toggle("hovering-arrow", Boolean(hit));
  }

  App.InteractionController = { attachInteractions };
})();
