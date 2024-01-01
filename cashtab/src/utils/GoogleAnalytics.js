import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Route } from 'react-router-dom';

let ReactGA;
if (process.env.REACT_APP_BUILD_ENV !== 'extension') {
    ReactGA = require('react-ga');
}

class GoogleAnalytics extends Component {
    componentDidMount() {
        this.logPageChange(
            this.props.location.pathname,
            this.props.location.search,
        );
    }

    componentDidUpdate({ location: prevLocation }) {
        const {
            location: { pathname, search },
        } = this.props;
        const isDifferentPathname = pathname !== prevLocation.pathname;
        const isDifferentSearch = search !== prevLocation.search;

        if (isDifferentPathname || isDifferentSearch) {
            this.logPageChange(pathname, search);
        }
    }

    logPageChange(pathname, search = '') {
        const page = pathname + search;
        const { location } = window;
        ReactGA.set({
            page,
            location: `${location.origin}${page}`,
            ...this.props.options,
        });
        ReactGA.pageview(page);
    }

    render() {
        return null;
    }
}

GoogleAnalytics.propTypes = {
    location: PropTypes.shape({
        pathname: PropTypes.string,
        search: PropTypes.string,
    }).isRequired,
    options: PropTypes.object,
};

const RouteTracker = () => <Route component={GoogleAnalytics} />;

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

const GoogleAnalyticsDefault =
    process.env.REACT_APP_BUILD_ENV !== 'extension'
        ? {
              RouteTracker,
              init,
          }
        : {
              RouteTracker: () => <Route />,
              init,
          };

export default GoogleAnalyticsDefault;
