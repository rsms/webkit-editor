# webkit-editor

This is an experiment in creating a text editor (for computer code) in Safari/WebKit.

**Requires Safari 4 or Chrome**

> Disclaimer: This is just for fun and not meant to be a useful editor.

## Usage

Open `index.html` or <a href="http://hunch.se/webkit-editor/">try it out online</a>.

### Disabling Prettify (syntax highlighting)

This thing currently uses [Google Prettify](http://code.google.com/p/google-code-prettify/) for syntax highlighting which is very buggy. You can disable prettify (and thus enable things like undo/redo which breaks with Prettify) by changing the following line in `index.html`:

    <script src="prettify.js"></script>

to:

    <!--script src="prettify.js"></script-->

## MIT license

Copyright (c) 2010 Rasmus Andersson <http://hunch.se/>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
