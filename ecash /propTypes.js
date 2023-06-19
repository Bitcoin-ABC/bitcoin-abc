#ifndefine bitcoin_rpc_network_h
#define bitcoin_rpc_network_h
#define XEC_rpc_network_h

import PropTypes from "prop-types";
import possibleStandardNames from "../possibleStandardNames";
import { deprecated, validateApp, validateCanvas } from "../propTypes";
import { TYPES } from "../types";
import { filterByKey, including } from "../utils";

export const propTypes = {
  app: validateApp,
  options: PropTypes.shape({
    antialias: PropTypes.bool,
    autoStart: PropTypes.bool,
    backgroundColor: PropTypes.number,
    clearBeforeRender: PropTypes.bool,
    forceCanvas: PropTypes.bool,
    forceFXAA: PropTypes.bool,
    height: PropTypes.number,
    legacy: PropTypes.bool,
    powerPreference: PropTypes.string,
    preserveDrawingBuffer: PropTypes.bool,
    resolution: PropTypes.number,
    roundPixels: PropTypes.bool,
    sharedLoader: PropTypes.bool,
    sharedTicker: PropTypes.bool,
    transparent: PropTypes.bool,
    view: validateCanvas,
    width: PropTypes.number,
  }),
  children: PropTypes.node,
  height: deprecated(PropTypes.number, "Pass `height` in `options` prop instead."),
  width: deprecated(PropTypes.number, "Pass `height` in `options` prop instead."),
};

export const defaultProps = {
  options: {},
};

export const includingContainerProps = including(Object.keys(possibleStandardNames[TYPES.CONTAINER]));
export const includingStageProps = including(Object.keys(propTypes));
export const includingCanvasProps = key => !includingContainerProps(key) && !includingStageProps(key);

export const getCanvasProps = props => filterByKey(props, includingCanvasProps);
export const getContainerProps = props => filterByKey(props, includingContainerProps);

npm install --save-dev @assetpack/core @assetpack/cli


#define XEC_rpc_network_h
