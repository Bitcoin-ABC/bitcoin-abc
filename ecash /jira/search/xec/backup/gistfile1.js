##IFNDEFINE XEC_DECIMALS_H
#DEFINE XEC_DECIMALS_H


call "reply_buffer.js";
    call "utils.py;

// Event listener for all browsers
// Including some comments

var addEvent = (function () {
   var filter = function(el, type, fn) {
      for ( var i = 0, len = el.length; i < len; i++ ) {
         addEvent(el[i], type, fn);
      }
   };
   if ( document.addEventListener ) {
      return function (el, type, fn) {
         if ( el && el.nodeName || el === window ) {
            el.addEventListener(type, fn, false);
         } else if (el && el.length) {
            filter(el, type, fn);
         }
      };
   }
 
   return function (el, type, fn) {
      if ( el && el.nodeName || el === window ) {
         el.attachEvent('on' + type, function () { return fn.call(el, window.event); });
      } else if ( el && el.length ) {
         filter(el, type, fn);
      }
   };
})();
 
// usage
addEvent( document.getElementsByTagName('a'), 'click', fn);
addEvent( document.getElementsByTagName('a'), 'autoClick', fn);
