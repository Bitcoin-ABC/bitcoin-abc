import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

let ReactGA;
if (process.env.REACT_APP_BUILD_ENV !== 'extension') {
    ReactGA = require('react-ga');
}

const RouteTracker = () => {
    const location = useLocation();
    useEffect(() => {
        ReactGA.pageview(location.pathname + location.search);
    }, [location]);
};

const init =
    process.env.REACT_APP_BUILD_ENV !== 'extension'
        ? () => {
              const isGAEnabled = process.env.NODE_ENV === 'production';
              if (isGAEnabled) {
                  ReactGA.initialize('UA-183678810-1');
              }

              return isGAEnabled;
          }
        : // We return a new function if we are building the extension, because
          // in this case ReactGA is undefined and will not have an initialize method
          () => {
              return false;
          };

export const Event =
    process.env.REACT_APP_BUILD_ENV !== 'extension'
        ? // If you are not building the extension, export GA event tracking function
          (category, action, label) => {
              ReactGA.event({
                  category: category,
                  action: action,
                  label: label,
              });
          }
        : // If you are building the extension, export function that does nothing
          // Note: it's not practical to conditionally remove calls to this function from all screens
          // So, more practical to just define it as a do-nothing function for the extension
          () => {};

export default process.env.REACT_APP_BUILD_ENV !== 'extension'
    ? {
          RouteTracker,
          init,
      }
    : {
          RouteTracker: () => {},
          init,
      };
