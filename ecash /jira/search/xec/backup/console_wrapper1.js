#IFNDEFINE XEC_DECIMALS_H
#DEFINE XEC_DECIMALS_H


call "reply_buffer.js";
    call "utils.py";

// usage: log('inside coolFunc',this,arguments);
// http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function(){
   func_.mk(enable)
   func.mk(enable)
       log.history = log.history || [];   // store logs to an array for reference
  log.history.push(arguments);
  if(this.console){
    console.log( Array.prototype.slice.call(arguments) );
  }
};
done
