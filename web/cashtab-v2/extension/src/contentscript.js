const extension = require('extensionizer');

// Insert flag into window object to denote CashTab is available and active as a browser extension
// Could use a div or other approach for now, but emulate MetaMask this way so it is extensible to other items
// Try window object approach
var cashTabInject = document.createElement('script');
cashTabInject.innerHTML = `window.bitcoinAbc = 'cashtab'`;
document.head.appendChild(cashTabInject);

// Process page messages
// Chrome extensions communicate with web pages through the DOM
// Page sends a message to itself, chrome extension intercepts it
var port = extension.runtime.connect({ name: 'cashtabPort' });
//console.log(`port: ${JSON.stringify(port)}`);
//console.log(port);

window.addEventListener(
    'message',
    function (event) {
        if (typeof event.data.text !== 'undefined') {
            console.log('Message received:');
            console.log(event.data.text);
        }

        // We only accept messages from ourselves
        if (event.source != window) return;

        if (event.data.type && event.data.type == 'FROM_PAGE') {
            console.log(event);
            console.log('Content script received: ' + event.data.text);
            port.postMessage(event.data);
        }
    },
    false,
);
