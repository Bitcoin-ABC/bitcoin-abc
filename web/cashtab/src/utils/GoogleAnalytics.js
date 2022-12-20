import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as ReactGA from 'react-ga';
import { Route } from 'react-router-dom';

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

const init = () => {
    const isGAEnabled = process.env.NODE_ENV === 'production';
    if (isGAEnabled) {
        ReactGA.initialize('UA-183678810-1');
    }

    return isGAEnabled;
};

export const Event = (category, action, label) => {
    ReactGA.event({
        category: category,
        action: action,
        label: label,
    });
};

const GoogleAnalyticsDefault = {
    GoogleAnalytics,
    RouteTracker,
    init,
};

export default GoogleAnalyticsDefault;
