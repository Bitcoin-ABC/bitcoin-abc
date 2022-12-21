$(document).ready(() => {
    $('.moment__timestamp').each((index, element) => {
        if (!element.dataset.timestamp) {
            return;
        }

        const timestamp = element.dataset.timestamp * 1000;
        const human_timestamp = moment(timestamp).format('L LTS');

        element.innerHTML = `${human_timestamp} <small>(UTC ${tzOffset})</small>`;
    });
});
