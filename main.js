(function(exports){
// -------------------------------------------------------------------------
// utils

function prop(obj, name, getter, setter) {
  var m = {};
  if (getter) m.get = getter;
  if (setter) m.set = setter;
  Object.defineProperty(obj, name, m);
}

/*function getSelectionState() {
  var sel = window.getSelection();
  // the Selection object returned is volatile -- make a copy of its state
  // See https://developer.mozilla.org/en/DOM/selection for details
  return {
    anchorNode:   sel.anchorNode,   // the node in which the selection begins.
    anchorOffset: sel.anchorOffset, // number of characters that the selection's
                                    // anchor is offset within the anchorNode.
    focusNode:    sel.focusNode,    // node in which the selection ends.
    focusOffset:  sel.focusOffset,  // number of characters that the selection's
                                    // focus is offset within the focusNode.
    baseNode:     sel.baseNode,     
    baseOffset:   sel.baseOffset,
    isCollapsed:  sel.isCollapsed,  // whether the selection's start and end
                                    // points are at the same position.
    type:         sel.type,
    extentNode:   sel.extentNode,
    extentOffset: sel.extentOffset,
    //rangeCount:   sel.rangeCount,   // number of ranges in the selection.
  };
}*/

if (!Array.prototype.unique)
Array.prototype.unique = function () {
  var buf = [], value;
  for (var i=0,L=this.length;i<L; ++i) {
    value = this[i];
    if (buf.indexOf(value) === -1) {
      buf.push(value);
    }
  }
  return buf;
}


// -------------------------------------------------------------------------
// prototypes

function Gutter(window, node) {
  this.window = window;
  this.node = node;
  this.lineNumbersTextNode = $(this.node).find('line-numbers')[0].firstChild;
}
Gutter.prototype = {
  update: function() {
    // line numbers
    var lineCount = this.window.buffer.countLines() + 2,
        v = new Array(lineCount);
    for (;lineCount;--lineCount) { v[lineCount-1] = lineCount; }
    this.lineNumbersTextNode.data = v.join('\n');
  }
};

function Buffer(window, node) {
  this.window = window;
  this.node = node;
  this.textNode = node.firstChild;
}
Buffer.prototype = {
  countLines: function() {
    // todo: keep a property "lineCount" and "length" up to date instead
    var count = 0, re = /[\n\r]|<br>|<\/div>/mg, m;
    //var buf = this.textNode.data;
    var buf = $.trim(this.content); // innerHTML
    while ((m = re.exec(buf)) != null) { count++; }
    return count;
  },
  
  select: function(selection) {
    this.node.focus();
    var sel = window.getSelection();
    if (selection) {
      if (typeof selection === 'object') {
        var range = sel.getRangeAt(0);
        range.setStart(selection.anchorNode, selection.anchorOffset);
        range.setEnd(selection.anchorNode, selection.anchorOffset);
      }
    } else {
      sel.collapseToStart();
    }
  },
  
  update: function(noselect) {
    //console.log('buffer.update!');
    if (this.mode === 'txt') {
      return;
    }
    noselect = !!noselect || !this.focused;
    if (!noselect) {
      this.saveSelectionRange();
      this.saveSelection();
    }
    if (typeof prettyPrint !== 'undefined') {
      prettyPrint();
    }
    if (!noselect) {
      this.restoreSelection();
    }
  },
  
  saveSelectionRange: function () {
    if (this.focused) {
      var sel = window.getSelection();
      //console.log(this.node.isSameNode(sel.anchorNode));
      //console.log('selection ranges:', sel.rangeCount);
      if (sel.rangeCount) {
        this._range = sel.getRangeAt(0);
      }
    }
  },
  
  saveSelection: function() {
    if (this._range) {
      var startMarker = document.createElement('point-mark');
      startMarker.setAttribute('class', 'start');
      this._range.insertNode(startMarker);
      // Insert end cursor marker if any text is selected
      if (!this._range.collapsed) {
        var endMarker = document.createElement('point-mark');
        endMarker.setAttribute('class', 'end');
        this._range.collapse();
        this._range.insertNode(endMarker);
      }
    } else {
      console.warn('failed to save selection');
    }
  },
  
  restoreSelection: function() {
    if (!this.focused) {
      console.warn('tried to restoreSelection of buffer which is not focused');
      return;
    }
    var sel = window.getSelection();
    var $node = $(this.node);
    var startMarker = $node.find('point-mark.start')[0];
    // todo: abort if user is creating a new selection
    if (startMarker) {
      var endMarker = $node.find('point-mark.end')[0];
      var range = document.createRange();
      if (endMarker) {
        range.setStartAfter(startMarker);
        range.setEndBefore(endMarker);
      } else {
        range.selectNode(startMarker);
      }
  
      sel.removeAllRanges();
      sel.addRange(range);
      
      if (startMarker) startMarker.parentNode.removeChild(startMarker);
      if (endMarker) endMarker.parentNode.removeChild(endMarker);
      //console.log('restored selection', range)
      return true;
    } else {
      console.log('restoreSelection: no selection state for buffer');
      return false;
    }
  }
};

prop(Buffer.prototype, 'content', function(){
  return this.node.innerHTML;
}, function(str){
  $(this.node).empty().append(document.createTextNode(str));
  this.window.gutter.update();
});

prop(Buffer.prototype, 'html', function(){
  return this.node.innerHTML;
}, function(str){
  this.node.innerHTML = str;
  this.window.gutter.update();
});

prop(Buffer.prototype, 'mode', function(){
  var s = this.node.getAttribute('class');
  var m = /(?:^|\s)lang-([\w\d]+)/.exec(s);
  return m[1];
}, function(mode){
  this.node.setAttribute('class', 'prettyprint lang-'+mode);
});


function Window(node) {
  this.node = node;
  this.buffer = new Buffer(this, $(node).find('pre')[0]);
  this.gutter = new Gutter(this, $(node).find('gutter')[0]);
}
Window.prototype = {
  update: function() {
    this.buffer.update();
    this.gutter.update();
  }
};

// -------------------------------------------------------------------------

// See this on performing "incremental" actions on the selection:
// https://developer.mozilla.org/en/DOM/Selection/modify

Node.prototype.on = Node.prototype.addEventListener;

var windows = [];

document.execCommand('insertBrOnReturn', false, true);

$(function(){
  var w = new Window($('window')[0]);
  
  /*['DOMFocusIn', 'DOMFocusOut', 'DOMActivate'].forEach(function(evname){
    document.on(evname, function(ev) { console.log('document', evname, ev); });
  });*/
  
  w.buffer.node.on('keydown', function(ev) {
    //console.log('buffer.node keydown', ev);
    if (ev.keyCode === 9) {
      ev.preventDefault();
      var sel = window.getSelection();
      if (sel.isCollapsed) {
        if (ev.altKey) {
          console.log('TODO: implement point outdent');
        } else {
          document.execCommand('insertHTML', false, '  ');
        }
      } else {
        if (ev.altKey) {
          console.log('TODO: implement block outdent');
        } else {
          console.log('TODO: implement block indent');
          
        }
      }
    }
  })
  
  if (typeof prettyPrint !== 'undefined') {
    // since undo/redo is fucked up by Google Prettify
    w.buffer.node.on('keypress', function(ev) {
      //console.log('buffer.node keypress', ev);
      if (ev.keyCode === 122 && ev.metaKey) {
        ev.preventDefault();
        if (ev.shiftKey) {
          console.log('TODO: implement redo');
        } else {
          console.log('TODO: implement undo');
        }
      }
    });
  }
  
  w.buffer.node.on('paste', function(ev) {
    // strip any non-plain text
    ev.clipboardData.types.filter(function(type){
      return (type !== 'text/plain' && type !== 'public.utf8-plain-text');
    }).forEach(function(type){
      console.log('remove', type, ev.clipboardData.getData(type));
      ev.clipboardData.clearData(type);
    });
  });
  
  w.buffer.node.on('blur', function(ev){
    w.buffer.focused = false;
    w.buffer.saveSelection();
  });
  
  w.buffer.node.on('focus', function(){
    w.buffer.focused = true;
    w.buffer.restoreSelection();
  });
  
  w.update();
  w.buffer.select();
  
  var bufferRedrawTimer, prevRaw = w.buffer.content;
  $(w.buffer.node).bind('keyup', function(){
    w.buffer.saveSelectionRange();
    
    // avoid triggering update of buffer display unless content changed
    var raw = w.buffer.content;
    if (!prevRaw || raw !== prevRaw) {
      console.log('buffer changed');
      prevRaw = raw;
      // update gutter
      w.gutter.update();
      // reset update timer
      clearTimeout(bufferRedrawTimer);
      bufferRedrawTimer = setTimeout(function(){
        w.buffer.update();
        prevRaw = w.buffer.content;
      }, 100);
    }
  });

  // command line / minibuffer stuff -- area of TODO FIXME WIP and REFACTOR
  var $tf = $('#minibuffer input[type=text]');
  // commands
  // command functions are bound to current Buffer when called
  exports.commands = {
    help: function (rawArgs, subject) {
      //var text = $('#help-buffer')[0].firstChild.data;
      //$(this.node).empty()[0].appendChild(document.createTextNode(text));
      //$(this.node).html($('#help-buffer').html());
      this.mode = 'txt';
      this.html = $('#help-buffer').html();
      return '';
    },
    mode: function (rawArgs, setmode) {
      if (setmode) {
        this.mode = setmode;
        this.update();
      }
      return this.mode;
    },
    eval: function (rawArgs) {
      try {
        var r = eval(rawArgs);
        console.log('eval>', rawArgs, '-->', r);
        try {
          r = JSON.stringify(r);
        } catch (e) {}
        return String(r);
      } catch (e) {
        return String(e);
      }
    },
    
    // new buffer
    'new-buffer': function() {
      // TODO: window <w> should be able to keep around multiple buffers
      //       and this command should do e.g. w.buffers.unshift(new Buffer)
      this.content = '';
      $(this.node).focus();
      return '';
    },
    // clear current buffer
    'clear-buffer': function () {
      this.content = '';
    },
    
    // enable/disable prettify
    'prettify': function (raw, action) {
      var withoutInSearch =
        document.location.search.indexOf('without-prettify') !== -1;
      if (String(action).charAt(0) === 'd') {
        if (!withoutInSearch) {
          setTimeout(function(){
            document.location.search +=
              ((document.location.search.indexOf('?') === -1) ? '?' : '&')+
              'without-prettify';
          },100);
          return '';
        } else {
          return 'prettify already disabled';
        }
      } else {
        if (withoutInSearch) {
          setTimeout(function(){
            document.location.search =
              document.location.search.replace(/without-prettify/g, '');
          },100);
          return '';
        } else {
          return 'prettify already enabled';
        }
      }
    },

    'load-url': function(raw, url) {
      var self = this;
      self.mode = 'txt';
      self.content = 'Loading '+url+'...';
      $.get(url, function(data){
        self.mode = 'html'; // TODO: check content-type header in response
        self.content = data;
      });
    },

    // clears the command line history
    'clear-history': function () {
      localStorage.removeItem('commandHistory');
      return '';
    }

  };
  var historyIndex = -1;
  $tf.keydown(function(ev) {
    if (ev.keyCode === 13) {
      var m, origInput = $.trim(this.value);
      if ((m = /([^\s]+)\s*(.*)/.exec(origInput))) {
        var cmd = exports.commands[m[1]];
        if (cmd) {
          var rawArgs = m[2];
          var args = rawArgs.split(/\s+/);
          args.unshift(rawArgs);
          
          // add to commandHistory
          var hist = localStorage.commandHistory;
          if (hist) {
            try { hist = JSON.parse(hist); } catch (e) { hist = []; }
          } else {
            hist = [];
          }
          if (hist[0] !== origInput) {
            hist.unshift(origInput);
            historyIndex = -1;
            hist = hist.unique();
            if (hist.length > 100) {
              hist.splice(99, hist.length-99);
            }
            localStorage.commandHistory = JSON.stringify(hist);
          }

          // run command
          var output = cmd.apply(w.buffer, args);

          if (typeof output === 'string') {
            this.value = output;
          }
        } else {
          this.value = m[1]+': no such command. Try typing "help"';
        }
      } else {
        console.log('command line: failed to parse input');
      }
      this.select();
    } else if (ev.keyCode === 38 || ev.keyCode === 40) {
      var hist = localStorage.commandHistory;
      hist = (hist) ? JSON.parse(hist) : null;
      if (hist && hist.length) {
        if (ev.keyCode === 38) {
          ++historyIndex; // up
        } else {
          --historyIndex; // down
        }
        if (historyIndex >= hist.length) {
          historyIndex = hist.length-1;
          $tf.addClass('highlight');
          setTimeout(function(){ $tf.removeClass('highlight'); }, 100);
        } else {
          if (historyIndex < 0) historyIndex = -1;
          var s = hist[historyIndex];
          console.log(hist, historyIndex, '-->', s);
          this.value = s || "";
        }
      }
    }
  });
  $tf.focus(function(ev) {
    setTimeout(function(){ $tf[0].select(); },1);
  });
  
  // document-wide keys
  document.on('keydown', function (ev) {
    if (ev.ctrlKey) {
      if (ev.keyCode === 88) { // C-x
        // switch to command line
        if (w.buffer.focused) {
          w.buffer.saveSelectionRange();
          w.buffer.saveSelection();
        }
        $tf.focus();
      }
    } else if (ev.keyCode === 27) { // ESC
      if (!w.buffer.focused) {
        w.buffer.select();
        w.buffer.restoreSelection();
      }
    }
    //console.log(ev, ev.keyCode);
  })
  
  // old super-simple token highlighter (WIP)
  /*
  function makeColorWrapper(color) {
    var n = document.createElement('span');
    n.style.color = color;
    return n;
  }
  
  var range = document.createRange();
  var tokenRE = /[\w\d]+/g, m, i=0;
  var colors = ['#f00','#ff0','#fff','#0ff','#00f','#f0f'];
  var guard = 400;
  while (guard--) {
  //while ((m = tokenRE.exec(buffer.textNode.data)) != null) {
    console.log(tokenRE.lastIndex);
    m = tokenRE.exec(w.buffer.textNode.data);
    var msg = "Found " + m[0] + ".  ";
    msg += "Next match starts at " + tokenRE.lastIndex;
    
    range.setStart(w.buffer.textNode, m.index);
    range.setEnd(w.buffer.textNode, m.index + m[0].length);
    var wrapNode = makeColorWrapper(colors[i++ % colors.length]);
    range.surroundContents(wrapNode);
    console.log(msg);
  }*/
  
});

})(window.editor={}); // {exports} namespace
