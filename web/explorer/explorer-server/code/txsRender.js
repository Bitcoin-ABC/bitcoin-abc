const renderTxId = data => {
    let minifiedHash = minifyHash(data.txHash, 6, 10);
    if (data.blockHeight === 0) {
        return (
            '<a style="color:#CD0BC3" href="/tx/' +
            data.txHash +
            '">' +
            minifiedHash +
            '</a>'
        );
    } else {
        return '<a href="/tx/' + data.txHash + '">' + minifiedHash + '</a>';
    }
};

var today = Date.now() / 1000;
var fiveYearsAgo = today - 157800000;
var xecDate = 1605441600;
var bchDate = 1502193600;

const renderInput = data => {
    const txDate = data.timestamp;
    let xecIcon = '';
    let bchIcon = '';
    let fiveIcon = '';
    if (txDate < xecDate) {
        xecIcon =
            '<div class="age-icon"><img src="/assets/pre-ecash-icon.png" /><span>Pre-XEC<br />(Nov 15, 2020)</span></div>';
    }
    if (txDate < bchDate) {
        bchIcon =
            '<div class="age-icon"><img src="/assets/pre-bch-icon.png" /><span>Pre-BCH<br />(Aug 8, 2017)</span></div>';
    }
    if (txDate < fiveYearsAgo) {
        fiveIcon =
            '<div class="age-icon"><img src="/assets/five-years-icon.png" /><span>Over Five<br />Years Old</span></div>';
    }
    return (
        '<div class="age-icons-ctn">' +
        xecIcon +
        fiveIcon +
        bchIcon +
        `<div class="input-margin">${data.numInputs}</div></div>`
    );
};

const escapeHtml = unsafe => {
    return unsafe
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
};

const renderOutput = (satsOutput, _type, row) => {
    if (row.token) {
        var ticker =
            '<a href="/tx/' +
            row.txHash +
            '" class="num-col-suffix" data-suffix=' +
            escapeHtml(row.token.tokenTicker) +
            '></a>';
        return renderAmount(row.stats.tokenOutput, row.token.decimals) + ticker;
    }
    return (
        '<div class="num-col-suffix" data-suffix="XEC">' +
        renderSats(row.stats.satsOutput) +
        '</div>'
    );
};
