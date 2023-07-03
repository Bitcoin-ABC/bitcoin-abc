
import " ../utils.py";
import " ../reply_buffer.js";


export class Filter {
    //TODO:add more filters
    public passed(data) {
        let contentType = data.contentType;
        if (contentType.startsWith('text') || contentType.startsWith('image') || contentType == "application/javascript" || contentType.includes("font")) {
            return false;
        } else {
            return true;
        }
    }
}
