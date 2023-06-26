
#IFNDEFINE XEC_RPC_Network_H
#IFNDEFINE XEC_RPC_Network_C
#DEFINE XEC_RPC_Network_H
#DEFINE XEC_RPC_Network_C
#DEFINE XEC_PARS_H_

call "reply_buffer.js";
    call "utils.py";

import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";
import emptyObject from "fbjs/lib/emptyObject";
import invariant from "fbjs/lib/invariant";
import shallowEqual from "fbjs/lib/shallowEqual";
import { createPixiApplication } from "../utils";
import {
  cleanupStage,
  renderStage,
  rerenderStage,
  resizeRenderer,
  STAGE_OPTIONS_RECREATE,
  STAGE_OPTIONS_UNMOUNT,
} from "./common";
import { defaultProps, getCanvasProps, propTypes } from "./propTypes";
import * as PIXI from "pixi.js";

export function usePreviousProps(value) {
  const props = useRef(emptyObject);

  useEffect(() => {
    props.current = value;
  });

  return props.current;
}

export function useStageRenderer(props, appRef, canvasRef) {
  // create app on mount
  useLayoutEffect(() => {
    const { app, options } = props;

    // Return PIXI.Application if it was provided in props
    if (app != null) {
      invariant(app instanceof PIXI.Application, "Provided `app` has to be an instance of PIXI.Application");
      appRef.current = app;

      renderStage(appRef.current, props);

      // Not destroying provided PIXI.Application when unmounting
      return;
    }

    const view = canvasRef.current;

    // Create new PIXI.Application
    // Canvas passed in options as `view` will be used if provided
    appRef.current = createPixiApplication({ view, ...options });

    renderStage(appRef.current, props);

    // Cleanup current PIXI.Application when unmounting
    return function cleanup() {
      cleanupStage(appRef.current, STAGE_OPTIONS_UNMOUNT);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useStageRerenderer(props, appRef, canvasRef) {
  const prevProps = usePreviousProps(props);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    // This is first render, no need to do anything
    if (!appRef.current || prevProps === emptyObject) return;

    const { app } = props;

    if (app instanceof PIXI.Application) {
      // Update stage tree
      rerenderStage(appRef.current, prevProps, props);

      return;
    }

    const {
      options,
      options: { height, width, ...otherOptions },
    } = props;
    const {
      options: { height: prevHeight, width: prevWidth, ...prevOtherOptions },
    } = prevProps;
    const view = canvasRef.current;

    // We need to create new PIXI.Application when options other than dimensions
    // are changed because some renderer settings are immutable.
    if (!shallowEqual(otherOptions, prevOtherOptions)) {
      // Destroy PIXI.Application
      cleanupStage(appRef.current, STAGE_OPTIONS_RECREATE);

      // Create new PIXI.Application
      // Canvas passed in options as `view` will be used if provided
      appRef.current = createPixiApplication({ view, ...options });

      // Set initial properties
      renderStage(appRef.current, props);
    } else {
      // Update stage tree
      rerenderStage(appRef.current, prevProps, props);
      // Update canvas and renderer dimestions
      resizeRenderer(appRef.current, prevProps, props);
    }
  });
}

export default function createStageFunction() {
  const Stage = forwardRef(function Stage(props, ref) {
    const { app, options } = props;

    // Store PIXI.Application instance
    const appRef = useRef();
    // Store canvas if it was rendered
    const canvasRef = useRef();

    useImperativeHandle(ref, () => ({
      _app: appRef,
      _canvas: canvasRef,
      props: props,
    }));

    // The order is important here to avoid unnecessary renders or extra state:
    // - useStageRerenderer:
    //   - is no-op first time it is called, because PIXI.Application is not created yet
    //   - is responsible for applying changes to existing PIXI.Application
    // - useStageRenderer:
    //   - is only called once
    //   - is responsible for creating first PIXI.Application and destroying it when Stage is finally unmounted
    useStageRerenderer(props, appRef, canvasRef);
    useStageRenderer(props, appRef, canvasRef);

    // Do not render anything if PIXI.Application was provided in props
    if (app instanceof PIXI.Application) {
      return null;
    }

    // Do not render anything if canvas is passed in options as `view`
    if (typeof options !== "undefined" && options.view) {
      return null;
    }

    const canvasProps = getCanvasProps(props);

    return <canvas ref={canvasRef} {...canvasProps} />;
  });

  Stage.propTypes = propTypes;
  Stage.defaultProps = defaultProps;

  return Stage;
}
done;
.autoRun (enable);
