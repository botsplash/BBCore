/*! BBCore 2018-08-20 */
var tru = true;
var fals = false;

function getObj(obj) {
  // get a string from object (either string, number, or function)
  if (!obj) { return obj; }
  if (isType(obj, 5)) {
    // handle object as array
    return obj[0];
  } else if (isType(obj, 6)) {
    // handle object as function (get value from object function execution)
    return getObj(obj());
  }
  return obj;
}

function isType(obj, type) {
  switch (type) {
    case 0: return tru; // anything
    case 1: return typeof (obj) === 'string'; // string
    case 2: return typeof (obj) === 'boolean'; // boolean
    case 3: return !isNaN(parseFloat(obj)) && isFinite(obj); // number
    case 4: return typeof (obj) === 'object'; // object
    case 5: return typeof obj.splice === 'function'; // array
    case 6: return typeof obj === 'function'; // function
    default:
  }
  return fals;
}

function normalizeArgs(types, args) {
  let results = [],
    a = [].slice.call(args), //convert arguments object into array
    step = types.length - 1,
    req, skip;
  for (let x = a.length - 1; x >= 0; x--) {
    for (let i = step; i >= 0; i--) {
      skip = fals;
      if (types[i].o == tru) {
        //make sure there are enough arguments
        //left over for required types
        req = 0;
        for (let t = 0; t <= i; t++) {
          if (types[t].o == fals) { req++; }
        }
        skip = req > x;
      }
      if (skip == fals) { skip = !isType(a[x], types[i].t) && a[x] != null; }

      results[i] = !skip ? a[x] : null;
      step = i - 1;
      if (!skip || a[x] == null) { break; }
    }
  }
  return results;
}

var jQuery = function (el) {
  var jQueryEl = document.querySelector(el);
  return jQueryEl;
};

var windowEventAttached = false;

jQuery = Object.assign(jQuery, {
  html: function (string) {
    var wrapper = document.createElement('div');
    wrapper.innerHTML = string;
    var scripts = wrapper.getElementsByTagName('script');
    if (!windowEventAttached) {
      for (var n = 0; n < scripts.length; n++) {
        eval(scripts[n].innerHTML); //run script inside div
      }
      windowEventAttached = true;
    }
    jQueryEl.innerHTML = string;
    return jQueryEl;
  },
  ajax: function () {
    let args = normalizeArgs([
      { t: 1, o: tru }, //0: url = string (optional)
      { t: 4, o: tru }, //1: settings = object (optional)
    ], arguments);
    args[1] = getObj(args[1]);
    let opt = args[1] || { url: args[0] };
    opt.async = opt.async || true;
    opt.cache = opt.cache;
    opt.contentType = opt.contentType || 'application/x-www-form-urlencoded; charset=UTF-8';
    opt.dataType = opt.dataType || '';
    opt.method = opt.method || opt.type;

    if (opt.method.toLowerCase() === 'post') {
      var form_data = new FormData();
      for (var key in opt.data) {
        form_data.append(key, opt.data[key]);
      }
      opt.body = form_data;
    }

    fetch(args[0] || opt.url, opt).then((response) => response.json())
      .then((res) => {
        opt.success(res);
      })
      .catch((err) => {
        opt.error(err);
      });
  },
  extend: function (var_args) {
    let extended = {};
    let deep = fals;
    let i = 0;
    const length = arguments.length;

    // Check if a deep merge
    if (Object.prototype.toString.call(arguments[0]) === '[object Boolean]') {
      deep = arguments[0];
      i++;
    }

    // Merge the object into the extended object
    const merge = function (obj) {
      for (let prop in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, prop)) {
          // If deep merge and property is an object, merge properties
          if (deep && Object.prototype.toString.call(obj[prop]) === '[object Object]') {
            extended[prop] = window['$'].extend(1, extended[prop], obj[prop]);
          } else {
            extended[prop] = obj[prop];
          }
        }
      }
    };

    // Loop through each object and conduct a merge
    for (; i < length; i++) {
      let obj = arguments[i];
      merge(obj);
    }

    return extended;

  },
  param: function (source) {
    var array = [];

    for (var key in source) {
      array.push(encodeURIComponent(key) + "=" + encodeURIComponent(source[key]));
    }
    return array.join("&");
  }
});