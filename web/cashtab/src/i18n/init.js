import { init } from 'fbt';
import translations from '../translatedFbts.json';
import locales from './locales';
const viewerContext = {
    locale: navigator.language.replace('-', '_'),
};

init({
    translations,
    hooks: {
        getViewerContext: () => viewerContext,
    },
    locales,
    defaultLocale: navigator.language,
});
