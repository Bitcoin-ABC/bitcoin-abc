// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface ReactGA {
    pageview: (path: string) => void;
    initialize: (trackingID: string) => void;
    event: (event: {
        category: string;
        action: string;
        label?: string;
    }) => void;
}

let ReactGA: ReactGA | undefined;
if (process.env.REACT_APP_BUILD_ENV !== 'extension') {
    ReactGA = require('react-ga');
}

const RouteTracker: React.FC | (() => null) =
    typeof ReactGA === 'undefined'
        ? () => null
        : () => {
              const location = useLocation();
              useEffect(() => {
                  (ReactGA as ReactGA).pageview(
                      location.pathname + location.search,
                  );
              }, [location]);
              return null;
          };

const init =
    typeof ReactGA === 'undefined'
        ? // We return false here to prevent rendering route tracker in non-prod and extension
          // see top level index.tsx
          // in this case ReactGA is undefined and will not have an initialize method
          () => {
              return false;
          }
        : () => {
              const isGAEnabled = process.env.NODE_ENV === 'production';
              if (isGAEnabled) {
                  (ReactGA as ReactGA).initialize(
                      process.env.REACT_APP_GOOGLE_ANALYTICS as string,
                  );
              }

              return isGAEnabled;
          };

export const Event =
    typeof ReactGA === 'undefined'
        ? // If you are building the extension, export function that does nothing
          // Note: it's not practical to conditionally remove calls to this function from all screens
          // So, more practical to just define it as a do-nothing function for the extension
          () => undefined
        : // If you are not building the extension, export GA event tracking function
          (category: string, action: string, label: string) => {
              (ReactGA as ReactGA).event({
                  category,
                  action,
                  label,
              });
          };

export default {
    RouteTracker,
    init,
};
