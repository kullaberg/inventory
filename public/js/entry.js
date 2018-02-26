webpackJsonp([0],[
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */



var base64 = __webpack_require__(57)
var ieee754 = __webpack_require__(58)
var isArray = __webpack_require__(59)

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)))

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.uriEncodeObject = exports.serviceResponse = exports.deprecate = exports.collectMetadata = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _Base = __webpack_require__(39);

var base64 = _interopRequireWildcard(_Base);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var RESULT_METADATA_KEY = '_stitch_metadata';

/** @namespace util */

/**
 * Utility which creates a function that extracts metadata
 * from the server in the response to a pipeline request,
 * and attaches it to the final result after the finalizer has been applied.
 *
 * @memberof util
 * @param {Function} [func] optional finalizer to transform the response data
 */
var collectMetadata = exports.collectMetadata = function collectMetadata(func) {
  var attachMetadata = function attachMetadata(metadata) {
    return function (res) {
      if ((typeof res === 'undefined' ? 'undefined' : _typeof(res)) === 'object' && !Object.prototype.hasOwnProperty.call(res, RESULT_METADATA_KEY)) {
        Object.defineProperty(res, RESULT_METADATA_KEY, { enumerable: false, configurable: false, writable: false, value: metadata });
      }
      return Promise.resolve(res);
    };
  };
  var captureMetadata = function captureMetadata(data) {
    var metadata = {};
    if (data.warnings) {
      // Metadata is not yet attached to result, grab any data that needs to be added.
      metadata.warnings = data.warnings;
    }
    if (!func) {
      return Promise.resolve(data).then(attachMetadata(metadata));
    }
    return Promise.resolve(data).then(func).then(attachMetadata(metadata));
  };
  return captureMetadata;
};

/**
 * Utility function for displaying deprecation notices
 *
 * @memberof util
 * @param {Function} fn the function to deprecate
 * @param {String} msg the message to display to the user regarding deprecation
 */
function deprecate(fn, msg) {
  var alreadyWarned = false;
  function deprecated() {
    if (!alreadyWarned) {
      alreadyWarned = true;
      console.warn('DeprecationWarning: ' + msg);
    }

    return fn.apply(this, arguments);
  }

  deprecated.__proto__ = fn; // eslint-disable-line
  if (fn.prototype) {
    deprecated.prototype = fn.prototype;
  }

  return deprecated;
}

/**
 * Utility method for executing a service action as a function call.
 *
 * @memberof util
 * @param {Object} service the service to execute the action on
 * @param {String} action the service action to execute
 * @param {Array} args the arguments to supply to the service action invocation
 * @returns {Promise} the API response from the executed service action
 */
function serviceResponse(service, _ref) {
  var _ref$serviceName = _ref.serviceName,
      serviceName = _ref$serviceName === undefined ? service.serviceName : _ref$serviceName,
      action = _ref.action,
      args = _ref.args;
  var client = service.client;


  if (!client) {
    throw new Error('Service has no client');
  }

  return client.executeServiceFunction(serviceName, action, args);
}

/**
 * Utility function to encode a JSON object into a valid string that can be
 * inserted in a URI. The object is first stringified, then encoded in base64,
 * and finally encoded via the builtin encodeURIComponent function.
 *
 * @memberof util
 * @param {Object} obj The object to encode
 * @returns {String} The encoded object
 */
function uriEncodeObject(obj) {
  return encodeURIComponent(base64.btoa(JSON.stringify(obj)));
}

exports.deprecate = deprecate;
exports.serviceResponse = serviceResponse;
exports.uriEncodeObject = uriEncodeObject;

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Copyright 2009 Google Inc. All Rights Reserved

/**
 * Defines a Long class for representing a 64-bit two's-complement
 * integer value, which faithfully simulates the behavior of a Java "Long". This
 * implementation is derived from LongLib in GWT.
 *
 * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
 * values as *signed* integers.  See the from* functions below for more
 * convenient ways of constructing Longs.
 *
 * The internal representation of a Long is the two given signed, 32-bit values.
 * We use 32-bit pieces because these are the size of integers on which
 * Javascript performs bit-operations.  For operations like addition and
 * multiplication, we split each number into 16-bit pieces, which can easily be
 * multiplied within Javascript's floating-point representation without overflow
 * or change in sign.
 *
 * In the algorithms below, we frequently reduce the negative case to the
 * positive case by negating the input(s) and then post-processing the result.
 * Note that we must ALWAYS check specially whether those values are MIN_VALUE
 * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
 * a positive number, it overflows back into a negative).  Not handling this
 * case would often result in infinite recursion.
 *
 * @class
 * @param {number} low  the low (signed) 32 bits of the Long.
 * @param {number} high the high (signed) 32 bits of the Long.
 * @return {Long}
 */
function Long(low, high) {
  if (!(this instanceof Long)) return new Long(low, high);

  this._bsontype = 'Long';
  /**
   * @type {number}
   * @ignore
   */
  this.low_ = low | 0; // force into 32 signed bits.

  /**
   * @type {number}
   * @ignore
   */
  this.high_ = high | 0; // force into 32 signed bits.
}

/**
 * Return the int value.
 *
 * @method
 * @return {number} the value, assuming it is a 32-bit integer.
 */
Long.prototype.toInt = function() {
  return this.low_;
};

/**
 * Return the Number value.
 *
 * @method
 * @return {number} the closest floating-point representation to this value.
 */
Long.prototype.toNumber = function() {
  return this.high_ * Long.TWO_PWR_32_DBL_ + this.getLowBitsUnsigned();
};

/**
 * Return the JSON value.
 *
 * @method
 * @return {string} the JSON representation.
 */
Long.prototype.toJSON = function() {
  return this.toString();
};

/**
 * Return the String value.
 *
 * @method
 * @param {number} [opt_radix] the radix in which the text should be written.
 * @return {string} the textual representation of this value.
 */
Long.prototype.toString = function(opt_radix) {
  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
    throw Error('radix out of range: ' + radix);
  }

  if (this.isZero()) {
    return '0';
  }

  if (this.isNegative()) {
    if (this.equals(Long.MIN_VALUE)) {
      // We need to change the Long value before it can be negated, so we remove
      // the bottom-most digit in this base and then recurse to do the rest.
      var radixLong = Long.fromNumber(radix);
      var div = this.div(radixLong);
      var rem = div.multiply(radixLong).subtract(this);
      return div.toString(radix) + rem.toInt().toString(radix);
    } else {
      return '-' + this.negate().toString(radix);
    }
  }

  // Do several (6) digits each time through the loop, so as to
  // minimize the calls to the very expensive emulated div.
  var radixToPower = Long.fromNumber(Math.pow(radix, 6));

  rem = this;
  var result = '';

  while (!rem.isZero()) {
    var remDiv = rem.div(radixToPower);
    var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
    var digits = intval.toString(radix);

    rem = remDiv;
    if (rem.isZero()) {
      return digits + result;
    } else {
      while (digits.length < 6) {
        digits = '0' + digits;
      }
      result = '' + digits + result;
    }
  }
};

/**
 * Return the high 32-bits value.
 *
 * @method
 * @return {number} the high 32-bits as a signed value.
 */
Long.prototype.getHighBits = function() {
  return this.high_;
};

/**
 * Return the low 32-bits value.
 *
 * @method
 * @return {number} the low 32-bits as a signed value.
 */
Long.prototype.getLowBits = function() {
  return this.low_;
};

/**
 * Return the low unsigned 32-bits value.
 *
 * @method
 * @return {number} the low 32-bits as an unsigned value.
 */
Long.prototype.getLowBitsUnsigned = function() {
  return this.low_ >= 0 ? this.low_ : Long.TWO_PWR_32_DBL_ + this.low_;
};

/**
 * Returns the number of bits needed to represent the absolute value of this Long.
 *
 * @method
 * @return {number} Returns the number of bits needed to represent the absolute value of this Long.
 */
Long.prototype.getNumBitsAbs = function() {
  if (this.isNegative()) {
    if (this.equals(Long.MIN_VALUE)) {
      return 64;
    } else {
      return this.negate().getNumBitsAbs();
    }
  } else {
    var val = this.high_ !== 0 ? this.high_ : this.low_;
    for (var bit = 31; bit > 0; bit--) {
      if ((val & (1 << bit)) !== 0) {
        break;
      }
    }
    return this.high_ !== 0 ? bit + 33 : bit + 1;
  }
};

/**
 * Return whether this value is zero.
 *
 * @method
 * @return {boolean} whether this value is zero.
 */
Long.prototype.isZero = function() {
  return this.high_ === 0 && this.low_ === 0;
};

/**
 * Return whether this value is negative.
 *
 * @method
 * @return {boolean} whether this value is negative.
 */
Long.prototype.isNegative = function() {
  return this.high_ < 0;
};

/**
 * Return whether this value is odd.
 *
 * @method
 * @return {boolean} whether this value is odd.
 */
Long.prototype.isOdd = function() {
  return (this.low_ & 1) === 1;
};

/**
 * Return whether this Long equals the other
 *
 * @method
 * @param {Long} other Long to compare against.
 * @return {boolean} whether this Long equals the other
 */
Long.prototype.equals = function(other) {
  return this.high_ === other.high_ && this.low_ === other.low_;
};

/**
 * Return whether this Long does not equal the other.
 *
 * @method
 * @param {Long} other Long to compare against.
 * @return {boolean} whether this Long does not equal the other.
 */
Long.prototype.notEquals = function(other) {
  return this.high_ !== other.high_ || this.low_ !== other.low_;
};

/**
 * Return whether this Long is less than the other.
 *
 * @method
 * @param {Long} other Long to compare against.
 * @return {boolean} whether this Long is less than the other.
 */
Long.prototype.lessThan = function(other) {
  return this.compare(other) < 0;
};

/**
 * Return whether this Long is less than or equal to the other.
 *
 * @method
 * @param {Long} other Long to compare against.
 * @return {boolean} whether this Long is less than or equal to the other.
 */
Long.prototype.lessThanOrEqual = function(other) {
  return this.compare(other) <= 0;
};

/**
 * Return whether this Long is greater than the other.
 *
 * @method
 * @param {Long} other Long to compare against.
 * @return {boolean} whether this Long is greater than the other.
 */
Long.prototype.greaterThan = function(other) {
  return this.compare(other) > 0;
};

/**
 * Return whether this Long is greater than or equal to the other.
 *
 * @method
 * @param {Long} other Long to compare against.
 * @return {boolean} whether this Long is greater than or equal to the other.
 */
Long.prototype.greaterThanOrEqual = function(other) {
  return this.compare(other) >= 0;
};

/**
 * Compares this Long with the given one.
 *
 * @method
 * @param {Long} other Long to compare against.
 * @return {boolean} 0 if they are the same, 1 if the this is greater, and -1 if the given one is greater.
 */
Long.prototype.compare = function(other) {
  if (this.equals(other)) {
    return 0;
  }

  var thisNeg = this.isNegative();
  var otherNeg = other.isNegative();
  if (thisNeg && !otherNeg) {
    return -1;
  }
  if (!thisNeg && otherNeg) {
    return 1;
  }

  // at this point, the signs are the same, so subtraction will not overflow
  if (this.subtract(other).isNegative()) {
    return -1;
  } else {
    return 1;
  }
};

/**
 * The negation of this value.
 *
 * @method
 * @return {Long} the negation of this value.
 */
Long.prototype.negate = function() {
  if (this.equals(Long.MIN_VALUE)) {
    return Long.MIN_VALUE;
  } else {
    return this.not().add(Long.ONE);
  }
};

/**
 * Returns the sum of this and the given Long.
 *
 * @method
 * @param {Long} other Long to add to this one.
 * @return {Long} the sum of this and the given Long.
 */
Long.prototype.add = function(other) {
  // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 0xffff;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 0xffff;

  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 0xffff;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 0xffff;

  var c48 = 0,
    c32 = 0,
    c16 = 0,
    c00 = 0;
  c00 += a00 + b00;
  c16 += c00 >>> 16;
  c00 &= 0xffff;
  c16 += a16 + b16;
  c32 += c16 >>> 16;
  c16 &= 0xffff;
  c32 += a32 + b32;
  c48 += c32 >>> 16;
  c32 &= 0xffff;
  c48 += a48 + b48;
  c48 &= 0xffff;
  return Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
};

/**
 * Returns the difference of this and the given Long.
 *
 * @method
 * @param {Long} other Long to subtract from this.
 * @return {Long} the difference of this and the given Long.
 */
Long.prototype.subtract = function(other) {
  return this.add(other.negate());
};

/**
 * Returns the product of this and the given Long.
 *
 * @method
 * @param {Long} other Long to multiply with this.
 * @return {Long} the product of this and the other.
 */
Long.prototype.multiply = function(other) {
  if (this.isZero()) {
    return Long.ZERO;
  } else if (other.isZero()) {
    return Long.ZERO;
  }

  if (this.equals(Long.MIN_VALUE)) {
    return other.isOdd() ? Long.MIN_VALUE : Long.ZERO;
  } else if (other.equals(Long.MIN_VALUE)) {
    return this.isOdd() ? Long.MIN_VALUE : Long.ZERO;
  }

  if (this.isNegative()) {
    if (other.isNegative()) {
      return this.negate().multiply(other.negate());
    } else {
      return this.negate()
        .multiply(other)
        .negate();
    }
  } else if (other.isNegative()) {
    return this.multiply(other.negate()).negate();
  }

  // If both Longs are small, use float multiplication
  if (this.lessThan(Long.TWO_PWR_24_) && other.lessThan(Long.TWO_PWR_24_)) {
    return Long.fromNumber(this.toNumber() * other.toNumber());
  }

  // Divide each Long into 4 chunks of 16 bits, and then add up 4x4 products.
  // We can skip products that would overflow.

  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 0xffff;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 0xffff;

  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 0xffff;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 0xffff;

  var c48 = 0,
    c32 = 0,
    c16 = 0,
    c00 = 0;
  c00 += a00 * b00;
  c16 += c00 >>> 16;
  c00 &= 0xffff;
  c16 += a16 * b00;
  c32 += c16 >>> 16;
  c16 &= 0xffff;
  c16 += a00 * b16;
  c32 += c16 >>> 16;
  c16 &= 0xffff;
  c32 += a32 * b00;
  c48 += c32 >>> 16;
  c32 &= 0xffff;
  c32 += a16 * b16;
  c48 += c32 >>> 16;
  c32 &= 0xffff;
  c32 += a00 * b32;
  c48 += c32 >>> 16;
  c32 &= 0xffff;
  c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
  c48 &= 0xffff;
  return Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
};

/**
 * Returns this Long divided by the given one.
 *
 * @method
 * @param {Long} other Long by which to divide.
 * @return {Long} this Long divided by the given one.
 */
Long.prototype.div = function(other) {
  if (other.isZero()) {
    throw Error('division by zero');
  } else if (this.isZero()) {
    return Long.ZERO;
  }

  if (this.equals(Long.MIN_VALUE)) {
    if (other.equals(Long.ONE) || other.equals(Long.NEG_ONE)) {
      return Long.MIN_VALUE; // recall that -MIN_VALUE == MIN_VALUE
    } else if (other.equals(Long.MIN_VALUE)) {
      return Long.ONE;
    } else {
      // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
      var halfThis = this.shiftRight(1);
      var approx = halfThis.div(other).shiftLeft(1);
      if (approx.equals(Long.ZERO)) {
        return other.isNegative() ? Long.ONE : Long.NEG_ONE;
      } else {
        var rem = this.subtract(other.multiply(approx));
        var result = approx.add(rem.div(other));
        return result;
      }
    }
  } else if (other.equals(Long.MIN_VALUE)) {
    return Long.ZERO;
  }

  if (this.isNegative()) {
    if (other.isNegative()) {
      return this.negate().div(other.negate());
    } else {
      return this.negate()
        .div(other)
        .negate();
    }
  } else if (other.isNegative()) {
    return this.div(other.negate()).negate();
  }

  // Repeat the following until the remainder is less than other:  find a
  // floating-point that approximates remainder / other *from below*, add this
  // into the result, and subtract it from the remainder.  It is critical that
  // the approximate value is less than or equal to the real value so that the
  // remainder never becomes negative.
  var res = Long.ZERO;
  rem = this;
  while (rem.greaterThanOrEqual(other)) {
    // Approximate the result of division. This may be a little greater or
    // smaller than the actual value.
    approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));

    // We will tweak the approximate result by changing it in the 48-th digit or
    // the smallest non-fractional digit, whichever is larger.
    var log2 = Math.ceil(Math.log(approx) / Math.LN2);
    var delta = log2 <= 48 ? 1 : Math.pow(2, log2 - 48);

    // Decrease the approximation until it is smaller than the remainder.  Note
    // that if it is too large, the product overflows and is negative.
    var approxRes = Long.fromNumber(approx);
    var approxRem = approxRes.multiply(other);
    while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
      approx -= delta;
      approxRes = Long.fromNumber(approx);
      approxRem = approxRes.multiply(other);
    }

    // We know the answer can't be zero... and actually, zero would cause
    // infinite recursion since we would make no progress.
    if (approxRes.isZero()) {
      approxRes = Long.ONE;
    }

    res = res.add(approxRes);
    rem = rem.subtract(approxRem);
  }
  return res;
};

/**
 * Returns this Long modulo the given one.
 *
 * @method
 * @param {Long} other Long by which to mod.
 * @return {Long} this Long modulo the given one.
 */
Long.prototype.modulo = function(other) {
  return this.subtract(this.div(other).multiply(other));
};

/**
 * The bitwise-NOT of this value.
 *
 * @method
 * @return {Long} the bitwise-NOT of this value.
 */
Long.prototype.not = function() {
  return Long.fromBits(~this.low_, ~this.high_);
};

/**
 * Returns the bitwise-AND of this Long and the given one.
 *
 * @method
 * @param {Long} other the Long with which to AND.
 * @return {Long} the bitwise-AND of this and the other.
 */
Long.prototype.and = function(other) {
  return Long.fromBits(this.low_ & other.low_, this.high_ & other.high_);
};

/**
 * Returns the bitwise-OR of this Long and the given one.
 *
 * @method
 * @param {Long} other the Long with which to OR.
 * @return {Long} the bitwise-OR of this and the other.
 */
Long.prototype.or = function(other) {
  return Long.fromBits(this.low_ | other.low_, this.high_ | other.high_);
};

/**
 * Returns the bitwise-XOR of this Long and the given one.
 *
 * @method
 * @param {Long} other the Long with which to XOR.
 * @return {Long} the bitwise-XOR of this and the other.
 */
Long.prototype.xor = function(other) {
  return Long.fromBits(this.low_ ^ other.low_, this.high_ ^ other.high_);
};

/**
 * Returns this Long with bits shifted to the left by the given amount.
 *
 * @method
 * @param {number} numBits the number of bits by which to shift.
 * @return {Long} this shifted to the left by the given amount.
 */
Long.prototype.shiftLeft = function(numBits) {
  numBits &= 63;
  if (numBits === 0) {
    return this;
  } else {
    var low = this.low_;
    if (numBits < 32) {
      var high = this.high_;
      return Long.fromBits(low << numBits, (high << numBits) | (low >>> (32 - numBits)));
    } else {
      return Long.fromBits(0, low << (numBits - 32));
    }
  }
};

/**
 * Returns this Long with bits shifted to the right by the given amount.
 *
 * @method
 * @param {number} numBits the number of bits by which to shift.
 * @return {Long} this shifted to the right by the given amount.
 */
Long.prototype.shiftRight = function(numBits) {
  numBits &= 63;
  if (numBits === 0) {
    return this;
  } else {
    var high = this.high_;
    if (numBits < 32) {
      var low = this.low_;
      return Long.fromBits((low >>> numBits) | (high << (32 - numBits)), high >> numBits);
    } else {
      return Long.fromBits(high >> (numBits - 32), high >= 0 ? 0 : -1);
    }
  }
};

/**
 * Returns this Long with bits shifted to the right by the given amount, with the new top bits matching the current sign bit.
 *
 * @method
 * @param {number} numBits the number of bits by which to shift.
 * @return {Long} this shifted to the right by the given amount, with zeros placed into the new leading bits.
 */
Long.prototype.shiftRightUnsigned = function(numBits) {
  numBits &= 63;
  if (numBits === 0) {
    return this;
  } else {
    var high = this.high_;
    if (numBits < 32) {
      var low = this.low_;
      return Long.fromBits((low >>> numBits) | (high << (32 - numBits)), high >>> numBits);
    } else if (numBits === 32) {
      return Long.fromBits(high, 0);
    } else {
      return Long.fromBits(high >>> (numBits - 32), 0);
    }
  }
};

/**
 * Returns a Long representing the given (32-bit) integer value.
 *
 * @method
 * @param {number} value the 32-bit integer in question.
 * @return {Long} the corresponding Long value.
 */
Long.fromInt = function(value) {
  if (-128 <= value && value < 128) {
    var cachedObj = Long.INT_CACHE_[value];
    if (cachedObj) {
      return cachedObj;
    }
  }

  var obj = new Long(value | 0, value < 0 ? -1 : 0);
  if (-128 <= value && value < 128) {
    Long.INT_CACHE_[value] = obj;
  }
  return obj;
};

/**
 * Returns a Long representing the given value, provided that it is a finite number. Otherwise, zero is returned.
 *
 * @method
 * @param {number} value the number in question.
 * @return {Long} the corresponding Long value.
 */
Long.fromNumber = function(value) {
  if (isNaN(value) || !isFinite(value)) {
    return Long.ZERO;
  } else if (value <= -Long.TWO_PWR_63_DBL_) {
    return Long.MIN_VALUE;
  } else if (value + 1 >= Long.TWO_PWR_63_DBL_) {
    return Long.MAX_VALUE;
  } else if (value < 0) {
    return Long.fromNumber(-value).negate();
  } else {
    return new Long((value % Long.TWO_PWR_32_DBL_) | 0, (value / Long.TWO_PWR_32_DBL_) | 0);
  }
};

/**
 * Returns a Long representing the 64-bit integer that comes by concatenating the given high and low bits. Each is assumed to use 32 bits.
 *
 * @method
 * @param {number} lowBits the low 32-bits.
 * @param {number} highBits the high 32-bits.
 * @return {Long} the corresponding Long value.
 */
Long.fromBits = function(lowBits, highBits) {
  return new Long(lowBits, highBits);
};

/**
 * Returns a Long representation of the given string, written using the given radix.
 *
 * @method
 * @param {string} str the textual representation of the Long.
 * @param {number} opt_radix the radix in which the text is written.
 * @return {Long} the corresponding Long value.
 */
Long.fromString = function(str, opt_radix) {
  if (str.length === 0) {
    throw Error('number format error: empty string');
  }

  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
    throw Error('radix out of range: ' + radix);
  }

  if (str.charAt(0) === '-') {
    return Long.fromString(str.substring(1), radix).negate();
  } else if (str.indexOf('-') >= 0) {
    throw Error('number format error: interior "-" character: ' + str);
  }

  // Do several (8) digits each time through the loop, so as to
  // minimize the calls to the very expensive emulated div.
  var radixToPower = Long.fromNumber(Math.pow(radix, 8));

  var result = Long.ZERO;
  for (var i = 0; i < str.length; i += 8) {
    var size = Math.min(8, str.length - i);
    var value = parseInt(str.substring(i, i + size), radix);
    if (size < 8) {
      var power = Long.fromNumber(Math.pow(radix, size));
      result = result.multiply(power).add(Long.fromNumber(value));
    } else {
      result = result.multiply(radixToPower);
      result = result.add(Long.fromNumber(value));
    }
  }
  return result;
};

// NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the
// from* methods on which they depend.

/**
 * A cache of the Long representations of small integer values.
 * @type {Object}
 * @ignore
 */
Long.INT_CACHE_ = {};

// NOTE: the compiler should inline these constant values below and then remove
// these variables, so there should be no runtime penalty for these.

/**
 * Number used repeated below in calculations.  This must appear before the
 * first call to any from* function below.
 * @type {number}
 * @ignore
 */
Long.TWO_PWR_16_DBL_ = 1 << 16;

/**
 * @type {number}
 * @ignore
 */
Long.TWO_PWR_24_DBL_ = 1 << 24;

/**
 * @type {number}
 * @ignore
 */
Long.TWO_PWR_32_DBL_ = Long.TWO_PWR_16_DBL_ * Long.TWO_PWR_16_DBL_;

/**
 * @type {number}
 * @ignore
 */
Long.TWO_PWR_31_DBL_ = Long.TWO_PWR_32_DBL_ / 2;

/**
 * @type {number}
 * @ignore
 */
Long.TWO_PWR_48_DBL_ = Long.TWO_PWR_32_DBL_ * Long.TWO_PWR_16_DBL_;

/**
 * @type {number}
 * @ignore
 */
Long.TWO_PWR_64_DBL_ = Long.TWO_PWR_32_DBL_ * Long.TWO_PWR_32_DBL_;

/**
 * @type {number}
 * @ignore
 */
Long.TWO_PWR_63_DBL_ = Long.TWO_PWR_64_DBL_ / 2;

/** @type {Long} */
Long.ZERO = Long.fromInt(0);

/** @type {Long} */
Long.ONE = Long.fromInt(1);

/** @type {Long} */
Long.NEG_ONE = Long.fromInt(-1);

/** @type {Long} */
Long.MAX_VALUE = Long.fromBits(0xffffffff | 0, 0x7fffffff | 0);

/** @type {Long} */
Long.MIN_VALUE = Long.fromBits(0, 0x80000000 | 0);

/**
 * @type {Long}
 * @ignore
 */
Long.TWO_PWR_24_ = Long.fromInt(1 << 24);

/**
 * Expose.
 */
module.exports = Long;
module.exports.Long = Long;


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var USER_AUTH_KEY = exports.USER_AUTH_KEY = '_stitch_ua';
var REFRESH_TOKEN_KEY = exports.REFRESH_TOKEN_KEY = '_stitch_rt';
var DEVICE_ID_KEY = exports.DEVICE_ID_KEY = '_stitch_did';
var STATE_KEY = exports.STATE_KEY = '_stitch_state';
var USER_AUTH_COOKIE_NAME = exports.USER_AUTH_COOKIE_NAME = 'stitch_ua';
var STITCH_ERROR_KEY = exports.STITCH_ERROR_KEY = '_stitch_error';
var STITCH_LINK_KEY = exports.STITCH_LINK_KEY = '_stitch_link';
var USER_LOGGED_IN_PT_KEY = exports.USER_LOGGED_IN_PT_KEY = '_stitch_pt';
var STITCH_REDIRECT_PROVIDER = exports.STITCH_REDIRECT_PROVIDER = '_stitch_rp';

var DEFAULT_ACCESS_TOKEN_EXPIRE_WITHIN_SECS = exports.DEFAULT_ACCESS_TOKEN_EXPIRE_WITHIN_SECS = 10;

var APP_CLIENT_CODEC = exports.APP_CLIENT_CODEC = {
  'accessToken': 'access_token',
  'refreshToken': 'refresh_token',
  'deviceId': 'device_id',
  'userId': 'user_id'
};

var ADMIN_CLIENT_CODEC = exports.ADMIN_CLIENT_CODEC = {
  'accessToken': 'access_token',
  'refreshToken': 'refresh_token',
  'deviceId': 'device_id',
  'userId': 'user_id'
};

/***/ }),
/* 4 */,
/* 5 */,
/* 6 */,
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeFetchArgs = exports.checkStatus = exports.SDK_VERSION = exports.DEFAULT_STITCH_SERVER_URL = exports.ADMIN_CLIENT_TYPE = exports.APP_CLIENT_TYPE = exports.JSONTYPE = undefined;

var _errors = __webpack_require__(11);

var JSONTYPE = exports.JSONTYPE = 'application/json';
var APP_CLIENT_TYPE = exports.APP_CLIENT_TYPE = 'app';
var ADMIN_CLIENT_TYPE = exports.ADMIN_CLIENT_TYPE = 'admin';
var DEFAULT_STITCH_SERVER_URL = exports.DEFAULT_STITCH_SERVER_URL = 'https://stitch.mongodb.com';

// VERSION is substituted with the package.json version number at build time
var version = 'unknown';
if (true) {
  version = "3.0.1";
}
var SDK_VERSION = exports.SDK_VERSION = version;

var checkStatus = exports.checkStatus = function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  }

  if (response.headers.get('Content-Type') === JSONTYPE) {
    return response.json().then(function (json) {
      var error = new _errors.StitchError(json.error, json.error_code);
      error.response = response;
      error.json = json;
      return Promise.reject(error);
    });
  }

  var error = new Error(response.statusText);
  error.response = response;
  return Promise.reject(error);
};

var makeFetchArgs = exports.makeFetchArgs = function makeFetchArgs(method, body) {
  var init = {
    method: method,
    headers: { 'Accept': JSONTYPE, 'Content-Type': JSONTYPE }
  };

  if (body) {
    init.body = body;
  }

  init.cors = true;
  return init;
};

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * A class representation of the BSON MinKey type.
 *
 * @class
 * @return {MinKey} A MinKey instance
 */
function MinKey() {
  if (!(this instanceof MinKey)) return new MinKey();

  this._bsontype = 'MinKey';
}

module.exports = MinKey;
module.exports.MinKey = MinKey;


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {

/**
 * Module dependencies.
 * @ignore
 */

// Test if we're in Node via presence of "global" not absence of "window"
// to support hybrid environments like Electron
if (typeof global !== 'undefined') {
  var Buffer = __webpack_require__(0).Buffer; // TODO just use global Buffer
}

/**
 * A class representation of the BSON Binary type.
 *
 * Sub types
 *  - **BSON.BSON_BINARY_SUBTYPE_DEFAULT**, default BSON type.
 *  - **BSON.BSON_BINARY_SUBTYPE_FUNCTION**, BSON function type.
 *  - **BSON.BSON_BINARY_SUBTYPE_BYTE_ARRAY**, BSON byte array type.
 *  - **BSON.BSON_BINARY_SUBTYPE_UUID**, BSON uuid type.
 *  - **BSON.BSON_BINARY_SUBTYPE_MD5**, BSON md5 type.
 *  - **BSON.BSON_BINARY_SUBTYPE_USER_DEFINED**, BSON user defined type.
 *
 * @class
 * @param {Buffer} buffer a buffer object containing the binary data.
 * @param {Number} [subType] the option binary type.
 * @return {Binary}
 */
function Binary(buffer, subType) {
  if (!(this instanceof Binary)) return new Binary(buffer, subType);

  this._bsontype = 'Binary';

  if (buffer instanceof Number) {
    this.sub_type = buffer;
    this.position = 0;
  } else {
    this.sub_type = subType == null ? BSON_BINARY_SUBTYPE_DEFAULT : subType;
    this.position = 0;
  }

  if (buffer != null && !(buffer instanceof Number)) {
    // Only accept Buffer, Uint8Array or Arrays
    if (typeof buffer === 'string') {
      // Different ways of writing the length of the string for the different types
      if (typeof Buffer !== 'undefined') {
        this.buffer = new Buffer(buffer);
      } else if (
        typeof Uint8Array !== 'undefined' ||
        Object.prototype.toString.call(buffer) === '[object Array]'
      ) {
        this.buffer = writeStringToArray(buffer);
      } else {
        throw new Error('only String, Buffer, Uint8Array or Array accepted');
      }
    } else {
      this.buffer = buffer;
    }
    this.position = buffer.length;
  } else {
    if (typeof Buffer !== 'undefined') {
      this.buffer = new Buffer(Binary.BUFFER_SIZE);
    } else if (typeof Uint8Array !== 'undefined') {
      this.buffer = new Uint8Array(new ArrayBuffer(Binary.BUFFER_SIZE));
    } else {
      this.buffer = new Array(Binary.BUFFER_SIZE);
    }
    // Set position to start of buffer
    this.position = 0;
  }
}

/**
 * Updates this binary with byte_value.
 *
 * @method
 * @param {string} byte_value a single byte we wish to write.
 */
Binary.prototype.put = function put(byte_value) {
  // If it's a string and a has more than one character throw an error
  if (byte_value['length'] != null && typeof byte_value !== 'number' && byte_value.length !== 1)
    throw new Error('only accepts single character String, Uint8Array or Array');
  if ((typeof byte_value !== 'number' && byte_value < 0) || byte_value > 255)
    throw new Error('only accepts number in a valid unsigned byte range 0-255');

  // Decode the byte value once
  var decoded_byte = null;
  if (typeof byte_value === 'string') {
    decoded_byte = byte_value.charCodeAt(0);
  } else if (byte_value['length'] != null) {
    decoded_byte = byte_value[0];
  } else {
    decoded_byte = byte_value;
  }

  if (this.buffer.length > this.position) {
    this.buffer[this.position++] = decoded_byte;
  } else {
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(this.buffer)) {
      // Create additional overflow buffer
      var buffer = new Buffer(Binary.BUFFER_SIZE + this.buffer.length);
      // Combine the two buffers together
      this.buffer.copy(buffer, 0, 0, this.buffer.length);
      this.buffer = buffer;
      this.buffer[this.position++] = decoded_byte;
    } else {
      buffer = null;
      // Create a new buffer (typed or normal array)
      if (Object.prototype.toString.call(this.buffer) === '[object Uint8Array]') {
        buffer = new Uint8Array(new ArrayBuffer(Binary.BUFFER_SIZE + this.buffer.length));
      } else {
        buffer = new Array(Binary.BUFFER_SIZE + this.buffer.length);
      }

      // We need to copy all the content to the new array
      for (var i = 0; i < this.buffer.length; i++) {
        buffer[i] = this.buffer[i];
      }

      // Reassign the buffer
      this.buffer = buffer;
      // Write the byte
      this.buffer[this.position++] = decoded_byte;
    }
  }
};

/**
 * Writes a buffer or string to the binary.
 *
 * @method
 * @param {(Buffer|string)} string a string or buffer to be written to the Binary BSON object.
 * @param {number} offset specify the binary of where to write the content.
 * @return {null}
 */
Binary.prototype.write = function write(string, offset) {
  offset = typeof offset === 'number' ? offset : this.position;

  // If the buffer is to small let's extend the buffer
  if (this.buffer.length < offset + string.length) {
    var buffer = null;
    // If we are in node.js
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(this.buffer)) {
      buffer = new Buffer(this.buffer.length + string.length);
      this.buffer.copy(buffer, 0, 0, this.buffer.length);
    } else if (Object.prototype.toString.call(this.buffer) === '[object Uint8Array]') {
      // Create a new buffer
      buffer = new Uint8Array(new ArrayBuffer(this.buffer.length + string.length));
      // Copy the content
      for (var i = 0; i < this.position; i++) {
        buffer[i] = this.buffer[i];
      }
    }

    // Assign the new buffer
    this.buffer = buffer;
  }

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(string) && Buffer.isBuffer(this.buffer)) {
    string.copy(this.buffer, offset, 0, string.length);
    this.position = offset + string.length > this.position ? offset + string.length : this.position;
    // offset = string.length
  } else if (
    typeof Buffer !== 'undefined' &&
    typeof string === 'string' &&
    Buffer.isBuffer(this.buffer)
  ) {
    this.buffer.write(string, offset, 'binary');
    this.position = offset + string.length > this.position ? offset + string.length : this.position;
    // offset = string.length;
  } else if (
    Object.prototype.toString.call(string) === '[object Uint8Array]' ||
    (Object.prototype.toString.call(string) === '[object Array]' && typeof string !== 'string')
  ) {
    for (i = 0; i < string.length; i++) {
      this.buffer[offset++] = string[i];
    }

    this.position = offset > this.position ? offset : this.position;
  } else if (typeof string === 'string') {
    for (i = 0; i < string.length; i++) {
      this.buffer[offset++] = string.charCodeAt(i);
    }

    this.position = offset > this.position ? offset : this.position;
  }
};

/**
 * Reads **length** bytes starting at **position**.
 *
 * @method
 * @param {number} position read from the given position in the Binary.
 * @param {number} length the number of bytes to read.
 * @return {Buffer}
 */
Binary.prototype.read = function read(position, length) {
  length = length && length > 0 ? length : this.position;

  // Let's return the data based on the type we have
  if (this.buffer['slice']) {
    return this.buffer.slice(position, position + length);
  } else {
    // Create a buffer to keep the result
    var buffer =
      typeof Uint8Array !== 'undefined'
        ? new Uint8Array(new ArrayBuffer(length))
        : new Array(length);
    for (var i = 0; i < length; i++) {
      buffer[i] = this.buffer[position++];
    }
  }
  // Return the buffer
  return buffer;
};

/**
 * Returns the value of this binary as a string.
 *
 * @method
 * @return {string}
 */
Binary.prototype.value = function value(asRaw) {
  asRaw = asRaw == null ? false : asRaw;

  // Optimize to serialize for the situation where the data == size of buffer
  if (
    asRaw &&
    typeof Buffer !== 'undefined' &&
    Buffer.isBuffer(this.buffer) &&
    this.buffer.length === this.position
  )
    return this.buffer;

  // If it's a node.js buffer object
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(this.buffer)) {
    return asRaw
      ? this.buffer.slice(0, this.position)
      : this.buffer.toString('binary', 0, this.position);
  } else {
    if (asRaw) {
      // we support the slice command use it
      if (this.buffer['slice'] != null) {
        return this.buffer.slice(0, this.position);
      } else {
        // Create a new buffer to copy content to
        var newBuffer =
          Object.prototype.toString.call(this.buffer) === '[object Uint8Array]'
            ? new Uint8Array(new ArrayBuffer(this.position))
            : new Array(this.position);
        // Copy content
        for (var i = 0; i < this.position; i++) {
          newBuffer[i] = this.buffer[i];
        }
        // Return the buffer
        return newBuffer;
      }
    } else {
      return convertArraytoUtf8BinaryString(this.buffer, 0, this.position);
    }
  }
};

/**
 * Length.
 *
 * @method
 * @return {number} the length of the binary.
 */
Binary.prototype.length = function length() {
  return this.position;
};

/**
 * @ignore
 */
Binary.prototype.toJSON = function() {
  return this.buffer != null ? this.buffer.toString('base64') : '';
};

/**
 * @ignore
 */
Binary.prototype.toString = function(format) {
  return this.buffer != null ? this.buffer.slice(0, this.position).toString(format) : '';
};

/**
 * Binary default subtype
 * @ignore
 */
var BSON_BINARY_SUBTYPE_DEFAULT = 0;

/**
 * @ignore
 */
var writeStringToArray = function(data) {
  // Create a buffer
  var buffer =
    typeof Uint8Array !== 'undefined'
      ? new Uint8Array(new ArrayBuffer(data.length))
      : new Array(data.length);
  // Write the content to the buffer
  for (var i = 0; i < data.length; i++) {
    buffer[i] = data.charCodeAt(i);
  }
  // Write the string to the buffer
  return buffer;
};

/**
 * Convert Array ot Uint8Array to Binary String
 *
 * @ignore
 */
var convertArraytoUtf8BinaryString = function(byteArray, startIndex, endIndex) {
  var result = '';
  for (var i = startIndex; i < endIndex; i++) {
    result = result + String.fromCharCode(byteArray[i]);
  }
  return result;
};

Binary.BUFFER_SIZE = 256;

/**
 * Default BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_DEFAULT = 0;
/**
 * Function BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_FUNCTION = 1;
/**
 * Byte Array BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_BYTE_ARRAY = 2;
/**
 * OLD UUID BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_UUID_OLD = 3;
/**
 * UUID BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_UUID = 4;
/**
 * MD5 BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_MD5 = 5;
/**
 * User BSON type
 *
 * @classconstant SUBTYPE_DEFAULT
 **/
Binary.SUBTYPE_USER_DEFINED = 128;

/**
 * Expose.
 */
module.exports = Binary;
module.exports.Binary = Binary;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)))

/***/ }),
/* 10 */,
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _extendableBuiltin(cls) {
  function ExtendableBuiltin() {
    var instance = Reflect.construct(cls, Array.from(arguments));
    Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
    return instance;
  }

  ExtendableBuiltin.prototype = Object.create(cls.prototype, {
    constructor: {
      value: cls,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });

  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(ExtendableBuiltin, cls);
  } else {
    ExtendableBuiltin.__proto__ = cls;
  }

  return ExtendableBuiltin;
}

/**
 * Creates a new StitchError
 *
 * @class
 * @augments Error
 * @param {String} message The error message.
 * @param {Object} code The error code.
 * @return {StitchError} A StitchError instance.
 */
var StitchError = function (_extendableBuiltin2) {
  _inherits(StitchError, _extendableBuiltin2);

  function StitchError(message, code) {
    _classCallCheck(this, StitchError);

    var _this = _possibleConstructorReturn(this, (StitchError.__proto__ || Object.getPrototypeOf(StitchError)).call(this, message));

    _this.name = 'StitchError';
    _this.message = message;
    if (code !== undefined) {
      _this.code = code;
    }

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(_this, _this.constructor);
    } else {
      _this.stack = new Error(message).stack;
    }
    return _this;
  }

  return StitchError;
}(_extendableBuiltin(Error));

var ErrAuthProviderNotFound = 'AuthProviderNotFound';
var ErrInvalidSession = 'InvalidSession';
var ErrUnauthorized = 'Unauthorized';

exports.StitchError = StitchError;
exports.ErrAuthProviderNotFound = ErrAuthProviderNotFound;
exports.ErrInvalidSession = ErrInvalidSession;
exports.ErrUnauthorized = ErrUnauthorized;

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * A class representation of the BSON Double type.
 *
 * @class
 * @param {number} value the number we want to represent as a double.
 * @return {Double}
 */
function Double(value) {
  if (!(this instanceof Double)) return new Double(value);

  this._bsontype = 'Double';
  this.value = value;
}

/**
 * Access the number value.
 *
 * @method
 * @return {number} returns the wrapped double number.
 */
Double.prototype.valueOf = function() {
  return this.value;
};

/**
 * @ignore
 */
Double.prototype.toJSON = function() {
  return this.value;
};

module.exports = Double;
module.exports.Double = Double;


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var Long = __webpack_require__(2);

/**
 * @class
 * @param {number} low  the low (signed) 32 bits of the Timestamp.
 * @param {number} high the high (signed) 32 bits of the Timestamp.
 * @return {Timestamp}
 */
var Timestamp = function(low, high) {
  if (low instanceof Long) {
    Long.call(this, low.low_, low.high_);
  } else {
    Long.call(this, low, high);
  }

  this._bsontype = 'Timestamp';
};

Timestamp.prototype = Object.create(Long.prototype);
Timestamp.prototype.constructor = Timestamp;

/**
 * Return the JSON value.
 *
 * @method
 * @return {String} the JSON representation.
 */
Timestamp.prototype.toJSON = function() {
  return {
    $timestamp: this.toString()
  };
};

/**
 * Returns a Timestamp represented by the given (32-bit) integer value.
 *
 * @method
 * @param {number} value the 32-bit integer in question.
 * @return {Timestamp} the timestamp.
 */
Timestamp.fromInt = function(value) {
  return new Timestamp(Long.fromInt(value));
};

/**
 * Returns a Timestamp representing the given number value, provided that it is a finite number. Otherwise, zero is returned.
 *
 * @method
 * @param {number} value the number in question.
 * @return {Timestamp} the timestamp.
 */
Timestamp.fromNumber = function(value) {
  return new Timestamp(Long.fromNumber(value));
};

/**
 * Returns a Timestamp for the given high and low bits. Each is assumed to use 32 bits.
 *
 * @method
 * @param {number} lowBits the low 32-bits.
 * @param {number} highBits the high 32-bits.
 * @return {Timestamp} the timestamp.
 */
Timestamp.fromBits = function(lowBits, highBits) {
  return new Timestamp(lowBits, highBits);
};

/**
 * Returns a Timestamp from the given string, optionally using the given radix.
 *
 * @method
 * @param {String} str the textual representation of the Timestamp.
 * @param {number} [opt_radix] the radix in which the text is written.
 * @return {Timestamp} the timestamp.
 */
Timestamp.fromString = function(str, opt_radix) {
  return new Timestamp(Long.fromString(str, opt_radix));
};

module.exports = Timestamp;
module.exports.Timestamp = Timestamp;


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer, process) {
/**
 * Machine id.
 *
 * Create a random 3-byte value (i.e. unique for this
 * process). Other drivers use a md5 of the machine id here, but
 * that would mean an asyc call to gethostname, so we don't bother.
 * @ignore
 */
var MACHINE_ID = parseInt(Math.random() * 0xffffff, 10);

// Regular expression that checks for hex value
var checkForHexRegExp = new RegExp('^[0-9a-fA-F]{24}$');

// Check if buffer exists
try {
  if (Buffer && Buffer.from) var hasBufferType = true;
} catch (err) {
  hasBufferType = false;
}

/**
* Create a new ObjectID instance
*
* @class
* @param {(string|number)} id Can be a 24 byte hex string, 12 byte binary string or a Number.
* @property {number} generationTime The generation time of this ObjectId instance
* @return {ObjectID} instance of ObjectID.
*/
var ObjectID = function ObjectID(id) {
  // Duck-typing to support ObjectId from different npm packages
  if (id instanceof ObjectID) return id;
  if (!(this instanceof ObjectID)) return new ObjectID(id);

  this._bsontype = 'ObjectID';

  // The most common usecase (blank id, new objectId instance)
  if (id == null || typeof id === 'number') {
    // Generate a new id
    this.id = this.generate(id);
    // If we are caching the hex string
    if (ObjectID.cacheHexString) this.__id = this.toString('hex');
    // Return the object
    return;
  }

  // Check if the passed in id is valid
  var valid = ObjectID.isValid(id);

  // Throw an error if it's not a valid setup
  if (!valid && id != null) {
    throw new Error(
      'Argument passed in must be a single String of 12 bytes or a string of 24 hex characters'
    );
  } else if (valid && typeof id === 'string' && id.length === 24 && hasBufferType) {
    return new ObjectID(new Buffer(id, 'hex'));
  } else if (valid && typeof id === 'string' && id.length === 24) {
    return ObjectID.createFromHexString(id);
  } else if (id != null && id.length === 12) {
    // assume 12 byte string
    this.id = id;
  } else if (id != null && id.toHexString) {
    // Duck-typing to support ObjectId from different npm packages
    return id;
  } else {
    throw new Error(
      'Argument passed in must be a single String of 12 bytes or a string of 24 hex characters'
    );
  }

  if (ObjectID.cacheHexString) this.__id = this.toString('hex');
};

// Allow usage of ObjectId as well as ObjectID
// var ObjectId = ObjectID;

// Precomputed hex table enables speedy hex string conversion
var hexTable = [];
for (var i = 0; i < 256; i++) {
  hexTable[i] = (i <= 15 ? '0' : '') + i.toString(16);
}

/**
* Return the ObjectID id as a 24 byte hex string representation
*
* @method
* @return {string} return the 24 byte hex string representation.
*/
ObjectID.prototype.toHexString = function() {
  if (ObjectID.cacheHexString && this.__id) return this.__id;

  var hexString = '';
  if (!this.id || !this.id.length) {
    throw new Error(
      'invalid ObjectId, ObjectId.id must be either a string or a Buffer, but is [' +
        JSON.stringify(this.id) +
        ']'
    );
  }

  if (this.id instanceof _Buffer) {
    hexString = convertToHex(this.id);
    if (ObjectID.cacheHexString) this.__id = hexString;
    return hexString;
  }

  for (var i = 0; i < this.id.length; i++) {
    hexString += hexTable[this.id.charCodeAt(i)];
  }

  if (ObjectID.cacheHexString) this.__id = hexString;
  return hexString;
};

/**
* Update the ObjectID index used in generating new ObjectID's on the driver
*
* @method
* @return {number} returns next index value.
* @ignore
*/
ObjectID.prototype.get_inc = function() {
  return (ObjectID.index = (ObjectID.index + 1) % 0xffffff);
};

/**
* Update the ObjectID index used in generating new ObjectID's on the driver
*
* @method
* @return {number} returns next index value.
* @ignore
*/
ObjectID.prototype.getInc = function() {
  return this.get_inc();
};

/**
* Generate a 12 byte id buffer used in ObjectID's
*
* @method
* @param {number} [time] optional parameter allowing to pass in a second based timestamp.
* @return {Buffer} return the 12 byte id buffer string.
*/
ObjectID.prototype.generate = function(time) {
  if ('number' !== typeof time) {
    time = ~~(Date.now() / 1000);
  }

  // Use pid
  var pid =
    (typeof process === 'undefined' || process.pid === 1
      ? Math.floor(Math.random() * 100000)
      : process.pid) % 0xffff;
  var inc = this.get_inc();
  // Buffer used
  var buffer = new Buffer(12);
  // Encode time
  buffer[3] = time & 0xff;
  buffer[2] = (time >> 8) & 0xff;
  buffer[1] = (time >> 16) & 0xff;
  buffer[0] = (time >> 24) & 0xff;
  // Encode machine
  buffer[6] = MACHINE_ID & 0xff;
  buffer[5] = (MACHINE_ID >> 8) & 0xff;
  buffer[4] = (MACHINE_ID >> 16) & 0xff;
  // Encode pid
  buffer[8] = pid & 0xff;
  buffer[7] = (pid >> 8) & 0xff;
  // Encode index
  buffer[11] = inc & 0xff;
  buffer[10] = (inc >> 8) & 0xff;
  buffer[9] = (inc >> 16) & 0xff;
  // Return the buffer
  return buffer;
};

/**
* Converts the id into a 24 byte hex string for printing
*
* @param {String} format The Buffer toString format parameter.
* @return {String} return the 24 byte hex string representation.
* @ignore
*/
ObjectID.prototype.toString = function(format) {
  // Is the id a buffer then use the buffer toString method to return the format
  if (this.id && this.id.copy) {
    return this.id.toString(typeof format === 'string' ? format : 'hex');
  }

  // if(this.buffer )
  return this.toHexString();
};

/**
* Converts to a string representation of this Id.
*
* @return {String} return the 24 byte hex string representation.
* @ignore
*/
ObjectID.prototype.inspect = ObjectID.prototype.toString;

/**
* Converts to its JSON representation.
*
* @return {String} return the 24 byte hex string representation.
* @ignore
*/
ObjectID.prototype.toJSON = function() {
  return this.toHexString();
};

/**
* Compares the equality of this ObjectID with `otherID`.
*
* @method
* @param {object} otherID ObjectID instance to compare against.
* @return {boolean} the result of comparing two ObjectID's
*/
ObjectID.prototype.equals = function equals(otherId) {
  // var id;

  if (otherId instanceof ObjectID) {
    return this.toString() === otherId.toString();
  } else if (
    typeof otherId === 'string' &&
    ObjectID.isValid(otherId) &&
    otherId.length === 12 &&
    this.id instanceof _Buffer
  ) {
    return otherId === this.id.toString('binary');
  } else if (typeof otherId === 'string' && ObjectID.isValid(otherId) && otherId.length === 24) {
    return otherId.toLowerCase() === this.toHexString();
  } else if (typeof otherId === 'string' && ObjectID.isValid(otherId) && otherId.length === 12) {
    return otherId === this.id;
  } else if (otherId != null && (otherId instanceof ObjectID || otherId.toHexString)) {
    return otherId.toHexString() === this.toHexString();
  } else {
    return false;
  }
};

/**
* Returns the generation date (accurate up to the second) that this ID was generated.
*
* @method
* @return {date} the generation date
*/
ObjectID.prototype.getTimestamp = function() {
  var timestamp = new Date();
  var time = this.id[3] | (this.id[2] << 8) | (this.id[1] << 16) | (this.id[0] << 24);
  timestamp.setTime(Math.floor(time) * 1000);
  return timestamp;
};

/**
* @ignore
*/
ObjectID.index = ~~(Math.random() * 0xffffff);

/**
* @ignore
*/
ObjectID.createPk = function createPk() {
  return new ObjectID();
};

/**
* Creates an ObjectID from a second based number, with the rest of the ObjectID zeroed out. Used for comparisons or sorting the ObjectID.
*
* @method
* @param {number} time an integer number representing a number of seconds.
* @return {ObjectID} return the created ObjectID
*/
ObjectID.createFromTime = function createFromTime(time) {
  var buffer = new Buffer([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  // Encode time into first 4 bytes
  buffer[3] = time & 0xff;
  buffer[2] = (time >> 8) & 0xff;
  buffer[1] = (time >> 16) & 0xff;
  buffer[0] = (time >> 24) & 0xff;
  // Return the new objectId
  return new ObjectID(buffer);
};

// Lookup tables
//var encodeLookup = '0123456789abcdef'.split('');
var decodeLookup = [];
i = 0;
while (i < 10) decodeLookup[0x30 + i] = i++;
while (i < 16) decodeLookup[0x41 - 10 + i] = decodeLookup[0x61 - 10 + i] = i++;

var _Buffer = Buffer;
var convertToHex = function(bytes) {
  return bytes.toString('hex');
};

/**
* Creates an ObjectID from a hex string representation of an ObjectID.
*
* @method
* @param {string} hexString create a ObjectID from a passed in 24 byte hexstring.
* @return {ObjectID} return the created ObjectID
*/
ObjectID.createFromHexString = function createFromHexString(string) {
  // Throw an error if it's not a valid setup
  if (typeof string === 'undefined' || (string != null && string.length !== 24)) {
    throw new Error(
      'Argument passed in must be a single String of 12 bytes or a string of 24 hex characters'
    );
  }

  // Use Buffer.from method if available
  if (hasBufferType) return new ObjectID(new Buffer(string, 'hex'));

  // Calculate lengths
  var array = new _Buffer(12);
  var n = 0;
  var i = 0;

  while (i < 24) {
    array[n++] = (decodeLookup[string.charCodeAt(i++)] << 4) | decodeLookup[string.charCodeAt(i++)];
  }

  return new ObjectID(array);
};

/**
* Checks if a value is a valid bson ObjectId
*
* @method
* @return {boolean} return true if the value is a valid bson ObjectId, return false otherwise.
*/
ObjectID.isValid = function isValid(id) {
  if (id == null) return false;

  if (typeof id === 'number') {
    return true;
  }

  if (typeof id === 'string') {
    return id.length === 12 || (id.length === 24 && checkForHexRegExp.test(id));
  }

  if (id instanceof ObjectID) {
    return true;
  }

  if (id instanceof _Buffer) {
    return true;
  }

  // Duck-Typing detection of ObjectId like objects
  if (id.toHexString) {
    return id.id.length === 12 || (id.id.length === 24 && checkForHexRegExp.test(id.id));
  }

  return false;
};

/**
* @ignore
*/
Object.defineProperty(ObjectID.prototype, 'generationTime', {
  enumerable: true,
  get: function() {
    return this.id[3] | (this.id[2] << 8) | (this.id[1] << 16) | (this.id[0] << 24);
  },
  set: function(value) {
    // Encode time into first 4 bytes
    this.id[3] = value & 0xff;
    this.id[2] = (value >> 8) & 0xff;
    this.id[1] = (value >> 16) & 0xff;
    this.id[0] = (value >> 24) & 0xff;
  }
});

/**
 * Expose.
 */
module.exports = ObjectID;
module.exports.ObjectID = ObjectID;
module.exports.ObjectId = ObjectID;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0).Buffer, __webpack_require__(73)))

/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * A class representation of the BSON RegExp type.
 *
 * @class
 * @return {BSONRegExp} A MinKey instance
 */
function BSONRegExp(pattern, options) {
  if (!(this instanceof BSONRegExp)) return new BSONRegExp();

  // Execute
  this._bsontype = 'BSONRegExp';
  this.pattern = pattern || '';
  this.options = options || '';

  // Validate options
  for (var i = 0; i < this.options.length; i++) {
    if (
      !(
        this.options[i] === 'i' ||
        this.options[i] === 'm' ||
        this.options[i] === 'x' ||
        this.options[i] === 'l' ||
        this.options[i] === 's' ||
        this.options[i] === 'u'
      )
    ) {
      throw new Error('the regular expression options [' + this.options[i] + '] is not supported');
    }
  }
}

module.exports = BSONRegExp;
module.exports.BSONRegExp = BSONRegExp;


/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/**
 * A class representation of the BSON Code type.
 *
 * @class
 * @param {(string|function)} code a string or function.
 * @param {Object} [scope] an optional scope for the function.
 * @return {Code}
 */
var Code = function Code(code, scope) {
  if (!(this instanceof Code)) return new Code(code, scope);
  this._bsontype = 'Code';
  this.code = code;
  this.scope = scope;
};

/**
 * @ignore
 */
Code.prototype.toJSON = function() {
  return { scope: this.scope, code: this.code };
};

module.exports = Code;
module.exports.Code = Code;


/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {

let Long = __webpack_require__(2);

var PARSE_STRING_REGEXP = /^(\+|-)?(\d+|(\d*\.\d*))?(E|e)?([-+])?(\d+)?$/;
var PARSE_INF_REGEXP = /^(\+|-)?(Infinity|inf)$/i;
var PARSE_NAN_REGEXP = /^(\+|-)?NaN$/i;

var EXPONENT_MAX = 6111;
var EXPONENT_MIN = -6176;
var EXPONENT_BIAS = 6176;
var MAX_DIGITS = 34;

// Nan value bits as 32 bit values (due to lack of longs)
var NAN_BUFFER = [
  0x7c,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00
].reverse();
// Infinity value bits 32 bit values (due to lack of longs)
var INF_NEGATIVE_BUFFER = [
  0xf8,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00
].reverse();
var INF_POSITIVE_BUFFER = [
  0x78,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00
].reverse();

var EXPONENT_REGEX = /^([-+])?(\d+)?$/;

// Detect if the value is a digit
var isDigit = function(value) {
  return !isNaN(parseInt(value, 10));
};

// Divide two uint128 values
var divideu128 = function(value) {
  var DIVISOR = Long.fromNumber(1000 * 1000 * 1000);
  var _rem = Long.fromNumber(0);

  if (!value.parts[0] && !value.parts[1] && !value.parts[2] && !value.parts[3]) {
    return { quotient: value, rem: _rem };
  }

  for (let i = 0; i <= 3; i++) {
    // Adjust remainder to match value of next dividend
    _rem = _rem.shiftLeft(32);
    // Add the divided to _rem
    _rem = _rem.add(new Long(value.parts[i], 0));
    value.parts[i] = _rem.div(DIVISOR).low_;
    _rem = _rem.modulo(DIVISOR);
  }

  return { quotient: value, rem: _rem };
};

// Multiply two Long values and return the 128 bit value
var multiply64x2 = function(left, right) {
  if (!left && !right) {
    return { high: Long.fromNumber(0), low: Long.fromNumber(0) };
  }

  var leftHigh = left.shiftRightUnsigned(32);
  var leftLow = new Long(left.getLowBits(), 0);
  var rightHigh = right.shiftRightUnsigned(32);
  var rightLow = new Long(right.getLowBits(), 0);

  var productHigh = leftHigh.multiply(rightHigh);
  var productMid = leftHigh.multiply(rightLow);
  var productMid2 = leftLow.multiply(rightHigh);
  var productLow = leftLow.multiply(rightLow);

  productHigh = productHigh.add(productMid.shiftRightUnsigned(32));
  productMid = new Long(productMid.getLowBits(), 0)
    .add(productMid2)
    .add(productLow.shiftRightUnsigned(32));

  productHigh = productHigh.add(productMid.shiftRightUnsigned(32));
  productLow = productMid.shiftLeft(32).add(new Long(productLow.getLowBits(), 0));

  // Return the 128 bit result
  return { high: productHigh, low: productLow };
};

var lessThan = function(left, right) {
  // Make values unsigned
  var uhleft = left.high_ >>> 0;
  var uhright = right.high_ >>> 0;

  // Compare high bits first
  if (uhleft < uhright) {
    return true;
  } else if (uhleft === uhright) {
    var ulleft = left.low_ >>> 0;
    var ulright = right.low_ >>> 0;
    if (ulleft < ulright) return true;
  }

  return false;
};

var invalidErr = function(string, message) {
  throw new Error('"${string}" not a valid Decimal128 string - ' + message);
};

/**
 * A class representation of the BSON Decimal128 type.
 *
 * @class
 * @param {Buffer} bytes a buffer containing the raw Decimal128 bytes.
 * @return {Double}
 */
var Decimal128 = function(bytes) {
  this._bsontype = 'Decimal128';
  this.bytes = bytes;
};

/**
 * Create a Decimal128 instance from a string representation
 *
 * @method
 * @param {string} string a numeric string representation.
 * @return {Decimal128} returns a Decimal128 instance.
 */
Decimal128.fromString = function(string) {
  // Parse state tracking
  var isNegative = false;
  var sawRadix = false;
  var foundNonZero = false;

  // Total number of significant digits (no leading or trailing zero)
  var significantDigits = 0;
  // Total number of significand digits read
  var nDigitsRead = 0;
  // Total number of digits (no leading zeros)
  var nDigits = 0;
  // The number of the digits after radix
  var radixPosition = 0;
  // The index of the first non-zero in *str*
  var firstNonZero = 0;

  // Digits Array
  var digits = [0];
  // The number of digits in digits
  var nDigitsStored = 0;
  // Insertion pointer for digits
  var digitsInsert = 0;
  // The index of the first non-zero digit
  var firstDigit = 0;
  // The index of the last digit
  var lastDigit = 0;

  // Exponent
  var exponent = 0;
  // loop index over array
  var i = 0;
  // The high 17 digits of the significand
  var significandHigh = [0, 0];
  // The low 17 digits of the significand
  var significandLow = [0, 0];
  // The biased exponent
  var biasedExponent = 0;

  // Read index
  var index = 0;

  // Results
  var stringMatch = string.match(PARSE_STRING_REGEXP);
  var infMatch = string.match(PARSE_INF_REGEXP);
  var nanMatch = string.match(PARSE_NAN_REGEXP);

  // Validate the string
  if ((!stringMatch && !infMatch && !nanMatch) || string.length === 0) {
    throw new Error('' + string + ' not a valid Decimal128 string');
  }

  if (stringMatch) {
    // full_match = stringMatch[0]
    // sign = stringMatch[1]

    var unsignedNumber = stringMatch[2];
    // stringMatch[3] is undefined if a whole number (ex "1", 12")
    // but defined if a number w/ decimal in it (ex "1.0, 12.2")

    var e = stringMatch[4];
    var expSign = stringMatch[5];
    var expNumber = stringMatch[6];

    // they provided e, but didn't give an exponent number. for ex "1e"
    if (e && expNumber === undefined) invalidErr(string, 'missing exponent power');

    // they provided e, but didn't give a number before it. for ex "e1"
    if (e && unsignedNumber === undefined) invalidErr(string, 'missing exponent base');

    if (e === undefined && (expSign || expNumber)) {
      invalidErr(string, 'missing e before exponent');
    }
  }

  // Get the negative or positive sign
  if (string[index] === '+' || string[index] === '-') {
    isNegative = string[index++] === '-';
  }

  // Check if user passed Infinity or NaN
  if (!isDigit(string[index]) && string[index] !== '.') {
    if (string[index] === 'i' || string[index] === 'I') {
      return new Decimal128(new Buffer(isNegative ? INF_NEGATIVE_BUFFER : INF_POSITIVE_BUFFER));
    } else if (string[index] === 'N') {
      return new Decimal128(new Buffer(NAN_BUFFER));
    }
  }

  // Read all the digits
  while (isDigit(string[index]) || string[index] === '.') {
    if (string[index] === '.') {
      if (sawRadix) invalidErr(string, 'contains multiple periods');

      sawRadix = true;
      index = index + 1;
      continue;
    }

    if (nDigitsStored < 34) {
      if (string[index] !== '0' || foundNonZero) {
        if (!foundNonZero) {
          firstNonZero = nDigitsRead;
        }

        foundNonZero = true;

        // Only store 34 digits
        digits[digitsInsert++] = parseInt(string[index], 10);
        nDigitsStored = nDigitsStored + 1;
      }
    }

    if (foundNonZero) nDigits = nDigits + 1;
    if (sawRadix) radixPosition = radixPosition + 1;

    nDigitsRead = nDigitsRead + 1;
    index = index + 1;
  }

  if (sawRadix && !nDigitsRead) throw new Error('' + string + ' not a valid Decimal128 string');

  // Read exponent if exists
  if (string[index] === 'e' || string[index] === 'E') {
    // Read exponent digits
    var match = string.substr(++index).match(EXPONENT_REGEX);

    // No digits read
    if (!match || !match[2]) return new Decimal128(new Buffer(NAN_BUFFER));

    // Get exponent
    exponent = parseInt(match[0], 10);

    // Adjust the index
    index = index + match[0].length;
  }

  // Return not a number
  if (string[index]) return new Decimal128(new Buffer(NAN_BUFFER));

  // Done reading input
  // Find first non-zero digit in digits
  firstDigit = 0;

  if (!nDigitsStored) {
    firstDigit = 0;
    lastDigit = 0;
    digits[0] = 0;
    nDigits = 1;
    nDigitsStored = 1;
    significantDigits = 0;
  } else {
    lastDigit = nDigitsStored - 1;
    significantDigits = nDigits;
    if (significantDigits !== 1) {
      while (string[firstNonZero + significantDigits - 1] === '0') {
        significantDigits = significantDigits - 1;
      }
    }
  }

  // Normalization of exponent
  // Correct exponent based on radix position, and shift significand as needed
  // to represent user input

  // Overflow prevention
  if (exponent <= radixPosition && radixPosition - exponent > 1 << 14) {
    exponent = EXPONENT_MIN;
  } else {
    exponent = exponent - radixPosition;
  }

  // Attempt to normalize the exponent
  while (exponent > EXPONENT_MAX) {
    // Shift exponent to significand and decrease
    lastDigit = lastDigit + 1;

    if (lastDigit - firstDigit > MAX_DIGITS) {
      // Check if we have a zero then just hard clamp, otherwise fail
      var digitsString = digits.join('');
      if (digitsString.match(/^0+$/)) {
        exponent = EXPONENT_MAX;
        break;
      }
      invalidErr(string, 'overflow');
    }
    exponent = exponent - 1;
  }

  while (exponent < EXPONENT_MIN || nDigitsStored < nDigits) {
    // Shift last digit. can only do this if < significant digits than # stored.
    if (lastDigit === 0 && significantDigits < nDigitsStored) {
      exponent = EXPONENT_MIN;
      significantDigits = 0;
      break;
    }

    if (nDigitsStored < nDigits) {
      // adjust to match digits not stored
      nDigits = nDigits - 1;
    } else {
      // adjust to round
      lastDigit = lastDigit - 1;
    }

    if (exponent < EXPONENT_MAX) {
      exponent = exponent + 1;
    } else {
      // Check if we have a zero then just hard clamp, otherwise fail
      digitsString = digits.join('');
      if (digitsString.match(/^0+$/)) {
        exponent = EXPONENT_MAX;
        break;
      }
      invalidErr(string, 'overflow');
    }
  }

  // Round
  // We've normalized the exponent, but might still need to round.
  if (lastDigit - firstDigit + 1 < significantDigits) {
    var endOfString = nDigitsRead;

    // If we have seen a radix point, 'string' is 1 longer than we have
    // documented with ndigits_read, so inc the position of the first nonzero
    // digit and the position that digits are read to.
    if (sawRadix) {
      firstNonZero = firstNonZero + 1;
      endOfString = endOfString + 1;
    }
    // if negative, we need to increment again to account for - sign at start.
    if (isNegative) {
      firstNonZero = firstNonZero + 1;
      endOfString = endOfString + 1;
    }

    var roundDigit = parseInt(string[firstNonZero + lastDigit + 1], 10);
    var roundBit = 0;

    if (roundDigit >= 5) {
      roundBit = 1;
      if (roundDigit === 5) {
        roundBit = digits[lastDigit] % 2 === 1;
        for (i = firstNonZero + lastDigit + 2; i < endOfString; i++) {
          if (parseInt(string[i], 10)) {
            roundBit = 1;
            break;
          }
        }
      }
    }

    if (roundBit) {
      var dIdx = lastDigit;

      for (; dIdx >= 0; dIdx--) {
        if (++digits[dIdx] > 9) {
          digits[dIdx] = 0;

          // overflowed most significant digit
          if (dIdx === 0) {
            if (exponent < EXPONENT_MAX) {
              exponent = exponent + 1;
              digits[dIdx] = 1;
            } else {
              return new Decimal128(
                new Buffer(isNegative ? INF_NEGATIVE_BUFFER : INF_POSITIVE_BUFFER)
              );
            }
          }
        }
      }
    }
  }

  // Encode significand
  // The high 17 digits of the significand
  significandHigh = Long.fromNumber(0);
  // The low 17 digits of the significand
  significandLow = Long.fromNumber(0);

  // read a zero
  if (significantDigits === 0) {
    significandHigh = Long.fromNumber(0);
    significandLow = Long.fromNumber(0);
  } else if (lastDigit - firstDigit < 17) {
    dIdx = firstDigit;
    significandLow = Long.fromNumber(digits[dIdx++]);
    significandHigh = new Long(0, 0);

    for (; dIdx <= lastDigit; dIdx++) {
      significandLow = significandLow.multiply(Long.fromNumber(10));
      significandLow = significandLow.add(Long.fromNumber(digits[dIdx]));
    }
  } else {
    dIdx = firstDigit;
    significandHigh = Long.fromNumber(digits[dIdx++]);

    for (; dIdx <= lastDigit - 17; dIdx++) {
      significandHigh = significandHigh.multiply(Long.fromNumber(10));
      significandHigh = significandHigh.add(Long.fromNumber(digits[dIdx]));
    }

    significandLow = Long.fromNumber(digits[dIdx++]);

    for (; dIdx <= lastDigit; dIdx++) {
      significandLow = significandLow.multiply(Long.fromNumber(10));
      significandLow = significandLow.add(Long.fromNumber(digits[dIdx]));
    }
  }

  var significand = multiply64x2(significandHigh, Long.fromString('100000000000000000'));

  significand.low = significand.low.add(significandLow);

  if (lessThan(significand.low, significandLow)) {
    significand.high = significand.high.add(Long.fromNumber(1));
  }

  // Biased exponent
  biasedExponent = exponent + EXPONENT_BIAS;
  var dec = { low: Long.fromNumber(0), high: Long.fromNumber(0) };

  // Encode combination, exponent, and significand.
  if (
    significand.high
      .shiftRightUnsigned(49)
      .and(Long.fromNumber(1))
      .equals(Long.fromNumber)
  ) {
    // Encode '11' into bits 1 to 3
    dec.high = dec.high.or(Long.fromNumber(0x3).shiftLeft(61));
    dec.high = dec.high.or(
      Long.fromNumber(biasedExponent).and(Long.fromNumber(0x3fff).shiftLeft(47))
    );
    dec.high = dec.high.or(significand.high.and(Long.fromNumber(0x7fffffffffff)));
  } else {
    dec.high = dec.high.or(Long.fromNumber(biasedExponent & 0x3fff).shiftLeft(49));
    dec.high = dec.high.or(significand.high.and(Long.fromNumber(0x1ffffffffffff)));
  }

  dec.low = significand.low;

  // Encode sign
  if (isNegative) {
    dec.high = dec.high.or(Long.fromString('9223372036854775808'));
  }

  // Encode into a buffer
  var buffer = new Buffer(16);
  index = 0;

  // Encode the low 64 bits of the decimal
  // Encode low bits
  buffer[index++] = dec.low.low_ & 0xff;
  buffer[index++] = (dec.low.low_ >> 8) & 0xff;
  buffer[index++] = (dec.low.low_ >> 16) & 0xff;
  buffer[index++] = (dec.low.low_ >> 24) & 0xff;
  // Encode high bits
  buffer[index++] = dec.low.high_ & 0xff;
  buffer[index++] = (dec.low.high_ >> 8) & 0xff;
  buffer[index++] = (dec.low.high_ >> 16) & 0xff;
  buffer[index++] = (dec.low.high_ >> 24) & 0xff;

  // Encode the high 64 bits of the decimal
  // Encode low bits
  buffer[index++] = dec.high.low_ & 0xff;
  buffer[index++] = (dec.high.low_ >> 8) & 0xff;
  buffer[index++] = (dec.high.low_ >> 16) & 0xff;
  buffer[index++] = (dec.high.low_ >> 24) & 0xff;
  // Encode high bits
  buffer[index++] = dec.high.high_ & 0xff;
  buffer[index++] = (dec.high.high_ >> 8) & 0xff;
  buffer[index++] = (dec.high.high_ >> 16) & 0xff;
  buffer[index++] = (dec.high.high_ >> 24) & 0xff;

  // Return the new Decimal128
  return new Decimal128(buffer);
};

// Extract least significant 5 bits
var COMBINATION_MASK = 0x1f;
// Extract least significant 14 bits
var EXPONENT_MASK = 0x3fff;
// Value of combination field for Inf
var COMBINATION_INFINITY = 30;
// Value of combination field for NaN
var COMBINATION_NAN = 31;
// Value of combination field for NaN
// var COMBINATION_SNAN = 32;
// decimal128 exponent bias
EXPONENT_BIAS = 6176;

/**
 * Create a string representation of the raw Decimal128 value
 *
 * @method
 * @return {string} returns a Decimal128 string representation.
 */
Decimal128.prototype.toString = function() {
  // Note: bits in this routine are referred to starting at 0,
  // from the sign bit, towards the coefficient.

  // bits 0 - 31
  var high;
  // bits 32 - 63
  var midh;
  // bits 64 - 95
  var midl;
  // bits 96 - 127
  var low;
  // bits 1 - 5
  var combination;
  // decoded biased exponent (14 bits)
  var biased_exponent;
  // the number of significand digits
  var significand_digits = 0;
  // the base-10 digits in the significand
  var significand = new Array(36);
  for (var i = 0; i < significand.length; i++) significand[i] = 0;
  // read pointer into significand
  var index = 0;

  // unbiased exponent
  var exponent;
  // the exponent if scientific notation is used
  var scientific_exponent;

  // true if the number is zero
  var is_zero = false;

  // the most signifcant significand bits (50-46)
  var significand_msb;
  // temporary storage for significand decoding
  var significand128 = { parts: new Array(4) };
  // indexing variables
  var j, k;

  // Output string
  var string = [];

  // Unpack index
  index = 0;

  // Buffer reference
  var buffer = this.bytes;

  // Unpack the low 64bits into a long
  low =
    buffer[index++] | (buffer[index++] << 8) | (buffer[index++] << 16) | (buffer[index++] << 24);
  midl =
    buffer[index++] | (buffer[index++] << 8) | (buffer[index++] << 16) | (buffer[index++] << 24);

  // Unpack the high 64bits into a long
  midh =
    buffer[index++] | (buffer[index++] << 8) | (buffer[index++] << 16) | (buffer[index++] << 24);
  high =
    buffer[index++] | (buffer[index++] << 8) | (buffer[index++] << 16) | (buffer[index++] << 24);

  // Unpack index
  index = 0;

  // Create the state of the decimal
  var dec = {
    low: new Long(low, midl),
    high: new Long(midh, high)
  };

  if (dec.high.lessThan(Long.ZERO)) {
    string.push('-');
  }

  // Decode combination field and exponent
  combination = (high >> 26) & COMBINATION_MASK;

  if (combination >> 3 === 3) {
    // Check for 'special' values
    if (combination === COMBINATION_INFINITY) {
      return string.join('') + 'Infinity';
    } else if (combination === COMBINATION_NAN) {
      return 'NaN';
    } else {
      biased_exponent = (high >> 15) & EXPONENT_MASK;
      significand_msb = 0x08 + ((high >> 14) & 0x01);
    }
  } else {
    significand_msb = (high >> 14) & 0x07;
    biased_exponent = (high >> 17) & EXPONENT_MASK;
  }

  exponent = biased_exponent - EXPONENT_BIAS;

  // Create string of significand digits

  // Convert the 114-bit binary number represented by
  // (significand_high, significand_low) to at most 34 decimal
  // digits through modulo and division.
  significand128.parts[0] = (high & 0x3fff) + ((significand_msb & 0xf) << 14);
  significand128.parts[1] = midh;
  significand128.parts[2] = midl;
  significand128.parts[3] = low;

  if (
    significand128.parts[0] === 0 &&
    significand128.parts[1] === 0 &&
    significand128.parts[2] === 0 &&
    significand128.parts[3] === 0
  ) {
    is_zero = true;
  } else {
    for (k = 3; k >= 0; k--) {
      var least_digits = 0;
      // Peform the divide
      var result = divideu128(significand128);
      significand128 = result.quotient;
      least_digits = result.rem.low_;

      // We now have the 9 least significant digits (in base 2).
      // Convert and output to string.
      if (!least_digits) continue;

      for (j = 8; j >= 0; j--) {
        // significand[k * 9 + j] = Math.round(least_digits % 10);
        significand[k * 9 + j] = least_digits % 10;
        // least_digits = Math.round(least_digits / 10);
        least_digits = Math.floor(least_digits / 10);
      }
    }
  }

  // Output format options:
  // Scientific - [-]d.dddE(+/-)dd or [-]dE(+/-)dd
  // Regular    - ddd.ddd

  if (is_zero) {
    significand_digits = 1;
    significand[index] = 0;
  } else {
    significand_digits = 36;
    i = 0;

    while (!significand[index]) {
      i++;
      significand_digits = significand_digits - 1;
      index = index + 1;
    }
  }

  scientific_exponent = significand_digits - 1 + exponent;

  // The scientific exponent checks are dictated by the string conversion
  // specification and are somewhat arbitrary cutoffs.
  //
  // We must check exponent > 0, because if this is the case, the number
  // has trailing zeros.  However, we *cannot* output these trailing zeros,
  // because doing so would change the precision of the value, and would
  // change stored data if the string converted number is round tripped.
  if (scientific_exponent >= 34 || scientific_exponent <= -7 || exponent > 0) {
    // Scientific format

    // if there are too many significant digits, we should just be treating numbers
    // as + or - 0 and using the non-scientific exponent (this is for the "invalid
    // representation should be treated as 0/-0" spec cases in decimal128-1.json)
    if (significand_digits > 34) {
      string.push(0);
      if (exponent > 0) string.push('E+' + exponent);
      else if (exponent < 0) string.push('E' + exponent);
      return string.join('');
    }

    string.push(significand[index++]);
    significand_digits = significand_digits - 1;

    if (significand_digits) {
      string.push('.');
    }

    for (i = 0; i < significand_digits; i++) {
      string.push(significand[index++]);
    }

    // Exponent
    string.push('E');
    if (scientific_exponent > 0) {
      string.push('+' + scientific_exponent);
    } else {
      string.push(scientific_exponent);
    }
  } else {
    // Regular format with no decimal place
    if (exponent >= 0) {
      for (i = 0; i < significand_digits; i++) {
        string.push(significand[index++]);
      }
    } else {
      var radix_position = significand_digits + exponent;

      // non-zero digits before radix
      if (radix_position > 0) {
        for (i = 0; i < radix_position; i++) {
          string.push(significand[index++]);
        }
      } else {
        string.push('0');
      }

      string.push('.');
      // add leading zeros after radix
      while (radix_position++ < 0) {
        string.push('0');
      }

      for (i = 0; i < significand_digits - Math.max(radix_position - 1, 0); i++) {
        string.push(significand[index++]);
      }
    }
  }

  return string.join('');
};

Decimal128.prototype.toJSON = function() {
  return { $numberDecimal: this.toString() };
};

module.exports = Decimal128;
module.exports.Decimal128 = Decimal128;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0).Buffer))

/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * A class representation of the BSON MaxKey type.
 *
 * @class
 * @return {MaxKey} A MaxKey instance
 */
function MaxKey() {
  if (!(this instanceof MaxKey)) return new MaxKey();

  this._bsontype = 'MaxKey';
}

module.exports = MaxKey;
module.exports.MaxKey = MaxKey;


/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * A class representation of the BSON DBRef type.
 *
 * @class
 * @param {string} collection the collection name.
 * @param {ObjectID} oid the reference ObjectID.
 * @param {string} [db] optional db name, if omitted the reference is local to the current db.
 * @return {DBRef}
 */
function DBRef(collection, oid, db, fields) {
  if (!(this instanceof DBRef)) return new DBRef(collection, oid, db, fields);

  this._bsontype = 'DBRef';
  this.collection = collection;
  this.oid = oid;
  this.db = db;
  this.fields = fields || {};
}

/**
 * @ignore
 * @api private
 */
DBRef.prototype.toJSON = function() {
  var o = {
    $ref: this.collection,
    $id: this.oid
  };

  if (this.db != null) o.$db = this.db;
  o = Object.assign(o, this.fields);
  return o;
};

module.exports = DBRef;
module.exports.DBRef = DBRef;


/***/ }),
/* 20 */,
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StitchClient = exports.StitchClientFactory = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /* global window, fetch */
/* eslint no-labels: ['error', { 'allowLoop': true }] */


exports.newStitchClient = newStitchClient;

__webpack_require__(22);

var _auth = __webpack_require__(37);

var _providers = __webpack_require__(23);

var _common = __webpack_require__(3);

var _services = __webpack_require__(46);

var _services2 = _interopRequireDefault(_services);

var _common2 = __webpack_require__(7);

var common = _interopRequireWildcard(_common2);

var _mongodbExtjson = __webpack_require__(24);

var _mongodbExtjson2 = _interopRequireDefault(_mongodbExtjson);

var _queryString = __webpack_require__(78);

var _queryString2 = _interopRequireDefault(_queryString);

var _errors = __webpack_require__(11);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var v1 = 1;
var v2 = 2;
var v3 = 3;
var API_TYPE_PUBLIC = 'public';
var API_TYPE_PRIVATE = 'private';
var API_TYPE_CLIENT = 'client';
var API_TYPE_APP = 'app';

/**
  * Factory class to create a new StitchClient asynchronously.
  */

var StitchClientFactory = exports.StitchClientFactory = function () {
  function StitchClientFactory() {
    _classCallCheck(this, StitchClientFactory);

    throw new _errors.StitchError('StitchClient can only be made from the StitchClientFactory.create function');
  }

  _createClass(StitchClientFactory, null, [{
    key: 'create',
    value: function create(clientAppID) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return newStitchClient(StitchClient.prototype, clientAppID, options);
    }
  }]);

  return StitchClientFactory;
}();

function newStitchClient(prototype, clientAppID) {
  var _v, _v2, _v3, _stitchClient$rootURL;

  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var stitchClient = Object.create(prototype);
  var baseUrl = common.DEFAULT_STITCH_SERVER_URL;
  if (options.baseUrl) {
    baseUrl = options.baseUrl;
  }

  stitchClient.clientAppID = clientAppID;

  stitchClient.authUrl = clientAppID ? baseUrl + '/api/client/v2.0/app/' + clientAppID + '/auth' : baseUrl + '/api/admin/v3.0/auth';

  stitchClient.rootURLsByAPIVersion = (_stitchClient$rootURL = {}, _defineProperty(_stitchClient$rootURL, v1, (_v = {}, _defineProperty(_v, API_TYPE_PUBLIC, baseUrl + '/api/public/v1.0'), _defineProperty(_v, API_TYPE_CLIENT, baseUrl + '/api/client/v1.0'), _defineProperty(_v, API_TYPE_PRIVATE, baseUrl + '/api/private/v1.0'), _defineProperty(_v, API_TYPE_APP, clientAppID ? baseUrl + '/api/client/v1.0/app/' + clientAppID : baseUrl + '/api/public/v1.0'), _v)), _defineProperty(_stitchClient$rootURL, v2, (_v2 = {}, _defineProperty(_v2, API_TYPE_PUBLIC, baseUrl + '/api/public/v2.0'), _defineProperty(_v2, API_TYPE_CLIENT, baseUrl + '/api/client/v2.0'), _defineProperty(_v2, API_TYPE_PRIVATE, baseUrl + '/api/private/v2.0'), _defineProperty(_v2, API_TYPE_APP, clientAppID ? baseUrl + '/api/client/v2.0/app/' + clientAppID : baseUrl + '/api/public/v2.0'), _v2)), _defineProperty(_stitchClient$rootURL, v3, (_v3 = {}, _defineProperty(_v3, API_TYPE_PUBLIC, baseUrl + '/api/public/v3.0'), _defineProperty(_v3, API_TYPE_CLIENT, baseUrl + '/api/client/v3.0'), _defineProperty(_v3, API_TYPE_APP, clientAppID ? baseUrl + '/api/client/v3.0/app/' + clientAppID : baseUrl + '/api/admin/v3.0'), _v3)), _stitchClient$rootURL);

  var authOptions = {
    codec: _common.APP_CLIENT_CODEC,
    storage: options.storage
  };

  if (options.storageType) {
    authOptions.storageType = options.storageType;
  }
  if (options.platform) {
    authOptions.platform = options.platform;
  }
  if (options.authCodec) {
    authOptions.codec = options.authCodec;
  }

  var authPromise = _auth.AuthFactory.create(stitchClient, stitchClient.authUrl, authOptions);
  return authPromise.then(function (auth) {
    stitchClient.auth = auth;
    return Promise.all([stitchClient.auth.handleRedirect(), stitchClient.auth.handleCookie()]);
  }).then(function () {
    return stitchClient;
  });
}
/**
 * Prototype for StitchClient class.
 * This is the internal implementation for StitchClient and should not
 * be exposed.
 *
 * @class
 */

var StitchClient = exports.StitchClient = function () {
  function StitchClient() {
    _classCallCheck(this, StitchClient);

    throw new _errors.StitchError('StitchClient can only be made from the StitchClientFactory.create function');
  }

  _createClass(StitchClient, [{
    key: 'login',


    /**
     * Login to stitch instance, optionally providing a username and password. In
     * the event that these are omitted, anonymous authentication is used.
     *
     * @param {String} [email] the email address used for login
     * @param {String} [password] the password for the provided email address
     * @param {Object} [options] additional authentication options
     * @returns {Promise}
     */
    value: function login(email, password) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      if (email === undefined || password === undefined) {
        return this.authenticate(_providers.PROVIDER_TYPE_ANON, options);
      }

      return this.authenticate('userpass', Object.assign({ username: email, password: password }, options));
    }

    /**
     * Send a request to the server indicating the provided email would like
     * to sign up for an account. This will trigger a confirmation email containing
     * a token which must be used with the `emailConfirm` method of the `userpass`
     * auth provider in order to complete registration. The user will not be able
     * to log in until that flow has been completed.
     *
     * @param {String} email the email used to sign up for the app
     * @param {String} password the password used to sign up for the app
     * @param {Object} [options] additional authentication options
     * @returns {Promise}
     */

  }, {
    key: 'register',
    value: function register(email, password) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      return this.auth.provider('userpass').register(email, password, options);
    }

    /**
     * Submits an authentication request to the specified provider providing any
     * included options (read: user data).  If auth data already exists and the
     * existing auth data has an access token, then these credentials are returned.
     *
     * @param {String} providerType the provider used for authentication (e.g. 'userpass', 'facebook', 'google')
     * @param {Object} [options] additional authentication options
     * @returns {Promise} which resolves to a String value: the authed userId
     */

  }, {
    key: 'authenticate',
    value: function authenticate(providerType) {
      var _this = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      // reuse existing auth if present
      var authenticateFn = function authenticateFn() {
        return _this.auth.provider(providerType).authenticate(options).then(function () {
          return _this.authedId();
        });
      };

      if (this.isAuthenticated()) {
        if (providerType === _providers.PROVIDER_TYPE_ANON && this.auth.getLoggedInProviderType() === _providers.PROVIDER_TYPE_ANON) {
          return Promise.resolve(this.auth.authedId); // is authenticated, skip log in
        }

        return this.logout().then(function () {
          return authenticateFn();
        }); // will not be authenticated, continue log in
      }

      // is not authenticated, continue log in
      return authenticateFn();
    }

    /**
     * Ends the session for the current user.
     *
     * @returns {Promise}
     */

  }, {
    key: 'logout',
    value: function logout() {
      var _this2 = this;

      return this._do('/auth/session', 'DELETE', {
        refreshOnFailure: false,
        useRefreshToken: true,
        rootURL: this.rootURLsByAPIVersion[v2][API_TYPE_CLIENT]
      }).then(function () {
        return _this2.auth.clear();
      }, function () {
        return _this2.auth.clear();
      });
    }

    /**
     * @return {*} Returns any error from the Stitch authentication system.
     */

  }, {
    key: 'authError',
    value: function authError() {
      return this.auth.error();
    }

    /**
     * Returns profile information for the currently logged in user
     *
     * @returns {Promise}
     */

  }, {
    key: 'userProfile',
    value: function userProfile() {
      return this._do('/auth/profile', 'GET', { rootURL: this.rootURLsByAPIVersion[v2][API_TYPE_CLIENT] }).then(function (response) {
        return response.json();
      });
    }

    /**
    * @return {Boolean} whether or not the current client is authenticated
    */

  }, {
    key: 'isAuthenticated',
    value: function isAuthenticated() {
      return !!this.authedId();
    }

    /**
     *  @return {String} Returns a string of the currently authed user's ID.
     */

  }, {
    key: 'authedId',
    value: function authedId() {
      return this.auth.authedId;
    }

    /**
     * Factory method for accessing Stitch services.
     *
     * @method
     * @param {String} type The service type [mongodb, {String}]
     * @param {String} name The service name.
     * @return {Object} returns a named service.
     */

  }, {
    key: 'service',
    value: function service(type, name) {
      if (this.constructor !== StitchClient) {
        throw new _errors.StitchError('`service` is a factory method, do not use `new`');
      }

      if (!_services2.default.hasOwnProperty(type)) {
        throw new _errors.StitchError('Invalid service type specified: ' + type);
      }

      var ServiceType = _services2.default[type];
      return new ServiceType(this, name);
    }

    /**
     * Executes a function.
     *
     * @param {String} name The name of the function.
     * @param {...*} args Arguments to pass to the function.
     */

  }, {
    key: 'executeFunction',
    value: function executeFunction(name) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      return this._doFunctionCall({
        name: name,
        arguments: args
      });
    }

    /**
     * Executes a service function.
     *
     * @param {String} service The name of the service.
     * @param {String} action The name of the service action.
     * @param {...*} args Arguments to pass to the service action.
     */

  }, {
    key: 'executeServiceFunction',
    value: function executeServiceFunction(service, action) {
      for (var _len2 = arguments.length, args = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
        args[_key2 - 2] = arguments[_key2];
      }

      return this._doFunctionCall({
        service: service,
        name: action,
        arguments: args
      });
    }
  }, {
    key: '_doFunctionCall',
    value: function _doFunctionCall(request) {
      var responseDecoder = function responseDecoder(d) {
        return _mongodbExtjson2.default.parse(d, { strict: false });
      };
      var responseEncoder = function responseEncoder(d) {
        return _mongodbExtjson2.default.stringify(d);
      };

      return this._do('/functions/call', 'POST', { body: responseEncoder(request) }).then(function (response) {
        return response.text();
      }).then(function (body) {
        return responseDecoder(body);
      });
    }

    /**
     * Returns an access token for the user
     *
     * @returns {Promise}
     */

  }, {
    key: 'doSessionPost',
    value: function doSessionPost() {
      return this._do('/auth/session', 'POST', {
        refreshOnFailure: false,
        useRefreshToken: true,
        rootURL: this.rootURLsByAPIVersion[v2][API_TYPE_CLIENT]
      }).then(function (response) {
        return response.json();
      });
    }

    /**
     * Returns an array of api keys
     *
     * @returns {Promise}
     */

  }, {
    key: 'getApiKeys',
    value: function getApiKeys() {
      return this._do('/auth/api_keys', 'GET', {
        rootURL: this.rootURLsByAPIVersion[v2][API_TYPE_CLIENT],
        useRefreshToken: true
      }).then(function (response) {
        return response.json();
      });
    }

    /**
     * Creates a user api key
     *
     * @param {String} userApiKeyName the user defined name of the userApiKey
     * @returns {Promise}
     */

  }, {
    key: 'createApiKey',
    value: function createApiKey(userApiKeyName) {
      return this._do('/auth/api_keys', 'POST', { rootURL: this.rootURLsByAPIVersion[v2][API_TYPE_CLIENT],
        useRefreshToken: true,
        body: JSON.stringify({ 'name': userApiKeyName })
      }).then(function (response) {
        return response.json();
      });
    }

    /**
     * Returns a user api key
     *
     * @param {String} keyID the ID of the key
     * @returns {Promise}
     */

  }, {
    key: 'getApiKeyByID',
    value: function getApiKeyByID(keyID) {
      return this._do('/auth/api_keys/' + keyID, 'GET', {
        rootURL: this.rootURLsByAPIVersion[v2][API_TYPE_CLIENT],
        useRefreshToken: true
      }).then(function (response) {
        return response.json();
      });
    }

    /**
     * Deletes a user api key
     *
     * @param {String} keyID the ID of the key
     * @returns {Promise}
     */

  }, {
    key: 'deleteApiKeyByID',
    value: function deleteApiKeyByID(keyID) {
      return this._do('/auth/api_keys/' + keyID, 'DELETE', {
        rootURL: this.rootURLsByAPIVersion[v2][API_TYPE_CLIENT],
        useRefreshToken: true
      });
    }

    /**
     * Enable a user api key
     *
     * @param {String} keyID the ID of the key
     * @returns {Promise}
     */

  }, {
    key: 'enableApiKeyByID',
    value: function enableApiKeyByID(keyID) {
      return this._do('/auth/api_keys/' + keyID + '/enable', 'PUT', {
        rootURL: this.rootURLsByAPIVersion[v2][API_TYPE_CLIENT],
        useRefreshToken: true
      });
    }

    /**
     * Disable a user api key
     *
     * @param {String} keyID the ID of the key
     * @returns {Promise}
     */

  }, {
    key: 'disableApiKeyByID',
    value: function disableApiKeyByID(keyID) {
      return this._do('/auth/api_keys/' + keyID + '/disable', 'PUT', {
        rootURL: this.rootURLsByAPIVersion[v2][API_TYPE_CLIENT],
        useRefreshToken: true
      });
    }
  }, {
    key: '_fetch',
    value: function _fetch(url, fetchArgs, resource, method, options) {
      var _this3 = this;

      return fetch(url, fetchArgs).then(function (response) {
        // Okay: passthrough
        if (response.status >= 200 && response.status < 300) {
          return Promise.resolve(response);
        }

        if (response.headers.get('Content-Type') === common.JSONTYPE) {
          return response.json().then(function (json) {
            // Only want to try refreshing token when there's an invalid session
            if ('error_code' in json && json.error_code === _errors.ErrInvalidSession) {
              if (!options.refreshOnFailure) {
                return _this3.auth.clear().then(function () {
                  var error = new _errors.StitchError(json.error, json.error_code);
                  error.response = response;
                  error.json = json;
                  throw error;
                });
              }

              return _this3.auth.refreshToken().then(function () {
                options.refreshOnFailure = false;
                return _this3._do(resource, method, options);
              });
            }

            var error = new _errors.StitchError(json.error, json.error_code);
            error.response = response;
            error.json = json;
            return Promise.reject(error);
          });
        }

        var error = new Error(response.statusText);
        error.response = response;
        return Promise.reject(error);
      });
    }
  }, {
    key: '_fetchArgs',
    value: function _fetchArgs(resource, method, options) {
      var appURL = this.rootURLsByAPIVersion[options.apiVersion][options.apiType];
      var url = '' + appURL + resource;
      if (options.rootURL) {
        url = '' + options.rootURL + resource;
      }
      var fetchArgs = common.makeFetchArgs(method, options.body);

      if (!!options.headers) {
        Object.assign(fetchArgs.headers, options.headers);
      }

      if (options.queryParams) {
        url = url + '?' + _queryString2.default.stringify(options.queryParams);
      }

      return { url: url, fetchArgs: fetchArgs };
    }
  }, {
    key: '_do',
    value: function _do(resource, method, options) {
      var _this4 = this;

      options = Object.assign({}, {
        refreshOnFailure: true,
        useRefreshToken: false,
        apiVersion: v2,
        apiType: API_TYPE_APP,
        rootURL: undefined
      }, options);

      var _fetchArgs2 = this._fetchArgs(resource, method, options),
          url = _fetchArgs2.url,
          fetchArgs = _fetchArgs2.fetchArgs;

      if (options.noAuth) {
        return this._fetch(url, fetchArgs, resource, method, options);
      }

      if (!this.isAuthenticated()) {
        return Promise.reject(new _errors.StitchError('Must auth first', _errors.ErrUnauthorized));
      }
      var token = options.useRefreshToken ? this.auth.getRefreshToken() : this.auth.getAccessToken();

      // If access token is expired, proactively get a new one
      if (!options.useRefreshToken) {
        if (this.auth.isAccessTokenExpired()) {
          return this.auth.refreshToken().then(function () {
            options.refreshOnFailure = false;
            return _this4._do(resource, method, options);
          });
        }

        fetchArgs.headers.Authorization = 'Bearer ' + token;
        return this._fetch(url, fetchArgs, resource, method, options);
      }

      fetchArgs.headers.Authorization = 'Bearer ' + token;
      return this._fetch(url, fetchArgs, resource, method, options);
    }
  }, {
    key: 'type',
    get: function get() {
      return common.APP_CLIENT_TYPE;
    }
  }]);

  return StitchClient;
}();

/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

// the whatwg-fetch polyfill installs the fetch() function
// on the global object (window or self)
//
// Return that as the export for use in Webpack, Browserify etc.
__webpack_require__(36);
var globalObj = typeof self !== 'undefined' && self || this;
module.exports = globalObj.fetch.bind(globalObj);


/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createProviders = exports.PROVIDER_TYPE_MONGODB_CLOUD = exports.PROVIDER_TYPE_FACEBOOK = exports.PROVIDER_TYPE_GOOGLE = exports.PROVIDER_TYPE_APIKEY = exports.PROVIDER_TYPE_USERPASS = exports.PROVIDER_TYPE_CUSTOM = exports.PROVIDER_TYPE_ANON = undefined;

var _common = __webpack_require__(7);

var common = _interopRequireWildcard(_common);

var _common2 = __webpack_require__(3);

var authCommon = _interopRequireWildcard(_common2);

var _util = __webpack_require__(1);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; } /** @module auth  */


var PROVIDER_TYPE_ANON = exports.PROVIDER_TYPE_ANON = 'anon';
var PROVIDER_TYPE_CUSTOM = exports.PROVIDER_TYPE_CUSTOM = 'custom';
var PROVIDER_TYPE_USERPASS = exports.PROVIDER_TYPE_USERPASS = 'userpass';
var PROVIDER_TYPE_APIKEY = exports.PROVIDER_TYPE_APIKEY = 'apiKey';
var PROVIDER_TYPE_GOOGLE = exports.PROVIDER_TYPE_GOOGLE = 'google';
var PROVIDER_TYPE_FACEBOOK = exports.PROVIDER_TYPE_FACEBOOK = 'facebook';
var PROVIDER_TYPE_MONGODB_CLOUD = exports.PROVIDER_TYPE_MONGODB_CLOUD = 'mongodbCloud';

/**
 * @namespace
 */
function anonProvider(auth) {
  return {
    /**
     * Login to a stitch application using anonymous authentication
     *
     * @memberof anonProvider
     * @instance
     * @returns {Promise} a promise that resolves when authentication succeeds.
     */
    authenticate: function authenticate() {
      var deviceId = auth.getDeviceId();
      var device = auth.getDeviceInfo(deviceId, !!auth.client && auth.client.clientAppID);
      var fetchArgs = common.makeFetchArgs('GET');
      fetchArgs.cors = true;

      return fetch(auth.rootUrl + '/providers/anon-user/login?device=' + (0, _util.uriEncodeObject)(device), fetchArgs).then(common.checkStatus).then(function (response) {
        return response.json();
      }).then(function (json) {
        return auth.set(json, PROVIDER_TYPE_ANON);
      });
    }
  };
}

/**
  * @namespace
  */
function customProvider(auth) {
  var providerRoute = 'providers/custom-token';
  var loginRoute = providerRoute + '/login';

  return {
    /**
     * Login to a stitch application using custom authentication
     *
     * @memberof customProvider
     * @instance
     * @param {String} JWT token to use for authentication
     * @returns {Promise} a promise that resolves when authentication succeeds.
     */
    authenticate: function authenticate(token) {
      var deviceId = auth.getDeviceId();
      var device = auth.getDeviceInfo(deviceId, !!auth.client && auth.client.clientAppID);

      var fetchArgs = common.makeFetchArgs('POST', JSON.stringify({ token: token, options: { device: device } }));
      fetchArgs.cors = true;

      return fetch(auth.rootUrl + '/' + loginRoute, fetchArgs).then(common.checkStatus).then(function (response) {
        return response.json();
      }).then(function (json) {
        return auth.set(json, PROVIDER_TYPE_CUSTOM);
      });
    }
  };
}

/** @namespace */
function userPassProvider(auth) {
  // The ternary expression here is redundant but is just preserving previous behavior based on whether or not
  // the client is for the admin or client API.
  var providerRoute = auth.isAppClient() ? 'providers/local-userpass' : 'providers/local-userpass';
  var loginRoute = auth.isAppClient() ? providerRoute + '/login' : providerRoute + '/login';

  return {
    /**
     * Login to a stitch application using username and password authentication
     *
     * @memberof userPassProvider
     * @instance
     * @param {String} username the username to use for authentication
     * @param {String} password the password to use for authentication
     * @returns {Promise} a promise that resolves when authentication succeeds.
     */
    authenticate: function authenticate(_ref) {
      var username = _ref.username,
          password = _ref.password;

      var deviceId = auth.getDeviceId();
      var device = auth.getDeviceInfo(deviceId, !!auth.client && auth.client.clientAppID);

      var fetchArgs = common.makeFetchArgs('POST', JSON.stringify({ username: username, password: password, options: { device: device } }));
      fetchArgs.cors = true;

      return fetch(auth.rootUrl + '/' + loginRoute, fetchArgs).then(common.checkStatus).then(function (response) {
        return response.json();
      }).then(function (json) {
        return auth.set(json, PROVIDER_TYPE_USERPASS);
      });
    },

    /**
     * Completes the confirmation workflow from the stitch server
     * @memberof userPassProvider
     * @instance
     * @param {String} tokenId the tokenId provided by the stitch server
     * @param {String} token the token provided by the stitch server
     * @returns {Promise}
     */
    emailConfirm: function emailConfirm(tokenId, token) {
      var fetchArgs = common.makeFetchArgs('POST', JSON.stringify({ tokenId: tokenId, token: token }));
      fetchArgs.cors = true;

      return fetch(auth.rootUrl + '/' + providerRoute + '/confirm', fetchArgs).then(common.checkStatus).then(function (response) {
        return response.json();
      });
    },

    /**
     * Request that the stitch server send another email confirmation
     * for account creation.
     *
     * @memberof userPassProvider
     * @instance
     * @param {String} email the email to send a confirmation email for
     * @returns {Promise}
     */
    sendEmailConfirm: function sendEmailConfirm(email) {
      var fetchArgs = common.makeFetchArgs('POST', JSON.stringify({ email: email }));
      fetchArgs.cors = true;

      return fetch(auth.rootUrl + '/' + providerRoute + '/confirm/send', fetchArgs).then(common.checkStatus).then(function (response) {
        return response.json();
      });
    },

    /**
     * Sends a password reset request to the stitch server
     *
     * @memberof userPassProvider
     * @instance
     * @param {String} email the email of the account to reset the password for
     * @returns {Promise}
     */
    sendPasswordReset: function sendPasswordReset(email) {
      var fetchArgs = common.makeFetchArgs('POST', JSON.stringify({ email: email }));
      fetchArgs.cors = true;

      return fetch(auth.rootUrl + '/' + providerRoute + '/reset/send', fetchArgs).then(common.checkStatus).then(function (response) {
        return response.json();
      });
    },

    /**
     * Use information returned from the stitch server to complete the password
     * reset flow for a given email account, providing a new password for the account.
     *
     * @memberof userPassProvider
     * @instance
     * @param {String} tokenId the tokenId provided by the stitch server
     * @param {String} token the token provided by the stitch server
     * @param {String} password the new password requested for this account
     * @returns {Promise}
     */
    passwordReset: function passwordReset(tokenId, token, password) {
      var fetchArgs = common.makeFetchArgs('POST', JSON.stringify({ tokenId: tokenId, token: token, password: password }));
      fetchArgs.cors = true;

      return fetch(auth.rootUrl + '/' + providerRoute + '/reset', fetchArgs).then(common.checkStatus).then(function (response) {
        return response.json();
      });
    },

    /**
     * Will trigger an email to the requested account containing a link with the
     * token and tokenId that must be returned to the server using emailConfirm()
     * to activate the account.
     *
     * @memberof userPassProvider
     * @instance
     * @param {String} email the requested email for the account
     * @param {String} password the requested password for the account
     * @returns {Promise}
     */
    register: function register(email, password) {
      var fetchArgs = common.makeFetchArgs('POST', JSON.stringify({ email: email, password: password }));
      fetchArgs.cors = true;

      return fetch(auth.rootUrl + '/' + providerRoute + '/register', fetchArgs).then(common.checkStatus).then(function (response) {
        return response.json();
      });
    }
  };
}

/** @namespace */
function apiKeyProvider(auth) {
  // The ternary expression here is redundant but is just preserving previous behavior based on whether or not
  // the client is for the admin or client API.
  var loginRoute = auth.isAppClient() ? 'providers/api-key/login' : 'providers/api-key/login';

  return {
    /**
     * Login to a stitch application using an api key
     *
     * @memberof apiKeyProvider
     * @instance
     * @param {String} key the key for authentication
     * @returns {Promise} a promise that resolves when authentication succeeds.
     */
    authenticate: function authenticate(key) {
      var deviceId = auth.getDeviceId();
      var device = auth.getDeviceInfo(deviceId, !!auth.client && auth.client.clientAppID);
      var fetchArgs = common.makeFetchArgs('POST', JSON.stringify({ 'key': key, 'options': { device: device } }));
      fetchArgs.cors = true;
      return fetch(auth.rootUrl + '/' + loginRoute, fetchArgs).then(common.checkStatus).then(function (response) {
        return response.json();
      }).then(function (json) {
        return auth.set(json, PROVIDER_TYPE_APIKEY);
      });
    }
  };
}

// The state we generate is to be used for any kind of request where we will
// complete an authentication flow via a redirect. We store the generate in
// a local storage bound to the app's origin. This ensures that any time we
// receive a redirect, there must be a state parameter and it must match
// what we ourselves have generated. This state MUST only be sent to
// a trusted Stitch endpoint in order to preserve its integrity. Stitch will
// store it in some way on its origin (currently a cookie stored on this client)
// and use that state at the end of an auth flow as a parameter in the redirect URI.
var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function generateState() {
  var state = '';
  for (var i = 0; i < 64; ++i) {
    state += alpha.charAt(Math.floor(Math.random() * alpha.length));
  }

  return state;
}

function getOAuthLoginURL(auth, providerName, redirectUrl) {
  if (redirectUrl === undefined) {
    redirectUrl = auth.pageRootUrl();
  }

  var state = generateState();
  return auth.storage.set(authCommon.STATE_KEY, state).then(function () {
    return auth.getDeviceId();
  }).then(function (deviceId) {
    var device = auth.getDeviceInfo(deviceId, !!auth.client && auth.client.clientAppID);

    var result = auth.rootUrl + '/providers/oauth2-' + providerName + '/login?redirect=' + encodeURI(redirectUrl) + '&state=' + state + '&device=' + (0, _util.uriEncodeObject)(device);
    return result;
  });
}

/** @namespace */
function googleProvider(auth) {
  var loginRoute = auth.isAppClient() ? 'providers/oauth2-google/login' : 'providers/oauth2-google/login';

  return {
    /**
     * Login to a stitch application using google authentication
     *
     * @memberof googleProvider
     * @instance
     * @param {Object} data the redirectUrl data to use for authentication
     * @returns {Promise} a promise that resolves when authentication succeeds.
     */
    authenticate: function authenticate(data) {
      var authCode = data.authCode;

      if (authCode) {
        var deviceId = auth.getDeviceId();
        var device = auth.getDeviceInfo(deviceId, !!auth.client && auth.client.clientAppID);

        var fetchArgs = common.makeFetchArgs('POST', JSON.stringify({ authCode: authCode, options: { device: device } }));

        return fetch(auth.rootUrl + '/' + loginRoute, fetchArgs).then(common.checkStatus).then(function (response) {
          return response.json();
        }).then(function (json) {
          return auth.set(json, PROVIDER_TYPE_GOOGLE);
        });
      }

      var redirectUrl = data && data.redirectUrl ? data.redirectUrl : undefined;
      return auth.storage.set(authCommon.STITCH_REDIRECT_PROVIDER, PROVIDER_TYPE_GOOGLE).then(function () {
        return getOAuthLoginURL(auth, PROVIDER_TYPE_GOOGLE, redirectUrl);
      }).then(function (res) {
        return window.location.replace(res);
      });
    }
  };
}

/** @namespace */
function facebookProvider(auth) {
  var loginRoute = auth.isAppClient() ? 'providers/oauth2-facebook/login' : 'providers/oauth2-facebook/login';

  return {
    /**
     * Login to a stitch application using facebook authentication
     *
     * @memberof facebookProvider
     * @instance
     * @param {Object} data the redirectUrl data to use for authentication
     * @returns {Promise} a promise that resolves when authentication succeeds.
     */
    authenticate: function authenticate(data) {
      var accessToken = data.accessToken;


      if (accessToken) {
        var deviceId = auth.getDeviceId();
        var device = auth.getDeviceInfo(deviceId, !!auth.client && auth.client.clientAppID);

        var fetchArgs = common.makeFetchArgs('POST', JSON.stringify({ accessToken: accessToken, options: { device: device } }));

        return fetch(auth.rootUrl + '/' + loginRoute, fetchArgs).then(common.checkStatus).then(function (response) {
          return response.json();
        }).then(function (json) {
          return auth.set(json, PROVIDER_TYPE_FACEBOOK);
        });
      }

      var redirectUrl = data && data.redirectUrl ? data.redirectUrl : undefined;
      return auth.storage.set(authCommon.STITCH_REDIRECT_PROVIDER, PROVIDER_TYPE_FACEBOOK).then(function () {
        return getOAuthLoginURL(auth, PROVIDER_TYPE_FACEBOOK, redirectUrl);
      }).then(function (res) {
        return window.location.replace(res);
      });
    }
  };
}

/** @namespace */
function mongodbCloudProvider(auth) {
  // The ternary expression here is redundant but is just preserving previous behavior based on whether or not
  // the client is for the admin or client API.
  var loginRoute = auth.isAppClient() ? 'providers/mongodb-cloud/login' : 'providers/mongodb-cloud/login';

  return {
    /**
     * Login to a stitch application using mongodb cloud authentication
     *
     * @memberof mongodbCloudProvider
     * @instance
     * @param {Object} data the username, apiKey, cors, and cookie data to use for authentication
     * @returns {Promise} a promise that resolves when authentication succeeds.
     */
    authenticate: function authenticate(data) {
      var username = data.username,
          apiKey = data.apiKey,
          cors = data.cors,
          cookie = data.cookie;

      var options = Object.assign({}, { cors: true, cookie: false }, { cors: cors, cookie: cookie });
      var deviceId = auth.getDeviceId();
      var device = auth.getDeviceInfo(deviceId, !!auth.client && auth.client.clientAppID);
      var fetchArgs = common.makeFetchArgs('POST', JSON.stringify({ username: username, apiKey: apiKey, options: { device: device } }));
      fetchArgs.cors = true; // TODO: shouldn't this use the passed in `cors` value?
      fetchArgs.credentials = 'include';

      var url = auth.rootUrl + '/' + loginRoute;
      if (options.cookie) {
        return fetch(url + '?cookie=true', fetchArgs).then(common.checkStatus);
      }

      return fetch(url, fetchArgs).then(common.checkStatus).then(function (response) {
        return response.json();
      }).then(function (json) {
        return auth.set(json, PROVIDER_TYPE_MONGODB_CLOUD);
      });
    }
  };
}

// TODO: support auth-specific options
function createProviders(auth) {
  var _ref2;

  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  return _ref2 = {}, _defineProperty(_ref2, PROVIDER_TYPE_ANON, anonProvider(auth)), _defineProperty(_ref2, PROVIDER_TYPE_APIKEY, apiKeyProvider(auth)), _defineProperty(_ref2, PROVIDER_TYPE_GOOGLE, googleProvider(auth)), _defineProperty(_ref2, PROVIDER_TYPE_FACEBOOK, facebookProvider(auth)), _defineProperty(_ref2, PROVIDER_TYPE_MONGODB_CLOUD, mongodbCloudProvider(auth)), _defineProperty(_ref2, PROVIDER_TYPE_USERPASS, userPassProvider(auth)), _defineProperty(_ref2, PROVIDER_TYPE_CUSTOM, customProvider(auth)), _ref2;
}

exports.createProviders = createProviders;

/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

var ExtJSON = __webpack_require__(54);

module.exports = ExtJSON;


/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {

// We have an ES6 Map available, return the native instance
if (typeof global.Map !== 'undefined') {
  module.exports = global.Map;
  module.exports.Map = global.Map;
} else {
  // We will return a polyfill
  var Map = function(array) {
    this._keys = [];
    this._values = {};

    for (var i = 0; i < array.length; i++) {
      if (array[i] == null) continue; // skip null and undefined
      var entry = array[i];
      var key = entry[0];
      var value = entry[1];
      // Add the key to the list of keys in order
      this._keys.push(key);
      // Add the key and value to the values dictionary with a point
      // to the location in the ordered keys list
      this._values[key] = { v: value, i: this._keys.length - 1 };
    }
  };

  Map.prototype.clear = function() {
    this._keys = [];
    this._values = {};
  };

  Map.prototype.delete = function(key) {
    var value = this._values[key];
    if (value == null) return false;
    // Delete entry
    delete this._values[key];
    // Remove the key from the ordered keys list
    this._keys.splice(value.i, 1);
    return true;
  };

  Map.prototype.entries = function() {
    var self = this;
    var index = 0;

    return {
      next: function() {
        var key = self._keys[index++];
        return {
          value: key !== undefined ? [key, self._values[key].v] : undefined,
          done: key !== undefined ? false : true
        };
      }
    };
  };

  Map.prototype.forEach = function(callback, self) {
    self = self || this;

    for (var i = 0; i < this._keys.length; i++) {
      var key = this._keys[i];
      // Call the forEach callback
      callback.call(self, this._values[key].v, key, self);
    }
  };

  Map.prototype.get = function(key) {
    return this._values[key] ? this._values[key].v : undefined;
  };

  Map.prototype.has = function(key) {
    return this._values[key] != null;
  };

  Map.prototype.keys = function() {
    var self = this;
    var index = 0;

    return {
      next: function() {
        var key = self._keys[index++];
        return {
          value: key !== undefined ? key : undefined,
          done: key !== undefined ? false : true
        };
      }
    };
  };

  Map.prototype.set = function(key, value) {
    if (this._values[key]) {
      this._values[key].v = value;
      return this;
    }

    // Add the key to the list of keys in order
    this._keys.push(key);
    // Add the key and value to the values dictionary with a point
    // to the location in the ordered keys list
    this._values[key] = { v: value, i: this._keys.length - 1 };
    return this;
  };

  Map.prototype.values = function() {
    var self = this;
    var index = 0;

    return {
      next: function() {
        var key = self._keys[index++];
        return {
          value: key !== undefined ? self._values[key].v : undefined,
          done: key !== undefined ? false : true
        };
      }
    };
  };

  // Last ismaster
  Object.defineProperty(Map.prototype, 'size', {
    enumerable: true,
    get: function() {
      return this._keys.length;
    }
  });

  module.exports = Map;
  module.exports.Map = Map;
}

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)))

/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * A class representation of the BSON Symbol type.
 *
 * @class
 * @deprecated
 * @param {string} value the string representing the symbol.
 * @return {Symbol}
 */
function Symbol(value) {
  if (!(this instanceof Symbol)) return new Symbol(value);
  this._bsontype = 'Symbol';
  this.value = value;
}

/**
 * Access the wrapped string value.
 *
 * @method
 * @return {String} returns the wrapped string.
 */
Symbol.prototype.valueOf = function() {
  return this.value;
};

/**
 * @ignore
 */
Symbol.prototype.toString = function() {
  return this.value;
};

/**
 * @ignore
 */
Symbol.prototype.inspect = function() {
  return this.value;
};

/**
 * @ignore
 */
Symbol.prototype.toJSON = function() {
  return this.value;
};

module.exports = Symbol;
module.exports.Symbol = Symbol;


/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * A class representation of a BSON Int32 type.
 *
 * @class
 * @param {number} value the number we want to represent as an int32.
 * @return {Int32}
 */
var Int32 = function(value) {
  if (!(this instanceof Int32)) return new Int32(value);

  this._bsontype = 'Int32';
  this.value = value;
};

/**
 * Access the number value.
 *
 * @method
 * @return {number} returns the wrapped int32 number.
 */
Int32.prototype.valueOf = function() {
  return this.value;
};

/**
 * @ignore
 */
Int32.prototype.toJSON = function() {
  return this.value;
};

module.exports = Int32;
module.exports.Int32 = Int32;


/***/ }),
/* 28 */,
/* 29 */,
/* 30 */,
/* 31 */,
/* 32 */,
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(20);
// require("materialize-loader!./app/materialize.config.js");
__webpack_require__(10);
// require("./node_modules/materialize-css/dist/css/materialize.css");
__webpack_require__(34);
__webpack_require__(82);
__webpack_require__(84);
__webpack_require__(86);


/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

const M = __webpack_require__(10);

const AllItems = new Set();

// MongoDB

const stitch = __webpack_require__(35);

const clientPromise = stitch.StitchClientFactory.create(
  "inventorykstitch-cwlil"
);

class Item {
  constructor(
    itemParams = ["Name", "Model", "Type", "Location", 1],
    log = [
      {
        by: "Initial Log Record",
        dateOut: Date.parse("1 / 1 / 2017"),
        dateIn: Date.parse("1 / 2 / 2017")
      }
    ]
  ) {
    this.brand = itemParams[0];
    this.model = itemParams[1];
    this.type = itemParams[2];
    this.location = itemParams[3];
    this.idNumber = itemParams[4];
    this.Log = log;
    this._id = `${this.brand}${this.idNumber}`;
    AllItems.add(this);
  }

  description() {
    return `${this.brand} ${this.model} ${this.type} #${this.idNumber}`;
  }
  name() {
    return `${this.brand}${this.idNumber}`;
  }

  photo() {
    let photo = ``;
    switch (this.type) {
      case "Vehicle":
        photo = `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">directions_car</i></div>`;
        break;
      case "Bike":
        photo = `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">directions_bike</i></div>`;
        break;
      case "Bed":
        photo = `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">hotel</i></div>`;
        break;
      case "Room":
        photo = `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">forum</i></div>`;
        break;
      case "Office":
        photo = `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">work</i></div>`;
        break;
      case "Camera":
        photo = `<div class="blue lighten-2 display"><i class="material-icons typeIcons medium white-text">photo_camera</i></div>`;
        break;
      default:
        photo = ``;
        break;
    }
    return photo;
  }

  get available() {
    const dateArray = [
      Date.parse(document.getElementById("dateOut").value),
      Date.parse(document.getElementById("dateIn").value)
    ];
    const reservationsArray = this.Log;

    let available = true;
    reservationsArray.forEach(dateRange => {
      if (
        (dateArray[0] >= dateRange.dateOut &&
          dateArray[0] <= dateRange.dateIn) ||
        (dateArray[1] >= dateRange.dateOut &&
          dateArray[1] <= dateRange.dateIn) ||
        (dateArray[0] <= dateRange.dateOut && dateArray[1] >= dateRange.dateIn)
      ) {
        
        available = false;
      } else if (dateArray[1] <= dateArray[0]) {
        available = false;
      }
    });
    return available;
  }

  cardHtml() {
    let button = ``;
    const itemName = this.name();
    const itemPhoto = this.photo();
    const itemDescription = this.description();
    if (!window.userName) {
      window.userName = window.localStorage.getItem("userName");
    }
    if (this.available === true) {
      button = `<a onclick="window.Item['${itemName}'].reserve()" id="button${itemName}" class="btn-floating btn-large halfway-fab waves-effect waves-light purple lighten-1 scale-transition">
      <i class="material-icons large">assignment</i>
    </a> `;
    } else if (window.userName === this.Log[0].by && this.available === false) {
      button = `<a id="button${itemName}" onclick="window.Item['${itemName}'].removeRecord()" class="btn-floating btn-large halfway-fab purple lighten-4 scale-transition">
      <i class="material-icons large">lock</i>
    </a>`;
    } else {
      button = `<a id="button${itemName}" class="btn-floating btn-large halfway-fab disabled lighten-2 scale-transition">
      <i class="material-icons large">lock</i>
    </a>`;
    }
    const dateOut = new Date(
      parseInt(this.Log[0].dateOut, 10)
    ).toLocaleDateString();
    const dateIn = new Date(
      parseInt(this.Log[0].dateIn, 10)
    ).toLocaleDateString();

    const htmlContent = `<div id="${itemName}" class="col s12 m6 l3">
  <div class="card">
    <div class="card-image">
      ${!itemPhoto ? `<div class="blue lighten-2 display"></div>` : itemPhoto}
      <span class="card-title title">${this.brand} ${this.type}</span>
      ${button}
    </div>
    <div class="card-content grey-text text-lighten description">
      <p>${itemDescription}</p>
    </div>

    <div class="card-action">
      ${
        !this.available
          ? `<div class="chip activator pointer"><i class="material-icons checks ">assignment_ind</i> ${
              this.Log[0].by
            } ${dateOut} - ${dateIn}</div>`
          : `<div class="chip activator pointer">@ ${this.location}</div>`
      }
    </div>
    <div class="card-reveal white">
      <span class="card-title grey-text lighten-4">${this.brand} ${
      this.type
    } Log
        <i class="material-icons right">close</i>
      </span>
      <p>${this.readLog()}</p>
    </div>
  </div>
</div>
`;

    return htmlContent;
  }

  cardRender() {
    const itemName = this.name();
    let domButton = document.getElementById(`button${itemName}`);
    domButton.classList.remove("scale-out");
    domButton.classList.remove("scale-in");
    domButton.classList.add("scale-out");
    const domElement = document.getElementById(itemName);
    setTimeout(() => {
      if (domElement.outerHTML.length > 3) {
        domElement.outerHTML = this.cardHtml();
        domButton = document.getElementById(`button${itemName}`);
        domButton.classList.add("scale-out");
        setTimeout(() => {
          domButton.classList.add("scale-in");
        }, 100);
      }
    }, 80);
  }

  readLog() {
    let content = "";
    this.Log.forEach(entry => {
      const dateOut = new Date(
        parseInt(entry.dateOut, 10)
      ).toLocaleDateString();
      const dateIn = new Date(parseInt(entry.dateIn, 10)).toLocaleDateString();
      if (entry.dateOut && entry.dateIn) {
        content +=
          '<div class="chip purple lighten-2 white-text"><i class="material-icons checks">assignment</i> ';
      } else if (!entry.dateOut) {
        content +=
          '<div class="chip orange lighten-2 white-text"><i class="material-icons checks">assignment_turned_in</i> ';
      } else if (entry.by === "Initial Log Record") {
        content +=
          '<div class="chip blue lighten-2 white-text"><i class="material-icons checks">add_circle</i> ';
      }
      content += `${entry.by} ${dateOut} - ${dateIn} </div>
      `;
    });
    return content;
  }

  reserve(user) {
    if (this.available) {
      let dateOut = Date.parse(document.getElementById("dateOut").value);
      if (Number.isNaN(dateOut)) {
        dateOut = Date.now();
      }
      let dateIn = Date.parse(document.getElementById("dateIn").value);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 360);
      if (Number.isNaN(dateIn)) {
        dateIn = Date.parse(tomorrow);
      }
      const reservation = {
        by: user || window.userName,
        dateOut,
        dateIn
      };
      this.Log.unshift(reservation);
      this.cardRender();
      clientPromise.then(client => {
        const db = client.service("mongodb", "mongodb-atlas").db("Populate");
        client
          .login()
          .then(() =>
            db
              .collection("Items")
              .updateOne({ _id: this._id }, { $set: { Log: this.Log } })
          );
        // .then(result => {
        //   console.log("[Updated]", result);
        // });
      });
    }
  }

  checkOut(user) {
    let dateOut = Date.parse(document.getElementById("dateOut").value);
    if (Number.isNaN(dateOut)) {
      dateOut = Date.now();
    }
    const checkOut = {
      by: user || window.userName,
      dateOut
    };
    this.Log.unshift(checkOut);
    this.cardRender();
  }

  checkIn(user) {
    let dateIn = Date.parse(document.getElementById("dateIn").value);
    if (Number.isNaN(dateIn)) {
      dateIn = Date.now();
    }
    const checkIn = {
      by: user || window.userName,
      dateIn
    };
    this.Log.unshift(checkIn);
    this.cardRender();
  }

  removeRecord() {
    if (this.Log[0].by === window.userName) {
      this.Log.shift();
      clientPromise.then(client => {
        const db = client.service("mongodb", "mongodb-atlas").db("Populate");
        client
          .login()
          .then(() =>
            db
              .collection("Items")
              .updateOne({ _id: this._id }, { $set: { Log: this.Log } })
          )
          .then(() => {
            // console.log("[Removed]", result);
            this.cardRender();
          });
      });
    }
  }
}

const refreshItems = function refreshItems() {
  AllItems.forEach(card => {
    card.cardRender();
  });
};

const buildItems = function populateItems() {
  const listDiv = document.getElementById("list");

  let productionCameraContent = ``;
  let spacesBedContent = ``;
  let spacesRoomContent = ``;
  let transportBikeContent = ``;
  let transportVehicleContent = ``;
  AllItems.forEach(resource => {
    switch (resource.type) {
      case "Bike":
        transportBikeContent += resource.cardHtml();
        break;
      case "Bed":
        spacesBedContent += resource.cardHtml();
        break;
      case "Vehicle":
        transportVehicleContent += resource.cardHtml();
        break;
      case "Room":
        spacesRoomContent += resource.cardHtml();
        break;
      case "Camera":
        productionCameraContent += resource.cardHtml();
        break;
      case "Office":
        spacesRoomContent += resource.cardHtml();
        break;

      default:
        break;
    }
  });
  listDiv.innerHTML =
    spacesRoomContent +
    spacesBedContent +
    transportBikeContent +
    transportVehicleContent +
    productionCameraContent;
};

const People = new Set();
class Person {
  constructor(name) {
    this.name = name;
    People.add(this);
  }
}

// Populate People
(function populatePeople() {
  clientPromise.then(client => {
    const db = client.service("mongodb", "mongodb-atlas").db("Populate");
    client
      .login()
      .then(() =>
        db
          .collection("People")
          .find()
          .limit(1)
          .execute()
      )
      .then(docs => {
        // console.log("[Found People]", docs[0]);
        if (window.localStorage.length > 0) {
          window.userName = window.localStorage.getItem("userName");
        }

        let nameFound = docs[0].peopleList.includes(window.userName);
        // let nameFound = true;

        while (!nameFound) {
          window.userName = window.prompt(
            "Hej! What is your name?",
            "Your first and last name"
          );
          nameFound = docs[0].peopleList.includes(window.userName);
          if (nameFound) {
            window.localStorage.setItem("userName", window.userName);
          }
        }
        const peopleListKeys = Object.keys(docs[0].peopleList);
        for (const i of peopleListKeys) {
          const name = docs[0].peopleList[i];
          Person[name] = new Person(docs[0].peopleList[i]);
        }
      });
    // .catch(err => {
    //   console.error(err);
    // })
  });

  // let peopleList = [
  //   "Carlos Velasco",
  //   "Daniel Åberg",
  //   "Malin Melén",
  //   "Johanna Stedt",
  //   "Mia Kristersson",
  //   "Peter Ovgren",
  //   "Laura Parsons",
  //   "Jimena Castillo",
  //   "Elena Bazhenova",
  //   "Per-Inge Persson",
  //   "Mats Sjöberg",
  //   "Cornelius Svarrer",
  //   "Helen Thorn Jönsson",
  //   "Freddy Kristensson"
  // ];
})();

const findItems = function findItems() {
  clientPromise.then(client => {
    const db = client.service("mongodb", "mongodb-atlas").db("Populate");
    client
      .login()
      .then(() =>
        db
          .collection("Items")
          .find()
          .sort({ type: 1 })
          .execute()
      )
      .then(foundItems => {
        const a = window.a || JSON.stringify(foundItems).length;
        const b = JSON.stringify(foundItems).length;
        const same = Object.is(a, b);
        // console.log("[Similar]", same);
        if (same === false || !window.a) {
          window.a = a;
          // console.log("[Found Items]", foundItems);
          AllItems.clear();

          const itemsFound = Object.keys(foundItems);
          for (const i of itemsFound) {
            const name = foundItems[i]._id;
            Item[name] = new Item(
              [
                foundItems[i].brand,
                foundItems[i].model,
                foundItems[i].type,
                foundItems[i].location,
                foundItems[i].idNumber
              ],
              foundItems[i].Log
            );
          }
          // if (!window.item) {
          window.Item = Item;
          buildItems();
          // } else {
          //   refreshItems();
          // }
        }
      });
  });
};

// Navbar
(function makeNavbar(window, document) {
  document.getElementById("header").classList.remove("hide");
  const dateOut = document.getElementById("dateOut");
  const dateIn = document.getElementById("dateIn");

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const options1 = {
    format: "ddd mmm dd yyyy",
    minDate: today,
    container: "body"
  };
  const options2 = {
    format: "ddd mmm dd yyyy",
    minDate: tomorrow,
    container: "body"
  };
  const instance1 = M.Datepicker.init(dateOut, options1);
  const instance2 = M.Datepicker.init(dateIn, options2);
  dateOut.value = today.toDateString();
  dateIn.value = tomorrow.toDateString();
  instance1.setDate(new Date(today));
  instance2.setDate(new Date(tomorrow));
  dateOut.addEventListener(
    "change",
    () => {
      refreshItems();
    },
    false
  );
  dateIn.addEventListener(
    "change",
    () => {
      refreshItems();
    },
    false
  );
})(window, document);

document.addEventListener("focusin", () => findItems(), false);

setInterval(() => {
  // body
  // if (document.hasFocus()) {
  findItems();
  // }
}, 5000);


/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BSON = exports.StitchAdminClientFactory = exports.StitchClientFactory = undefined;

var _client = __webpack_require__(21);

var _admin = __webpack_require__(81);

var _mongodbExtjson = __webpack_require__(24);

exports.StitchClientFactory = _client.StitchClientFactory;
exports.StitchAdminClientFactory = _admin.StitchAdminClientFactory;
exports.BSON = _mongodbExtjson.BSON;

/***/ }),
/* 36 */
/***/ (function(module, exports) {

(function(self) {
  'use strict';

  if (self.fetch) {
    return
  }

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob()
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ]

    var isDataView = function(obj) {
      return obj && DataView.prototype.isPrototypeOf(obj)
    }

    var isArrayBufferView = ArrayBuffer.isView || function(obj) {
      return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
    }
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name)
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value)
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift()
        return {done: value === undefined, value: value}
      }
    }

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      }
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {}

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value)
      }, this)
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1])
      }, this)
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name])
      }, this)
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var oldValue = this.map[name]
    this.map[name] = oldValue ? oldValue+','+value : value
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    name = normalizeName(name)
    return this.has(name) ? this.map[name] : null
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value)
  }

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this)
      }
    }
  }

  Headers.prototype.keys = function() {
    var items = []
    this.forEach(function(value, name) { items.push(name) })
    return iteratorFor(items)
  }

  Headers.prototype.values = function() {
    var items = []
    this.forEach(function(value) { items.push(value) })
    return iteratorFor(items)
  }

  Headers.prototype.entries = function() {
    var items = []
    this.forEach(function(value, name) { items.push([name, value]) })
    return iteratorFor(items)
  }

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsArrayBuffer(blob)
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsText(blob)
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf)
    var chars = new Array(view.length)

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i])
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength)
      view.set(new Uint8Array(buf))
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false

    this._initBody = function(body) {
      this._bodyInit = body
      if (!body) {
        this._bodyText = ''
      } else if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString()
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer)
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer])
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body)
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8')
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type)
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
        }
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      }
    }

    this.text = function() {
      var rejected = consumed(this)
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(input, options) {
    options = options || {}
    var body = options.body

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
      this.credentials = input.credentials
      if (!options.headers) {
        this.headers = new Headers(input.headers)
      }
      this.method = input.method
      this.mode = input.mode
      if (!body && input._bodyInit != null) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = String(input)
    }

    this.credentials = options.credentials || this.credentials || 'omit'
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers)
    }
    this.method = normalizeMethod(options.method || this.method || 'GET')
    this.mode = options.mode || this.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body)
  }

  Request.prototype.clone = function() {
    return new Request(this, { body: this._bodyInit })
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers()
    rawHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':')
      var key = parts.shift().trim()
      if (key) {
        var value = parts.join(':').trim()
        headers.append(key, value)
      }
    })
    return headers
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this.type = 'default'
    this.status = 'status' in options ? options.status : 200
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = 'statusText' in options ? options.statusText : 'OK'
    this.headers = new Headers(options.headers)
    this.url = options.url || ''
    this._initBody(bodyInit)
  }

  Body.call(Response.prototype)

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  }

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''})
    response.type = 'error'
    return response
  }

  var redirectStatuses = [301, 302, 303, 307, 308]

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  }

  self.Headers = Headers
  self.Request = Request
  self.Response = Response

  self.fetch = function(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init)
      var xhr = new XMLHttpRequest()

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        }
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL')
        var body = 'response' in xhr ? xhr.response : xhr.responseText
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value)
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})(typeof self !== 'undefined' ? self : this);


/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Auth = exports.AuthFactory = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /* global window, document, fetch */

exports.newAuth = newAuth;

var _storage = __webpack_require__(38);

var _providers = __webpack_require__(23);

var _errors = __webpack_require__(11);

var _common = __webpack_require__(3);

var authCommon = _interopRequireWildcard(_common);

var _common2 = __webpack_require__(7);

var common = _interopRequireWildcard(_common2);

var _detectBrowser = __webpack_require__(40);

var _platform = _interopRequireWildcard(_detectBrowser);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var jwtDecode = __webpack_require__(43);

var EMBEDDED_USER_AUTH_DATA_PARTS = 4;

var AuthFactory = exports.AuthFactory = function () {
  function AuthFactory() {
    _classCallCheck(this, AuthFactory);

    throw new _errors.StitchError('Auth can only be made from the AuthFactory.create function');
  }

  _createClass(AuthFactory, null, [{
    key: 'create',
    value: function create(client, rootUrl, options) {
      return newAuth(client, rootUrl, options);
    }
  }]);

  return AuthFactory;
}();

function newAuth(client, rootUrl, options) {
  var auth = Object.create(Auth.prototype);
  var namespace = void 0;
  if (!client || client.clientAppID === '') {
    namespace = 'admin';
  } else {
    namespace = 'client.' + client.clientAppID;
  }

  options = Object.assign({
    codec: authCommon.APP_CLIENT_CODEC,
    namespace: namespace,
    storageType: 'localStorage'
  }, options);

  auth.client = client;
  auth.rootUrl = rootUrl;
  auth.codec = options.codec;
  auth.platform = options.platform || _platform;
  auth.storage = (0, _storage.createStorage)(options);
  auth.providers = (0, _providers.createProviders)(auth, options);

  return Promise.all([auth._get(), auth.storage.get(authCommon.REFRESH_TOKEN_KEY), auth.storage.get(authCommon.USER_LOGGED_IN_PT_KEY), auth.storage.get(authCommon.DEVICE_ID_KEY)]).then(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 4),
        authObj = _ref2[0],
        rt = _ref2[1],
        loggedInProviderType = _ref2[2],
        deviceId = _ref2[3];

    auth.auth = authObj;
    auth.authedId = authObj.userId;
    auth.rt = rt;
    auth.loggedInProviderType = loggedInProviderType;
    auth.deviceId = deviceId;

    return auth;
  });
}

var Auth = exports.Auth = function () {
  function Auth(client, rootUrl, options) {
    _classCallCheck(this, Auth);

    throw new _errors.StitchError('Auth can only be made from the AuthFactory.create function');
  }

  /**
   * Create the device info for this client.
   *
   * @memberof module:auth
   * @method getDeviceInfo
   * @param {String} appId The app ID for this client
   * @param {String} appVersion The version of the app
   * @returns {Object} The device info object
   */


  _createClass(Auth, [{
    key: 'getDeviceInfo',
    value: function getDeviceInfo(deviceId, appId) {
      var appVersion = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

      var deviceInfo = { appId: appId, appVersion: appVersion, sdkVersion: common.SDK_VERSION };

      if (deviceId) {
        deviceInfo.deviceId = deviceId;
      }

      if (this.platform) {
        deviceInfo.platform = this.platform.name;
        deviceInfo.platformVersion = this.platform.version;
      }

      return deviceInfo;
    }
  }, {
    key: 'provider',
    value: function provider(name) {
      if (!this.providers.hasOwnProperty(name)) {
        throw new Error('Invalid auth provider specified: ' + name);
      }

      return this.providers[name];
    }
  }, {
    key: 'refreshToken',
    value: function refreshToken() {
      var _this = this;

      return this.client.doSessionPost().then(function (json) {
        return _this.set(json);
      });
    }
  }, {
    key: 'pageRootUrl',
    value: function pageRootUrl() {
      return [window.location.protocol, '//', window.location.host, window.location.pathname].join('');
    }
  }, {
    key: 'error',
    value: function error() {
      return this._error;
    }
  }, {
    key: 'isAppClient',
    value: function isAppClient() {
      if (!this.client) {
        return true; // Handle the case where Auth is constructed with null
      }
      return this.client.type === common.APP_CLIENT_TYPE;
    }
  }, {
    key: 'handleRedirect',
    value: function handleRedirect() {
      var _this2 = this;

      if (typeof window === 'undefined') {
        // This means we're running in some environment other
        // than a browser - so handling a redirect makes no sense here.
        return;
      }
      if (!window.location || !window.location.hash) {
        return;
      }

      var redirectProvider = void 0;
      return Promise.all([this.storage.get(authCommon.STATE_KEY), this.storage.get(authCommon.STITCH_REDIRECT_PROVIDER)]).then(function (_ref3) {
        var _ref4 = _slicedToArray(_ref3, 2),
            ourState = _ref4[0],
            _redirectProvider = _ref4[1];

        var redirectFragment = window.location.hash.substring(1);
        redirectProvider = _redirectProvider;
        var redirectState = _this2.parseRedirectFragment(redirectFragment, ourState);
        if (redirectState.lastError || !redirectProvider) {
          console.error('StitchClient: error from redirect: ' + (redirectState.lastError ? redirectState.lastError : 'provider type not set'));
          _this2._error = redirectState.lastError;
          window.history.replaceState(null, '', _this2.pageRootUrl());
          return;
        }

        if (!redirectState.found) {
          return;
        }

        return Promise.all([_this2.storage.remove(authCommon.STATE_KEY), _this2.storage.remove(authCommon.STITCH_REDIRECT_PROVIDER)]).then(function () {
          return redirectState;
        });
      }).then(function (redirectState) {
        if (!redirectState.stateValid) {
          console.error('StitchClient: state values did not match!');
          window.history.replaceState(null, '', _this2.pageRootUrl());
          return;
        }

        if (!redirectState.ua) {
          console.error('StitchClient: no UA value was returned from redirect!');
          return;
        }

        // If we get here, the state is valid - set auth appropriately.
        return _this2.set(redirectState.ua, redirectProvider);
      }).then(function () {
        return window.history.replaceState(null, '', _this2.pageRootUrl());
      });
    }
  }, {
    key: 'getCookie',
    value: function getCookie(name) {
      var splitCookies = document.cookie.split(' ');
      for (var i = 0; i < splitCookies.length; i++) {
        var cookie = splitCookies[i];
        var sepIdx = cookie.indexOf('=');
        var cookieName = cookie.substring(0, sepIdx);
        if (cookieName === name) {
          var cookieVal = cookie.substring(sepIdx + 1, cookie.length);
          if (cookieVal[cookieVal.length - 1] === ';') {
            return cookieVal.substring(0, cookie.length - 1);
          }
          return cookieVal;
        }
      }
    }
  }, {
    key: 'handleCookie',
    value: function handleCookie() {
      var _this3 = this;

      if (typeof window === 'undefined' || typeof document === 'undefined') {
        // This means we're running in some environment other
        // than a browser - so handling a cookie makes no sense here.
        return;
      }
      if (!document.cookie) {
        return;
      }

      var uaCookie = this.getCookie(authCommon.USER_AUTH_COOKIE_NAME);
      if (!uaCookie) {
        return;
      }

      document.cookie = authCommon.USER_AUTH_COOKIE_NAME + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      var userAuth = this.unmarshallUserAuth(uaCookie);
      return this.set(userAuth, _providers.PROVIDER_TYPE_MONGODB_CLOUD).then(function () {
        return window.history.replaceState(null, '', _this3.pageRootUrl());
      });
    }
  }, {
    key: 'clear',
    value: function clear() {
      this.auth = null;
      this.authedId = null;
      this.rt = null;
      this.loggedInProviderType = null;

      return Promise.all([this.storage.remove(authCommon.USER_AUTH_KEY), this.storage.remove(authCommon.REFRESH_TOKEN_KEY), this.storage.remove(authCommon.USER_LOGGED_IN_PT_KEY), this.storage.remove(authCommon.STITCH_REDIRECT_PROVIDER)]);
    }
  }, {
    key: 'getDeviceId',
    value: function getDeviceId() {
      return this.deviceId;
    }

    // Returns whether or not the access token is expired or is going to expire within 'withinSeconds'
    // seconds, according to current system time. Returns false if the token is malformed in any way.

  }, {
    key: 'isAccessTokenExpired',
    value: function isAccessTokenExpired() {
      var withinSeconds = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : authCommon.DEFAULT_ACCESS_TOKEN_EXPIRE_WITHIN_SECS;

      var token = this.getAccessToken();
      if (!token) {
        return false;
      }

      var decodedToken = void 0;
      try {
        decodedToken = jwtDecode(token);
      } catch (e) {
        return false;
      }

      if (!decodedToken) {
        return false;
      }

      return decodedToken.exp && Math.floor(Date.now() / 1000) >= decodedToken.exp - withinSeconds;
    }
  }, {
    key: 'getAccessToken',
    value: function getAccessToken() {
      return this.auth.accessToken;
    }
  }, {
    key: 'getRefreshToken',
    value: function getRefreshToken() {
      return this.rt;
    }
  }, {
    key: 'set',
    value: function set(json) {
      var _this4 = this;

      var authType = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

      if (!json) {
        return;
      }

      var newUserAuth = {};
      var setters = [];

      if (authType) {
        this.loggedInProviderType = authType;
        setters.push(this.storage.set(authCommon.USER_LOGGED_IN_PT_KEY, authType));
      }

      if (json[this.codec.refreshToken]) {
        this.rt = json[this.codec.refreshToken];
        delete json[this.codec.refreshToken];
        setters.push(this.storage.set(authCommon.REFRESH_TOKEN_KEY, this.rt));
      }

      if (json[this.codec.deviceId]) {
        this.deviceId = json[this.codec.deviceId];
        delete json[this.codec.deviceId];
        setters.push(this.storage.set(authCommon.DEVICE_ID_KEY, this.deviceId));
      }

      // Merge in new fields with old fields. Typically the first json value
      // is complete with every field inside a user auth, but subsequent requests
      // do not include everything. This merging behavior is safe so long as json
      // value responses with absent fields do not indicate that the field should
      // be unset.
      if (json[this.codec.accessToken]) {
        newUserAuth.accessToken = json[this.codec.accessToken];
      }
      if (json[this.codec.userId]) {
        newUserAuth.userId = json[this.codec.userId];
      }

      this.auth = Object.assign(this.auth ? this.auth : {}, newUserAuth);
      this.authedId = this.auth.userId;
      setters.push(this.storage.set(authCommon.USER_AUTH_KEY, JSON.stringify(this.auth)));
      return Promise.all(setters).then(function () {
        return _this4.auth;
      });
    }
  }, {
    key: '_get',
    value: function _get() {
      var _this5 = this;

      return this.storage.get(authCommon.USER_AUTH_KEY).then(function (data) {
        if (!data) {
          return {};
        }

        try {
          return JSON.parse(data);
        } catch (e) {
          // Need to back out and clear auth otherwise we will never
          // be able to do anything useful.
          return _this5.clear().then(function () {
            throw new _errors.StitchError('Failure retrieving stored auth');
          });
        }
      });
    }
  }, {
    key: 'getLoggedInProviderType',
    value: function getLoggedInProviderType() {
      return this.loggedInProviderType;
    }
  }, {
    key: 'parseRedirectFragment',
    value: function parseRedirectFragment(fragment, ourState) {
      // After being redirected from oauth, the URL will look like:
      // https://todo.examples.stitch.mongodb.com/#_stitch_state=...&_stitch_ua=...
      // This function parses out stitch-specific tokens from the fragment and
      // builds an object describing the result.
      var vars = fragment.split('&');
      var result = { ua: null, found: false, stateValid: false, lastError: null };
      var shouldBreak = false;
      for (var i = 0; i < vars.length && !shouldBreak; ++i) {
        var pairParts = vars[i].split('=');
        var pairKey = decodeURIComponent(pairParts[0]);
        switch (pairKey) {
          case authCommon.STITCH_ERROR_KEY:
            result.lastError = decodeURIComponent(pairParts[1]);
            result.found = true;
            shouldBreak = true;
            break;
          case authCommon.USER_AUTH_KEY:
            try {
              result.ua = this.unmarshallUserAuth(decodeURIComponent(pairParts[1]));
              result.found = true;
            } catch (e) {
              result.lastError = e;
            }
            continue;
          case authCommon.STITCH_LINK_KEY:
            result.found = true;
            continue;
          case authCommon.STATE_KEY:
            result.found = true;
            var theirState = decodeURIComponent(pairParts[1]);
            if (ourState && ourState === theirState) {
              result.stateValid = true;
            }
            continue;
          default:
            continue;
        }
      }

      return result;
    }
  }, {
    key: 'unmarshallUserAuth',
    value: function unmarshallUserAuth(data) {
      var _ref5;

      var parts = data.split('$');
      if (parts.length !== EMBEDDED_USER_AUTH_DATA_PARTS) {
        throw new RangeError('invalid user auth data provided: ' + data);
      }

      return _ref5 = {}, _defineProperty(_ref5, this.codec.accessToken, parts[0]), _defineProperty(_ref5, this.codec.refreshToken, parts[1]), _defineProperty(_ref5, this.codec.userId, parts[2]), _defineProperty(_ref5, this.codec.deviceId, parts[3]), _ref5;
    }
  }]);

  return Auth;
}();

/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MemoryStorage = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.createStorage = createStorage;

var _common = __webpack_require__(3);

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MemoryStorage = exports.MemoryStorage = function () {
  function MemoryStorage() {
    _classCallCheck(this, MemoryStorage);

    this._data = {};
    this._orderedKeys = [];
    this.length = 0;
  }

  _createClass(MemoryStorage, [{
    key: 'getItem',
    value: function getItem(key) {
      return key in this._data ? this._data[key] : null;
    }
  }, {
    key: 'setItem',
    value: function setItem(key, value) {
      this._orderedKeys.push(key);
      this._data[key] = value;
      this.length++;
      return this._data[key];
    }
  }, {
    key: 'removeItem',
    value: function removeItem(key) {
      this._orderedKeys.pop(key);
      delete this._data[key];
      this.length--;
      return undefined;
    }
  }, {
    key: 'key',
    value: function key(index) {
      return this._orderedKeys[index];
    }
  }]);

  return MemoryStorage;
}();

var _VERSION = 1;
var _VERSION_KEY = '__stitch_storage_version__';

/**
  * Run a migration on the currently used storage
  * that checks to see if the current version is up to date.
  * If the version has not been set, this method will migrate
  * to the latest version.
  * @param {Integer} version version number of storage
  * @param {Object} storage storage class being checked
  * @returns {Promise} nullable promise containing migration logic
  */
function _runMigration(version, storage) {
  switch (version) {
    case null:
    case undefined:
      // return a promise,
      // mapping each of the store's keys to a Promise
      // that fetches the each value for each key,
      // sets the old value to the new "namespaced" key
      // remove the old key value pair,
      // and set the version number
      var migrations = [_common.USER_AUTH_KEY, _common.REFRESH_TOKEN_KEY, _common.DEVICE_ID_KEY, _common.STATE_KEY].map(function (key) {
        return Promise.resolve(storage.store.getItem(key)).then(function (item) {
          return !!item && storage.store.setItem(storage._generateKey(key), item);
        }).then(function () {
          return storage.store.removeItem(key);
        });
      });
      return Promise.all(migrations).then(function () {
        return storage.store.setItem(_VERSION_KEY, _VERSION);
      });
    // in future versions, `case 1:`, `case 2:` and so on
    // could be added to perform similar migrations
    default:
      break;
  }
}

var Storage = function () {
  /**
   * @param {Storage} store implementer of Storage interface
   * @param {String} namespace clientAppID to be used for namespacing
   * @param
  */
  function Storage(store, namespace) {
    var _this = this;

    _classCallCheck(this, Storage);

    this.store = store;
    this.namespace = '_stitch.' + namespace;

    this._migration = Promise.resolve(this.store.getItem(_VERSION_KEY)).then(function (version) {
      return _runMigration(version, _this);
    });
  }

  _createClass(Storage, [{
    key: '_generateKey',
    value: function _generateKey(key) {
      return this.namespace + '.' + key;
    }
  }, {
    key: 'get',
    value: function get(key) {
      var _this2 = this;

      return Promise.resolve(this._migration).then(function () {
        return _this2.store.getItem(_this2._generateKey(key));
      });
    }
  }, {
    key: 'set',
    value: function set(key, value) {
      var _this3 = this;

      return Promise.resolve(this._migration).then(function () {
        return _this3.store.setItem(_this3._generateKey(key), value);
      }).then(function () {
        return value;
      });
    }
  }, {
    key: 'remove',
    value: function remove(key) {
      var _this4 = this;

      return Promise.resolve(this._migration).then(function () {
        return _this4.store.removeItem(_this4._generateKey(key));
      });
    }
  }]);

  return Storage;
}();

function createStorage(options) {
  var storageType = options.storageType,
      storage = options.storage,
      namespace = options.namespace;


  if (storageType === 'localStorage') {
    if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage !== null) {
      return new Storage(window.localStorage, namespace);
    }
  } else if (storageType === 'sessionStorage') {
    if (typeof window !== 'undefined' && 'sessionStorage' in window && window.sessionStorage !== null) {
      return new Storage(window.sessionStorage, namespace);
    }
  } else if (storageType == 'customStorage') {
    //eslint-disable-line eqeqeq
    return new Storage(storage, namespace);
  }

  // default to memory storage
  return new Storage(new MemoryStorage(), namespace);
}

/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

;(function () {

  var object =
     true ? exports :
    typeof self != 'undefined' ? self : // #8: web workers
    $.global; // #31: ExtendScript

  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  function InvalidCharacterError(message) {
    this.message = message;
  }
  InvalidCharacterError.prototype = new Error;
  InvalidCharacterError.prototype.name = 'InvalidCharacterError';

  // encoder
  // [https://gist.github.com/999166] by [https://github.com/nignag]
  object.btoa || (
  object.btoa = function (input) {
    var str = String(input);
    for (
      // initialize result and counter
      var block, charCode, idx = 0, map = chars, output = '';
      // if the next str index does not exist:
      //   change the mapping table to "="
      //   check if d has no fractional digits
      str.charAt(idx | 0) || (map = '=', idx % 1);
      // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
      output += map.charAt(63 & block >> 8 - idx % 1 * 8)
    ) {
      charCode = str.charCodeAt(idx += 3/4);
      if (charCode > 0xFF) {
        throw new InvalidCharacterError("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      }
      block = block << 8 | charCode;
    }
    return output;
  });

  // decoder
  // [https://gist.github.com/1020396] by [https://github.com/atk]
  object.atob || (
  object.atob = function (input) {
    var str = String(input).replace(/[=]+$/, ''); // #31: ExtendScript bad parse of /=
    if (str.length % 4 == 1) {
      throw new InvalidCharacterError("'atob' failed: The string to be decoded is not correctly encoded.");
    }
    for (
      // initialize result and counters
      var bc = 0, bs, buffer, idx = 0, output = '';
      // get next character
      buffer = str.charAt(idx++);
      // character found in table? initialize bit storage and add its ascii value;
      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
        // and if not first of each 4 characters,
        // convert the first 8 bits to one ascii character
        bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
      // try to find character in table (0-63, not found => -1)
      buffer = chars.indexOf(buffer);
    }
    return output;
  });

}());


/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

var detectBrowser = __webpack_require__(41);

var agent;

if (typeof navigator !== 'undefined' && navigator) {
  agent = navigator.userAgent;
}

module.exports = detectBrowser(agent);


/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

var detectOS = __webpack_require__(42);

module.exports = function detectBrowser(userAgentString) {
  if (!userAgentString) return null;

  var browsers = [
    [ 'edge', /Edge\/([0-9\._]+)/ ],
    [ 'yandexbrowser', /YaBrowser\/([0-9\._]+)/ ],
    [ 'vivaldi', /Vivaldi\/([0-9\.]+)/ ],
    [ 'kakaotalk', /KAKAOTALK\s([0-9\.]+)/ ],
    [ 'chrome', /(?!Chrom.*OPR)Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/ ],
    [ 'phantomjs', /PhantomJS\/([0-9\.]+)(:?\s|$)/ ],
    [ 'crios', /CriOS\/([0-9\.]+)(:?\s|$)/ ],
    [ 'firefox', /Firefox\/([0-9\.]+)(?:\s|$)/ ],
    [ 'fxios', /FxiOS\/([0-9\.]+)/ ],
    [ 'opera', /Opera\/([0-9\.]+)(?:\s|$)/ ],
    [ 'opera', /OPR\/([0-9\.]+)(:?\s|$)$/ ],
    [ 'ie', /Trident\/7\.0.*rv\:([0-9\.]+).*\).*Gecko$/ ],
    [ 'ie', /MSIE\s([0-9\.]+);.*Trident\/[4-7].0/ ],
    [ 'ie', /MSIE\s(7\.0)/ ],
    [ 'bb10', /BB10;\sTouch.*Version\/([0-9\.]+)/ ],
    [ 'android', /Android\s([0-9\.]+)/ ],
    [ 'ios', /Version\/([0-9\._]+).*Mobile.*Safari.*/ ],
    [ 'safari', /Version\/([0-9\._]+).*Safari/ ]
  ];

  return browsers.map(function (rule) {
      if (rule[1].test(userAgentString)) {
          var match = rule[1].exec(userAgentString);
          var version = match && match[1].split(/[._]/).slice(0,3);

          if (version && version.length < 3) {
              Array.prototype.push.apply(version, (version.length == 1) ? [0, 0] : [0]);
          }

          return {
              name: rule[0],
              version: version.join('.'),
              os: detectOS(userAgentString)
          };
      }
  }).filter(Boolean).shift();
};


/***/ }),
/* 42 */
/***/ (function(module, exports) {

module.exports = function detectOS(userAgentString) {
  var operatingSystems = [
    {
      name: 'iOS',
      rule: /iP(hone|od|ad)/
    },
    {
      name: 'Android OS',
      rule: /Android/
    },
    {
      name: 'BlackBerry OS',
      rule: /BlackBerry|BB10/
    },
    {
      name: 'Windows Mobile',
      rule: /IEMobile/
    },
    {
      name: 'Amazon OS',
      rule: /Kindle/
    },
    {
      name: 'Windows 3.11',
      rule: /Win16/
    },
    {
      name: 'Windows 95',
      rule: /(Windows 95)|(Win95)|(Windows_95)/
    },
    {
      name: 'Windows 98',
      rule: /(Windows 98)|(Win98)/
    },
    {
      name: 'Windows 2000',
      rule: /(Windows NT 5.0)|(Windows 2000)/
    },
    {
      name: 'Windows XP',
      rule: /(Windows NT 5.1)|(Windows XP)/
    },
    {
      name: 'Windows Server 2003',
      rule: /(Windows NT 5.2)/
    },
    {
      name: 'Windows Vista',
      rule: /(Windows NT 6.0)/
    },
    {
      name: 'Windows 7',
      rule: /(Windows NT 6.1)/
    },
    {
      name: 'Windows 8',
      rule: /(Windows NT 6.2)/
    },
    {
      name: 'Windows 8.1',
      rule: /(Windows NT 6.3)/
    },
    {
      name: 'Windows 10',
      rule: /(Windows NT 10.0)/
    },
    {
      name: 'Windows ME',
      rule: /Windows ME/
    },
    {
      name: 'Open BSD',
      rule: /OpenBSD/
    },
    {
      name: 'Sun OS',
      rule: /SunOS/
    },
    {
      name: 'Linux',
      rule: /(Linux)|(X11)/
    },
    {
      name: 'Mac OS',
      rule: /(Mac_PowerPC)|(Macintosh)/
    },
    {
      name: 'QNX',
      rule: /QNX/
    },
    {
      name: 'BeOS',
      rule: /BeOS/
    },
    {
      name: 'OS/2',
      rule: /OS\/2/
    },
    {
      name: 'Search Bot',
      rule: /(nuhk)|(Googlebot)|(Yammybot)|(Openbot)|(Slurp)|(MSNBot)|(Ask Jeeves\/Teoma)|(ia_archiver)/
    }
  ];

  var detected = operatingSystems.filter(function (os) {
    if (userAgentString.match(os.rule)) {
      return true;
    }
  });

  return detected && detected[0] ? detected[0].name : null;
};


/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var base64_url_decode = __webpack_require__(44);

function InvalidTokenError(message) {
  this.message = message;
}

InvalidTokenError.prototype = new Error();
InvalidTokenError.prototype.name = 'InvalidTokenError';

module.exports = function (token,options) {
  if (typeof token !== 'string') {
    throw new InvalidTokenError('Invalid token specified');
  }

  options = options || {};
  var pos = options.header === true ? 0 : 1;
  try {
    return JSON.parse(base64_url_decode(token.split('.')[pos]));
  } catch (e) {
    throw new InvalidTokenError('Invalid token specified: ' + e.message);
  }
};

module.exports.InvalidTokenError = InvalidTokenError;


/***/ }),
/* 44 */
/***/ (function(module, exports, __webpack_require__) {

var atob = __webpack_require__(45);

function b64DecodeUnicode(str) {
  return decodeURIComponent(atob(str).replace(/(.)/g, function (m, p) {
    var code = p.charCodeAt(0).toString(16).toUpperCase();
    if (code.length < 2) {
      code = '0' + code;
    }
    return '%' + code;
  }));
}

module.exports = function(str) {
  var output = str.replace(/-/g, "+").replace(/_/g, "/");
  switch (output.length % 4) {
    case 0:
      break;
    case 2:
      output += "==";
      break;
    case 3:
      output += "=";
      break;
    default:
      throw "Illegal base64url string!";
  }

  try{
    return b64DecodeUnicode(output);
  } catch (err) {
    return atob(output);
  }
};


/***/ }),
/* 45 */
/***/ (function(module, exports) {

/**
 * The code was extracted from:
 * https://github.com/davidchambers/Base64.js
 */

var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function InvalidCharacterError(message) {
  this.message = message;
}

InvalidCharacterError.prototype = new Error();
InvalidCharacterError.prototype.name = 'InvalidCharacterError';

function polyfill (input) {
  var str = String(input).replace(/=+$/, '');
  if (str.length % 4 == 1) {
    throw new InvalidCharacterError("'atob' failed: The string to be decoded is not correctly encoded.");
  }
  for (
    // initialize result and counters
    var bc = 0, bs, buffer, idx = 0, output = '';
    // get next character
    buffer = str.charAt(idx++);
    // character found in table? initialize bit storage and add its ascii value;
    ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
      // and if not first of each 4 characters,
      // convert the first 8 bits to one ascii character
      bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
  ) {
    // try to find character in table (0-63, not found => -1)
    buffer = chars.indexOf(buffer);
  }
  return output;
}


module.exports = typeof window !== 'undefined' && window.atob && window.atob.bind(window) || polyfill;


/***/ }),
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _s3_service = __webpack_require__(47);

var _s3_service2 = _interopRequireDefault(_s3_service);

var _ses_service = __webpack_require__(48);

var _ses_service2 = _interopRequireDefault(_ses_service);

var _http_service = __webpack_require__(49);

var _http_service2 = _interopRequireDefault(_http_service);

var _mongodb_service = __webpack_require__(50);

var _mongodb_service2 = _interopRequireDefault(_mongodb_service);

var _twilio_service = __webpack_require__(53);

var _twilio_service2 = _interopRequireDefault(_twilio_service);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
  'aws/s3': _s3_service2.default,
  'aws/ses': _ses_service2.default,
  'http': _http_service2.default,
  'mongodb': _mongodb_service2.default,
  'twilio': _twilio_service2.default
};
module.exports = exports['default'];

/***/ }),
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = __webpack_require__(1);

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Convenience wrapper around AWS S3 service (not meant to be instantiated directly).
 *
 * @class
 * @return {S3Service} a S3Service instance.
 */
var S3Service = function () {
  function S3Service(stitchClient, serviceName) {
    _classCallCheck(this, S3Service);

    this.client = stitchClient;
    this.serviceName = serviceName;
  }

  /**
   * Put an object to S3 via Stitch. For small uploads
   *
   * NOTE: body must be a pipeline stream
   *
   * @param {String} bucket which S3 bucket to use
   * @param {String} key which key (filename) to use
   * @param {String} acl which policy to apply
   * @param {String} contentType content type of uploaded data
   * @return {Promise}
   */


  _createClass(S3Service, [{
    key: 'put',
    value: function put(bucket, key, acl, contentType) {
      return (0, _util.serviceResponse)(this, {
        action: 'put',
        args: { bucket: bucket, key: key, acl: acl, contentType: contentType }
      });
    }

    /**
     * Sign a policy for putting via Stitch. For large uploads
     *
     * @param {String} bucket which S3 bucket to use
     * @param {String} key which key (filename) to use
     * @param {String} acl which policy to apply
     * @param {String} contentType content type of uploaded data
     * @return {Promise}
     */

  }, {
    key: 'signPolicy',
    value: function signPolicy(bucket, key, acl, contentType) {
      return (0, _util.serviceResponse)(this, {
        action: 'signPolicy',
        args: { bucket: bucket, key: key, acl: acl, contentType: contentType }
      });
    }
  }]);

  return S3Service;
}();

exports.default = S3Service;
module.exports = exports['default'];

/***/ }),
/* 48 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = __webpack_require__(1);

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Convenience wrapper around AWS SES service (not meant to be instantiated directly).
 *
 * @class
 * @return {SESService} a SESService instance.
 */
var SESService = function () {
  function SESService(stitchClient, serviceName) {
    _classCallCheck(this, SESService);

    this.client = stitchClient;
    this.serviceName = serviceName;
  }

  /**
   * Send an email
   *
   * @method
   * @param {String} from the email to send from
   * @param {String} to the email to send to
   * @param {String} subject the subject of the email
   * @param {String} body the body of the email
   * @return {Promise}
   */


  _createClass(SESService, [{
    key: 'send',
    value: function send(from, to, subject, body) {
      return (0, _util.serviceResponse)(this, {
        action: 'send',
        args: { from: from, to: to, subject: subject, body: body }
      });
    }
  }]);

  return SESService;
}();

exports.default = SESService;
module.exports = exports['default'];

/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = __webpack_require__(1);

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Convenience wrapper for HTTP service (not meant to be instantiated directly).
 *
 * @class
 * @return {HTTPService} a HTTPService instance.
 */
var HTTPService = function () {
  function HTTPService(client, serviceName) {
    _classCallCheck(this, HTTPService);

    this.client = client;
    this.serviceName = serviceName;
  }

  /**
   * Send a GET request to a resource (result must be application/json)
   *
   * @param {String|Object} urlOrOptions the url to request, or an object of GET args
   * @param {Object} [options] optional settings for the GET operation
   * @param {String} [options.authUrl] url that grants a cookie
   * @return {Promise}
   */


  _createClass(HTTPService, [{
    key: 'get',
    value: function get(urlOrOptions) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return buildResponse('get', this, buildArgs(urlOrOptions, options));
    }

    /**
     * Send a POST request to a resource with payload
     *
     * @param {String|Object} urlOrOptions the url to request, or an object of POST args
     * @param {Object} [options] optional settings for the POST operation
     * @param {String} [options.authUrl] url that grants a cookie
     * @return {Promise}
     */

  }, {
    key: 'post',
    value: function post(urlOrOptions) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return buildResponse('post', this, buildArgs(urlOrOptions, options));
    }

    /**
     * Send a PUT request to a resource with payload
     *
     * @param {String|Object} urlOrOptions the url to request, or an object of PUT args
     * @param {Object} [options] optional settings for the PUT operation
     * @param {String} [options.authUrl] url that grants a cookie
     * @return {Promise}
     */

  }, {
    key: 'put',
    value: function put(urlOrOptions) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return buildResponse('put', this, buildArgs(urlOrOptions, options));
    }

    /**
     * Send a PATCH request to a resource with payload
     *
     * @param {String|Object} urlOrOptions the url to request, or an object of PATCH args
     * @param {Object} [options] optional settings for the PATCH operation
     * @param {String} [options.authUrl] url that grants a cookie
     * @return {Promise}
     */

  }, {
    key: 'patch',
    value: function patch(urlOrOptions) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return buildResponse('patch', this, buildArgs(urlOrOptions, options));
    }

    /**
     * Send a DELETE request to a resource
     *
     * @param {String|Object} urlOrOptions the url to request, or an object of DELETE args
     * @param {Object} [options] optional settings for the DELETE operation
     * @param {String} [options.authUrl] url that grants a cookie
     * @return {Promise}
     */

  }, {
    key: 'delete',
    value: function _delete(urlOrOptions) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return buildResponse('delete', this, buildArgs(urlOrOptions, options));
    }

    /**
     * Send a HEAD request to a resource
     *
     * @param {String|Object} urlOrOptions the url to request, or an object of HEAD args
     * @param {Object} [options] optional settings for the HEAD operation
     * @param {String} [options.authUrl] url that grants a cookie
     * @return {Promise}
     */

  }, {
    key: 'head',
    value: function head(urlOrOptions) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return buildResponse('head', this, buildArgs(urlOrOptions, options));
    }
  }]);

  return HTTPService;
}();

function buildArgs(urlOrOptions, options) {
  var args = void 0;
  if (typeof urlOrOptions !== 'string') {
    args = urlOrOptions;
  } else {
    args = { url: urlOrOptions };
    if (!!options.authUrl) args.authUrl = options.authUrl;
  }

  return args;
}

function buildResponse(action, service, args) {
  return (0, _util.serviceResponse)(service, {
    action: action,
    args: args
  });
}

exports.default = HTTPService;
module.exports = exports['default'];

/***/ }),
/* 50 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _db = __webpack_require__(51);

var _db2 = _interopRequireDefault(_db);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Create a new MongoDBService instance (not meant to be instantiated directly).
 *
 * @class
 * @return {MongoDBService} a MongoDBService instance.
 */
var MongoDBService = function () {
  function MongoDBService(stitchClient, serviceName) {
    _classCallCheck(this, MongoDBService);

    this.stitchClient = stitchClient;
    this.serviceName = serviceName;
  }

  /**
   * Get a DB instance
   *
   * @method
   * @param {String} databaseName The MongoDB database name
   * @param {Object} [options] Additional options.
   * @return {DB} returns a DB instance representing a MongoDB database.
   */


  _createClass(MongoDBService, [{
    key: 'db',
    value: function db(databaseName) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return new _db2.default(this.stitchClient, this.serviceName, databaseName);
    }
  }]);

  return MongoDBService;
}();

exports.default = MongoDBService;
module.exports = exports['default'];

/***/ }),
/* 51 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _collection = __webpack_require__(52);

var _collection2 = _interopRequireDefault(_collection);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Create a new DB instance (not meant to be instantiated directly).
 * @class
 * @return {DB} a DB instance.
 */
var DB = function () {
  function DB(client, service, name) {
    _classCallCheck(this, DB);

    this.client = client;
    this.service = service;
    this.name = name;
  }

  /**
   * Returns a Collection instance representing a MongoDB Collection object.
   *
   * @method
   * @param {String} name The collection name.
   * @param {Object} [options] Additional options.
   * @return {Collection} returns a Collection instance representing a MongoDb collection.
   */


  _createClass(DB, [{
    key: 'collection',
    value: function collection(name) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return new _collection2.default(this, name, options);
    }
  }]);

  return DB;
}();

exports.default = DB;
module.exports = exports['default'];

/***/ }),
/* 52 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = __webpack_require__(1);

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Create a new Collection instance (not meant to be instantiated directly).
 *
 * @class
 * @return {Collection} a Collection instance.
 */
var Collection = function () {
  function Collection(db, name) {
    _classCallCheck(this, Collection);

    this.db = db;
    this.name = name;
  }

  /**
   * Inserts a single document.
   *
   * @method
   * @param {Object} doc The document to insert.
   * @return {Promise<Object, Error>} a Promise for the operation.
   */


  _createClass(Collection, [{
    key: 'insertOne',
    value: function insertOne(doc) {
      var args = { document: doc };
      return buildResponse('insertOne', this, buildArgs(this, args));
    }

    /**
     * Inserts multiple documents.
     *
     * @method
     * @param {Array} docs The documents to insert.
     * @return {Promise<Object, Error>} Returns a Promise for the operation.
     */

  }, {
    key: 'insertMany',
    value: function insertMany(docs) {
      var args = { documents: Array.isArray(docs) ? docs : [docs] };
      return buildResponse('insertMany', this, buildArgs(this, args));
    }

    /**
     * Deletes a single document.
     *
     * @method
     * @param {Object} query The query used to match a single document.
     * @return {Promise<Object, Error>} Returns a Promise for the operation.
     */

  }, {
    key: 'deleteOne',
    value: function deleteOne(query) {
      return buildResponse('deleteOne', this, buildArgs(this, { query: query }));
    }

    /**
     * Deletes all documents matching query.
     *
     * @method
     * @param {Object} query The query used to match the documents to delete.
     * @return {Promise<Object, Error>} Returns a Promise for the operation.
     */

  }, {
    key: 'deleteMany',
    value: function deleteMany(query) {
      return buildResponse('deleteMany', this, buildArgs(this, { query: query }));
    }

    /**
     * Updates a single document.
     *
     * @method
     * @param {Object} query The query used to match a single document.
     * @param {Object} update The update operations to perform on the matching document.
     * @param {Object} [options] Additional options object.
     * @param {Boolean} [options.upsert=false] Perform an upsert operation.
     * @return {Promise<Object, Error>} A Promise for the operation.
     */

  }, {
    key: 'updateOne',
    value: function updateOne(query, update) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      return updateOp(this, false, query, update, options);
    }

    /**
     * Updates multiple documents.
     *
     * @method
     * @param {Object} query The query used to match the documents.
     * @param {Object} update The update operations to perform on the matching documents.
     * @param {Object} [options] Additional options object.
     * @param {Boolean} [options.upsert=false] Perform an upsert operation.
     * @return {Promise<Object, Error>} Returns a Promise for the operation.
     */

  }, {
    key: 'updateMany',
    value: function updateMany(query, update) {
      return updateOp(this, true, query, update);
    }

    /**
     * Finds documents.
     *
     * @method
     * @param {Object} query The query used to match documents.
     * @param {Object} [project] The query document projection.
     * @return {MongoQuery} An object which allows for `limit` and `sort` parameters to be set.
     * `execute` will return a {Promise} for the operation.
     */

  }, {
    key: 'find',
    value: function find(query, project) {
      return new MongoQuery(this, query, project);
    }

    /**
     * Finds one document.
     *
     * @method
     * @param {Object} query The query used to match documents.
     * @param {Object} [project] The query document projection.
     * @return {Promise<Object, Error>} Returns a Promise for the operation
     */

  }, {
    key: 'findOne',
    value: function findOne(query, project) {
      return buildResponse('findOne', this, buildArgs(this, { query: query, project: project }));
    }

    /**
     * Executes an aggregation pipeline.
     *
     * @param {Array} pipeline The aggregation pipeline.
     * @returns {Array} The results of the aggregation.
     */

  }, {
    key: 'aggregate',
    value: function aggregate(pipeline) {
      return aggregateOp(this, pipeline);
    }

    /**
     * Gets the number of documents matching the filter.
     *
     * @param {Object} query The query used to match documents.
     * @param {Object} options Additional count options.
     * @param {Number} [options.limit=null] The maximum number of documents to return.
     * @return {Number} The results of the count operation.
     */

  }, {
    key: 'count',
    value: function count(query) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var outgoingOptions = void 0;
      if (options.limit) {
        outgoingOptions = { limit: options.limit };
      }

      return buildResponse('count', this, buildArgs(this, { count: true, query: query }, outgoingOptions));
    }
  }]);

  return Collection;
}();

// private

function updateOp(service, isMulti, query, update) {
  var options = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};

  var action = isMulti ? 'updateMany' : 'updateOne';

  var outgoingOptions = void 0;
  if (!isMulti && options.upsert) {
    outgoingOptions = { upsert: true };
  }

  return buildResponse(action, service, buildArgs(service, { query: query, update: update }, outgoingOptions));
}

function findOp(_ref) {
  var service = _ref.service,
      query = _ref.query,
      project = _ref.project,
      limit = _ref.limit,
      sort = _ref.sort;

  return buildResponse('find', service, buildArgs(service, { query: query, project: project, limit: limit, sort: sort }));
}

function aggregateOp(service, pipeline) {
  return buildResponse('aggregate', service, buildArgs(service, { pipeline: pipeline }));
}

function buildArgs(_ref2, args) {
  var database = _ref2.db.name,
      collection = _ref2.name;
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  return Object.assign({ database: database, collection: collection }, args, options);
}

function buildResponse(action, service, args) {
  return (0, _util.serviceResponse)(service.db, {
    serviceName: service.db.service,
    action: action,
    args: args
  });
}

// mongo query (find) support

function MongoQuery(service, query, project) {
  if (this instanceof MongoQuery) {
    this.service = service;
    this.query = query;
    this.project = project;
    return this;
  }
  return new MongoQuery(service, query, project);
}

MongoQuery.prototype.limit = function (limit) {
  this.limit = limit;
  return this;
};

MongoQuery.prototype.sort = function (sort) {
  this.sort = sort;
  return this;
};

MongoQuery.prototype.execute = function (resolve) {
  return findOp(this);
};

exports.default = Collection;
module.exports = exports['default'];

/***/ }),
/* 53 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = __webpack_require__(1);

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Create a new TwilioService instance (not meant to be instantiated directly).
 *
 * @class
 * @return {TwilioService} a TwilioService instance.
 */
var TwilioService = function () {
  function TwilioService(stitchClient, serviceName) {
    _classCallCheck(this, TwilioService);

    this.client = stitchClient;
    this.serviceName = serviceName;
  }

  /**
   * Send a text message to a number
   *
   * @method
   * @param {String} from number to send from
   * @param {String} to number to send to
   * @param {String} body SMS body content
   * @return {Promise}
   */


  _createClass(TwilioService, [{
    key: 'send',
    value: function send(from, to, body) {
      return (0, _util.serviceResponse)(this, {
        action: 'send',
        args: { from: from, to: to, body: body }
      });
    }
  }]);

  return TwilioService;
}();

exports.default = TwilioService;
module.exports = exports['default'];

/***/ }),
/* 54 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


let codecs = __webpack_require__(55),
  BSON = __webpack_require__(72);

var BSONTypes = [
  'Binary',
  'Code',
  'DBRef',
  'Decimal128',
  'Double',
  'Int32',
  'Long',
  'MaxKey',
  'MinKey',
  'ObjectID',
  'BSONRegExp',
  'Symbol',
  'Timestamp'
];

setBSONModule(BSON);

// all the types where we don't need to do any special processing and can just pass the EJSON
//straight to type.fromExtendedJSON
var keysToCodecs = {
  $oid: codecs.ObjectID,
  $binary: codecs.Binary,
  $symbol: codecs.Symbol,
  $numberDecimal: codecs.Decimal128,
  $numberLong: codecs.Long,
  $minKey: codecs.MinKey,
  $maxKey: codecs.MaxKey,
  $regularExpression: codecs.BSONRegExp,
  $timestamp: codecs.Timestamp
};

function setBSONModule(module) {
  BSONTypes.forEach(t => {
    if (!module[t]) throw new Error('passed in module does not contain all BSON types required');
  });
  BSON = module;
}

function deserializeValue(self, key, value, options) {
  if (typeof value === 'number') {
    // if it's an integer, should interpret as smallest BSON integer
    // that can represent it exactly. (if out of range, interpret as double.)
    if (Math.floor(value) === value) {
      let int32Range = value >= BSON_INT32_MIN && value <= BSON_INT32_MAX,
        int64Range = value >= BSON_INT64_MIN && value <= BSON_INT64_MAX;

      if (int32Range) return options.strict ? new BSON.Int32(value) : value;
      if (int64Range) return options.strict ? new BSON.Long.fromNumber(value) : value;
    }
    // If the number is a non-integer or out of integer range, should interpret as BSON Double.
    return new BSON.Double(value);
  }

  // from here on out we're looking for bson types, so bail if its not an object
  if (value == null || typeof value !== 'object') return value;

  // upgrade deprecated undefined to null
  if (value.$undefined) return null;

  var keys = Object.keys(value).filter(k => k.startsWith('$') && value[k] != null);
  for (let i = 0; i < keys.length; i++) {
    let c = keysToCodecs[keys[i]];
    if (c) return c.fromExtendedJSON(BSON, value);
  }

  if (value.$date != null) {
    let d = value.$date,
      date = new Date();

    if (typeof d === 'string') date.setTime(Date.parse(d));
    else if (d instanceof BSON.Long) date.setTime(d.toNumber());
    return date;
  }

  if (value.$code != null) {
    if (value.$scope) var scope = deserializeValue(self, null, value.$scope);
    let copy = Object.assign({}, value);
    copy.$scope = scope;
    return codecs.Code.fromExtendedJSON(BSON, value);
  }

  if (value.$numberDouble != null) {
    return options.strict
      ? codecs.Double.fromExtendedJSON(BSON, value)
      : parseFloat(value.$numberDouble);
  }

  if (value.$numberInt != null) {
    return options.strict
      ? codecs.Int32.fromExtendedJSON(BSON, value)
      : parseInt(value.$numberInt, 10);
  }

  if (value.$ref != null || value.$dbPointer != null) {
    let v = value.$ref ? value : value.$dbPointer;

    // we run into this in a "degenerate EJSON" case (with $id and $ref order flipped)
    // because of the order JSON.parse goes through the document
    if (v instanceof BSON.DBRef) return v;

    let dollarKeys = Object.keys(v).filter(k => k.startsWith('$')),
      valid = true;
    dollarKeys.forEach(k => {
      if (['$ref', '$id', '$db'].indexOf(k) === -1) valid = false;
    });

    // only make DBRef if $ keys are all valid
    if (valid) return codecs.DBRef.fromExtendedJSON(BSON, v);
  }

  return value;
}

const parse = function(text, options) {
  var self = this;
  options = options || { strict: true };

  return JSON.parse(text, function(key, value) {
    return deserializeValue(self, key, value, options);
  });
};

//
// Serializer
//

// MAX INT32 boundaries
const BSON_INT32_MAX = 0x7fffffff,
  BSON_INT32_MIN = -0x80000000,
  BSON_INT64_MAX = 0x7fffffffffffffff,
  BSON_INT64_MIN = -0x8000000000000000;

const stringify = function(value, reducer, indents, options) {
  var opts = {};
  if (options != null && typeof options === 'object') opts = options;
  else if (indents != null && typeof indents === 'object') {
    opts = indents;
    indents = 0;
  } else if (reducer != null && typeof reducer === 'object') {
    opts = reducer;
    reducer = null;
  }

  var doc = Array.isArray(value) ? serializeArray(value, opts) : serializeDocument(value, opts);
  return JSON.stringify(doc, reducer, indents);
};

function serializeArray(array, options) {
  return array.map(v => serializeValue(v, options));
}

function getISOString(date) {
  var isoStr = date.toISOString();
  // we should only show milliseconds in timestamp if they're non-zero
  return date.getUTCMilliseconds() !== 0 ? isoStr : isoStr.slice(0, -5) + 'Z';
}

function serializeValue(value, options) {
  if (Array.isArray(value)) return serializeArray(value, options);

  if (value === undefined) return null;

  if (value instanceof Date) {
    let dateNum = value.getTime(),
      // is it in year range 1970-9999?
      inRange = dateNum > -1 && dateNum < 253402318800000;

    return options.relaxed && inRange
      ? { $date: getISOString(value) }
      : { $date: { $numberLong: value.getTime().toString() } };
  }

  if (typeof value === 'number' && !options.relaxed) {
    // it's an integer
    if (Math.floor(value) === value) {
      let int32Range = value >= BSON_INT32_MIN && value <= BSON_INT32_MAX,
        int64Range = value >= BSON_INT64_MIN && value <= BSON_INT64_MAX;

      // interpret as being of the smallest BSON integer type that can represent the number exactly
      if (int32Range) return { $numberInt: value.toString() };
      if (int64Range) return { $numberLong: value.toString() };
    }
    return { $numberDouble: value.toString() };
  }

  if (value != null && typeof value === 'object') return serializeDocument(value, options);
  return value;
}

function serializeDocument(doc, options) {
  if (doc == null || typeof doc !== 'object') throw new Error('not an object instance');

  // the document itself is a BSON type
  if (doc._bsontype && BSONTypes.indexOf(doc._bsontype) !== -1) {
    // we need to separately serialize the embedded scope document
    if (doc._bsontype === 'Code' && doc.scope) {
      let tempScope = serializeDocument(doc.scope, options),
        tempDoc = Object.assign({}, doc, { scope: tempScope });
      return codecs['Code'].toExtendedJSON(tempDoc, options);
      // we need to separately serialize the embedded OID document
    } else if (doc._bsontype === 'DBRef' && doc.oid) {
      let tempId = serializeDocument(doc.oid, options),
        tempDoc = Object.assign({}, doc, { oid: tempId });
      return codecs['DBRef'].toExtendedJSON(tempDoc, options);
    }
    return codecs[doc._bsontype].toExtendedJSON(doc, options);
  }

  // the document is an object with nested BSON types
  var _doc = {};
  for (var name in doc) {
    let val = doc[name];
    if (Array.isArray(val)) {
      _doc[name] = serializeArray(val, options);
    } else if (val != null && val._bsontype && BSONTypes.indexOf(val._bsontype) !== -1) {
      // we need to separately serialize the embedded scope document
      if (val._bsontype === 'Code' && val.scope) {
        let tempScope = serializeDocument(val.scope, options),
          tempVal = Object.assign({}, val, { scope: tempScope });
        _doc[name] = codecs['Code'].toExtendedJSON(tempVal, options);
        // we need to separately serialize the embedded OID document
      } else if (val._bsontype === 'DBRef' && val.oid) {
        let tempId = serializeDocument(val.oid, options),
          tempVal = Object.assign({}, val, { oid: tempId });
        _doc[name] = codecs['DBRef'].toExtendedJSON(tempVal, options);
      } else _doc[name] = codecs[val._bsontype].toExtendedJSON(val, options);
    } else if (val instanceof Date) {
      _doc[name] = serializeValue(val, options);
    } else if (val != null && typeof val === 'object') {
      _doc[name] = serializeDocument(val, options);
    }

    _doc[name] = serializeValue(val, options);
  }

  return _doc;
}

module.exports = {
  parse: parse,
  stringify: stringify,
  setBSONModule: setBSONModule,
  BSON: BSON
};


/***/ }),
/* 55 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var Binary = __webpack_require__(56);
var Code = __webpack_require__(60);
var DBRef = __webpack_require__(61);
var Decimal128 = __webpack_require__(62);
var Double = __webpack_require__(63);
var Int32 = __webpack_require__(64);
var Long = __webpack_require__(65);
var MaxKey = __webpack_require__(66);
var MinKey = __webpack_require__(67);
var ObjectID = __webpack_require__(68);
var BSONRegExp = __webpack_require__(69);
var Symbol = __webpack_require__(70);
var Timestamp = __webpack_require__(71);

module.exports = {
  Binary: Binary,
  Code: Code,
  DBRef: DBRef,
  Decimal128: Decimal128,
  Double: Double,
  Int32: Int32,
  Long: Long,
  MaxKey: MaxKey,
  MinKey: MinKey,
  ObjectID: ObjectID,
  BSONRegExp: BSONRegExp,
  Symbol: Symbol,
  Timestamp: Timestamp
};


/***/ }),
/* 56 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {

/**
 * Module dependencies.
 * @ignore
 */
function convert(integer) {
  var str = Number(integer).toString(16);
  return str.length === 1 ? '0' + str : str;
}

function toExtendedJSON(obj) {
  var base64String = obj.buffer.toString('base64');

  return {
    $binary: {
      base64: base64String,
      subType: convert(obj.sub_type)
    }
  };
}

function fromExtendedJSON(BSON, doc) {
  var type = doc.$binary.subType ? parseInt(doc.$binary.subType, 16) : 0;

  var data = new Buffer(doc.$binary.base64, 'base64');

  return new BSON.Binary(data, type);
}

module.exports = {
  toExtendedJSON: toExtendedJSON,
  fromExtendedJSON: fromExtendedJSON
};

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0).Buffer))

/***/ }),
/* 57 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return (b64.length * 3 / 4) - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr((len * 3 / 4) - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0; i < l; i += 4) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = ((uint8[i] << 16) & 0xFF0000) + ((uint8[i + 1] << 8) & 0xFF00) + (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}


/***/ }),
/* 58 */
/***/ (function(module, exports) {

exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}


/***/ }),
/* 59 */
/***/ (function(module, exports) {

var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};


/***/ }),
/* 60 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function toExtendedJSON(obj) {
  if (obj.scope) {
    return { $code: obj.code, $scope: obj.scope };
  }

  return { $code: obj.code };
}

function fromExtendedJSON(BSON, doc) {
  return new BSON.Code(doc.$code, doc.$scope);
}

module.exports = {
  toExtendedJSON: toExtendedJSON,
  fromExtendedJSON: fromExtendedJSON
};


/***/ }),
/* 61 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function toExtendedJSON(obj) {
  var o = {
    $ref: obj.collection,
    $id: obj.oid
  };
  if (obj.db) o.$db = obj.db;
  o = Object.assign(o, obj.fields);
  return o;
}

function fromExtendedJSON(BSON, doc) {
  var copy = Object.assign({}, doc);
  ['$ref', '$id', '$db'].forEach(k => delete copy[k]);
  return new BSON.DBRef(doc.$ref, doc.$id, doc.$db, copy);
}

module.exports = {
  toExtendedJSON: toExtendedJSON,
  fromExtendedJSON: fromExtendedJSON
};


/***/ }),
/* 62 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function toExtendedJSON(obj) {
  return { $numberDecimal: obj.toString() };
}

function fromExtendedJSON(BSON, doc) {
  return new BSON.Decimal128.fromString(doc.$numberDecimal);
}

module.exports = {
  toExtendedJSON: toExtendedJSON,
  fromExtendedJSON: fromExtendedJSON
};


/***/ }),
/* 63 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function toExtendedJSON(obj, options) {
  if (options.relaxed && isFinite(obj.value)) return obj.value;
  return { $numberDouble: obj.value.toString() };
}

function fromExtendedJSON(BSON, doc) {
  return new BSON.Double(parseFloat(doc.$numberDouble));
}

module.exports = {
  toExtendedJSON: toExtendedJSON,
  fromExtendedJSON: fromExtendedJSON
};


/***/ }),
/* 64 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function toExtendedJSON(obj, options) {
  if (options && options.relaxed) return obj.value;
  return { $numberInt: obj.value.toString() };
}

function fromExtendedJSON(BSON, doc) {
  return new BSON.Int32(doc.$numberInt);
}

module.exports = {
  toExtendedJSON: toExtendedJSON,
  fromExtendedJSON: fromExtendedJSON
};


/***/ }),
/* 65 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function toExtendedJSON(obj, options) {
  if (options && options.relaxed) return obj.toNumber();
  return { $numberLong: obj.toString() };
}

function fromExtendedJSON(BSON, doc) {
  return BSON.Long.fromString(doc.$numberLong);
}

module.exports = {
  toExtendedJSON: toExtendedJSON,
  fromExtendedJSON: fromExtendedJSON
};


/***/ }),
/* 66 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function toExtendedJSON() {
  return { $maxKey: 1 };
}

function fromExtendedJSON(BSON) {
  return new BSON.MaxKey();
}

module.exports = {
  toExtendedJSON: toExtendedJSON,
  fromExtendedJSON: fromExtendedJSON
};


/***/ }),
/* 67 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function toExtendedJSON() {
  return { $minKey: 1 };
}

function fromExtendedJSON(BSON) {
  return new BSON.MinKey();
}

module.exports = {
  toExtendedJSON: toExtendedJSON,
  fromExtendedJSON: fromExtendedJSON
};


/***/ }),
/* 68 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function toExtendedJSON(obj) {
  if (obj.toHexString) return { $oid: obj.toHexString() };
  return { $oid: obj.toString('hex') };
}

function fromExtendedJSON(BSON, doc) {
  return new BSON.ObjectID(doc.$oid);
}

module.exports = {
  toExtendedJSON: toExtendedJSON,
  fromExtendedJSON: fromExtendedJSON
};


/***/ }),
/* 69 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function toExtendedJSON(obj) {
  return { $regularExpression: { pattern: obj.pattern, options: obj.options } };
}

function fromExtendedJSON(BSON, doc) {
  return new BSON.BSONRegExp(
    doc.$regularExpression.pattern,
    doc.$regularExpression.options
      .split('')
      .sort()
      .join('')
  );
}

module.exports = {
  toExtendedJSON: toExtendedJSON,
  fromExtendedJSON: fromExtendedJSON
};


/***/ }),
/* 70 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function toExtendedJSON(obj) {
  return { $symbol: obj.value };
}

function fromExtendedJSON(BSON, doc) {
  return new BSON.Symbol(doc.$symbol);
}

module.exports = {
  toExtendedJSON: toExtendedJSON,
  fromExtendedJSON: fromExtendedJSON
};


/***/ }),
/* 71 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function toExtendedJSON(obj) {
  return {
    $timestamp: {
      t: obj.high_,
      i: obj.low_
    }
  };
}

function fromExtendedJSON(BSON, doc) {
  return new BSON.Timestamp(doc.$timestamp.i, doc.$timestamp.t);
}

module.exports = {
  toExtendedJSON: toExtendedJSON,
  fromExtendedJSON: fromExtendedJSON
};


/***/ }),
/* 72 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {

var Map = __webpack_require__(25),
  Long = __webpack_require__(2),
  Double = __webpack_require__(12),
  Timestamp = __webpack_require__(13),
  ObjectID = __webpack_require__(14),
  BSONRegExp = __webpack_require__(15),
  Symbol = __webpack_require__(26),
  Int32 = __webpack_require__(27),
  Code = __webpack_require__(16),
  Decimal128 = __webpack_require__(17),
  MinKey = __webpack_require__(8),
  MaxKey = __webpack_require__(18),
  DBRef = __webpack_require__(19),
  Binary = __webpack_require__(9);

// Parts of the parser
var deserialize = __webpack_require__(74),
  serializer = __webpack_require__(75),
  calculateObjectSize = __webpack_require__(77);

/**
 * @ignore
 * @api private
 */
// Max Size
var MAXSIZE = 1024 * 1024 * 17;
// Max Document Buffer size
var buffer = new Buffer(MAXSIZE);

var BSON = function() {};

/**
 * Serialize a Javascript object.
 *
 * @param {Object} object the Javascript object to serialize.
 * @param {Boolean} [options.checkKeys] the serializer will check if keys are valid.
 * @param {Boolean} [options.serializeFunctions=false] serialize the javascript functions **(default:false)**.
 * @param {Boolean} [options.ignoreUndefined=true] ignore undefined fields **(default:true)**.
 * @return {Buffer} returns the Buffer object containing the serialized object.
 * @api public
 */
BSON.prototype.serialize = function serialize(object, options) {
  options = options || {};
  // Unpack the options
  var checkKeys = typeof options.checkKeys === 'boolean' ? options.checkKeys : false;
  var serializeFunctions =
    typeof options.serializeFunctions === 'boolean' ? options.serializeFunctions : false;
  var ignoreUndefined =
    typeof options.ignoreUndefined === 'boolean' ? options.ignoreUndefined : true;

  // Attempt to serialize
  var serializationIndex = serializer(
    buffer,
    object,
    checkKeys,
    0,
    0,
    serializeFunctions,
    ignoreUndefined,
    []
  );
  // Create the final buffer
  var finishedBuffer = new Buffer(serializationIndex);
  // Copy into the finished buffer
  buffer.copy(finishedBuffer, 0, 0, finishedBuffer.length);
  // Return the buffer
  return finishedBuffer;
};

/**
 * Serialize a Javascript object using a predefined Buffer and index into the buffer, useful when pre-allocating the space for serialization.
 *
 * @param {Object} object the Javascript object to serialize.
 * @param {Buffer} buffer the Buffer you pre-allocated to store the serialized BSON object.
 * @param {Boolean} [options.checkKeys] the serializer will check if keys are valid.
 * @param {Boolean} [options.serializeFunctions=false] serialize the javascript functions **(default:false)**.
 * @param {Boolean} [options.ignoreUndefined=true] ignore undefined fields **(default:true)**.
 * @param {Number} [options.index] the index in the buffer where we wish to start serializing into.
 * @return {Number} returns the index pointing to the last written byte in the buffer.
 * @api public
 */
BSON.prototype.serializeWithBufferAndIndex = function(object, finalBuffer, options) {
  options = options || {};
  // Unpack the options
  var checkKeys = typeof options.checkKeys === 'boolean' ? options.checkKeys : false;
  var serializeFunctions =
    typeof options.serializeFunctions === 'boolean' ? options.serializeFunctions : false;
  var ignoreUndefined =
    typeof options.ignoreUndefined === 'boolean' ? options.ignoreUndefined : true;
  var startIndex = typeof options.index === 'number' ? options.index : 0;

  // Attempt to serialize
  var serializationIndex = serializer(
    buffer,
    object,
    checkKeys,
    0,
    0,
    serializeFunctions,
    ignoreUndefined
  );
  buffer.copy(finalBuffer, startIndex, 0, serializationIndex);

  // Return the index
  return startIndex + serializationIndex - 1;
};

/**
 * Deserialize data as BSON.
 *
 * @param {Buffer} buffer the buffer containing the serialized set of BSON documents.
 * @param {Object} [options.evalFunctions=false] evaluate functions in the BSON document scoped to the object deserialized.
 * @param {Object} [options.cacheFunctions=false] cache evaluated functions for reuse.
 * @param {Object} [options.cacheFunctionsCrc32=false] use a crc32 code for caching, otherwise use the string of the function.
 * @param {Object} [options.promoteLongs=true] when deserializing a Long will fit it into a Number if it's smaller than 53 bits
 * @param {Object} [options.promoteBuffers=false] when deserializing a Binary will return it as a node.js Buffer instance.
 * @param {Object} [options.promoteValues=false] when deserializing will promote BSON values to their Node.js closest equivalent types.
 * @param {Object} [options.fieldsAsRaw=null] allow to specify if there what fields we wish to return as unserialized raw buffer.
 * @param {Object} [options.bsonRegExp=false] return BSON regular expressions as BSONRegExp instances.
 * @return {Object} returns the deserialized Javascript Object.
 * @api public
 */
BSON.prototype.deserialize = function(buffer, options) {
  return deserialize(buffer, options);
};

/**
 * Calculate the bson size for a passed in Javascript object.
 *
 * @param {Object} object the Javascript object to calculate the BSON byte size for.
 * @param {Boolean} [options.serializeFunctions=false] serialize the javascript functions **(default:false)**.
 * @param {Boolean} [options.ignoreUndefined=true] ignore undefined fields **(default:true)**.
 * @return {Number} returns the number of bytes the BSON object will take up.
 * @api public
 */
BSON.prototype.calculateObjectSize = function(object, options) {
  options = options || {};

  var serializeFunctions =
    typeof options.serializeFunctions === 'boolean' ? options.serializeFunctions : false;
  var ignoreUndefined =
    typeof options.ignoreUndefined === 'boolean' ? options.ignoreUndefined : true;

  return calculateObjectSize(object, serializeFunctions, ignoreUndefined);
};

/**
 * Deserialize stream data as BSON documents.
 *
 * @param {Buffer} data the buffer containing the serialized set of BSON documents.
 * @param {Number} startIndex the start index in the data Buffer where the deserialization is to start.
 * @param {Number} numberOfDocuments number of documents to deserialize.
 * @param {Array} documents an array where to store the deserialized documents.
 * @param {Number} docStartIndex the index in the documents array from where to start inserting documents.
 * @param {Object} [options] additional options used for the deserialization.
 * @param {Object} [options.evalFunctions=false] evaluate functions in the BSON document scoped to the object deserialized.
 * @param {Object} [options.cacheFunctions=false] cache evaluated functions for reuse.
 * @param {Object} [options.cacheFunctionsCrc32=false] use a crc32 code for caching, otherwise use the string of the function.
 * @param {Object} [options.promoteLongs=true] when deserializing a Long will fit it into a Number if it's smaller than 53 bits
 * @param {Object} [options.promoteBuffers=false] when deserializing a Binary will return it as a node.js Buffer instance.
 * @param {Object} [options.promoteValues=false] when deserializing will promote BSON values to their Node.js closest equivalent types.
 * @param {Object} [options.fieldsAsRaw=null] allow to specify if there what fields we wish to return as unserialized raw buffer.
 * @param {Object} [options.bsonRegExp=false] return BSON regular expressions as BSONRegExp instances.
 * @return {Number} returns the next index in the buffer after deserialization **x** numbers of documents.
 * @api public
 */
BSON.prototype.deserializeStream = function(
  data,
  startIndex,
  numberOfDocuments,
  documents,
  docStartIndex,
  options
) {
  options = options != null ? options : {};
  var index = startIndex;
  // Loop over all documents
  for (var i = 0; i < numberOfDocuments; i++) {
    // Find size of the document
    var size =
      data[index] | (data[index + 1] << 8) | (data[index + 2] << 16) | (data[index + 3] << 24);
    // Update options with index
    options['index'] = index;
    // Parse the document at this point
    documents[docStartIndex + i] = this.deserialize(data, options);
    // Adjust index by the document size
    index = index + size;
  }

  // Return object containing end index of parsing and list of documents
  return index;
};

/**
 * @ignore
 * @api private
 */
// BSON MAX VALUES
BSON.BSON_INT32_MAX = 0x7fffffff;
BSON.BSON_INT32_MIN = -0x80000000;

BSON.BSON_INT64_MAX = Math.pow(2, 63) - 1;
BSON.BSON_INT64_MIN = -Math.pow(2, 63);

// JS MAX PRECISE VALUES
BSON.JS_INT_MAX = 0x20000000000000; // Any integer up to 2^53 can be precisely represented by a double.
BSON.JS_INT_MIN = -0x20000000000000; // Any integer down to -2^53 can be precisely represented by a double.

// Internal long versions
// var JS_INT_MAX_LONG = Long.fromNumber(0x20000000000000); // Any integer up to 2^53 can be precisely represented by a double.
// var JS_INT_MIN_LONG = Long.fromNumber(-0x20000000000000); // Any integer down to -2^53 can be precisely represented by a double.

/**
 * Number BSON Type
 *
 * @classconstant BSON_DATA_NUMBER
 **/
BSON.BSON_DATA_NUMBER = 1;
/**
 * String BSON Type
 *
 * @classconstant BSON_DATA_STRING
 **/
BSON.BSON_DATA_STRING = 2;
/**
 * Object BSON Type
 *
 * @classconstant BSON_DATA_OBJECT
 **/
BSON.BSON_DATA_OBJECT = 3;
/**
 * Array BSON Type
 *
 * @classconstant BSON_DATA_ARRAY
 **/
BSON.BSON_DATA_ARRAY = 4;
/**
 * Binary BSON Type
 *
 * @classconstant BSON_DATA_BINARY
 **/
BSON.BSON_DATA_BINARY = 5;
/**
 * ObjectID BSON Type
 *
 * @classconstant BSON_DATA_OID
 **/
BSON.BSON_DATA_OID = 7;
/**
 * Boolean BSON Type
 *
 * @classconstant BSON_DATA_BOOLEAN
 **/
BSON.BSON_DATA_BOOLEAN = 8;
/**
 * Date BSON Type
 *
 * @classconstant BSON_DATA_DATE
 **/
BSON.BSON_DATA_DATE = 9;
/**
 * null BSON Type
 *
 * @classconstant BSON_DATA_NULL
 **/
BSON.BSON_DATA_NULL = 10;
/**
 * RegExp BSON Type
 *
 * @classconstant BSON_DATA_REGEXP
 **/
BSON.BSON_DATA_REGEXP = 11;
/**
 * Code BSON Type
 *
 * @classconstant BSON_DATA_CODE
 **/
BSON.BSON_DATA_CODE = 13;
/**
 * Symbol BSON Type
 *
 * @classconstant BSON_DATA_SYMBOL
 **/
BSON.BSON_DATA_SYMBOL = 14;
/**
 * Code with Scope BSON Type
 *
 * @classconstant BSON_DATA_CODE_W_SCOPE
 **/
BSON.BSON_DATA_CODE_W_SCOPE = 15;
/**
 * 32 bit Integer BSON Type
 *
 * @classconstant BSON_DATA_INT
 **/
BSON.BSON_DATA_INT = 16;
/**
 * Timestamp BSON Type
 *
 * @classconstant BSON_DATA_TIMESTAMP
 **/
BSON.BSON_DATA_TIMESTAMP = 17;
/**
 * Long BSON Type
 *
 * @classconstant BSON_DATA_LONG
 **/
BSON.BSON_DATA_LONG = 18;
/**
 * MinKey BSON Type
 *
 * @classconstant BSON_DATA_MIN_KEY
 **/
BSON.BSON_DATA_MIN_KEY = 0xff;
/**
 * MaxKey BSON Type
 *
 * @classconstant BSON_DATA_MAX_KEY
 **/
BSON.BSON_DATA_MAX_KEY = 0x7f;

/**
 * Binary Default Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_DEFAULT
 **/
BSON.BSON_BINARY_SUBTYPE_DEFAULT = 0;
/**
 * Binary Function Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_FUNCTION
 **/
BSON.BSON_BINARY_SUBTYPE_FUNCTION = 1;
/**
 * Binary Byte Array Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_BYTE_ARRAY
 **/
BSON.BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
/**
 * Binary UUID Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_UUID
 **/
BSON.BSON_BINARY_SUBTYPE_UUID = 3;
/**
 * Binary MD5 Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_MD5
 **/
BSON.BSON_BINARY_SUBTYPE_MD5 = 4;
/**
 * Binary User Defined Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_USER_DEFINED
 **/
BSON.BSON_BINARY_SUBTYPE_USER_DEFINED = 128;

// Return BSON
module.exports = BSON;
module.exports.Code = Code;
module.exports.Map = Map;
module.exports.Symbol = Symbol;
module.exports.BSON = BSON;
module.exports.DBRef = DBRef;
module.exports.Binary = Binary;
module.exports.ObjectID = ObjectID;
module.exports.Long = Long;
module.exports.Timestamp = Timestamp;
module.exports.Double = Double;
module.exports.Int32 = Int32;
module.exports.MinKey = MinKey;
module.exports.MaxKey = MaxKey;
module.exports.BSONRegExp = BSONRegExp;
module.exports.Decimal128 = Decimal128;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0).Buffer))

/***/ }),
/* 73 */
/***/ (function(module, exports) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),
/* 74 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {

var Long = __webpack_require__(2).Long,
  Double = __webpack_require__(12).Double,
  Timestamp = __webpack_require__(13).Timestamp,
  ObjectID = __webpack_require__(14).ObjectID,
  Code = __webpack_require__(16).Code,
  MinKey = __webpack_require__(8).MinKey,
  MaxKey = __webpack_require__(18).MaxKey,
  Decimal128 = __webpack_require__(17),
  Int32 = __webpack_require__(27),
  DBRef = __webpack_require__(19).DBRef,
  BSONRegExp = __webpack_require__(15).BSONRegExp,
  Binary = __webpack_require__(9).Binary;

var deserialize = function(buffer, options, isArray) {
  options = options == null ? {} : options;
  var index = options && options.index ? options.index : 0;
  // Read the document size
  var size =
    buffer[index] |
    (buffer[index + 1] << 8) |
    (buffer[index + 2] << 16) |
    (buffer[index + 3] << 24);

  // Ensure buffer is valid size
  if (size < 5 || buffer.length !== size || size + index > buffer.length) {
    throw new Error('corrupt bson message');
  }

  // Illegal end value
  if (buffer[index + size - 1] !== 0) {
    throw new Error("One object, sized correctly, with a spot for an EOO, but the EOO isn't 0x00");
  }

  // Start deserializtion
  return deserializeObject(buffer, index, options, isArray);
};

var deserializeObject = function(buffer, index, options, isArray) {
  var evalFunctions = options['evalFunctions'] == null ? false : options['evalFunctions'];
  var cacheFunctions = options['cacheFunctions'] == null ? false : options['cacheFunctions'];
  var cacheFunctionsCrc32 =
    options['cacheFunctionsCrc32'] == null ? false : options['cacheFunctionsCrc32'];

  if (!cacheFunctionsCrc32) var crc32 = null;

  var fieldsAsRaw = options['fieldsAsRaw'] == null ? null : options['fieldsAsRaw'];

  // Return raw bson buffer instead of parsing it
  var raw = options['raw'] == null ? false : options['raw'];

  // Return BSONRegExp objects instead of native regular expressions
  var bsonRegExp = typeof options['bsonRegExp'] === 'boolean' ? options['bsonRegExp'] : false;

  // Controls the promotion of values vs wrapper classes
  var promoteBuffers = options['promoteBuffers'] == null ? false : options['promoteBuffers'];
  var promoteLongs = options['promoteLongs'] == null ? true : options['promoteLongs'];
  var promoteValues = options['promoteValues'] == null ? true : options['promoteValues'];

  // Set the start index
  var startIndex = index;

  // Validate that we have at least 4 bytes of buffer
  if (buffer.length < 5) throw new Error('corrupt bson message < 5 bytes long');

  // Read the document size
  var size =
    buffer[index++] | (buffer[index++] << 8) | (buffer[index++] << 16) | (buffer[index++] << 24);

  // Ensure buffer is valid size
  if (size < 5 || size > buffer.length) throw new Error('corrupt bson message');

  // Create holding object
  var object = isArray ? [] : {};
  // Used for arrays to skip having to perform utf8 decoding
  var arrayIndex = 0,
    done = false;

  // While we have more left data left keep parsing
  while (!done) {
    // Read the type
    var elementType = buffer[index++];

    // If we get a zero it's the last byte, exit
    if (elementType === 0) break;

    // Get the start search index
    var i = index;
    // Locate the end of the c string
    while (buffer[i] !== 0x00 && i < buffer.length) {
      i++;
    }

    // If are at the end of the buffer there is a problem with the document
    if (i >= buffer.length) throw new Error('Bad BSON Document: illegal CString');
    var name = isArray ? arrayIndex++ : buffer.toString('utf8', index, i);

    index = i + 1;

    if (elementType === BSON.BSON_DATA_STRING) {
      var stringSize =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      if (
        stringSize <= 0 ||
        stringSize > buffer.length - index ||
        buffer[index + stringSize - 1] !== 0
      )
        throw new Error('bad string length in bson');

      var s = buffer.toString('utf8', index, index + stringSize - 1);
      for (i = 0; i < s.length; i++) {
        if (s.charCodeAt(i) === 0xfffd) {
          throw new Error('Invalid UTF-8 string in BSON document');
        }
      }

      object[name] = s;
      index = index + stringSize;
    } else if (elementType === BSON.BSON_DATA_OID) {
      var oid = new Buffer(12);
      buffer.copy(oid, 0, index, index + 12);
      object[name] = new ObjectID(oid);
      index = index + 12;
    } else if (elementType === BSON.BSON_DATA_INT && promoteValues === false) {
      object[name] = new Int32(
        buffer[index++] | (buffer[index++] << 8) | (buffer[index++] << 16) | (buffer[index++] << 24)
      );
    } else if (elementType === BSON.BSON_DATA_INT) {
      object[name] =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
    } else if (elementType === BSON.BSON_DATA_NUMBER && promoteValues === false) {
      object[name] = new Double(buffer.readDoubleLE(index));
      index = index + 8;
    } else if (elementType === BSON.BSON_DATA_NUMBER) {
      object[name] = buffer.readDoubleLE(index);
      index = index + 8;
    } else if (elementType === BSON.BSON_DATA_DATE) {
      var lowBits =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      var highBits =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      object[name] = new Date(new Long(lowBits, highBits).toNumber());
    } else if (elementType === BSON.BSON_DATA_BOOLEAN) {
      if (buffer[index] !== 0 && buffer[index] !== 1) throw new Error('illegal boolean type value');
      object[name] = buffer[index++] === 1;
    } else if (elementType === BSON.BSON_DATA_OBJECT) {
      var _index = index;
      var objectSize =
        buffer[index] |
        (buffer[index + 1] << 8) |
        (buffer[index + 2] << 16) |
        (buffer[index + 3] << 24);
      if (objectSize <= 0 || objectSize > buffer.length - index)
        throw new Error('bad embedded document length in bson');

      // We have a raw value
      if (raw) {
        object[name] = buffer.slice(index, index + objectSize);
      } else {
        object[name] = deserializeObject(buffer, _index, options, false);
      }

      index = index + objectSize;
    } else if (elementType === BSON.BSON_DATA_ARRAY) {
      _index = index;
      objectSize =
        buffer[index] |
        (buffer[index + 1] << 8) |
        (buffer[index + 2] << 16) |
        (buffer[index + 3] << 24);
      var arrayOptions = options;

      // Stop index
      var stopIndex = index + objectSize;

      // All elements of array to be returned as raw bson
      if (fieldsAsRaw && fieldsAsRaw[name]) {
        arrayOptions = {};
        for (var n in options) arrayOptions[n] = options[n];
        arrayOptions['raw'] = true;
      }

      object[name] = deserializeObject(buffer, _index, arrayOptions, true);
      index = index + objectSize;

      if (buffer[index - 1] !== 0) throw new Error('invalid array terminator byte');
      if (index !== stopIndex) throw new Error('corrupted array bson');
    } else if (elementType === BSON.BSON_DATA_UNDEFINED) {
      object[name] = undefined;
    } else if (elementType === BSON.BSON_DATA_NULL) {
      object[name] = null;
    } else if (elementType === BSON.BSON_DATA_LONG) {
      // Unpack the low and high bits
      lowBits =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      highBits =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      var long = new Long(lowBits, highBits);
      // Promote the long if possible
      if (promoteLongs && promoteValues === true) {
        object[name] =
          long.lessThanOrEqual(JS_INT_MAX_LONG) && long.greaterThanOrEqual(JS_INT_MIN_LONG)
            ? long.toNumber()
            : long;
      } else {
        object[name] = long;
      }
    } else if (elementType === BSON.BSON_DATA_DECIMAL128) {
      // Buffer to contain the decimal bytes
      var bytes = new Buffer(16);
      // Copy the next 16 bytes into the bytes buffer
      buffer.copy(bytes, 0, index, index + 16);
      // Update index
      index = index + 16;
      // Assign the new Decimal128 value
      var decimal128 = new Decimal128(bytes);
      // If we have an alternative mapper use that
      object[name] = decimal128.toObject ? decimal128.toObject() : decimal128;
    } else if (elementType === BSON.BSON_DATA_BINARY) {
      var binarySize =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      var totalBinarySize = binarySize;
      var subType = buffer[index++];

      // Did we have a negative binary size, throw
      if (binarySize < 0) throw new Error('Negative binary type element size found');

      // Is the length longer than the document
      if (binarySize > buffer.length) throw new Error('Binary type size larger than document size');

      // Decode as raw Buffer object if options specifies it
      if (buffer['slice'] != null) {
        // If we have subtype 2 skip the 4 bytes for the size
        if (subType === Binary.SUBTYPE_BYTE_ARRAY) {
          binarySize =
            buffer[index++] |
            (buffer[index++] << 8) |
            (buffer[index++] << 16) |
            (buffer[index++] << 24);
          if (binarySize < 0)
            throw new Error('Negative binary type element size found for subtype 0x02');
          if (binarySize > totalBinarySize - 4)
            throw new Error('Binary type with subtype 0x02 contains to long binary size');
          if (binarySize < totalBinarySize - 4)
            throw new Error('Binary type with subtype 0x02 contains to short binary size');
        }

        if (promoteBuffers && promoteValues) {
          object[name] = buffer.slice(index, index + binarySize);
        } else {
          object[name] = new Binary(buffer.slice(index, index + binarySize), subType);
        }
      } else {
        var _buffer =
          typeof Uint8Array !== 'undefined'
            ? new Uint8Array(new ArrayBuffer(binarySize))
            : new Array(binarySize);
        // If we have subtype 2 skip the 4 bytes for the size
        if (subType === Binary.SUBTYPE_BYTE_ARRAY) {
          binarySize =
            buffer[index++] |
            (buffer[index++] << 8) |
            (buffer[index++] << 16) |
            (buffer[index++] << 24);
          if (binarySize < 0)
            throw new Error('Negative binary type element size found for subtype 0x02');
          if (binarySize > totalBinarySize - 4)
            throw new Error('Binary type with subtype 0x02 contains to long binary size');
          if (binarySize < totalBinarySize - 4)
            throw new Error('Binary type with subtype 0x02 contains to short binary size');
        }

        // Copy the data
        for (i = 0; i < binarySize; i++) {
          _buffer[i] = buffer[index + i];
        }

        if (promoteBuffers && promoteValues) {
          object[name] = _buffer;
        } else {
          object[name] = new Binary(_buffer, subType);
        }
      }

      // Update the index
      index = index + binarySize;
    } else if (elementType === BSON.BSON_DATA_REGEXP && bsonRegExp === false) {
      // Get the start search index
      i = index;
      // Locate the end of the c string
      while (buffer[i] !== 0x00 && i < buffer.length) {
        i++;
      }
      // If are at the end of the buffer there is a problem with the document
      if (i >= buffer.length) throw new Error('Bad BSON Document: illegal CString');
      // Return the C string
      var source = buffer.toString('utf8', index, i);
      // Create the regexp
      index = i + 1;

      // Get the start search index
      i = index;
      // Locate the end of the c string
      while (buffer[i] !== 0x00 && i < buffer.length) {
        i++;
      }
      // If are at the end of the buffer there is a problem with the document
      if (i >= buffer.length) throw new Error('Bad BSON Document: illegal CString');
      // Return the C string
      var regExpOptions = buffer.toString('utf8', index, i);
      index = i + 1;

      // For each option add the corresponding one for javascript
      var optionsArray = new Array(regExpOptions.length);

      // Parse options
      for (i = 0; i < regExpOptions.length; i++) {
        switch (regExpOptions[i]) {
          case 'm':
            optionsArray[i] = 'm';
            break;
          case 's':
            optionsArray[i] = 'g';
            break;
          case 'i':
            optionsArray[i] = 'i';
            break;
        }
      }

      object[name] = new RegExp(source, optionsArray.join(''));
    } else if (elementType === BSON.BSON_DATA_REGEXP && bsonRegExp === true) {
      // Get the start search index
      i = index;
      // Locate the end of the c string
      while (buffer[i] !== 0x00 && i < buffer.length) {
        i++;
      }
      // If are at the end of the buffer there is a problem with the document
      if (i >= buffer.length) throw new Error('Bad BSON Document: illegal CString');
      // Return the C string
      source = buffer.toString('utf8', index, i);
      index = i + 1;

      // Get the start search index
      i = index;
      // Locate the end of the c string
      while (buffer[i] !== 0x00 && i < buffer.length) {
        i++;
      }
      // If are at the end of the buffer there is a problem with the document
      if (i >= buffer.length) throw new Error('Bad BSON Document: illegal CString');
      // Return the C string
      regExpOptions = buffer.toString('utf8', index, i);
      index = i + 1;

      // Set the object
      object[name] = new BSONRegExp(source, regExpOptions);
    } else if (elementType === BSON.BSON_DATA_SYMBOL) {
      stringSize =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      if (
        stringSize <= 0 ||
        stringSize > buffer.length - index ||
        buffer[index + stringSize - 1] !== 0
      )
        throw new Error('bad string length in bson');
      // symbol is deprecated - upgrade to string.
      object[name] = buffer.toString('utf8', index, index + stringSize - 1);
      index = index + stringSize;
    } else if (elementType === BSON.BSON_DATA_TIMESTAMP) {
      lowBits =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      highBits =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);

      object[name] = new Timestamp(lowBits, highBits);
    } else if (elementType === BSON.BSON_DATA_MIN_KEY) {
      object[name] = new MinKey();
    } else if (elementType === BSON.BSON_DATA_MAX_KEY) {
      object[name] = new MaxKey();
    } else if (elementType === BSON.BSON_DATA_CODE) {
      stringSize =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      if (
        stringSize <= 0 ||
        stringSize > buffer.length - index ||
        buffer[index + stringSize - 1] !== 0
      )
        throw new Error('bad string length in bson');
      var functionString = buffer.toString('utf8', index, index + stringSize - 1);

      // If we are evaluating the functions
      if (evalFunctions) {
        // If we have cache enabled let's look for the md5 of the function in the cache
        if (cacheFunctions) {
          var hash = cacheFunctionsCrc32 ? crc32(functionString) : functionString;
          // Got to do this to avoid V8 deoptimizing the call due to finding eval
          object[name] = isolateEvalWithHash(functionCache, hash, functionString, object);
        } else {
          object[name] = isolateEval(functionString);
        }
      } else {
        object[name] = new Code(functionString);
      }

      // Update parse index position
      index = index + stringSize;
    } else if (elementType === BSON.BSON_DATA_CODE_W_SCOPE) {
      var totalSize =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);

      // Element cannot be shorter than totalSize + stringSize + documentSize + terminator
      if (totalSize < 4 + 4 + 4 + 1) {
        throw new Error('code_w_scope total size shorter minimum expected length');
      }

      // Get the code string size
      stringSize =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      // Check if we have a valid string
      if (
        stringSize <= 0 ||
        stringSize > buffer.length - index ||
        buffer[index + stringSize - 1] !== 0
      )
        throw new Error('bad string length in bson');

      // Javascript function
      functionString = buffer.toString('utf8', index, index + stringSize - 1);
      // Update parse index position
      index = index + stringSize;
      // Parse the element
      _index = index;
      // Decode the size of the object document
      objectSize =
        buffer[index] |
        (buffer[index + 1] << 8) |
        (buffer[index + 2] << 16) |
        (buffer[index + 3] << 24);
      // Decode the scope object
      var scopeObject = deserializeObject(buffer, _index, options, false);
      // Adjust the index
      index = index + objectSize;

      // Check if field length is to short
      if (totalSize < 4 + 4 + objectSize + stringSize) {
        throw new Error('code_w_scope total size is to short, truncating scope');
      }

      // Check if totalSize field is to long
      if (totalSize > 4 + 4 + objectSize + stringSize) {
        throw new Error('code_w_scope total size is to long, clips outer document');
      }

      // If we are evaluating the functions
      if (evalFunctions) {
        // If we have cache enabled let's look for the md5 of the function in the cache
        if (cacheFunctions) {
          hash = cacheFunctionsCrc32 ? crc32(functionString) : functionString;
          // Got to do this to avoid V8 deoptimizing the call due to finding eval
          object[name] = isolateEvalWithHash(functionCache, hash, functionString, object);
        } else {
          object[name] = isolateEval(functionString);
        }

        object[name].scope = scopeObject;
      } else {
        object[name] = new Code(functionString, scopeObject);
      }
    } else if (elementType === BSON.BSON_DATA_DBPOINTER) {
      // Get the code string size
      stringSize =
        buffer[index++] |
        (buffer[index++] << 8) |
        (buffer[index++] << 16) |
        (buffer[index++] << 24);
      // Check if we have a valid string
      if (
        stringSize <= 0 ||
        stringSize > buffer.length - index ||
        buffer[index + stringSize - 1] !== 0
      )
        throw new Error('bad string length in bson');
      // Namespace
      var namespace = buffer.toString('utf8', index, index + stringSize - 1);
      // Update parse index position
      index = index + stringSize;

      // Read the oid
      var oidBuffer = new Buffer(12);
      buffer.copy(oidBuffer, 0, index, index + 12);
      oid = new ObjectID(oidBuffer);

      // Update the index
      index = index + 12;

      for (i = 0; i < namespace.length; i++) {
        if (namespace.charCodeAt(i) === 0xfffd) {
          throw new Error('Invalid UTF-8 string in BSON document');
        }
      }

      // Split the namespace
      var parts = namespace.split('.');

      var db, collection;
      if (parts.length === 2) {
        db = parts.shift();
        collection = parts.shift();
      } else {
        collection = namespace;
      }

      // Upgrade to DBRef type
      object[name] = new DBRef(collection, oid, db);
    } else {
      throw new Error(
        'Detected unknown BSON type ' +
          elementType.toString(16) +
          ' for fieldname "' +
          name +
          '", are you using the latest BSON parser?'
      );
    }
  }

  // Check if the deserialization was against a valid array/object
  if (size !== index - startIndex) {
    if (isArray) throw new Error('corrupt array bson');
    throw new Error('corrupt object bson');
  }

  // check if object's $ keys are those of a DBRef
  var dollarKeys = Object.keys(object).filter(k => k.startsWith('$'));
  var valid = true;
  dollarKeys.forEach(k => {
    if (['$ref', '$id', '$db'].indexOf(k) === -1) valid = false;
  });

  // if a $key not in "$ref", "$id", "$db", don't make a DBRef
  if (!valid) return object;

  if (object['$id'] != null && object['$ref'] != null) {
    let copy = Object.assign({}, object);
    delete copy.$ref;
    delete copy.$id;
    delete copy.$db;
    return new DBRef(object.$ref, object.$id, object.$db || null, copy);
  }

  return object;
};

/**
 * Ensure eval is isolated.
 *
 * @ignore
 * @api private
 */
var isolateEvalWithHash = function(functionCache, hash, functionString, object) {
  // Contains the value we are going to set
  var value = null;

  // Check for cache hit, eval if missing and return cached function
  if (functionCache[hash] == null) {
    eval('value = ' + functionString);
    functionCache[hash] = value;
  }
  // Set the object
  return functionCache[hash].bind(object);
};

/**
 * Ensure eval is isolated.
 *
 * @ignore
 * @api private
 */
var isolateEval = function(functionString) {
  // Contains the value we are going to set
  var value = null;
  // Eval the function
  eval('value = ' + functionString);
  return value;
};

var BSON = {};

/**
 * Contains the function cache if we have that enable to allow for avoiding the eval step on each deserialization, comparison is by md5
 *
 * @ignore
 * @api private
 */
var functionCache = (BSON.functionCache = {});

/**
 * Number BSON Type
 *
 * @classconstant BSON_DATA_NUMBER
 **/
BSON.BSON_DATA_NUMBER = 1;
/**
 * String BSON Type
 *
 * @classconstant BSON_DATA_STRING
 **/
BSON.BSON_DATA_STRING = 2;
/**
 * Object BSON Type
 *
 * @classconstant BSON_DATA_OBJECT
 **/
BSON.BSON_DATA_OBJECT = 3;
/**
 * Array BSON Type
 *
 * @classconstant BSON_DATA_ARRAY
 **/
BSON.BSON_DATA_ARRAY = 4;
/**
 * Binary BSON Type
 *
 * @classconstant BSON_DATA_BINARY
 **/
BSON.BSON_DATA_BINARY = 5;
/**
 * Binary BSON Type
 *
 * @classconstant BSON_DATA_UNDEFINED
 **/
BSON.BSON_DATA_UNDEFINED = 6;
/**
 * ObjectID BSON Type
 *
 * @classconstant BSON_DATA_OID
 **/
BSON.BSON_DATA_OID = 7;
/**
 * Boolean BSON Type
 *
 * @classconstant BSON_DATA_BOOLEAN
 **/
BSON.BSON_DATA_BOOLEAN = 8;
/**
 * Date BSON Type
 *
 * @classconstant BSON_DATA_DATE
 **/
BSON.BSON_DATA_DATE = 9;
/**
 * null BSON Type
 *
 * @classconstant BSON_DATA_NULL
 **/
BSON.BSON_DATA_NULL = 10;
/**
 * RegExp BSON Type
 *
 * @classconstant BSON_DATA_REGEXP
 **/
BSON.BSON_DATA_REGEXP = 11;
/**
 * Code BSON Type
 *
 * @classconstant BSON_DATA_DBPOINTER
 **/
BSON.BSON_DATA_DBPOINTER = 12;
/**
 * Code BSON Type
 *
 * @classconstant BSON_DATA_CODE
 **/
BSON.BSON_DATA_CODE = 13;
/**
 * Symbol BSON Type
 *
 * @classconstant BSON_DATA_SYMBOL
 **/
BSON.BSON_DATA_SYMBOL = 14;
/**
 * Code with Scope BSON Type
 *
 * @classconstant BSON_DATA_CODE_W_SCOPE
 **/
BSON.BSON_DATA_CODE_W_SCOPE = 15;
/**
 * 32 bit Integer BSON Type
 *
 * @classconstant BSON_DATA_INT
 **/
BSON.BSON_DATA_INT = 16;
/**
 * Timestamp BSON Type
 *
 * @classconstant BSON_DATA_TIMESTAMP
 **/
BSON.BSON_DATA_TIMESTAMP = 17;
/**
 * Long BSON Type
 *
 * @classconstant BSON_DATA_LONG
 **/
BSON.BSON_DATA_LONG = 18;
/**
 * Long BSON Type
 *
 * @classconstant BSON_DATA_DECIMAL128
 **/
BSON.BSON_DATA_DECIMAL128 = 19;
/**
 * MinKey BSON Type
 *
 * @classconstant BSON_DATA_MIN_KEY
 **/
BSON.BSON_DATA_MIN_KEY = 0xff;
/**
 * MaxKey BSON Type
 *
 * @classconstant BSON_DATA_MAX_KEY
 **/
BSON.BSON_DATA_MAX_KEY = 0x7f;

/**
 * Binary Default Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_DEFAULT
 **/
BSON.BSON_BINARY_SUBTYPE_DEFAULT = 0;
/**
 * Binary Function Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_FUNCTION
 **/
BSON.BSON_BINARY_SUBTYPE_FUNCTION = 1;
/**
 * Binary Byte Array Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_BYTE_ARRAY
 **/
BSON.BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
/**
 * Binary UUID Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_UUID
 **/
BSON.BSON_BINARY_SUBTYPE_UUID = 3;
/**
 * Binary MD5 Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_MD5
 **/
BSON.BSON_BINARY_SUBTYPE_MD5 = 4;
/**
 * Binary User Defined Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_USER_DEFINED
 **/
BSON.BSON_BINARY_SUBTYPE_USER_DEFINED = 128;

// BSON MAX VALUES
BSON.BSON_INT32_MAX = 0x7fffffff;
BSON.BSON_INT32_MIN = -0x80000000;

BSON.BSON_INT64_MAX = Math.pow(2, 63) - 1;
BSON.BSON_INT64_MIN = -Math.pow(2, 63);

// JS MAX PRECISE VALUES
BSON.JS_INT_MAX = 0x20000000000000; // Any integer up to 2^53 can be precisely represented by a double.
BSON.JS_INT_MIN = -0x20000000000000; // Any integer down to -2^53 can be precisely represented by a double.

// Internal long versions
var JS_INT_MAX_LONG = Long.fromNumber(0x20000000000000); // Any integer up to 2^53 can be precisely represented by a double.
var JS_INT_MIN_LONG = Long.fromNumber(-0x20000000000000); // Any integer down to -2^53 can be precisely represented by a double.

module.exports = deserialize;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0).Buffer))

/***/ }),
/* 75 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {

var writeIEEE754 = __webpack_require__(76).writeIEEE754,
  Long = __webpack_require__(2).Long,
  Map = __webpack_require__(25),
  MinKey = __webpack_require__(8).MinKey,
  Binary = __webpack_require__(9).Binary;

// try {
//   var _Buffer = Uint8Array;
// } catch (e) {
//   _Buffer = Buffer;
// }

var regexp = /\x00/; // eslint-disable-line no-control-regex

// To ensure that 0.4 of node works correctly
var isDate = function isDate(d) {
  return typeof d === 'object' && Object.prototype.toString.call(d) === '[object Date]';
};

var isRegExp = function isRegExp(d) {
  return Object.prototype.toString.call(d) === '[object RegExp]';
};

var serializeString = function(buffer, key, value, index, isArray) {
  // Encode String type
  buffer[index++] = BSON.BSON_DATA_STRING;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes + 1;
  buffer[index - 1] = 0;
  // Write the string
  var size = buffer.write(value, index + 4, 'utf8');
  // Write the size of the string to buffer
  buffer[index + 3] = ((size + 1) >> 24) & 0xff;
  buffer[index + 2] = ((size + 1) >> 16) & 0xff;
  buffer[index + 1] = ((size + 1) >> 8) & 0xff;
  buffer[index] = (size + 1) & 0xff;
  // Update index
  index = index + 4 + size;
  // Write zero
  buffer[index++] = 0;
  return index;
};

var serializeNumber = function(buffer, key, value, index, isArray) {
  // We have an integer value
  if (Math.floor(value) === value && value >= BSON.JS_INT_MIN && value <= BSON.JS_INT_MAX) {
    // If the value fits in 32 bits encode as int, if it fits in a double
    // encode it as a double, otherwise long
    if (value >= BSON.BSON_INT32_MIN && value <= BSON.BSON_INT32_MAX) {
      // Set int type 32 bits or less
      buffer[index++] = BSON.BSON_DATA_INT;
      // Number of written bytes
      var numberOfWrittenBytes = !isArray
        ? buffer.write(key, index, 'utf8')
        : buffer.write(key, index, 'ascii');
      // Encode the name
      index = index + numberOfWrittenBytes;
      buffer[index++] = 0;
      // Write the int value
      buffer[index++] = value & 0xff;
      buffer[index++] = (value >> 8) & 0xff;
      buffer[index++] = (value >> 16) & 0xff;
      buffer[index++] = (value >> 24) & 0xff;
    } else if (value >= BSON.JS_INT_MIN && value <= BSON.JS_INT_MAX) {
      // Encode as double
      buffer[index++] = BSON.BSON_DATA_NUMBER;
      // Number of written bytes
      numberOfWrittenBytes = !isArray
        ? buffer.write(key, index, 'utf8')
        : buffer.write(key, index, 'ascii');
      // Encode the name
      index = index + numberOfWrittenBytes;
      buffer[index++] = 0;
      // Write float
      writeIEEE754(buffer, value, index, 'little', 52, 8);
      // Ajust index
      index = index + 8;
    } else {
      // Set long type
      buffer[index++] = BSON.BSON_DATA_LONG;
      // Number of written bytes
      numberOfWrittenBytes = !isArray
        ? buffer.write(key, index, 'utf8')
        : buffer.write(key, index, 'ascii');
      // Encode the name
      index = index + numberOfWrittenBytes;
      buffer[index++] = 0;
      var longVal = Long.fromNumber(value);
      var lowBits = longVal.getLowBits();
      var highBits = longVal.getHighBits();
      // Encode low bits
      buffer[index++] = lowBits & 0xff;
      buffer[index++] = (lowBits >> 8) & 0xff;
      buffer[index++] = (lowBits >> 16) & 0xff;
      buffer[index++] = (lowBits >> 24) & 0xff;
      // Encode high bits
      buffer[index++] = highBits & 0xff;
      buffer[index++] = (highBits >> 8) & 0xff;
      buffer[index++] = (highBits >> 16) & 0xff;
      buffer[index++] = (highBits >> 24) & 0xff;
    }
  } else {
    // Encode as double
    buffer[index++] = BSON.BSON_DATA_NUMBER;
    // Number of written bytes
    numberOfWrittenBytes = !isArray
      ? buffer.write(key, index, 'utf8')
      : buffer.write(key, index, 'ascii');
    // Encode the name
    index = index + numberOfWrittenBytes;
    buffer[index++] = 0;
    // Write float
    writeIEEE754(buffer, value, index, 'little', 52, 8);
    // Ajust index
    index = index + 8;
  }

  return index;
};

var serializeNull = function(buffer, key, value, index, isArray) {
  // Set long type
  buffer[index++] = BSON.BSON_DATA_NULL;

  // Number of written bytes
  var numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');

  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  return index;
};

var serializeBoolean = function(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = BSON.BSON_DATA_BOOLEAN;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Encode the boolean value
  buffer[index++] = value ? 1 : 0;
  return index;
};

var serializeDate = function(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = BSON.BSON_DATA_DATE;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;

  // Write the date
  var dateInMilis = Long.fromNumber(value.getTime());
  var lowBits = dateInMilis.getLowBits();
  var highBits = dateInMilis.getHighBits();
  // Encode low bits
  buffer[index++] = lowBits & 0xff;
  buffer[index++] = (lowBits >> 8) & 0xff;
  buffer[index++] = (lowBits >> 16) & 0xff;
  buffer[index++] = (lowBits >> 24) & 0xff;
  // Encode high bits
  buffer[index++] = highBits & 0xff;
  buffer[index++] = (highBits >> 8) & 0xff;
  buffer[index++] = (highBits >> 16) & 0xff;
  buffer[index++] = (highBits >> 24) & 0xff;
  return index;
};

var serializeRegExp = function(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = BSON.BSON_DATA_REGEXP;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');

  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  if (value.source && value.source.match(regexp) != null) {
    throw Error('value ' + value.source + ' must not contain null bytes');
  }
  // Adjust the index
  index = index + buffer.write(value.source, index, 'utf8');
  // Write zero
  buffer[index++] = 0x00;
  // Write the parameters
  if (value.global) buffer[index++] = 0x73; // s
  if (value.ignoreCase) buffer[index++] = 0x69; // i
  if (value.multiline) buffer[index++] = 0x6d; // m

  // Add ending zero
  buffer[index++] = 0x00;
  return index;
};

var serializeBSONRegExp = function(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = BSON.BSON_DATA_REGEXP;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;

  // Check the pattern for 0 bytes
  if (value.pattern.match(regexp) != null) {
    // The BSON spec doesn't allow keys with null bytes because keys are
    // null-terminated.
    throw Error('pattern ' + value.pattern + ' must not contain null bytes');
  }

  // Adjust the index
  index = index + buffer.write(value.pattern, index, 'utf8');
  // Write zero
  buffer[index++] = 0x00;
  // Write the options
  index =
    index +
    buffer.write(
      value.options
        .split('')
        .sort()
        .join(''),
      index,
      'utf8'
    );
  // Add ending zero
  buffer[index++] = 0x00;
  return index;
};

var serializeMinMax = function(buffer, key, value, index, isArray) {
  // Write the type of either min or max key
  if (value === null) {
    buffer[index++] = BSON.BSON_DATA_NULL;
  } else if (value instanceof MinKey) {
    buffer[index++] = BSON.BSON_DATA_MIN_KEY;
  } else {
    buffer[index++] = BSON.BSON_DATA_MAX_KEY;
  }

  // Number of written bytes
  var numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  return index;
};

var serializeObjectId = function(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = BSON.BSON_DATA_OID;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');

  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;

  // Write the objectId into the shared buffer
  if (typeof value.id === 'string') {
    buffer.write(value.id, index, 'binary');
  } else if (value.id && value.id.copy) {
    value.id.copy(buffer, index, 0, 12);
  } else {
    throw new Error('object [' + JSON.stringify(value) + '] is not a valid ObjectId');
  }

  // Ajust index
  return index + 12;
};

var serializeBuffer = function(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = BSON.BSON_DATA_BINARY;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Get size of the buffer (current write point)
  var size = value.length;
  // Write the size of the string to buffer
  buffer[index++] = size & 0xff;
  buffer[index++] = (size >> 8) & 0xff;
  buffer[index++] = (size >> 16) & 0xff;
  buffer[index++] = (size >> 24) & 0xff;
  // Write the default subtype
  buffer[index++] = BSON.BSON_BINARY_SUBTYPE_DEFAULT;
  // Copy the content form the binary field to the buffer
  value.copy(buffer, index, 0, size);
  // Adjust the index
  index = index + size;
  return index;
};

var serializeObject = function(
  buffer,
  key,
  value,
  index,
  checkKeys,
  depth,
  serializeFunctions,
  ignoreUndefined,
  isArray,
  path
) {
  for (var i = 0; i < path.length; i++) {
    if (path[i] === value) throw new Error('cyclic dependency detected');
  }

  // Push value to stack
  path.push(value);
  // Write the type
  buffer[index++] = Array.isArray(value) ? BSON.BSON_DATA_ARRAY : BSON.BSON_DATA_OBJECT;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  var endIndex = serializeInto(
    buffer,
    value,
    checkKeys,
    index,
    depth + 1,
    serializeFunctions,
    ignoreUndefined,
    path
  );
  // Pop stack
  path.pop();
  return endIndex;
};

var serializeDecimal128 = function(buffer, key, value, index, isArray) {
  buffer[index++] = BSON.BSON_DATA_DECIMAL128;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Write the data from the value
  value.bytes.copy(buffer, index, 0, 16);
  return index + 16;
};

var serializeLong = function(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = value._bsontype === 'Long' ? BSON.BSON_DATA_LONG : BSON.BSON_DATA_TIMESTAMP;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Write the date
  var lowBits = value.getLowBits();
  var highBits = value.getHighBits();
  // Encode low bits
  buffer[index++] = lowBits & 0xff;
  buffer[index++] = (lowBits >> 8) & 0xff;
  buffer[index++] = (lowBits >> 16) & 0xff;
  buffer[index++] = (lowBits >> 24) & 0xff;
  // Encode high bits
  buffer[index++] = highBits & 0xff;
  buffer[index++] = (highBits >> 8) & 0xff;
  buffer[index++] = (highBits >> 16) & 0xff;
  buffer[index++] = (highBits >> 24) & 0xff;
  return index;
};

var serializeInt32 = function(buffer, key, value, index, isArray) {
  // Set int type 32 bits or less
  buffer[index++] = BSON.BSON_DATA_INT;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Write the int value
  buffer[index++] = value & 0xff;
  buffer[index++] = (value >> 8) & 0xff;
  buffer[index++] = (value >> 16) & 0xff;
  buffer[index++] = (value >> 24) & 0xff;
  return index;
};

var serializeDouble = function(buffer, key, value, index, isArray) {
  // Encode as double
  buffer[index++] = BSON.BSON_DATA_NUMBER;

  // Number of written bytes
  var numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');

  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;

  // Write float
  writeIEEE754(buffer, value.value, index, 'little', 52, 8);

  // Adjust index
  index = index + 8;
  return index;
};

var serializeFunction = function(buffer, key, value, index, checkKeys, depth, isArray) {
  buffer[index++] = BSON.BSON_DATA_CODE;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Function string
  var functionString = value.toString();
  // Write the string
  var size = buffer.write(functionString, index + 4, 'utf8') + 1;
  // Write the size of the string to buffer
  buffer[index] = size & 0xff;
  buffer[index + 1] = (size >> 8) & 0xff;
  buffer[index + 2] = (size >> 16) & 0xff;
  buffer[index + 3] = (size >> 24) & 0xff;
  // Update index
  index = index + 4 + size - 1;
  // Write zero
  buffer[index++] = 0;
  return index;
};

var serializeCode = function(
  buffer,
  key,
  value,
  index,
  checkKeys,
  depth,
  serializeFunctions,
  ignoreUndefined,
  isArray
) {
  if (value.scope && typeof value.scope === 'object') {
    // Write the type
    buffer[index++] = BSON.BSON_DATA_CODE_W_SCOPE;
    // Number of written bytes
    var numberOfWrittenBytes = !isArray
      ? buffer.write(key, index, 'utf8')
      : buffer.write(key, index, 'ascii');
    // Encode the name
    index = index + numberOfWrittenBytes;
    buffer[index++] = 0;

    // Starting index
    var startIndex = index;

    // Serialize the function
    // Get the function string
    var functionString = typeof value.code === 'string' ? value.code : value.code.toString();
    // Index adjustment
    index = index + 4;
    // Write string into buffer
    var codeSize = buffer.write(functionString, index + 4, 'utf8') + 1;
    // Write the size of the string to buffer
    buffer[index] = codeSize & 0xff;
    buffer[index + 1] = (codeSize >> 8) & 0xff;
    buffer[index + 2] = (codeSize >> 16) & 0xff;
    buffer[index + 3] = (codeSize >> 24) & 0xff;
    // Write end 0
    buffer[index + 4 + codeSize - 1] = 0;
    // Write the
    index = index + codeSize + 4;

    //
    // Serialize the scope value
    var endIndex = serializeInto(
      buffer,
      value.scope,
      checkKeys,
      index,
      depth + 1,
      serializeFunctions,
      ignoreUndefined
    );
    index = endIndex - 1;

    // Writ the total
    var totalSize = endIndex - startIndex;

    // Write the total size of the object
    buffer[startIndex++] = totalSize & 0xff;
    buffer[startIndex++] = (totalSize >> 8) & 0xff;
    buffer[startIndex++] = (totalSize >> 16) & 0xff;
    buffer[startIndex++] = (totalSize >> 24) & 0xff;
    // Write trailing zero
    buffer[index++] = 0;
  } else {
    buffer[index++] = BSON.BSON_DATA_CODE;
    // Number of written bytes
    numberOfWrittenBytes = !isArray
      ? buffer.write(key, index, 'utf8')
      : buffer.write(key, index, 'ascii');
    // Encode the name
    index = index + numberOfWrittenBytes;
    buffer[index++] = 0;
    // Function string
    functionString = value.code.toString();
    // Write the string
    var size = buffer.write(functionString, index + 4, 'utf8') + 1;
    // Write the size of the string to buffer
    buffer[index] = size & 0xff;
    buffer[index + 1] = (size >> 8) & 0xff;
    buffer[index + 2] = (size >> 16) & 0xff;
    buffer[index + 3] = (size >> 24) & 0xff;
    // Update index
    index = index + 4 + size - 1;
    // Write zero
    buffer[index++] = 0;
  }

  return index;
};

var serializeBinary = function(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = BSON.BSON_DATA_BINARY;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Extract the buffer
  var data = value.value(true);
  // Calculate size
  var size = value.position;
  // Add the deprecated 02 type 4 bytes of size to total
  if (value.sub_type === Binary.SUBTYPE_BYTE_ARRAY) size = size + 4;
  // Write the size of the string to buffer
  buffer[index++] = size & 0xff;
  buffer[index++] = (size >> 8) & 0xff;
  buffer[index++] = (size >> 16) & 0xff;
  buffer[index++] = (size >> 24) & 0xff;
  // Write the subtype to the buffer
  buffer[index++] = value.sub_type;

  // If we have binary type 2 the 4 first bytes are the size
  if (value.sub_type === Binary.SUBTYPE_BYTE_ARRAY) {
    size = size - 4;
    buffer[index++] = size & 0xff;
    buffer[index++] = (size >> 8) & 0xff;
    buffer[index++] = (size >> 16) & 0xff;
    buffer[index++] = (size >> 24) & 0xff;
  }

  // Write the data to the object
  data.copy(buffer, index, 0, value.position);
  // Adjust the index
  index = index + value.position;
  return index;
};

var serializeSymbol = function(buffer, key, value, index, isArray) {
  // Write the type
  buffer[index++] = BSON.BSON_DATA_SYMBOL;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');
  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;
  // Write the string
  var size = buffer.write(value.value, index + 4, 'utf8') + 1;
  // Write the size of the string to buffer
  buffer[index] = size & 0xff;
  buffer[index + 1] = (size >> 8) & 0xff;
  buffer[index + 2] = (size >> 16) & 0xff;
  buffer[index + 3] = (size >> 24) & 0xff;
  // Update index
  index = index + 4 + size - 1;
  // Write zero
  buffer[index++] = 0x00;
  return index;
};

var serializeDBRef = function(buffer, key, value, index, depth, serializeFunctions, isArray) {
  // Write the type
  buffer[index++] = BSON.BSON_DATA_OBJECT;
  // Number of written bytes
  var numberOfWrittenBytes = !isArray
    ? buffer.write(key, index, 'utf8')
    : buffer.write(key, index, 'ascii');

  // Encode the name
  index = index + numberOfWrittenBytes;
  buffer[index++] = 0;

  var startIndex = index;
  var endIndex;
  var output = {
    $ref: value.collection,
    $id: value.oid
  };

  if (value.db != null) output.$db = value.db;

  output = Object.assign(output, value.fields);
  endIndex = serializeInto(buffer, output, false, index, depth + 1, serializeFunctions);

  // Calculate object size
  var size = endIndex - startIndex;
  // Write the size
  buffer[startIndex++] = size & 0xff;
  buffer[startIndex++] = (size >> 8) & 0xff;
  buffer[startIndex++] = (size >> 16) & 0xff;
  buffer[startIndex++] = (size >> 24) & 0xff;
  // Set index
  return endIndex;
};

var serializeInto = function serializeInto(
  buffer,
  object,
  checkKeys,
  startingIndex,
  depth,
  serializeFunctions,
  ignoreUndefined,
  path
) {
  startingIndex = startingIndex || 0;
  path = path || [];

  // Push the object to the path
  path.push(object);

  // Start place to serialize into
  var index = startingIndex + 4;

  // Special case isArray
  if (Array.isArray(object)) {
    // Get object keys
    for (var i = 0; i < object.length; i++) {
      var key = '' + i;
      var value = object[i];

      // Is there an override value
      if (value && value.toBSON) {
        if (typeof value.toBSON !== 'function') throw new Error('toBSON is not a function');
        value = value.toBSON();
      }

      var type = typeof value;
      if (type === 'string') {
        index = serializeString(buffer, key, value, index, true);
      } else if (type === 'number') {
        index = serializeNumber(buffer, key, value, index, true);
      } else if (type === 'boolean') {
        index = serializeBoolean(buffer, key, value, index, true);
      } else if (value instanceof Date || isDate(value)) {
        index = serializeDate(buffer, key, value, index, true);
      } else if (value === undefined) {
        index = serializeNull(buffer, key, value, index, true);
      } else if (value === null) {
        index = serializeNull(buffer, key, value, index, true);
      } else if (value['_bsontype'] === 'ObjectID') {
        index = serializeObjectId(buffer, key, value, index, true);
      } else if (Buffer.isBuffer(value)) {
        index = serializeBuffer(buffer, key, value, index, true);
      } else if (value instanceof RegExp || isRegExp(value)) {
        index = serializeRegExp(buffer, key, value, index, true);
      } else if (type === 'object' && value['_bsontype'] == null) {
        index = serializeObject(
          buffer,
          key,
          value,
          index,
          checkKeys,
          depth,
          serializeFunctions,
          ignoreUndefined,
          true,
          path
        );
      } else if (type === 'object' && value['_bsontype'] === 'Decimal128') {
        index = serializeDecimal128(buffer, key, value, index, true);
      } else if (value['_bsontype'] === 'Long' || value['_bsontype'] === 'Timestamp') {
        index = serializeLong(buffer, key, value, index, true);
      } else if (value['_bsontype'] === 'Double') {
        index = serializeDouble(buffer, key, value, index, true);
      } else if (typeof value === 'function' && serializeFunctions) {
        index = serializeFunction(
          buffer,
          key,
          value,
          index,
          checkKeys,
          depth,
          serializeFunctions,
          true
        );
      } else if (value['_bsontype'] === 'Code') {
        index = serializeCode(
          buffer,
          key,
          value,
          index,
          checkKeys,
          depth,
          serializeFunctions,
          ignoreUndefined,
          true
        );
      } else if (value['_bsontype'] === 'Binary') {
        index = serializeBinary(buffer, key, value, index, true);
      } else if (value['_bsontype'] === 'Symbol') {
        index = serializeSymbol(buffer, key, value, index, true);
      } else if (value['_bsontype'] === 'DBRef') {
        index = serializeDBRef(buffer, key, value, index, depth, serializeFunctions, true);
      } else if (value['_bsontype'] === 'BSONRegExp') {
        index = serializeBSONRegExp(buffer, key, value, index, true);
      } else if (value['_bsontype'] === 'Int32') {
        index = serializeInt32(buffer, key, value, index, true);
      } else if (value['_bsontype'] === 'MinKey' || value['_bsontype'] === 'MaxKey') {
        index = serializeMinMax(buffer, key, value, index, true);
      }
    }
  } else if (object instanceof Map) {
    var iterator = object.entries();
    var done = false;

    while (!done) {
      // Unpack the next entry
      var entry = iterator.next();
      done = entry.done;
      // Are we done, then skip and terminate
      if (done) continue;

      // Get the entry values
      key = entry.value[0];
      value = entry.value[1];

      // Check the type of the value
      type = typeof value;

      // Check the key and throw error if it's illegal
      if (key !== '$db' && key !== '$ref' && key !== '$id') {
        if (key.match(regexp) != null) {
          // The BSON spec doesn't allow keys with null bytes because keys are
          // null-terminated.
          throw Error('key ' + key + ' must not contain null bytes');
        }

        if (checkKeys) {
          if ('$' === key[0]) {
            throw Error('key ' + key + " must not start with '$'");
          } else if (~key.indexOf('.')) {
            throw Error('key ' + key + " must not contain '.'");
          }
        }
      }

      if (type === 'string') {
        index = serializeString(buffer, key, value, index);
      } else if (type === 'number') {
        index = serializeNumber(buffer, key, value, index);
      } else if (type === 'boolean') {
        index = serializeBoolean(buffer, key, value, index);
      } else if (value instanceof Date || isDate(value)) {
        index = serializeDate(buffer, key, value, index);
      } else if (value === null || (value === undefined && ignoreUndefined === false)) {
        index = serializeNull(buffer, key, value, index);
      } else if (value['_bsontype'] === 'ObjectID') {
        index = serializeObjectId(buffer, key, value, index);
      } else if (Buffer.isBuffer(value)) {
        index = serializeBuffer(buffer, key, value, index);
      } else if (value instanceof RegExp || isRegExp(value)) {
        index = serializeRegExp(buffer, key, value, index);
      } else if (type === 'object' && value['_bsontype'] == null) {
        index = serializeObject(
          buffer,
          key,
          value,
          index,
          checkKeys,
          depth,
          serializeFunctions,
          ignoreUndefined,
          false,
          path
        );
      } else if (type === 'object' && value['_bsontype'] === 'Decimal128') {
        index = serializeDecimal128(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Long' || value['_bsontype'] === 'Timestamp') {
        index = serializeLong(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Double') {
        index = serializeDouble(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Code') {
        index = serializeCode(
          buffer,
          key,
          value,
          index,
          checkKeys,
          depth,
          serializeFunctions,
          ignoreUndefined
        );
      } else if (typeof value === 'function' && serializeFunctions) {
        index = serializeFunction(buffer, key, value, index, checkKeys, depth, serializeFunctions);
      } else if (value['_bsontype'] === 'Binary') {
        index = serializeBinary(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Symbol') {
        index = serializeSymbol(buffer, key, value, index);
      } else if (value['_bsontype'] === 'DBRef') {
        index = serializeDBRef(buffer, key, value, index, depth, serializeFunctions);
      } else if (value['_bsontype'] === 'BSONRegExp') {
        index = serializeBSONRegExp(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Int32') {
        index = serializeInt32(buffer, key, value, index);
      } else if (value['_bsontype'] === 'MinKey' || value['_bsontype'] === 'MaxKey') {
        index = serializeMinMax(buffer, key, value, index);
      }
    }
  } else {
    // Did we provide a custom serialization method
    if (object.toBSON) {
      if (typeof object.toBSON !== 'function') throw new Error('toBSON is not a function');
      object = object.toBSON();
      if (object != null && typeof object !== 'object')
        throw new Error('toBSON function did not return an object');
    }

    // Iterate over all the keys
    for (key in object) {
      value = object[key];
      // Is there an override value
      if (value && value.toBSON) {
        if (typeof value.toBSON !== 'function') throw new Error('toBSON is not a function');
        value = value.toBSON();
      }

      // Check the type of the value
      type = typeof value;

      // Check the key and throw error if it's illegal
      if (key !== '$db' && key !== '$ref' && key !== '$id') {
        if (key.match(regexp) != null) {
          // The BSON spec doesn't allow keys with null bytes because keys are
          // null-terminated.
          throw Error('key ' + key + ' must not contain null bytes');
        }

        if (checkKeys) {
          if ('$' === key[0]) {
            throw Error('key ' + key + " must not start with '$'");
          } else if (~key.indexOf('.')) {
            throw Error('key ' + key + " must not contain '.'");
          }
        }
      }

      if (type === 'string') {
        index = serializeString(buffer, key, value, index);
      } else if (type === 'number') {
        index = serializeNumber(buffer, key, value, index);
      } else if (type === 'boolean') {
        index = serializeBoolean(buffer, key, value, index);
      } else if (value instanceof Date || isDate(value)) {
        index = serializeDate(buffer, key, value, index);
      } else if (value === undefined) {
        if (ignoreUndefined === false) index = serializeNull(buffer, key, value, index);
      } else if (value === null) {
        index = serializeNull(buffer, key, value, index);
      } else if (value['_bsontype'] === 'ObjectID') {
        index = serializeObjectId(buffer, key, value, index);
      } else if (Buffer.isBuffer(value)) {
        index = serializeBuffer(buffer, key, value, index);
      } else if (value instanceof RegExp || isRegExp(value)) {
        index = serializeRegExp(buffer, key, value, index);
      } else if (type === 'object' && value['_bsontype'] == null) {
        index = serializeObject(
          buffer,
          key,
          value,
          index,
          checkKeys,
          depth,
          serializeFunctions,
          ignoreUndefined,
          false,
          path
        );
      } else if (type === 'object' && value['_bsontype'] === 'Decimal128') {
        index = serializeDecimal128(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Long' || value['_bsontype'] === 'Timestamp') {
        index = serializeLong(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Double') {
        index = serializeDouble(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Code') {
        index = serializeCode(
          buffer,
          key,
          value,
          index,
          checkKeys,
          depth,
          serializeFunctions,
          ignoreUndefined
        );
      } else if (typeof value === 'function' && serializeFunctions) {
        index = serializeFunction(buffer, key, value, index, checkKeys, depth, serializeFunctions);
      } else if (value['_bsontype'] === 'Binary') {
        index = serializeBinary(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Symbol') {
        index = serializeSymbol(buffer, key, value, index);
      } else if (value['_bsontype'] === 'DBRef') {
        index = serializeDBRef(buffer, key, value, index, depth, serializeFunctions);
      } else if (value['_bsontype'] === 'BSONRegExp') {
        index = serializeBSONRegExp(buffer, key, value, index);
      } else if (value['_bsontype'] === 'Int32') {
        index = serializeInt32(buffer, key, value, index);
      } else if (value['_bsontype'] === 'MinKey' || value['_bsontype'] === 'MaxKey') {
        index = serializeMinMax(buffer, key, value, index);
      }
    }
  }

  // Remove the path
  path.pop();

  // Final padding byte for object
  buffer[index++] = 0x00;

  // Final size
  var size = index - startingIndex;
  // Write the size of the object
  buffer[startingIndex++] = size & 0xff;
  buffer[startingIndex++] = (size >> 8) & 0xff;
  buffer[startingIndex++] = (size >> 16) & 0xff;
  buffer[startingIndex++] = (size >> 24) & 0xff;
  return index;
};

var BSON = {};

/**
 * Contains the function cache if we have that enable to allow for avoiding the eval step on each deserialization, comparison is by md5
 *
 * @ignore
 * @api private
 */
// var functionCache = (BSON.functionCache = {});

/**
 * Number BSON Type
 *
 * @classconstant BSON_DATA_NUMBER
 **/
BSON.BSON_DATA_NUMBER = 1;
/**
 * String BSON Type
 *
 * @classconstant BSON_DATA_STRING
 **/
BSON.BSON_DATA_STRING = 2;
/**
 * Object BSON Type
 *
 * @classconstant BSON_DATA_OBJECT
 **/
BSON.BSON_DATA_OBJECT = 3;
/**
 * Array BSON Type
 *
 * @classconstant BSON_DATA_ARRAY
 **/
BSON.BSON_DATA_ARRAY = 4;
/**
 * Binary BSON Type
 *
 * @classconstant BSON_DATA_BINARY
 **/
BSON.BSON_DATA_BINARY = 5;
/**
 * ObjectID BSON Type, deprecated
 *
 * @classconstant BSON_DATA_UNDEFINED
 **/
BSON.BSON_DATA_UNDEFINED = 6;
/**
 * ObjectID BSON Type
 *
 * @classconstant BSON_DATA_OID
 **/
BSON.BSON_DATA_OID = 7;
/**
 * Boolean BSON Type
 *
 * @classconstant BSON_DATA_BOOLEAN
 **/
BSON.BSON_DATA_BOOLEAN = 8;
/**
 * Date BSON Type
 *
 * @classconstant BSON_DATA_DATE
 **/
BSON.BSON_DATA_DATE = 9;
/**
 * null BSON Type
 *
 * @classconstant BSON_DATA_NULL
 **/
BSON.BSON_DATA_NULL = 10;
/**
 * RegExp BSON Type
 *
 * @classconstant BSON_DATA_REGEXP
 **/
BSON.BSON_DATA_REGEXP = 11;
/**
 * Code BSON Type
 *
 * @classconstant BSON_DATA_CODE
 **/
BSON.BSON_DATA_CODE = 13;
/**
 * Symbol BSON Type
 *
 * @classconstant BSON_DATA_SYMBOL
 **/
BSON.BSON_DATA_SYMBOL = 14;
/**
 * Code with Scope BSON Type
 *
 * @classconstant BSON_DATA_CODE_W_SCOPE
 **/
BSON.BSON_DATA_CODE_W_SCOPE = 15;
/**
 * 32 bit Integer BSON Type
 *
 * @classconstant BSON_DATA_INT
 **/
BSON.BSON_DATA_INT = 16;
/**
 * Timestamp BSON Type
 *
 * @classconstant BSON_DATA_TIMESTAMP
 **/
BSON.BSON_DATA_TIMESTAMP = 17;
/**
 * Long BSON Type
 *
 * @classconstant BSON_DATA_LONG
 **/
BSON.BSON_DATA_LONG = 18;
/**
 * Long BSON Type
 *
 * @classconstant BSON_DATA_DECIMAL128
 **/
BSON.BSON_DATA_DECIMAL128 = 19;
/**
 * MinKey BSON Type
 *
 * @classconstant BSON_DATA_MIN_KEY
 **/
BSON.BSON_DATA_MIN_KEY = 0xff;
/**
 * MaxKey BSON Type
 *
 * @classconstant BSON_DATA_MAX_KEY
 **/
BSON.BSON_DATA_MAX_KEY = 0x7f;
/**
 * Binary Default Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_DEFAULT
 **/
BSON.BSON_BINARY_SUBTYPE_DEFAULT = 0;
/**
 * Binary Function Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_FUNCTION
 **/
BSON.BSON_BINARY_SUBTYPE_FUNCTION = 1;
/**
 * Binary Byte Array Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_BYTE_ARRAY
 **/
BSON.BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
/**
 * Binary UUID Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_UUID
 **/
BSON.BSON_BINARY_SUBTYPE_UUID = 3;
/**
 * Binary MD5 Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_MD5
 **/
BSON.BSON_BINARY_SUBTYPE_MD5 = 4;
/**
 * Binary User Defined Type
 *
 * @classconstant BSON_BINARY_SUBTYPE_USER_DEFINED
 **/
BSON.BSON_BINARY_SUBTYPE_USER_DEFINED = 128;

// BSON MAX VALUES
BSON.BSON_INT32_MAX = 0x7fffffff;
BSON.BSON_INT32_MIN = -0x80000000;

BSON.BSON_INT64_MAX = Math.pow(2, 63) - 1;
BSON.BSON_INT64_MIN = -Math.pow(2, 63);

// JS MAX PRECISE VALUES
BSON.JS_INT_MAX = 0x20000000000000; // Any integer up to 2^53 can be precisely represented by a double.
BSON.JS_INT_MIN = -0x20000000000000; // Any integer down to -2^53 can be precisely represented by a double.

// Internal long versions
// var JS_INT_MAX_LONG = Long.fromNumber(0x20000000000000); // Any integer up to 2^53 can be precisely represented by a double.
// var JS_INT_MIN_LONG = Long.fromNumber(-0x20000000000000); // Any integer down to -2^53 can be precisely represented by a double.

module.exports = serializeInto;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0).Buffer))

/***/ }),
/* 76 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// Copyright (c) 2008, Fair Oaks Labs, Inc.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//  * Redistributions of source code must retain the above copyright notice,
//    this list of conditions and the following disclaimer.
//
//  * Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution.
//
//  * Neither the name of Fair Oaks Labs, Inc. nor the names of its contributors
//    may be used to endorse or promote products derived from this software
//    without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.
//
//
// Modifications to writeIEEE754 to support negative zeroes made by Brian White

var readIEEE754 = function(buffer, offset, endian, mLen, nBytes) {
  var e,
    m,
    bBE = endian === 'big',
    eLen = nBytes * 8 - mLen - 1,
    eMax = (1 << eLen) - 1,
    eBias = eMax >> 1,
    nBits = -7,
    i = bBE ? 0 : nBytes - 1,
    d = bBE ? 1 : -1,
    s = buffer[offset + i];

  i += d;

  e = s & ((1 << -nBits) - 1);
  s >>= -nBits;
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << -nBits) - 1);
  e >>= -nBits;
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : (s ? -1 : 1) * Infinity;
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

var writeIEEE754 = function(buffer, value, offset, endian, mLen, nBytes) {
  var e,
    m,
    c,
    bBE = endian === 'big',
    eLen = nBytes * 8 - mLen - 1,
    eMax = (1 << eLen) - 1,
    eBias = eMax >> 1,
    rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0,
    i = bBE ? nBytes - 1 : 0,
    d = bBE ? -1 : 1,
    s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  if (isNaN(value)) m = 0;

  while (mLen >= 8) {
    buffer[offset + i] = m & 0xff;
    i += d;
    m /= 256;
    mLen -= 8;
  }

  e = (e << mLen) | m;

  if (isNaN(value)) e += 8;

  eLen += mLen;

  while (eLen > 0) {
    buffer[offset + i] = e & 0xff;
    i += d;
    e /= 256;
    eLen -= 8;
  }

  buffer[offset + i - d] |= s * 128;
};

exports.readIEEE754 = readIEEE754;
exports.writeIEEE754 = writeIEEE754;


/***/ }),
/* 77 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {

var Long = __webpack_require__(2).Long,
  Double = __webpack_require__(12).Double,
  Timestamp = __webpack_require__(13).Timestamp,
  ObjectID = __webpack_require__(14).ObjectID,
  Symbol = __webpack_require__(26).Symbol,
  BSONRegExp = __webpack_require__(15).BSONRegExp,
  Code = __webpack_require__(16).Code,
  Decimal128 = __webpack_require__(17),
  MinKey = __webpack_require__(8).MinKey,
  MaxKey = __webpack_require__(18).MaxKey,
  DBRef = __webpack_require__(19).DBRef,
  Binary = __webpack_require__(9).Binary;

// To ensure that 0.4 of node works correctly
var isDate = function isDate(d) {
  return typeof d === 'object' && Object.prototype.toString.call(d) === '[object Date]';
};

var calculateObjectSize = function calculateObjectSize(
  object,
  serializeFunctions,
  ignoreUndefined
) {
  var totalLength = 4 + 1;

  if (Array.isArray(object)) {
    for (var i = 0; i < object.length; i++) {
      totalLength += calculateElement(
        i.toString(),
        object[i],
        serializeFunctions,
        true,
        ignoreUndefined
      );
    }
  } else {
    // If we have toBSON defined, override the current object

    if (object.toBSON) {
      object = object.toBSON();
    }

    // Calculate size
    for (var key in object) {
      totalLength += calculateElement(key, object[key], serializeFunctions, false, ignoreUndefined);
    }
  }

  return totalLength;
};

/**
 * @ignore
 * @api private
 */
function calculateElement(name, value, serializeFunctions, isArray, ignoreUndefined) {
  // If we have toBSON defined, override the current object
  if (value && value.toBSON) {
    value = value.toBSON();
  }

  switch (typeof value) {
    case 'string':
      return 1 + Buffer.byteLength(name, 'utf8') + 1 + 4 + Buffer.byteLength(value, 'utf8') + 1;
    case 'number':
      if (Math.floor(value) === value && value >= BSON.JS_INT_MIN && value <= BSON.JS_INT_MAX) {
        if (value >= BSON.BSON_INT32_MIN && value <= BSON.BSON_INT32_MAX) {
          // 32 bit
          return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (4 + 1);
        } else {
          return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (8 + 1);
        }
      } else {
        // 64 bit
        return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (8 + 1);
      }
    case 'undefined':
      if (isArray || !ignoreUndefined)
        return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + 1;
      return 0;
    case 'boolean':
      return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (1 + 1);
    case 'object':
      if (
        value == null ||
        value instanceof MinKey ||
        value instanceof MaxKey ||
        value['_bsontype'] === 'MinKey' ||
        value['_bsontype'] === 'MaxKey'
      ) {
        return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + 1;
      } else if (value instanceof ObjectID || value['_bsontype'] === 'ObjectID') {
        return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (12 + 1);
      } else if (value instanceof Date || isDate(value)) {
        return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (8 + 1);
      } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
        return (
          (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (1 + 4 + 1) + value.length
        );
      } else if (
        value instanceof Long ||
        value instanceof Double ||
        value instanceof Timestamp ||
        value['_bsontype'] === 'Long' ||
        value['_bsontype'] === 'Double' ||
        value['_bsontype'] === 'Timestamp'
      ) {
        return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (8 + 1);
      } else if (value instanceof Decimal128 || value['_bsontype'] === 'Decimal128') {
        return (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (16 + 1);
      } else if (value instanceof Code || value['_bsontype'] === 'Code') {
        // Calculate size depending on the availability of a scope
        if (value.scope != null && Object.keys(value.scope).length > 0) {
          return (
            (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
            1 +
            4 +
            4 +
            Buffer.byteLength(value.code.toString(), 'utf8') +
            1 +
            calculateObjectSize(value.scope, serializeFunctions, ignoreUndefined)
          );
        } else {
          return (
            (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
            1 +
            4 +
            Buffer.byteLength(value.code.toString(), 'utf8') +
            1
          );
        }
      } else if (value instanceof Binary || value['_bsontype'] === 'Binary') {
        // Check what kind of subtype we have
        if (value.sub_type === Binary.SUBTYPE_BYTE_ARRAY) {
          return (
            (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
            (value.position + 1 + 4 + 1 + 4)
          );
        } else {
          return (
            (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) + (value.position + 1 + 4 + 1)
          );
        }
      } else if (value instanceof Symbol || value['_bsontype'] === 'Symbol') {
        return (
          (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
          Buffer.byteLength(value.value, 'utf8') +
          4 +
          1 +
          1
        );
      } else if (value instanceof DBRef || value['_bsontype'] === 'DBRef') {
        // Set up correct object for serialization
        var ordered_values = {
          $ref: value.collection,
          $id: value.oid
        };

        // Add db reference if it exists
        if (value.db != null) {
          ordered_values['$db'] = value.db;
        }

        ordered_values = Object.assign(ordered_values, value.fields);

        return (
          (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
          1 +
          calculateObjectSize(ordered_values, serializeFunctions, ignoreUndefined)
        );
      } else if (
        value instanceof RegExp ||
        Object.prototype.toString.call(value) === '[object RegExp]'
      ) {
        return (
          (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
          1 +
          Buffer.byteLength(value.source, 'utf8') +
          1 +
          (value.global ? 1 : 0) +
          (value.ignoreCase ? 1 : 0) +
          (value.multiline ? 1 : 0) +
          1
        );
      } else if (value instanceof BSONRegExp || value['_bsontype'] === 'BSONRegExp') {
        return (
          (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
          1 +
          Buffer.byteLength(value.pattern, 'utf8') +
          1 +
          Buffer.byteLength(value.options, 'utf8') +
          1
        );
      } else {
        return (
          (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
          calculateObjectSize(value, serializeFunctions, ignoreUndefined) +
          1
        );
      }
    case 'function':
      // WTF for 0.4.X where typeof /someregexp/ === 'function'
      if (
        value instanceof RegExp ||
        Object.prototype.toString.call(value) === '[object RegExp]' ||
        String.call(value) === '[object RegExp]'
      ) {
        return (
          (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
          1 +
          Buffer.byteLength(value.source, 'utf8') +
          1 +
          (value.global ? 1 : 0) +
          (value.ignoreCase ? 1 : 0) +
          (value.multiline ? 1 : 0) +
          1
        );
      } else {
        if (serializeFunctions && value.scope != null && Object.keys(value.scope).length > 0) {
          return (
            (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
            1 +
            4 +
            4 +
            Buffer.byteLength(value.toString(), 'utf8') +
            1 +
            calculateObjectSize(value.scope, serializeFunctions, ignoreUndefined)
          );
        } else if (serializeFunctions) {
          return (
            (name != null ? Buffer.byteLength(name, 'utf8') + 1 : 0) +
            1 +
            4 +
            Buffer.byteLength(value.toString(), 'utf8') +
            1
          );
        }
      }
  }

  return 0;
}

var BSON = {};

// BSON MAX VALUES
BSON.BSON_INT32_MAX = 0x7fffffff;
BSON.BSON_INT32_MIN = -0x80000000;

// JS MAX PRECISE VALUES
BSON.JS_INT_MAX = 0x20000000000000; // Any integer up to 2^53 can be precisely represented by a double.
BSON.JS_INT_MIN = -0x20000000000000; // Any integer down to -2^53 can be precisely represented by a double.

module.exports = calculateObjectSize;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(0).Buffer))

/***/ }),
/* 78 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var strictUriEncode = __webpack_require__(79);
var objectAssign = __webpack_require__(80);

function encoderForArrayFormat(opts) {
	switch (opts.arrayFormat) {
		case 'index':
			return function (key, value, index) {
				return value === null ? [
					encode(key, opts),
					'[',
					index,
					']'
				].join('') : [
					encode(key, opts),
					'[',
					encode(index, opts),
					']=',
					encode(value, opts)
				].join('');
			};

		case 'bracket':
			return function (key, value) {
				return value === null ? encode(key, opts) : [
					encode(key, opts),
					'[]=',
					encode(value, opts)
				].join('');
			};

		default:
			return function (key, value) {
				return value === null ? encode(key, opts) : [
					encode(key, opts),
					'=',
					encode(value, opts)
				].join('');
			};
	}
}

function parserForArrayFormat(opts) {
	var result;

	switch (opts.arrayFormat) {
		case 'index':
			return function (key, value, accumulator) {
				result = /\[(\d*)\]$/.exec(key);

				key = key.replace(/\[\d*\]$/, '');

				if (!result) {
					accumulator[key] = value;
					return;
				}

				if (accumulator[key] === undefined) {
					accumulator[key] = {};
				}

				accumulator[key][result[1]] = value;
			};

		case 'bracket':
			return function (key, value, accumulator) {
				result = /(\[\])$/.exec(key);
				key = key.replace(/\[\]$/, '');

				if (!result) {
					accumulator[key] = value;
					return;
				} else if (accumulator[key] === undefined) {
					accumulator[key] = [value];
					return;
				}

				accumulator[key] = [].concat(accumulator[key], value);
			};

		default:
			return function (key, value, accumulator) {
				if (accumulator[key] === undefined) {
					accumulator[key] = value;
					return;
				}

				accumulator[key] = [].concat(accumulator[key], value);
			};
	}
}

function encode(value, opts) {
	if (opts.encode) {
		return opts.strict ? strictUriEncode(value) : encodeURIComponent(value);
	}

	return value;
}

function keysSorter(input) {
	if (Array.isArray(input)) {
		return input.sort();
	} else if (typeof input === 'object') {
		return keysSorter(Object.keys(input)).sort(function (a, b) {
			return Number(a) - Number(b);
		}).map(function (key) {
			return input[key];
		});
	}

	return input;
}

exports.extract = function (str) {
	return str.split('?')[1] || '';
};

exports.parse = function (str, opts) {
	opts = objectAssign({arrayFormat: 'none'}, opts);

	var formatter = parserForArrayFormat(opts);

	// Create an object with no prototype
	// https://github.com/sindresorhus/query-string/issues/47
	var ret = Object.create(null);

	if (typeof str !== 'string') {
		return ret;
	}

	str = str.trim().replace(/^(\?|#|&)/, '');

	if (!str) {
		return ret;
	}

	str.split('&').forEach(function (param) {
		var parts = param.replace(/\+/g, ' ').split('=');
		// Firefox (pre 40) decodes `%3D` to `=`
		// https://github.com/sindresorhus/query-string/pull/37
		var key = parts.shift();
		var val = parts.length > 0 ? parts.join('=') : undefined;

		// missing `=` should be `null`:
		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
		val = val === undefined ? null : decodeURIComponent(val);

		formatter(decodeURIComponent(key), val, ret);
	});

	return Object.keys(ret).sort().reduce(function (result, key) {
		var val = ret[key];
		if (Boolean(val) && typeof val === 'object' && !Array.isArray(val)) {
			// Sort object keys, not values
			result[key] = keysSorter(val);
		} else {
			result[key] = val;
		}

		return result;
	}, Object.create(null));
};

exports.stringify = function (obj, opts) {
	var defaults = {
		encode: true,
		strict: true,
		arrayFormat: 'none'
	};

	opts = objectAssign(defaults, opts);

	var formatter = encoderForArrayFormat(opts);

	return obj ? Object.keys(obj).sort().map(function (key) {
		var val = obj[key];

		if (val === undefined) {
			return '';
		}

		if (val === null) {
			return encode(key, opts);
		}

		if (Array.isArray(val)) {
			var result = [];

			val.slice().forEach(function (val2) {
				if (val2 === undefined) {
					return;
				}

				result.push(formatter(key, val2, result.length));
			});

			return result.join('&');
		}

		return encode(key, opts) + '=' + encode(val, opts);
	}).filter(function (x) {
		return x.length > 0;
	}).join('&') : '';
};


/***/ }),
/* 79 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

module.exports = function (str) {
	return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
		return '%' + c.charCodeAt(0).toString(16).toUpperCase();
	});
};


/***/ }),
/* 80 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*
object-assign
(c) Sindre Sorhus
@license MIT
*/


/* eslint-disable no-unused-vars */
var getOwnPropertySymbols = Object.getOwnPropertySymbols;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

function shouldUseNative() {
	try {
		if (!Object.assign) {
			return false;
		}

		// Detect buggy property enumeration order in older V8 versions.

		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
		var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
		test1[5] = 'de';
		if (Object.getOwnPropertyNames(test1)[0] === '5') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test2 = {};
		for (var i = 0; i < 10; i++) {
			test2['_' + String.fromCharCode(i)] = i;
		}
		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
			return test2[n];
		});
		if (order2.join('') !== '0123456789') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test3 = {};
		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
			test3[letter] = letter;
		});
		if (Object.keys(Object.assign({}, test3)).join('') !==
				'abcdefghijklmnopqrst') {
			return false;
		}

		return true;
	} catch (err) {
		// We don't expect any of the above to throw, but better to be safe.
		return false;
	}
}

module.exports = shouldUseNative() ? Object.assign : function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (getOwnPropertySymbols) {
			symbols = getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};


/***/ }),
/* 81 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StitchAdminClient = exports.StitchAdminClientFactory = undefined;

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /* global window, fetch */
/* eslint no-labels: ['error', { 'allowLoop': true }] */


__webpack_require__(22);

var _client = __webpack_require__(21);

var _common = __webpack_require__(7);

var _common2 = _interopRequireDefault(_common);

var _common3 = __webpack_require__(3);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var v2 = 2;
var v3 = 3;

var StitchAdminClientFactory = exports.StitchAdminClientFactory = function () {
  function StitchAdminClientFactory() {
    _classCallCheck(this, StitchAdminClientFactory);

    throw new StitchError('StitchAdminClient can only be made from the StitchAdminClientFactory.create function');
  }

  _createClass(StitchAdminClientFactory, null, [{
    key: 'create',
    value: function create(baseUrl) {
      return (0, _client.newStitchClient)(StitchAdminClient.prototype, '', { baseUrl: baseUrl, authCodec: _common3.ADMIN_CLIENT_CODEC });
    }
  }]);

  return StitchAdminClientFactory;
}();

var StitchAdminClient = exports.StitchAdminClient = function (_StitchClient) {
  _inherits(StitchAdminClient, _StitchClient);

  function StitchAdminClient() {
    _classCallCheck(this, StitchAdminClient);

    var _this = _possibleConstructorReturn(this, (StitchAdminClient.__proto__ || Object.getPrototypeOf(StitchAdminClient)).call(this));

    throw new StitchError('StitchAdminClient can only be made from the StitchAdminClientFactory.create function');
    return _this;
  }

  _createClass(StitchAdminClient, [{
    key: 'logout',


    /**
     * Ends the session for the current user.
     *
     * @returns {Promise}
     */
    value: function logout() {
      var _this2 = this;

      return _get(StitchAdminClient.prototype.__proto__ || Object.getPrototypeOf(StitchAdminClient.prototype), '_do', this).call(this, '/auth/session', 'DELETE', { refreshOnFailure: false, useRefreshToken: true, apiVersion: v3 }).then(function () {
        return _this2.auth.clear();
      });
    }

    /**
     * Returns profile information for the currently logged in user
     *
     * @returns {Promise}
     */

  }, {
    key: 'userProfile',
    value: function userProfile() {
      return this._v3._get('/auth/profile');
    }

    /**
     * Returns available providers for the currently logged in admin
     *
     * @returns {Promise}
     */

  }, {
    key: 'getAuthProviders',
    value: function getAuthProviders() {
      return _get(StitchAdminClient.prototype.__proto__ || Object.getPrototypeOf(StitchAdminClient.prototype), '_do', this).call(this, '/auth/providers', 'GET', { noAuth: true, apiVersion: v3 }).then(function (response) {
        return response.json();
      });
    }

    /**
     * Returns an access token for the user
     *
     * @returns {Promise}
     */

  }, {
    key: 'doSessionPost',
    value: function doSessionPost() {
      return _get(StitchAdminClient.prototype.__proto__ || Object.getPrototypeOf(StitchAdminClient.prototype), '_do', this).call(this, '/auth/session', 'POST', { refreshOnFailure: false, useRefreshToken: true, apiVersion: v3 }).then(function (response) {
        return response.json();
      });
    }

    /* Examples of how to access admin API with this client:
     *
     * List all apps
     *    a.apps('580e6d055b199c221fcb821c').list()
     *
     * Fetch app under name 'planner'
     *    a.apps('580e6d055b199c221fcb821c').app('planner').get()
     *
     * List services under the app 'planner'
     *    a.apps('580e6d055b199c221fcb821c').app('planner').services().list()
     *
     * Delete a rule by ID
     *    a.apps('580e6d055b199c221fcb821c').app('planner').services().service('mdb1').rules().rule('580e6d055b199c221fcb821d').remove()
     *
     */

  }, {
    key: 'apps',
    value: function apps(groupId) {
      var api = this._v3;
      var groupUrl = '/groups/' + groupId + '/apps';
      return {
        list: function list() {
          return api._get(groupUrl);
        },
        create: function create(data, options) {
          var query = options && options.defaults ? '?defaults=true' : '';
          return api._post(groupUrl + query, data);
        },

        app: function app(appId) {
          var appUrl = groupUrl + '/' + appId;
          return {
            get: function get() {
              return api._get(appUrl);
            },
            remove: function remove() {
              return api._delete(appUrl);
            },

            values: function values() {
              return {
                list: function list() {
                  return api._get(appUrl + '/values');
                },
                create: function create(data) {
                  return api._post(appUrl + '/values', data);
                },
                value: function value(valueId) {
                  var valueUrl = appUrl + '/values/' + valueId;
                  return {
                    get: function get() {
                      return api._get(valueUrl);
                    },
                    remove: function remove() {
                      return api._delete(valueUrl);
                    },
                    update: function update(data) {
                      return api._put(valueUrl, data);
                    }
                  };
                }
              };
            },

            services: function services() {
              return {
                list: function list() {
                  return api._get(appUrl + '/services');
                },
                create: function create(data) {
                  return api._post(appUrl + '/services', data);
                },
                service: function service(serviceId) {
                  return {
                    get: function get() {
                      return api._get(appUrl + '/services/' + serviceId);
                    },
                    remove: function remove() {
                      return api._delete(appUrl + '/services/' + serviceId);
                    },
                    runCommand: function runCommand(commandName, data) {
                      return api._post(appUrl + '/services/' + serviceId + '/commands/' + commandName, data);
                    },
                    config: function config() {
                      return {
                        get: function get() {
                          return api._get(appUrl + '/services/' + serviceId + '/config');
                        },
                        update: function update(data) {
                          return api._patch(appUrl + '/services/' + serviceId + '/config', data);
                        }
                      };
                    },

                    rules: function rules() {
                      return {
                        list: function list() {
                          return api._get(appUrl + '/services/' + serviceId + '/rules');
                        },
                        create: function create(data) {
                          return api._post(appUrl + '/services/' + serviceId + '/rules', data);
                        },
                        rule: function rule(ruleId) {
                          var ruleUrl = appUrl + '/services/' + serviceId + '/rules/' + ruleId;
                          return {
                            get: function get() {
                              return api._get(ruleUrl);
                            },
                            update: function update(data) {
                              return api._put(ruleUrl, data);
                            },
                            remove: function remove() {
                              return api._delete(ruleUrl);
                            }
                          };
                        }
                      };
                    },

                    incomingWebhooks: function incomingWebhooks() {
                      return {
                        list: function list() {
                          return api._get(appUrl + '/services/' + serviceId + '/incoming_webhooks');
                        },
                        create: function create(data) {
                          return api._post(appUrl + '/services/' + serviceId + '/incoming_webhooks', data);
                        },
                        incomingWebhook: function incomingWebhook(incomingWebhookId) {
                          var webhookUrl = appUrl + '/services/' + serviceId + '/incoming_webhooks/' + incomingWebhookId;
                          return {
                            get: function get() {
                              return api._get(webhookUrl);
                            },
                            update: function update(data) {
                              return api._put(webhookUrl, data);
                            },
                            remove: function remove() {
                              return api._delete(webhookUrl);
                            }
                          };
                        }
                      };
                    }
                  };
                }
              };
            },

            pushNotifications: function pushNotifications() {
              return {
                list: function list(filter) {
                  return api._get(appUrl + '/push/notifications', filter);
                },
                create: function create(data) {
                  return api._post(appUrl + '/push/notifications', data);
                },
                pushNotification: function pushNotification(messageId) {
                  return {
                    get: function get() {
                      return api._get(appUrl + '/push/notifications/' + messageId);
                    },
                    update: function update(data) {
                      return api._put(appUrl + '/push/notifications/' + messageId, data);
                    },
                    remove: function remove() {
                      return api._delete(appUrl + '/push/notifications/' + messageId);
                    },
                    send: function send() {
                      return api._post(appUrl + '/push/notifications/' + messageId + '/send');
                    }
                  };
                }
              };
            },

            users: function users() {
              return {
                list: function list(filter) {
                  return api._get(appUrl + '/users', filter);
                },
                create: function create(user) {
                  return api._post(appUrl + '/users', user);
                },
                user: function user(uid) {
                  return {
                    get: function get() {
                      return api._get(appUrl + '/users/' + uid);
                    },
                    devices: function devices() {
                      return {
                        get: function get() {
                          return api._get(appUrl + '/users/' + uid + '/devices');
                        }
                      };
                    },
                    logout: function logout() {
                      return api._put(appUrl + '/users/' + uid + '/logout');
                    },
                    enable: function enable() {
                      return api._put(appUrl + '/users/' + uid + '/enable');
                    },
                    disable: function disable() {
                      return api._put(appUrl + '/users/' + uid + '/disable');
                    },
                    remove: function remove() {
                      return api._delete(appUrl + '/users/' + uid);
                    }
                  };
                }
              };
            },

            debug: function debug() {
              return {
                executeFunction: function executeFunction(userId) {
                  for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
                    args[_key - 2] = arguments[_key];
                  }

                  var name = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

                  return api._post(appUrl + '/debug/execute_function', { name: name, 'arguments': args }, { user_id: userId });
                },
                executeFunctionSource: function executeFunctionSource(userId) {
                  var source = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
                  var evalSource = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

                  return api._post(appUrl + '/debug/execute_function_source', { source: source, 'eval_source': evalSource }, { user_id: userId });
                }
              };
            },

            authProviders: function authProviders() {
              return {
                list: function list() {
                  return api._get(appUrl + '/auth_providers');
                },
                create: function create(data) {
                  return api._post(appUrl + '/auth_providers', data);
                },
                authProvider: function authProvider(providerId) {
                  return {
                    get: function get() {
                      return api._get(appUrl + '/auth_providers/' + providerId);
                    },
                    update: function update(data) {
                      return api._patch(appUrl + '/auth_providers/' + providerId, data);
                    },
                    enable: function enable() {
                      return api._put(appUrl + '/auth_providers/' + providerId + '/enable');
                    },
                    disable: function disable() {
                      return api._put(appUrl + '/auth_providers/' + providerId + '/disable');
                    },
                    remove: function remove() {
                      return api._delete(appUrl + '/auth_providers/' + providerId);
                    }
                  };
                }
              };
            },

            security: function security() {
              return {
                allowedRequestOrigins: function allowedRequestOrigins() {
                  return {
                    get: function get() {
                      return api._get(appUrl + '/security/allowed_request_origins');
                    },
                    update: function update(data) {
                      return api._post(appUrl + '/security/allowed_request_origins', data);
                    }
                  };
                }
              };
            },

            logs: function logs() {
              return {
                list: function list(filter) {
                  return api._get(appUrl + '/logs', filter);
                }
              };
            },

            apiKeys: function apiKeys() {
              return {
                list: function list() {
                  return api._get(appUrl + '/api_keys');
                },
                create: function create(data) {
                  return api._post(appUrl + '/api_keys', data);
                },
                apiKey: function apiKey(apiKeyId) {
                  return {
                    get: function get() {
                      return api._get(appUrl + '/api_keys/' + apiKeyId);
                    },
                    remove: function remove() {
                      return api._delete(appUrl + '/api_keys/' + apiKeyId);
                    },
                    enable: function enable() {
                      return api._put(appUrl + '/api_keys/' + apiKeyId + '/enable');
                    },
                    disable: function disable() {
                      return api._put(appUrl + '/api_keys/' + apiKeyId + '/disable');
                    }
                  };
                }
              };
            },

            functions: function functions() {
              return {
                list: function list() {
                  return api._get(appUrl + '/functions');
                },
                create: function create(data) {
                  return api._post(appUrl + '/functions', data);
                },
                function: function _function(functionId) {
                  return {
                    get: function get() {
                      return api._get(appUrl + '/functions/' + functionId);
                    },
                    update: function update(data) {
                      return api._put(appUrl + '/functions/' + functionId, data);
                    },
                    remove: function remove() {
                      return api._delete(appUrl + '/functions/' + functionId);
                    }
                  };
                }
              };
            }
          };
        }
      };
    }
  }, {
    key: 'v2',
    value: function v2() {
      var api = this._v2;
      return {

        apps: function apps(groupId) {
          var groupUrl = '/groups/' + groupId + '/apps';
          return {
            list: function list() {
              return api._get(groupUrl);
            },
            create: function create(data, options) {
              var query = options && options.defaults ? '?defaults=true' : '';
              return api._post(groupUrl + query, data);
            },

            app: function app(appId) {
              var appUrl = groupUrl + '/' + appId;
              return {
                get: function get() {
                  return api._get(appUrl);
                },
                remove: function remove() {
                  return api._delete(appUrl);
                },

                pipelines: function pipelines() {
                  return {
                    list: function list() {
                      return api._get(appUrl + '/pipelines');
                    },
                    create: function create(data) {
                      return api._post(appUrl + '/pipelines', data);
                    },
                    pipeline: function pipeline(pipelineId) {
                      var pipelineUrl = appUrl + '/pipelines/' + pipelineId;
                      return {
                        get: function get() {
                          return api._get(pipelineUrl);
                        },
                        remove: function remove() {
                          return api._delete(pipelineUrl);
                        },
                        update: function update(data) {
                          return api._put(pipelineUrl, data);
                        }
                      };
                    }
                  };
                },

                values: function values() {
                  return {
                    list: function list() {
                      return api._get(appUrl + '/values');
                    },
                    create: function create(data) {
                      return api._post(appUrl + '/values', data);
                    },
                    value: function value(valueId) {
                      var valueUrl = appUrl + '/values/' + valueId;
                      return {
                        get: function get() {
                          return api._get(valueUrl);
                        },
                        remove: function remove() {
                          return api._delete(valueUrl);
                        },
                        update: function update(data) {
                          return api._put(valueUrl, data);
                        }
                      };
                    }
                  };
                },

                services: function services() {
                  return {
                    list: function list() {
                      return api._get(appUrl + '/services');
                    },
                    create: function create(data) {
                      return api._post(appUrl + '/services', data);
                    },
                    service: function service(serviceId) {
                      return {
                        get: function get() {
                          return api._get(appUrl + '/services/' + serviceId);
                        },
                        remove: function remove() {
                          return api._delete(appUrl + '/services/' + serviceId);
                        },
                        runCommand: function runCommand(commandName, data) {
                          return api._post(appUrl + '/services/' + serviceId + '/commands/' + commandName, data);
                        },
                        config: function config() {
                          return {
                            get: function get() {
                              return api._get(appUrl + '/services/' + serviceId + '/config');
                            },
                            update: function update(data) {
                              return api._patch(appUrl + '/services/' + serviceId + '/config', data);
                            }
                          };
                        },

                        rules: function rules() {
                          return {
                            list: function list() {
                              return api._get(appUrl + '/services/' + serviceId + '/rules');
                            },
                            create: function create(data) {
                              return api._post(appUrl + '/services/' + serviceId + '/rules', data);
                            },
                            rule: function rule(ruleId) {
                              var ruleUrl = appUrl + '/services/' + serviceId + '/rules/' + ruleId;
                              return {
                                get: function get() {
                                  return api._get(ruleUrl);
                                },
                                update: function update(data) {
                                  return api._put(ruleUrl, data);
                                },
                                remove: function remove() {
                                  return api._delete(ruleUrl);
                                }
                              };
                            }
                          };
                        },

                        incomingWebhooks: function incomingWebhooks() {
                          return {
                            list: function list() {
                              return api._get(appUrl + '/services/' + serviceId + '/incoming_webhooks');
                            },
                            create: function create(data) {
                              return api._post(appUrl + '/services/' + serviceId + '/incoming_webhooks', data);
                            },
                            incomingWebhook: function incomingWebhook(incomingWebhookId) {
                              var webhookUrl = appUrl + '/services/' + serviceId + '/incoming_webhooks/' + incomingWebhookId;
                              return {
                                get: function get() {
                                  return api._get(webhookUrl);
                                },
                                update: function update(data) {
                                  return api._put(webhookUrl, data);
                                },
                                remove: function remove() {
                                  return api._delete(webhookUrl);
                                }
                              };
                            }
                          };
                        }

                      };
                    }
                  };
                },

                pushNotifications: function pushNotifications() {
                  return {
                    list: function list(filter) {
                      return api._get(appUrl + '/push/notifications', filter);
                    },
                    create: function create(data) {
                      return api._post(appUrl + '/push/notifications', data);
                    },
                    pushNotification: function pushNotification(messageId) {
                      return {
                        get: function get() {
                          return api._get(appUrl + '/push/notifications/' + messageId);
                        },
                        update: function update(data) {
                          return api._put(appUrl + '/push/notifications/' + messageId, data);
                        },
                        setType: function setType(type) {
                          return api._put(appUrl + '/push/notifications/' + messageId + '/type', { type: type });
                        },
                        remove: function remove() {
                          return api._delete(appUrl + '/push/notifications/' + messageId);
                        }
                      };
                    }
                  };
                },

                users: function users() {
                  return {
                    list: function list(filter) {
                      return api._get(appUrl + '/users', filter);
                    },
                    create: function create(user) {
                      return api._post(appUrl + '/users', user);
                    },
                    user: function user(uid) {
                      return {
                        get: function get() {
                          return api._get(appUrl + '/users/' + uid);
                        },
                        logout: function logout() {
                          return api._put(appUrl + '/users/' + uid + '/logout');
                        },
                        remove: function remove() {
                          return api._delete(appUrl + '/users/' + uid);
                        }
                      };
                    }
                  };
                },

                dev: function dev() {
                  return {
                    executePipeline: function executePipeline(body, userId, options) {
                      return api._post(appUrl + '/dev/pipeline', body, Object.assign({}, options, { user_id: userId }));
                    }
                  };
                },

                authProviders: function authProviders() {
                  return {
                    list: function list() {
                      return api._get(appUrl + '/auth_providers');
                    },
                    create: function create(data) {
                      return api._post(appUrl + '/auth_providers', data);
                    },
                    authProvider: function authProvider(providerId) {
                      return {
                        get: function get() {
                          return api._get(appUrl + '/auth_providers/' + providerId);
                        },
                        update: function update(data) {
                          return api._patch(appUrl + '/auth_providers/' + providerId, data);
                        },
                        enable: function enable() {
                          return api._put(appUrl + '/auth_providers/' + providerId + '/enable');
                        },
                        disable: function disable() {
                          return api._put(appUrl + '/auth_providers/' + providerId + '/disable');
                        },
                        remove: function remove() {
                          return api._delete(appUrl + '/auth_providers/' + providerId);
                        }
                      };
                    }
                  };
                },

                security: function security() {
                  return {
                    allowedRequestOrigins: function allowedRequestOrigins() {
                      return {
                        get: function get() {
                          return api._get(appUrl + '/security/allowed_request_origins');
                        },
                        update: function update(data) {
                          return api._post(appUrl + '/security/allowed_request_origins', data);
                        }
                      };
                    }
                  };
                },

                logs: function logs() {
                  return {
                    list: function list(filter) {
                      return api._get(appUrl + '/logs', filter);
                    }
                  };
                },

                apiKeys: function apiKeys() {
                  return {
                    list: function list() {
                      return api._get(appUrl + '/api_keys');
                    },
                    create: function create(data) {
                      return api._post(appUrl + '/api_keys', data);
                    },
                    apiKey: function apiKey(apiKeyId) {
                      return {
                        get: function get() {
                          return api._get(appUrl + '/api_keys/' + apiKeyId);
                        },
                        remove: function remove() {
                          return api._delete(appUrl + '/api_keys/' + apiKeyId);
                        },
                        enable: function enable() {
                          return api._put(appUrl + '/api_keys/' + apiKeyId + '/enable');
                        },
                        disable: function disable() {
                          return api._put(appUrl + '/api_keys/' + apiKeyId + '/disable');
                        }
                      };
                    }
                  };
                }
              };
            }
          };
        }
      };
    }
  }, {
    key: '_admin',
    value: function _admin() {
      var _this3 = this;

      return {
        logs: function logs() {
          return {
            get: function get(filter) {
              return _get(StitchAdminClient.prototype.__proto__ || Object.getPrototypeOf(StitchAdminClient.prototype), '_do', _this3).call(_this3, '/admin/logs', 'GET', { useRefreshToken: true, queryParams: filter });
            }
          };
        },
        users: function users() {
          return {
            list: function list(filter) {
              return _get(StitchAdminClient.prototype.__proto__ || Object.getPrototypeOf(StitchAdminClient.prototype), '_do', _this3).call(_this3, '/admin/users', 'GET', { useRefreshToken: true, queryParams: filter });
            },
            user: function user(uid) {
              return {
                logout: function logout() {
                  return _get(StitchAdminClient.prototype.__proto__ || Object.getPrototypeOf(StitchAdminClient.prototype), '_do', _this3).call(_this3, '/admin/users/' + uid + '/logout', 'PUT', { useRefreshToken: true });
                }
              };
            }
          };
        }
      };
    }
  }, {
    key: 'type',
    get: function get() {
      return _common2.default;
    }
  }, {
    key: '_v3',
    get: function get() {
      var _this4 = this;

      var v3do = function v3do(url, method, options) {
        return _get(StitchAdminClient.prototype.__proto__ || Object.getPrototypeOf(StitchAdminClient.prototype), '_do', _this4).call(_this4, url, method, Object.assign({}, { apiVersion: v3 }, options)).then(function (response) {
          var contentHeader = response.headers.get('content-type') || '';
          if (contentHeader.split(',').indexOf('application/json') >= 0) {
            return response.json();
          }
          return response;
        });
      };

      return {
        _get: function _get(url, queryParams) {
          return v3do(url, 'GET', { queryParams: queryParams });
        },
        _put: function _put(url, data) {
          return data ? v3do(url, 'PUT', { body: JSON.stringify(data) }) : v3do(url, 'PUT');
        },
        _patch: function _patch(url, data) {
          return data ? v3do(url, 'PATCH', { body: JSON.stringify(data) }) : v3do(url, 'PATCH');
        },
        _delete: function _delete(url) {
          return v3do(url, 'DELETE');
        },
        _post: function _post(url, body, queryParams) {
          return queryParams ? v3do(url, 'POST', { body: JSON.stringify(body), queryParams: queryParams }) : v3do(url, 'POST', { body: JSON.stringify(body) });
        }
      };
    }
  }, {
    key: '_v2',
    get: function get() {
      var _this5 = this;

      var v2do = function v2do(url, method, options) {
        return _get(StitchAdminClient.prototype.__proto__ || Object.getPrototypeOf(StitchAdminClient.prototype), '_do', _this5).call(_this5, url, method, Object.assign({}, { apiVersion: v2 }, options)).then(function (response) {
          var contentHeader = response.headers.get('content-type') || '';
          if (contentHeader.split(',').indexOf('application/json') >= 0) {
            return response.json();
          }
          return response;
        });
      };

      return {
        _get: function _get(url, queryParams) {
          return v2do(url, 'GET', { queryParams: queryParams });
        },
        _put: function _put(url, data) {
          return data ? v2do(url, 'PUT', { body: JSON.stringify(data) }) : v2do(url, 'PUT');
        },
        _patch: function _patch(url, data) {
          return data ? v2do(url, 'PATCH', { body: JSON.stringify(data) }) : v2do(url, 'PATCH');
        },
        _delete: function _delete(url) {
          return v2do(url, 'DELETE');
        },
        _post: function _post(url, body, queryParams) {
          return queryParams ? v2do(url, 'POST', { body: JSON.stringify(body), queryParams: queryParams }) : v2do(url, 'POST', { body: JSON.stringify(body) });
        }
      };
    }
  }]);

  return StitchAdminClient;
}(_client.StitchClient);

/***/ }),
/* 82 */
/***/ (function(module, exports, __webpack_require__) {


var content = __webpack_require__(83);

if(typeof content === 'string') content = [[module.i, content, '']];

var transform;
var insertInto;



var options = {"hmr":true}

options.transform = transform
options.insertInto = undefined;

var update = __webpack_require__(6)(content, options);

if(content.locals) module.exports = content.locals;

if(false) {
	module.hot.accept("!!../../node_modules/css-loader/index.js!../../node_modules/sass-loader/lib/loader.js!./materialize.scss", function() {
		var newContent = require("!!../../node_modules/css-loader/index.js!../../node_modules/sass-loader/lib/loader.js!./materialize.scss");

		if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];

		var locals = (function(a, b) {
			var key, idx = 0;

			for(key in a) {
				if(!b || a[key] !== b[key]) return false;
				idx++;
			}

			for(key in b) idx--;

			return idx === 0;
		}(content.locals, newContent.locals));

		if(!locals) throw new Error('Aborting CSS HMR due to changed css-modules locals.');

		update(newContent);
	});

	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 83 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(5)(false);
// imports


// module
exports.push([module.i, ".materialize-red {\n  background-color: #e51c23 !important; }\n\n.materialize-red-text {\n  color: #e51c23 !important; }\n\n.materialize-red.lighten-5 {\n  background-color: #fdeaeb !important; }\n\n.materialize-red-text.text-lighten-5 {\n  color: #fdeaeb !important; }\n\n.materialize-red.lighten-4 {\n  background-color: #f8c1c3 !important; }\n\n.materialize-red-text.text-lighten-4 {\n  color: #f8c1c3 !important; }\n\n.materialize-red.lighten-3 {\n  background-color: #f3989b !important; }\n\n.materialize-red-text.text-lighten-3 {\n  color: #f3989b !important; }\n\n.materialize-red.lighten-2 {\n  background-color: #ee6e73 !important; }\n\n.materialize-red-text.text-lighten-2 {\n  color: #ee6e73 !important; }\n\n.materialize-red.lighten-1 {\n  background-color: #ea454b !important; }\n\n.materialize-red-text.text-lighten-1 {\n  color: #ea454b !important; }\n\n.materialize-red.darken-1 {\n  background-color: #d0181e !important; }\n\n.materialize-red-text.text-darken-1 {\n  color: #d0181e !important; }\n\n.materialize-red.darken-2 {\n  background-color: #b9151b !important; }\n\n.materialize-red-text.text-darken-2 {\n  color: #b9151b !important; }\n\n.materialize-red.darken-3 {\n  background-color: #a21318 !important; }\n\n.materialize-red-text.text-darken-3 {\n  color: #a21318 !important; }\n\n.materialize-red.darken-4 {\n  background-color: #8b1014 !important; }\n\n.materialize-red-text.text-darken-4 {\n  color: #8b1014 !important; }\n\n.red {\n  background-color: #F44336 !important; }\n\n.red-text {\n  color: #F44336 !important; }\n\n.red.lighten-5 {\n  background-color: #FFEBEE !important; }\n\n.red-text.text-lighten-5 {\n  color: #FFEBEE !important; }\n\n.red.lighten-4 {\n  background-color: #FFCDD2 !important; }\n\n.red-text.text-lighten-4 {\n  color: #FFCDD2 !important; }\n\n.red.lighten-3 {\n  background-color: #EF9A9A !important; }\n\n.red-text.text-lighten-3 {\n  color: #EF9A9A !important; }\n\n.red.lighten-2 {\n  background-color: #E57373 !important; }\n\n.red-text.text-lighten-2 {\n  color: #E57373 !important; }\n\n.red.lighten-1 {\n  background-color: #EF5350 !important; }\n\n.red-text.text-lighten-1 {\n  color: #EF5350 !important; }\n\n.red.darken-1 {\n  background-color: #E53935 !important; }\n\n.red-text.text-darken-1 {\n  color: #E53935 !important; }\n\n.red.darken-2 {\n  background-color: #D32F2F !important; }\n\n.red-text.text-darken-2 {\n  color: #D32F2F !important; }\n\n.red.darken-3 {\n  background-color: #C62828 !important; }\n\n.red-text.text-darken-3 {\n  color: #C62828 !important; }\n\n.red.darken-4 {\n  background-color: #B71C1C !important; }\n\n.red-text.text-darken-4 {\n  color: #B71C1C !important; }\n\n.red.accent-1 {\n  background-color: #FF8A80 !important; }\n\n.red-text.text-accent-1 {\n  color: #FF8A80 !important; }\n\n.red.accent-2 {\n  background-color: #FF5252 !important; }\n\n.red-text.text-accent-2 {\n  color: #FF5252 !important; }\n\n.red.accent-3 {\n  background-color: #FF1744 !important; }\n\n.red-text.text-accent-3 {\n  color: #FF1744 !important; }\n\n.red.accent-4 {\n  background-color: #D50000 !important; }\n\n.red-text.text-accent-4 {\n  color: #D50000 !important; }\n\n.pink {\n  background-color: #e91e63 !important; }\n\n.pink-text {\n  color: #e91e63 !important; }\n\n.pink.lighten-5 {\n  background-color: #fce4ec !important; }\n\n.pink-text.text-lighten-5 {\n  color: #fce4ec !important; }\n\n.pink.lighten-4 {\n  background-color: #f8bbd0 !important; }\n\n.pink-text.text-lighten-4 {\n  color: #f8bbd0 !important; }\n\n.pink.lighten-3 {\n  background-color: #f48fb1 !important; }\n\n.pink-text.text-lighten-3 {\n  color: #f48fb1 !important; }\n\n.pink.lighten-2 {\n  background-color: #f06292 !important; }\n\n.pink-text.text-lighten-2 {\n  color: #f06292 !important; }\n\n.pink.lighten-1 {\n  background-color: #ec407a !important; }\n\n.pink-text.text-lighten-1 {\n  color: #ec407a !important; }\n\n.pink.darken-1 {\n  background-color: #d81b60 !important; }\n\n.pink-text.text-darken-1 {\n  color: #d81b60 !important; }\n\n.pink.darken-2 {\n  background-color: #c2185b !important; }\n\n.pink-text.text-darken-2 {\n  color: #c2185b !important; }\n\n.pink.darken-3 {\n  background-color: #ad1457 !important; }\n\n.pink-text.text-darken-3 {\n  color: #ad1457 !important; }\n\n.pink.darken-4 {\n  background-color: #880e4f !important; }\n\n.pink-text.text-darken-4 {\n  color: #880e4f !important; }\n\n.pink.accent-1 {\n  background-color: #ff80ab !important; }\n\n.pink-text.text-accent-1 {\n  color: #ff80ab !important; }\n\n.pink.accent-2 {\n  background-color: #ff4081 !important; }\n\n.pink-text.text-accent-2 {\n  color: #ff4081 !important; }\n\n.pink.accent-3 {\n  background-color: #f50057 !important; }\n\n.pink-text.text-accent-3 {\n  color: #f50057 !important; }\n\n.pink.accent-4 {\n  background-color: #c51162 !important; }\n\n.pink-text.text-accent-4 {\n  color: #c51162 !important; }\n\n.purple {\n  background-color: #9c27b0 !important; }\n\n.purple-text {\n  color: #9c27b0 !important; }\n\n.purple.lighten-5 {\n  background-color: #f3e5f5 !important; }\n\n.purple-text.text-lighten-5 {\n  color: #f3e5f5 !important; }\n\n.purple.lighten-4 {\n  background-color: #e1bee7 !important; }\n\n.purple-text.text-lighten-4 {\n  color: #e1bee7 !important; }\n\n.purple.lighten-3 {\n  background-color: #ce93d8 !important; }\n\n.purple-text.text-lighten-3 {\n  color: #ce93d8 !important; }\n\n.purple.lighten-2 {\n  background-color: #ba68c8 !important; }\n\n.purple-text.text-lighten-2 {\n  color: #ba68c8 !important; }\n\n.purple.lighten-1 {\n  background-color: #ab47bc !important; }\n\n.purple-text.text-lighten-1 {\n  color: #ab47bc !important; }\n\n.purple.darken-1 {\n  background-color: #8e24aa !important; }\n\n.purple-text.text-darken-1 {\n  color: #8e24aa !important; }\n\n.purple.darken-2 {\n  background-color: #7b1fa2 !important; }\n\n.purple-text.text-darken-2 {\n  color: #7b1fa2 !important; }\n\n.purple.darken-3 {\n  background-color: #6a1b9a !important; }\n\n.purple-text.text-darken-3 {\n  color: #6a1b9a !important; }\n\n.purple.darken-4 {\n  background-color: #4a148c !important; }\n\n.purple-text.text-darken-4 {\n  color: #4a148c !important; }\n\n.purple.accent-1 {\n  background-color: #ea80fc !important; }\n\n.purple-text.text-accent-1 {\n  color: #ea80fc !important; }\n\n.purple.accent-2 {\n  background-color: #e040fb !important; }\n\n.purple-text.text-accent-2 {\n  color: #e040fb !important; }\n\n.purple.accent-3 {\n  background-color: #d500f9 !important; }\n\n.purple-text.text-accent-3 {\n  color: #d500f9 !important; }\n\n.purple.accent-4 {\n  background-color: #aa00ff !important; }\n\n.purple-text.text-accent-4 {\n  color: #aa00ff !important; }\n\n.deep-purple {\n  background-color: #673ab7 !important; }\n\n.deep-purple-text {\n  color: #673ab7 !important; }\n\n.deep-purple.lighten-5 {\n  background-color: #ede7f6 !important; }\n\n.deep-purple-text.text-lighten-5 {\n  color: #ede7f6 !important; }\n\n.deep-purple.lighten-4 {\n  background-color: #d1c4e9 !important; }\n\n.deep-purple-text.text-lighten-4 {\n  color: #d1c4e9 !important; }\n\n.deep-purple.lighten-3 {\n  background-color: #b39ddb !important; }\n\n.deep-purple-text.text-lighten-3 {\n  color: #b39ddb !important; }\n\n.deep-purple.lighten-2 {\n  background-color: #9575cd !important; }\n\n.deep-purple-text.text-lighten-2 {\n  color: #9575cd !important; }\n\n.deep-purple.lighten-1 {\n  background-color: #7e57c2 !important; }\n\n.deep-purple-text.text-lighten-1 {\n  color: #7e57c2 !important; }\n\n.deep-purple.darken-1 {\n  background-color: #5e35b1 !important; }\n\n.deep-purple-text.text-darken-1 {\n  color: #5e35b1 !important; }\n\n.deep-purple.darken-2 {\n  background-color: #512da8 !important; }\n\n.deep-purple-text.text-darken-2 {\n  color: #512da8 !important; }\n\n.deep-purple.darken-3 {\n  background-color: #4527a0 !important; }\n\n.deep-purple-text.text-darken-3 {\n  color: #4527a0 !important; }\n\n.deep-purple.darken-4 {\n  background-color: #311b92 !important; }\n\n.deep-purple-text.text-darken-4 {\n  color: #311b92 !important; }\n\n.deep-purple.accent-1 {\n  background-color: #b388ff !important; }\n\n.deep-purple-text.text-accent-1 {\n  color: #b388ff !important; }\n\n.deep-purple.accent-2 {\n  background-color: #7c4dff !important; }\n\n.deep-purple-text.text-accent-2 {\n  color: #7c4dff !important; }\n\n.deep-purple.accent-3 {\n  background-color: #651fff !important; }\n\n.deep-purple-text.text-accent-3 {\n  color: #651fff !important; }\n\n.deep-purple.accent-4 {\n  background-color: #6200ea !important; }\n\n.deep-purple-text.text-accent-4 {\n  color: #6200ea !important; }\n\n.indigo {\n  background-color: #3f51b5 !important; }\n\n.indigo-text {\n  color: #3f51b5 !important; }\n\n.indigo.lighten-5 {\n  background-color: #e8eaf6 !important; }\n\n.indigo-text.text-lighten-5 {\n  color: #e8eaf6 !important; }\n\n.indigo.lighten-4 {\n  background-color: #c5cae9 !important; }\n\n.indigo-text.text-lighten-4 {\n  color: #c5cae9 !important; }\n\n.indigo.lighten-3 {\n  background-color: #9fa8da !important; }\n\n.indigo-text.text-lighten-3 {\n  color: #9fa8da !important; }\n\n.indigo.lighten-2 {\n  background-color: #7986cb !important; }\n\n.indigo-text.text-lighten-2 {\n  color: #7986cb !important; }\n\n.indigo.lighten-1 {\n  background-color: #5c6bc0 !important; }\n\n.indigo-text.text-lighten-1 {\n  color: #5c6bc0 !important; }\n\n.indigo.darken-1 {\n  background-color: #3949ab !important; }\n\n.indigo-text.text-darken-1 {\n  color: #3949ab !important; }\n\n.indigo.darken-2 {\n  background-color: #303f9f !important; }\n\n.indigo-text.text-darken-2 {\n  color: #303f9f !important; }\n\n.indigo.darken-3 {\n  background-color: #283593 !important; }\n\n.indigo-text.text-darken-3 {\n  color: #283593 !important; }\n\n.indigo.darken-4 {\n  background-color: #1a237e !important; }\n\n.indigo-text.text-darken-4 {\n  color: #1a237e !important; }\n\n.indigo.accent-1 {\n  background-color: #8c9eff !important; }\n\n.indigo-text.text-accent-1 {\n  color: #8c9eff !important; }\n\n.indigo.accent-2 {\n  background-color: #536dfe !important; }\n\n.indigo-text.text-accent-2 {\n  color: #536dfe !important; }\n\n.indigo.accent-3 {\n  background-color: #3d5afe !important; }\n\n.indigo-text.text-accent-3 {\n  color: #3d5afe !important; }\n\n.indigo.accent-4 {\n  background-color: #304ffe !important; }\n\n.indigo-text.text-accent-4 {\n  color: #304ffe !important; }\n\n.blue {\n  background-color: #2196F3 !important; }\n\n.blue-text {\n  color: #2196F3 !important; }\n\n.blue.lighten-5 {\n  background-color: #E3F2FD !important; }\n\n.blue-text.text-lighten-5 {\n  color: #E3F2FD !important; }\n\n.blue.lighten-4 {\n  background-color: #BBDEFB !important; }\n\n.blue-text.text-lighten-4 {\n  color: #BBDEFB !important; }\n\n.blue.lighten-3 {\n  background-color: #90CAF9 !important; }\n\n.blue-text.text-lighten-3 {\n  color: #90CAF9 !important; }\n\n.blue.lighten-2 {\n  background-color: #64B5F6 !important; }\n\n.blue-text.text-lighten-2 {\n  color: #64B5F6 !important; }\n\n.blue.lighten-1 {\n  background-color: #42A5F5 !important; }\n\n.blue-text.text-lighten-1 {\n  color: #42A5F5 !important; }\n\n.blue.darken-1 {\n  background-color: #1E88E5 !important; }\n\n.blue-text.text-darken-1 {\n  color: #1E88E5 !important; }\n\n.blue.darken-2 {\n  background-color: #1976D2 !important; }\n\n.blue-text.text-darken-2 {\n  color: #1976D2 !important; }\n\n.blue.darken-3 {\n  background-color: #1565C0 !important; }\n\n.blue-text.text-darken-3 {\n  color: #1565C0 !important; }\n\n.blue.darken-4 {\n  background-color: #0D47A1 !important; }\n\n.blue-text.text-darken-4 {\n  color: #0D47A1 !important; }\n\n.blue.accent-1 {\n  background-color: #82B1FF !important; }\n\n.blue-text.text-accent-1 {\n  color: #82B1FF !important; }\n\n.blue.accent-2 {\n  background-color: #448AFF !important; }\n\n.blue-text.text-accent-2 {\n  color: #448AFF !important; }\n\n.blue.accent-3 {\n  background-color: #2979FF !important; }\n\n.blue-text.text-accent-3 {\n  color: #2979FF !important; }\n\n.blue.accent-4 {\n  background-color: #2962FF !important; }\n\n.blue-text.text-accent-4 {\n  color: #2962FF !important; }\n\n.light-blue {\n  background-color: #03a9f4 !important; }\n\n.light-blue-text {\n  color: #03a9f4 !important; }\n\n.light-blue.lighten-5 {\n  background-color: #e1f5fe !important; }\n\n.light-blue-text.text-lighten-5 {\n  color: #e1f5fe !important; }\n\n.light-blue.lighten-4 {\n  background-color: #b3e5fc !important; }\n\n.light-blue-text.text-lighten-4 {\n  color: #b3e5fc !important; }\n\n.light-blue.lighten-3 {\n  background-color: #81d4fa !important; }\n\n.light-blue-text.text-lighten-3 {\n  color: #81d4fa !important; }\n\n.light-blue.lighten-2 {\n  background-color: #4fc3f7 !important; }\n\n.light-blue-text.text-lighten-2 {\n  color: #4fc3f7 !important; }\n\n.light-blue.lighten-1 {\n  background-color: #29b6f6 !important; }\n\n.light-blue-text.text-lighten-1 {\n  color: #29b6f6 !important; }\n\n.light-blue.darken-1 {\n  background-color: #039be5 !important; }\n\n.light-blue-text.text-darken-1 {\n  color: #039be5 !important; }\n\n.light-blue.darken-2 {\n  background-color: #0288d1 !important; }\n\n.light-blue-text.text-darken-2 {\n  color: #0288d1 !important; }\n\n.light-blue.darken-3 {\n  background-color: #0277bd !important; }\n\n.light-blue-text.text-darken-3 {\n  color: #0277bd !important; }\n\n.light-blue.darken-4 {\n  background-color: #01579b !important; }\n\n.light-blue-text.text-darken-4 {\n  color: #01579b !important; }\n\n.light-blue.accent-1 {\n  background-color: #80d8ff !important; }\n\n.light-blue-text.text-accent-1 {\n  color: #80d8ff !important; }\n\n.light-blue.accent-2 {\n  background-color: #40c4ff !important; }\n\n.light-blue-text.text-accent-2 {\n  color: #40c4ff !important; }\n\n.light-blue.accent-3 {\n  background-color: #00b0ff !important; }\n\n.light-blue-text.text-accent-3 {\n  color: #00b0ff !important; }\n\n.light-blue.accent-4 {\n  background-color: #0091ea !important; }\n\n.light-blue-text.text-accent-4 {\n  color: #0091ea !important; }\n\n.cyan {\n  background-color: #00bcd4 !important; }\n\n.cyan-text {\n  color: #00bcd4 !important; }\n\n.cyan.lighten-5 {\n  background-color: #e0f7fa !important; }\n\n.cyan-text.text-lighten-5 {\n  color: #e0f7fa !important; }\n\n.cyan.lighten-4 {\n  background-color: #b2ebf2 !important; }\n\n.cyan-text.text-lighten-4 {\n  color: #b2ebf2 !important; }\n\n.cyan.lighten-3 {\n  background-color: #80deea !important; }\n\n.cyan-text.text-lighten-3 {\n  color: #80deea !important; }\n\n.cyan.lighten-2 {\n  background-color: #4dd0e1 !important; }\n\n.cyan-text.text-lighten-2 {\n  color: #4dd0e1 !important; }\n\n.cyan.lighten-1 {\n  background-color: #26c6da !important; }\n\n.cyan-text.text-lighten-1 {\n  color: #26c6da !important; }\n\n.cyan.darken-1 {\n  background-color: #00acc1 !important; }\n\n.cyan-text.text-darken-1 {\n  color: #00acc1 !important; }\n\n.cyan.darken-2 {\n  background-color: #0097a7 !important; }\n\n.cyan-text.text-darken-2 {\n  color: #0097a7 !important; }\n\n.cyan.darken-3 {\n  background-color: #00838f !important; }\n\n.cyan-text.text-darken-3 {\n  color: #00838f !important; }\n\n.cyan.darken-4 {\n  background-color: #006064 !important; }\n\n.cyan-text.text-darken-4 {\n  color: #006064 !important; }\n\n.cyan.accent-1 {\n  background-color: #84ffff !important; }\n\n.cyan-text.text-accent-1 {\n  color: #84ffff !important; }\n\n.cyan.accent-2 {\n  background-color: #18ffff !important; }\n\n.cyan-text.text-accent-2 {\n  color: #18ffff !important; }\n\n.cyan.accent-3 {\n  background-color: #00e5ff !important; }\n\n.cyan-text.text-accent-3 {\n  color: #00e5ff !important; }\n\n.cyan.accent-4 {\n  background-color: #00b8d4 !important; }\n\n.cyan-text.text-accent-4 {\n  color: #00b8d4 !important; }\n\n.teal {\n  background-color: #009688 !important; }\n\n.teal-text {\n  color: #009688 !important; }\n\n.teal.lighten-5 {\n  background-color: #e0f2f1 !important; }\n\n.teal-text.text-lighten-5 {\n  color: #e0f2f1 !important; }\n\n.teal.lighten-4 {\n  background-color: #b2dfdb !important; }\n\n.teal-text.text-lighten-4 {\n  color: #b2dfdb !important; }\n\n.teal.lighten-3 {\n  background-color: #80cbc4 !important; }\n\n.teal-text.text-lighten-3 {\n  color: #80cbc4 !important; }\n\n.teal.lighten-2 {\n  background-color: #4db6ac !important; }\n\n.teal-text.text-lighten-2 {\n  color: #4db6ac !important; }\n\n.teal.lighten-1 {\n  background-color: #26a69a !important; }\n\n.teal-text.text-lighten-1 {\n  color: #26a69a !important; }\n\n.teal.darken-1 {\n  background-color: #00897b !important; }\n\n.teal-text.text-darken-1 {\n  color: #00897b !important; }\n\n.teal.darken-2 {\n  background-color: #00796b !important; }\n\n.teal-text.text-darken-2 {\n  color: #00796b !important; }\n\n.teal.darken-3 {\n  background-color: #00695c !important; }\n\n.teal-text.text-darken-3 {\n  color: #00695c !important; }\n\n.teal.darken-4 {\n  background-color: #004d40 !important; }\n\n.teal-text.text-darken-4 {\n  color: #004d40 !important; }\n\n.teal.accent-1 {\n  background-color: #a7ffeb !important; }\n\n.teal-text.text-accent-1 {\n  color: #a7ffeb !important; }\n\n.teal.accent-2 {\n  background-color: #64ffda !important; }\n\n.teal-text.text-accent-2 {\n  color: #64ffda !important; }\n\n.teal.accent-3 {\n  background-color: #1de9b6 !important; }\n\n.teal-text.text-accent-3 {\n  color: #1de9b6 !important; }\n\n.teal.accent-4 {\n  background-color: #00bfa5 !important; }\n\n.teal-text.text-accent-4 {\n  color: #00bfa5 !important; }\n\n.green {\n  background-color: #4CAF50 !important; }\n\n.green-text {\n  color: #4CAF50 !important; }\n\n.green.lighten-5 {\n  background-color: #E8F5E9 !important; }\n\n.green-text.text-lighten-5 {\n  color: #E8F5E9 !important; }\n\n.green.lighten-4 {\n  background-color: #C8E6C9 !important; }\n\n.green-text.text-lighten-4 {\n  color: #C8E6C9 !important; }\n\n.green.lighten-3 {\n  background-color: #A5D6A7 !important; }\n\n.green-text.text-lighten-3 {\n  color: #A5D6A7 !important; }\n\n.green.lighten-2 {\n  background-color: #81C784 !important; }\n\n.green-text.text-lighten-2 {\n  color: #81C784 !important; }\n\n.green.lighten-1 {\n  background-color: #66BB6A !important; }\n\n.green-text.text-lighten-1 {\n  color: #66BB6A !important; }\n\n.green.darken-1 {\n  background-color: #43A047 !important; }\n\n.green-text.text-darken-1 {\n  color: #43A047 !important; }\n\n.green.darken-2 {\n  background-color: #388E3C !important; }\n\n.green-text.text-darken-2 {\n  color: #388E3C !important; }\n\n.green.darken-3 {\n  background-color: #2E7D32 !important; }\n\n.green-text.text-darken-3 {\n  color: #2E7D32 !important; }\n\n.green.darken-4 {\n  background-color: #1B5E20 !important; }\n\n.green-text.text-darken-4 {\n  color: #1B5E20 !important; }\n\n.green.accent-1 {\n  background-color: #B9F6CA !important; }\n\n.green-text.text-accent-1 {\n  color: #B9F6CA !important; }\n\n.green.accent-2 {\n  background-color: #69F0AE !important; }\n\n.green-text.text-accent-2 {\n  color: #69F0AE !important; }\n\n.green.accent-3 {\n  background-color: #00E676 !important; }\n\n.green-text.text-accent-3 {\n  color: #00E676 !important; }\n\n.green.accent-4 {\n  background-color: #00C853 !important; }\n\n.green-text.text-accent-4 {\n  color: #00C853 !important; }\n\n.light-green {\n  background-color: #8bc34a !important; }\n\n.light-green-text {\n  color: #8bc34a !important; }\n\n.light-green.lighten-5 {\n  background-color: #f1f8e9 !important; }\n\n.light-green-text.text-lighten-5 {\n  color: #f1f8e9 !important; }\n\n.light-green.lighten-4 {\n  background-color: #dcedc8 !important; }\n\n.light-green-text.text-lighten-4 {\n  color: #dcedc8 !important; }\n\n.light-green.lighten-3 {\n  background-color: #c5e1a5 !important; }\n\n.light-green-text.text-lighten-3 {\n  color: #c5e1a5 !important; }\n\n.light-green.lighten-2 {\n  background-color: #aed581 !important; }\n\n.light-green-text.text-lighten-2 {\n  color: #aed581 !important; }\n\n.light-green.lighten-1 {\n  background-color: #9ccc65 !important; }\n\n.light-green-text.text-lighten-1 {\n  color: #9ccc65 !important; }\n\n.light-green.darken-1 {\n  background-color: #7cb342 !important; }\n\n.light-green-text.text-darken-1 {\n  color: #7cb342 !important; }\n\n.light-green.darken-2 {\n  background-color: #689f38 !important; }\n\n.light-green-text.text-darken-2 {\n  color: #689f38 !important; }\n\n.light-green.darken-3 {\n  background-color: #558b2f !important; }\n\n.light-green-text.text-darken-3 {\n  color: #558b2f !important; }\n\n.light-green.darken-4 {\n  background-color: #33691e !important; }\n\n.light-green-text.text-darken-4 {\n  color: #33691e !important; }\n\n.light-green.accent-1 {\n  background-color: #ccff90 !important; }\n\n.light-green-text.text-accent-1 {\n  color: #ccff90 !important; }\n\n.light-green.accent-2 {\n  background-color: #b2ff59 !important; }\n\n.light-green-text.text-accent-2 {\n  color: #b2ff59 !important; }\n\n.light-green.accent-3 {\n  background-color: #76ff03 !important; }\n\n.light-green-text.text-accent-3 {\n  color: #76ff03 !important; }\n\n.light-green.accent-4 {\n  background-color: #64dd17 !important; }\n\n.light-green-text.text-accent-4 {\n  color: #64dd17 !important; }\n\n.lime {\n  background-color: #cddc39 !important; }\n\n.lime-text {\n  color: #cddc39 !important; }\n\n.lime.lighten-5 {\n  background-color: #f9fbe7 !important; }\n\n.lime-text.text-lighten-5 {\n  color: #f9fbe7 !important; }\n\n.lime.lighten-4 {\n  background-color: #f0f4c3 !important; }\n\n.lime-text.text-lighten-4 {\n  color: #f0f4c3 !important; }\n\n.lime.lighten-3 {\n  background-color: #e6ee9c !important; }\n\n.lime-text.text-lighten-3 {\n  color: #e6ee9c !important; }\n\n.lime.lighten-2 {\n  background-color: #dce775 !important; }\n\n.lime-text.text-lighten-2 {\n  color: #dce775 !important; }\n\n.lime.lighten-1 {\n  background-color: #d4e157 !important; }\n\n.lime-text.text-lighten-1 {\n  color: #d4e157 !important; }\n\n.lime.darken-1 {\n  background-color: #c0ca33 !important; }\n\n.lime-text.text-darken-1 {\n  color: #c0ca33 !important; }\n\n.lime.darken-2 {\n  background-color: #afb42b !important; }\n\n.lime-text.text-darken-2 {\n  color: #afb42b !important; }\n\n.lime.darken-3 {\n  background-color: #9e9d24 !important; }\n\n.lime-text.text-darken-3 {\n  color: #9e9d24 !important; }\n\n.lime.darken-4 {\n  background-color: #827717 !important; }\n\n.lime-text.text-darken-4 {\n  color: #827717 !important; }\n\n.lime.accent-1 {\n  background-color: #f4ff81 !important; }\n\n.lime-text.text-accent-1 {\n  color: #f4ff81 !important; }\n\n.lime.accent-2 {\n  background-color: #eeff41 !important; }\n\n.lime-text.text-accent-2 {\n  color: #eeff41 !important; }\n\n.lime.accent-3 {\n  background-color: #c6ff00 !important; }\n\n.lime-text.text-accent-3 {\n  color: #c6ff00 !important; }\n\n.lime.accent-4 {\n  background-color: #aeea00 !important; }\n\n.lime-text.text-accent-4 {\n  color: #aeea00 !important; }\n\n.yellow {\n  background-color: #ffeb3b !important; }\n\n.yellow-text {\n  color: #ffeb3b !important; }\n\n.yellow.lighten-5 {\n  background-color: #fffde7 !important; }\n\n.yellow-text.text-lighten-5 {\n  color: #fffde7 !important; }\n\n.yellow.lighten-4 {\n  background-color: #fff9c4 !important; }\n\n.yellow-text.text-lighten-4 {\n  color: #fff9c4 !important; }\n\n.yellow.lighten-3 {\n  background-color: #fff59d !important; }\n\n.yellow-text.text-lighten-3 {\n  color: #fff59d !important; }\n\n.yellow.lighten-2 {\n  background-color: #fff176 !important; }\n\n.yellow-text.text-lighten-2 {\n  color: #fff176 !important; }\n\n.yellow.lighten-1 {\n  background-color: #ffee58 !important; }\n\n.yellow-text.text-lighten-1 {\n  color: #ffee58 !important; }\n\n.yellow.darken-1 {\n  background-color: #fdd835 !important; }\n\n.yellow-text.text-darken-1 {\n  color: #fdd835 !important; }\n\n.yellow.darken-2 {\n  background-color: #fbc02d !important; }\n\n.yellow-text.text-darken-2 {\n  color: #fbc02d !important; }\n\n.yellow.darken-3 {\n  background-color: #f9a825 !important; }\n\n.yellow-text.text-darken-3 {\n  color: #f9a825 !important; }\n\n.yellow.darken-4 {\n  background-color: #f57f17 !important; }\n\n.yellow-text.text-darken-4 {\n  color: #f57f17 !important; }\n\n.yellow.accent-1 {\n  background-color: #ffff8d !important; }\n\n.yellow-text.text-accent-1 {\n  color: #ffff8d !important; }\n\n.yellow.accent-2 {\n  background-color: #ffff00 !important; }\n\n.yellow-text.text-accent-2 {\n  color: #ffff00 !important; }\n\n.yellow.accent-3 {\n  background-color: #ffea00 !important; }\n\n.yellow-text.text-accent-3 {\n  color: #ffea00 !important; }\n\n.yellow.accent-4 {\n  background-color: #ffd600 !important; }\n\n.yellow-text.text-accent-4 {\n  color: #ffd600 !important; }\n\n.amber {\n  background-color: #ffc107 !important; }\n\n.amber-text {\n  color: #ffc107 !important; }\n\n.amber.lighten-5 {\n  background-color: #fff8e1 !important; }\n\n.amber-text.text-lighten-5 {\n  color: #fff8e1 !important; }\n\n.amber.lighten-4 {\n  background-color: #ffecb3 !important; }\n\n.amber-text.text-lighten-4 {\n  color: #ffecb3 !important; }\n\n.amber.lighten-3 {\n  background-color: #ffe082 !important; }\n\n.amber-text.text-lighten-3 {\n  color: #ffe082 !important; }\n\n.amber.lighten-2 {\n  background-color: #ffd54f !important; }\n\n.amber-text.text-lighten-2 {\n  color: #ffd54f !important; }\n\n.amber.lighten-1 {\n  background-color: #ffca28 !important; }\n\n.amber-text.text-lighten-1 {\n  color: #ffca28 !important; }\n\n.amber.darken-1 {\n  background-color: #ffb300 !important; }\n\n.amber-text.text-darken-1 {\n  color: #ffb300 !important; }\n\n.amber.darken-2 {\n  background-color: #ffa000 !important; }\n\n.amber-text.text-darken-2 {\n  color: #ffa000 !important; }\n\n.amber.darken-3 {\n  background-color: #ff8f00 !important; }\n\n.amber-text.text-darken-3 {\n  color: #ff8f00 !important; }\n\n.amber.darken-4 {\n  background-color: #ff6f00 !important; }\n\n.amber-text.text-darken-4 {\n  color: #ff6f00 !important; }\n\n.amber.accent-1 {\n  background-color: #ffe57f !important; }\n\n.amber-text.text-accent-1 {\n  color: #ffe57f !important; }\n\n.amber.accent-2 {\n  background-color: #ffd740 !important; }\n\n.amber-text.text-accent-2 {\n  color: #ffd740 !important; }\n\n.amber.accent-3 {\n  background-color: #ffc400 !important; }\n\n.amber-text.text-accent-3 {\n  color: #ffc400 !important; }\n\n.amber.accent-4 {\n  background-color: #ffab00 !important; }\n\n.amber-text.text-accent-4 {\n  color: #ffab00 !important; }\n\n.orange {\n  background-color: #ff9800 !important; }\n\n.orange-text {\n  color: #ff9800 !important; }\n\n.orange.lighten-5 {\n  background-color: #fff3e0 !important; }\n\n.orange-text.text-lighten-5 {\n  color: #fff3e0 !important; }\n\n.orange.lighten-4 {\n  background-color: #ffe0b2 !important; }\n\n.orange-text.text-lighten-4 {\n  color: #ffe0b2 !important; }\n\n.orange.lighten-3 {\n  background-color: #ffcc80 !important; }\n\n.orange-text.text-lighten-3 {\n  color: #ffcc80 !important; }\n\n.orange.lighten-2 {\n  background-color: #ffb74d !important; }\n\n.orange-text.text-lighten-2 {\n  color: #ffb74d !important; }\n\n.orange.lighten-1 {\n  background-color: #ffa726 !important; }\n\n.orange-text.text-lighten-1 {\n  color: #ffa726 !important; }\n\n.orange.darken-1 {\n  background-color: #fb8c00 !important; }\n\n.orange-text.text-darken-1 {\n  color: #fb8c00 !important; }\n\n.orange.darken-2 {\n  background-color: #f57c00 !important; }\n\n.orange-text.text-darken-2 {\n  color: #f57c00 !important; }\n\n.orange.darken-3 {\n  background-color: #ef6c00 !important; }\n\n.orange-text.text-darken-3 {\n  color: #ef6c00 !important; }\n\n.orange.darken-4 {\n  background-color: #e65100 !important; }\n\n.orange-text.text-darken-4 {\n  color: #e65100 !important; }\n\n.orange.accent-1 {\n  background-color: #ffd180 !important; }\n\n.orange-text.text-accent-1 {\n  color: #ffd180 !important; }\n\n.orange.accent-2 {\n  background-color: #ffab40 !important; }\n\n.orange-text.text-accent-2 {\n  color: #ffab40 !important; }\n\n.orange.accent-3 {\n  background-color: #ff9100 !important; }\n\n.orange-text.text-accent-3 {\n  color: #ff9100 !important; }\n\n.orange.accent-4 {\n  background-color: #ff6d00 !important; }\n\n.orange-text.text-accent-4 {\n  color: #ff6d00 !important; }\n\n.deep-orange {\n  background-color: #ff5722 !important; }\n\n.deep-orange-text {\n  color: #ff5722 !important; }\n\n.deep-orange.lighten-5 {\n  background-color: #fbe9e7 !important; }\n\n.deep-orange-text.text-lighten-5 {\n  color: #fbe9e7 !important; }\n\n.deep-orange.lighten-4 {\n  background-color: #ffccbc !important; }\n\n.deep-orange-text.text-lighten-4 {\n  color: #ffccbc !important; }\n\n.deep-orange.lighten-3 {\n  background-color: #ffab91 !important; }\n\n.deep-orange-text.text-lighten-3 {\n  color: #ffab91 !important; }\n\n.deep-orange.lighten-2 {\n  background-color: #ff8a65 !important; }\n\n.deep-orange-text.text-lighten-2 {\n  color: #ff8a65 !important; }\n\n.deep-orange.lighten-1 {\n  background-color: #ff7043 !important; }\n\n.deep-orange-text.text-lighten-1 {\n  color: #ff7043 !important; }\n\n.deep-orange.darken-1 {\n  background-color: #f4511e !important; }\n\n.deep-orange-text.text-darken-1 {\n  color: #f4511e !important; }\n\n.deep-orange.darken-2 {\n  background-color: #e64a19 !important; }\n\n.deep-orange-text.text-darken-2 {\n  color: #e64a19 !important; }\n\n.deep-orange.darken-3 {\n  background-color: #d84315 !important; }\n\n.deep-orange-text.text-darken-3 {\n  color: #d84315 !important; }\n\n.deep-orange.darken-4 {\n  background-color: #bf360c !important; }\n\n.deep-orange-text.text-darken-4 {\n  color: #bf360c !important; }\n\n.deep-orange.accent-1 {\n  background-color: #ff9e80 !important; }\n\n.deep-orange-text.text-accent-1 {\n  color: #ff9e80 !important; }\n\n.deep-orange.accent-2 {\n  background-color: #ff6e40 !important; }\n\n.deep-orange-text.text-accent-2 {\n  color: #ff6e40 !important; }\n\n.deep-orange.accent-3 {\n  background-color: #ff3d00 !important; }\n\n.deep-orange-text.text-accent-3 {\n  color: #ff3d00 !important; }\n\n.deep-orange.accent-4 {\n  background-color: #dd2c00 !important; }\n\n.deep-orange-text.text-accent-4 {\n  color: #dd2c00 !important; }\n\n.brown {\n  background-color: #795548 !important; }\n\n.brown-text {\n  color: #795548 !important; }\n\n.brown.lighten-5 {\n  background-color: #efebe9 !important; }\n\n.brown-text.text-lighten-5 {\n  color: #efebe9 !important; }\n\n.brown.lighten-4 {\n  background-color: #d7ccc8 !important; }\n\n.brown-text.text-lighten-4 {\n  color: #d7ccc8 !important; }\n\n.brown.lighten-3 {\n  background-color: #bcaaa4 !important; }\n\n.brown-text.text-lighten-3 {\n  color: #bcaaa4 !important; }\n\n.brown.lighten-2 {\n  background-color: #a1887f !important; }\n\n.brown-text.text-lighten-2 {\n  color: #a1887f !important; }\n\n.brown.lighten-1 {\n  background-color: #8d6e63 !important; }\n\n.brown-text.text-lighten-1 {\n  color: #8d6e63 !important; }\n\n.brown.darken-1 {\n  background-color: #6d4c41 !important; }\n\n.brown-text.text-darken-1 {\n  color: #6d4c41 !important; }\n\n.brown.darken-2 {\n  background-color: #5d4037 !important; }\n\n.brown-text.text-darken-2 {\n  color: #5d4037 !important; }\n\n.brown.darken-3 {\n  background-color: #4e342e !important; }\n\n.brown-text.text-darken-3 {\n  color: #4e342e !important; }\n\n.brown.darken-4 {\n  background-color: #3e2723 !important; }\n\n.brown-text.text-darken-4 {\n  color: #3e2723 !important; }\n\n.blue-grey {\n  background-color: #607d8b !important; }\n\n.blue-grey-text {\n  color: #607d8b !important; }\n\n.blue-grey.lighten-5 {\n  background-color: #eceff1 !important; }\n\n.blue-grey-text.text-lighten-5 {\n  color: #eceff1 !important; }\n\n.blue-grey.lighten-4 {\n  background-color: #cfd8dc !important; }\n\n.blue-grey-text.text-lighten-4 {\n  color: #cfd8dc !important; }\n\n.blue-grey.lighten-3 {\n  background-color: #b0bec5 !important; }\n\n.blue-grey-text.text-lighten-3 {\n  color: #b0bec5 !important; }\n\n.blue-grey.lighten-2 {\n  background-color: #90a4ae !important; }\n\n.blue-grey-text.text-lighten-2 {\n  color: #90a4ae !important; }\n\n.blue-grey.lighten-1 {\n  background-color: #78909c !important; }\n\n.blue-grey-text.text-lighten-1 {\n  color: #78909c !important; }\n\n.blue-grey.darken-1 {\n  background-color: #546e7a !important; }\n\n.blue-grey-text.text-darken-1 {\n  color: #546e7a !important; }\n\n.blue-grey.darken-2 {\n  background-color: #455a64 !important; }\n\n.blue-grey-text.text-darken-2 {\n  color: #455a64 !important; }\n\n.blue-grey.darken-3 {\n  background-color: #37474f !important; }\n\n.blue-grey-text.text-darken-3 {\n  color: #37474f !important; }\n\n.blue-grey.darken-4 {\n  background-color: #263238 !important; }\n\n.blue-grey-text.text-darken-4 {\n  color: #263238 !important; }\n\n.grey {\n  background-color: #9e9e9e !important; }\n\n.grey-text {\n  color: #9e9e9e !important; }\n\n.grey.lighten-5 {\n  background-color: #fafafa !important; }\n\n.grey-text.text-lighten-5 {\n  color: #fafafa !important; }\n\n.grey.lighten-4 {\n  background-color: #f5f5f5 !important; }\n\n.grey-text.text-lighten-4 {\n  color: #f5f5f5 !important; }\n\n.grey.lighten-3 {\n  background-color: #eeeeee !important; }\n\n.grey-text.text-lighten-3 {\n  color: #eeeeee !important; }\n\n.grey.lighten-2 {\n  background-color: #e0e0e0 !important; }\n\n.grey-text.text-lighten-2 {\n  color: #e0e0e0 !important; }\n\n.grey.lighten-1 {\n  background-color: #bdbdbd !important; }\n\n.grey-text.text-lighten-1 {\n  color: #bdbdbd !important; }\n\n.grey.darken-1 {\n  background-color: #757575 !important; }\n\n.grey-text.text-darken-1 {\n  color: #757575 !important; }\n\n.grey.darken-2 {\n  background-color: #616161 !important; }\n\n.grey-text.text-darken-2 {\n  color: #616161 !important; }\n\n.grey.darken-3 {\n  background-color: #424242 !important; }\n\n.grey-text.text-darken-3 {\n  color: #424242 !important; }\n\n.grey.darken-4 {\n  background-color: #212121 !important; }\n\n.grey-text.text-darken-4 {\n  color: #212121 !important; }\n\n.black {\n  background-color: #000000 !important; }\n\n.black-text {\n  color: #000000 !important; }\n\n.white {\n  background-color: #FFFFFF !important; }\n\n.white-text {\n  color: #FFFFFF !important; }\n\n.transparent {\n  background-color: transparent !important; }\n\n.transparent-text {\n  color: transparent !important; }\n\n/*! normalize.css v7.0.0 | MIT License | github.com/necolas/normalize.css */\n/* Document\r\n   ========================================================================== */\n/**\r\n * 1. Correct the line height in all browsers.\r\n * 2. Prevent adjustments of font size after orientation changes in\r\n *    IE on Windows Phone and in iOS.\r\n */\nhtml {\n  line-height: 1.15;\n  /* 1 */\n  -ms-text-size-adjust: 100%;\n  /* 2 */\n  -webkit-text-size-adjust: 100%;\n  /* 2 */ }\n\n/* Sections\r\n   ========================================================================== */\n/**\r\n * Remove the margin in all browsers (opinionated).\r\n */\nbody {\n  margin: 0; }\n\n/**\r\n * Add the correct display in IE 9-.\r\n */\narticle,\naside,\nfooter,\nheader,\nnav,\nsection {\n  display: block; }\n\n/**\r\n * Correct the font size and margin on `h1` elements within `section` and\r\n * `article` contexts in Chrome, Firefox, and Safari.\r\n */\nh1 {\n  font-size: 2em;\n  margin: 0.67em 0; }\n\n/* Grouping content\r\n   ========================================================================== */\n/**\r\n * Add the correct display in IE 9-.\r\n * 1. Add the correct display in IE.\r\n */\nfigcaption,\nfigure,\nmain {\n  /* 1 */\n  display: block; }\n\n/**\r\n * Add the correct margin in IE 8.\r\n */\nfigure {\n  margin: 1em 40px; }\n\n/**\r\n * 1. Add the correct box sizing in Firefox.\r\n * 2. Show the overflow in Edge and IE.\r\n */\nhr {\n  box-sizing: content-box;\n  /* 1 */\n  height: 0;\n  /* 1 */\n  overflow: visible;\n  /* 2 */ }\n\n/**\r\n * 1. Correct the inheritance and scaling of font size in all browsers.\r\n * 2. Correct the odd `em` font sizing in all browsers.\r\n */\npre {\n  font-family: monospace, monospace;\n  /* 1 */\n  font-size: 1em;\n  /* 2 */ }\n\n/* Text-level semantics\r\n   ========================================================================== */\n/**\r\n * 1. Remove the gray background on active links in IE 10.\r\n * 2. Remove gaps in links underline in iOS 8+ and Safari 8+.\r\n */\na {\n  background-color: transparent;\n  /* 1 */\n  -webkit-text-decoration-skip: objects;\n  /* 2 */ }\n\n/**\r\n * 1. Remove the bottom border in Chrome 57- and Firefox 39-.\r\n * 2. Add the correct text decoration in Chrome, Edge, IE, Opera, and Safari.\r\n */\nabbr[title] {\n  border-bottom: none;\n  /* 1 */\n  text-decoration: underline;\n  /* 2 */\n  text-decoration: underline dotted;\n  /* 2 */ }\n\n/**\r\n * Prevent the duplicate application of `bolder` by the next rule in Safari 6.\r\n */\nb,\nstrong {\n  font-weight: inherit; }\n\n/**\r\n * Add the correct font weight in Chrome, Edge, and Safari.\r\n */\nb,\nstrong {\n  font-weight: bolder; }\n\n/**\r\n * 1. Correct the inheritance and scaling of font size in all browsers.\r\n * 2. Correct the odd `em` font sizing in all browsers.\r\n */\ncode,\nkbd,\nsamp {\n  font-family: monospace, monospace;\n  /* 1 */\n  font-size: 1em;\n  /* 2 */ }\n\n/**\r\n * Add the correct font style in Android 4.3-.\r\n */\ndfn {\n  font-style: italic; }\n\n/**\r\n * Add the correct background and color in IE 9-.\r\n */\nmark {\n  background-color: #ff0;\n  color: #000; }\n\n/**\r\n * Add the correct font size in all browsers.\r\n */\nsmall {\n  font-size: 80%; }\n\n/**\r\n * Prevent `sub` and `sup` elements from affecting the line height in\r\n * all browsers.\r\n */\nsub,\nsup {\n  font-size: 75%;\n  line-height: 0;\n  position: relative;\n  vertical-align: baseline; }\n\nsub {\n  bottom: -0.25em; }\n\nsup {\n  top: -0.5em; }\n\n/* Embedded content\r\n   ========================================================================== */\n/**\r\n * Add the correct display in IE 9-.\r\n */\naudio,\nvideo {\n  display: inline-block; }\n\n/**\r\n * Add the correct display in iOS 4-7.\r\n */\naudio:not([controls]) {\n  display: none;\n  height: 0; }\n\n/**\r\n * Remove the border on images inside links in IE 10-.\r\n */\nimg {\n  border-style: none; }\n\n/**\r\n * Hide the overflow in IE.\r\n */\nsvg:not(:root) {\n  overflow: hidden; }\n\n/* Forms\r\n   ========================================================================== */\n/**\r\n * 1. Change the font styles in all browsers (opinionated).\r\n * 2. Remove the margin in Firefox and Safari.\r\n */\nbutton,\ninput,\noptgroup,\nselect,\ntextarea {\n  font-family: sans-serif;\n  /* 1 */\n  font-size: 100%;\n  /* 1 */\n  line-height: 1.15;\n  /* 1 */\n  margin: 0;\n  /* 2 */ }\n\n/**\r\n * Show the overflow in IE.\r\n * 1. Show the overflow in Edge.\r\n */\nbutton,\ninput {\n  /* 1 */\n  overflow: visible; }\n\n/**\r\n * Remove the inheritance of text transform in Edge, Firefox, and IE.\r\n * 1. Remove the inheritance of text transform in Firefox.\r\n */\nbutton,\nselect {\n  /* 1 */\n  text-transform: none; }\n\n/**\r\n * 1. Prevent a WebKit bug where (2) destroys native `audio` and `video`\r\n *    controls in Android 4.\r\n * 2. Correct the inability to style clickable types in iOS and Safari.\r\n */\nbutton,\nhtml [type=\"button\"],\n[type=\"reset\"],\n[type=\"submit\"] {\n  -webkit-appearance: button;\n  /* 2 */ }\n\n/**\r\n * Remove the inner border and padding in Firefox.\r\n */\nbutton::-moz-focus-inner,\n[type=\"button\"]::-moz-focus-inner,\n[type=\"reset\"]::-moz-focus-inner,\n[type=\"submit\"]::-moz-focus-inner {\n  border-style: none;\n  padding: 0; }\n\n/**\r\n * Restore the focus styles unset by the previous rule.\r\n */\nbutton:-moz-focusring,\n[type=\"button\"]:-moz-focusring,\n[type=\"reset\"]:-moz-focusring,\n[type=\"submit\"]:-moz-focusring {\n  outline: 1px dotted ButtonText; }\n\n/**\r\n * Correct the padding in Firefox.\r\n */\nfieldset {\n  padding: 0.35em 0.75em 0.625em; }\n\n/**\r\n * 1. Correct the text wrapping in Edge and IE.\r\n * 2. Correct the color inheritance from `fieldset` elements in IE.\r\n * 3. Remove the padding so developers are not caught out when they zero out\r\n *    `fieldset` elements in all browsers.\r\n */\nlegend {\n  box-sizing: border-box;\n  /* 1 */\n  color: inherit;\n  /* 2 */\n  display: table;\n  /* 1 */\n  max-width: 100%;\n  /* 1 */\n  padding: 0;\n  /* 3 */\n  white-space: normal;\n  /* 1 */ }\n\n/**\r\n * 1. Add the correct display in IE 9-.\r\n * 2. Add the correct vertical alignment in Chrome, Firefox, and Opera.\r\n */\nprogress {\n  display: inline-block;\n  /* 1 */\n  vertical-align: baseline;\n  /* 2 */ }\n\n/**\r\n * Remove the default vertical scrollbar in IE.\r\n */\ntextarea {\n  overflow: auto; }\n\n/**\r\n * 1. Add the correct box sizing in IE 10-.\r\n * 2. Remove the padding in IE 10-.\r\n */\n[type=\"checkbox\"],\n[type=\"radio\"] {\n  box-sizing: border-box;\n  /* 1 */\n  padding: 0;\n  /* 2 */ }\n\n/**\r\n * Correct the cursor style of increment and decrement buttons in Chrome.\r\n */\n[type=\"number\"]::-webkit-inner-spin-button,\n[type=\"number\"]::-webkit-outer-spin-button {\n  height: auto; }\n\n/**\r\n * 1. Correct the odd appearance in Chrome and Safari.\r\n * 2. Correct the outline style in Safari.\r\n */\n[type=\"search\"] {\n  -webkit-appearance: textfield;\n  /* 1 */\n  outline-offset: -2px;\n  /* 2 */ }\n\n/**\r\n * Remove the inner padding and cancel buttons in Chrome and Safari on macOS.\r\n */\n[type=\"search\"]::-webkit-search-cancel-button,\n[type=\"search\"]::-webkit-search-decoration {\n  -webkit-appearance: none; }\n\n/**\r\n * 1. Correct the inability to style clickable types in iOS and Safari.\r\n * 2. Change font properties to `inherit` in Safari.\r\n */\n::-webkit-file-upload-button {\n  -webkit-appearance: button;\n  /* 1 */\n  font: inherit;\n  /* 2 */ }\n\n/* Interactive\r\n   ========================================================================== */\n/*\r\n * Add the correct display in IE 9-.\r\n * 1. Add the correct display in Edge, IE, and Firefox.\r\n */\ndetails,\nmenu {\n  display: block; }\n\n/*\r\n * Add the correct display in all browsers.\r\n */\nsummary {\n  display: list-item; }\n\n/* Scripting\r\n   ========================================================================== */\n/**\r\n * Add the correct display in IE 9-.\r\n */\ncanvas {\n  display: inline-block; }\n\n/**\r\n * Add the correct display in IE.\r\n */\ntemplate {\n  display: none; }\n\n/* Hidden\r\n   ========================================================================== */\n/**\r\n * Add the correct display in IE 10-.\r\n */\n[hidden] {\n  display: none; }\n\nhtml {\n  box-sizing: border-box; }\n\n*, *:before, *:after {\n  box-sizing: inherit; }\n\nbutton,\ninput,\noptgroup,\nselect,\ntextarea {\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Oxygen-Sans, Ubuntu, Cantarell, \"Helvetica Neue\", sans-serif; }\n\nul:not(.browser-default) {\n  padding-left: 0;\n  list-style-type: none; }\n  ul:not(.browser-default) > li {\n    list-style-type: none; }\n\na {\n  color: #039be5;\n  text-decoration: none;\n  -webkit-tap-highlight-color: transparent; }\n\n.valign-wrapper {\n  display: flex;\n  align-items: center; }\n\n.clearfix {\n  clear: both; }\n\n.z-depth-0 {\n  box-shadow: none !important; }\n\n/* 2dp elevation modified*/\n.z-depth-1, nav, .card-panel, .card, .toast, .btn, .btn-large, .btn-floating, .dropdown-content, .collapsible, .sidenav {\n  box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 3px 1px -2px rgba(0, 0, 0, 0.12), 0 1px 5px 0 rgba(0, 0, 0, 0.2); }\n\n.z-depth-1-half, .btn:hover, .btn-large:hover, .btn-floating:hover {\n  box-shadow: 0 3px 3px 0 rgba(0, 0, 0, 0.14), 0 1px 7px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -1px rgba(0, 0, 0, 0.2); }\n\n/* 6dp elevation modified*/\n.z-depth-2 {\n  box-shadow: 0 4px 5px 0 rgba(0, 0, 0, 0.14), 0 1px 10px 0 rgba(0, 0, 0, 0.12), 0 2px 4px -1px rgba(0, 0, 0, 0.3); }\n\n/* 12dp elevation modified*/\n.z-depth-3 {\n  box-shadow: 0 8px 17px 2px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2); }\n\n/* 16dp elevation */\n.z-depth-4 {\n  box-shadow: 0 16px 24px 2px rgba(0, 0, 0, 0.14), 0 6px 30px 5px rgba(0, 0, 0, 0.12), 0 8px 10px -7px rgba(0, 0, 0, 0.2); }\n\n/* 24dp elevation */\n.z-depth-5, .modal {\n  box-shadow: 0 24px 38px 3px rgba(0, 0, 0, 0.14), 0 9px 46px 8px rgba(0, 0, 0, 0.12), 0 11px 15px -7px rgba(0, 0, 0, 0.2); }\n\n.hoverable {\n  transition: box-shadow .25s; }\n  .hoverable:hover {\n    box-shadow: 0 8px 17px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19); }\n\n.divider {\n  height: 1px;\n  overflow: hidden;\n  background-color: #e0e0e0; }\n\nblockquote {\n  margin: 20px 0;\n  padding-left: 1.5rem;\n  border-left: 5px solid #64B5F6; }\n\ni {\n  line-height: inherit; }\n  i.left {\n    float: left;\n    margin-right: 15px; }\n  i.right {\n    float: right;\n    margin-left: 15px; }\n  i.tiny {\n    font-size: 1rem; }\n  i.small {\n    font-size: 2rem; }\n  i.medium {\n    font-size: 4rem; }\n  i.large {\n    font-size: 6rem; }\n\nimg.responsive-img,\nvideo.responsive-video {\n  max-width: 100%;\n  height: auto; }\n\n.pagination li {\n  display: inline-block;\n  border-radius: 2px;\n  text-align: center;\n  vertical-align: top;\n  height: 30px; }\n  .pagination li a {\n    color: #444;\n    display: inline-block;\n    font-size: 1.2rem;\n    padding: 0 10px;\n    line-height: 30px; }\n  .pagination li.active a {\n    color: #fff; }\n  .pagination li.active {\n    background-color: #64B5F6; }\n  .pagination li.disabled a {\n    cursor: default;\n    color: #999; }\n  .pagination li i {\n    font-size: 2rem; }\n\n.pagination li.pages ul li {\n  display: inline-block;\n  float: none; }\n\n@media only screen and (max-width: 992px) {\n  .pagination {\n    width: 100%; }\n    .pagination li.prev,\n    .pagination li.next {\n      width: 10%; }\n    .pagination li.pages {\n      width: 80%;\n      overflow: hidden;\n      white-space: nowrap; } }\n\n.breadcrumb {\n  font-size: 18px;\n  color: rgba(255, 255, 255, 0.7); }\n  .breadcrumb i,\n  .breadcrumb [class^=\"mdi-\"], .breadcrumb [class*=\"mdi-\"],\n  .breadcrumb i.material-icons {\n    display: inline-block;\n    float: left;\n    font-size: 24px; }\n  .breadcrumb:before {\n    content: '\\E5CC';\n    color: rgba(255, 255, 255, 0.7);\n    vertical-align: top;\n    display: inline-block;\n    font-family: 'Material Icons';\n    font-weight: normal;\n    font-style: normal;\n    font-size: 25px;\n    margin: 0 10px 0 8px;\n    -webkit-font-smoothing: antialiased; }\n  .breadcrumb:first-child:before {\n    display: none; }\n  .breadcrumb:last-child {\n    color: #fff; }\n\n.parallax-container {\n  position: relative;\n  overflow: hidden;\n  height: 500px; }\n  .parallax-container .parallax {\n    position: absolute;\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0;\n    z-index: -1; }\n    .parallax-container .parallax img {\n      opacity: 0;\n      position: absolute;\n      left: 50%;\n      bottom: 0;\n      min-width: 100%;\n      min-height: 100%;\n      transform: translate3d(0, 0, 0);\n      transform: translateX(-50%); }\n\n.pin-top, .pin-bottom {\n  position: relative; }\n\n.pinned {\n  position: fixed !important; }\n\n/*********************\r\n  Transition Classes\r\n**********************/\nul.staggered-list li {\n  opacity: 0; }\n\n.fade-in {\n  opacity: 0;\n  transform-origin: 0 50%; }\n\n/*********************\r\n  Media Query Classes\r\n**********************/\n@media only screen and (max-width: 600px) {\n  .hide-on-small-only, .hide-on-small-and-down {\n    display: none !important; } }\n\n@media only screen and (max-width: 992px) {\n  .hide-on-med-and-down {\n    display: none !important; } }\n\n@media only screen and (min-width: 601px) {\n  .hide-on-med-and-up {\n    display: none !important; } }\n\n@media only screen and (min-width: 600px) and (max-width: 992px) {\n  .hide-on-med-only {\n    display: none !important; } }\n\n@media only screen and (min-width: 993px) {\n  .hide-on-large-only {\n    display: none !important; } }\n\n@media only screen and (min-width: 993px) {\n  .show-on-large {\n    display: block !important; } }\n\n@media only screen and (min-width: 600px) and (max-width: 992px) {\n  .show-on-medium {\n    display: block !important; } }\n\n@media only screen and (max-width: 600px) {\n  .show-on-small {\n    display: block !important; } }\n\n@media only screen and (min-width: 601px) {\n  .show-on-medium-and-up {\n    display: block !important; } }\n\n@media only screen and (max-width: 992px) {\n  .show-on-medium-and-down {\n    display: block !important; } }\n\n@media only screen and (max-width: 600px) {\n  .center-on-small-only {\n    text-align: center; } }\n\n.page-footer {\n  padding-top: 20px;\n  color: rgba(0, 0, 0, 0.87);\n  background-color: #64B5F6; }\n  .page-footer .footer-copyright {\n    overflow: hidden;\n    min-height: 50px;\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    padding: 10px 0px;\n    color: rgba(255, 255, 255, 0.8);\n    background-color: rgba(51, 51, 51, 0.08); }\n\ntable, th, td {\n  border: none; }\n\ntable {\n  width: 100%;\n  display: table;\n  border-collapse: collapse;\n  border-spacing: 0; }\n  table.striped tr {\n    border-bottom: none; }\n  table.striped > tbody > tr:nth-child(odd) {\n    background-color: rgba(242, 242, 242, 0.5); }\n  table.striped > tbody > tr > td {\n    border-radius: 0; }\n  table.highlight > tbody > tr {\n    transition: background-color .25s ease; }\n    table.highlight > tbody > tr:hover {\n      background-color: rgba(242, 242, 242, 0.5); }\n  table.centered thead tr th, table.centered tbody tr td {\n    text-align: center; }\n\ntr {\n  border-bottom: 1px solid rgba(0, 0, 0, 0.12); }\n\ntd, th {\n  padding: 15px 5px;\n  display: table-cell;\n  text-align: left;\n  vertical-align: middle;\n  border-radius: 2px; }\n\n@media only screen and (max-width: 992px) {\n  table.responsive-table {\n    width: 100%;\n    border-collapse: collapse;\n    border-spacing: 0;\n    display: block;\n    position: relative;\n    /* sort out borders */ }\n    table.responsive-table td:empty:before {\n      content: '\\A0'; }\n    table.responsive-table th,\n    table.responsive-table td {\n      margin: 0;\n      vertical-align: top; }\n    table.responsive-table th {\n      text-align: left; }\n    table.responsive-table thead {\n      display: block;\n      float: left; }\n      table.responsive-table thead tr {\n        display: block;\n        padding: 0 10px 0 0; }\n        table.responsive-table thead tr th::before {\n          content: \"\\A0\"; }\n    table.responsive-table tbody {\n      display: block;\n      width: auto;\n      position: relative;\n      overflow-x: auto;\n      white-space: nowrap; }\n      table.responsive-table tbody tr {\n        display: inline-block;\n        vertical-align: top; }\n    table.responsive-table th {\n      display: block;\n      text-align: right; }\n    table.responsive-table td {\n      display: block;\n      min-height: 1.25em;\n      text-align: left; }\n    table.responsive-table tr {\n      border-bottom: none;\n      padding: 0 10px; }\n    table.responsive-table thead {\n      border: 0;\n      border-right: 1px solid rgba(0, 0, 0, 0.12); } }\n\n.collection {\n  margin: 0.5rem 0 1rem 0;\n  border: 1px solid #e0e0e0;\n  border-radius: 2px;\n  overflow: hidden;\n  position: relative; }\n  .collection .collection-item {\n    background-color: #fff;\n    line-height: 1.5rem;\n    padding: 10px 20px;\n    margin: 0;\n    border-bottom: 1px solid #e0e0e0; }\n    .collection .collection-item.avatar {\n      min-height: 84px;\n      padding-left: 72px;\n      position: relative; }\n      .collection .collection-item.avatar:not(.circle-clipper) > .circle,\n      .collection .collection-item.avatar :not(.circle-clipper) > .circle {\n        position: absolute;\n        width: 42px;\n        height: 42px;\n        overflow: hidden;\n        left: 15px;\n        display: inline-block;\n        vertical-align: middle; }\n      .collection .collection-item.avatar i.circle {\n        font-size: 18px;\n        line-height: 42px;\n        color: #fff;\n        background-color: #999;\n        text-align: center; }\n      .collection .collection-item.avatar .title {\n        font-size: 16px; }\n      .collection .collection-item.avatar p {\n        margin: 0; }\n      .collection .collection-item.avatar .secondary-content {\n        position: absolute;\n        top: 16px;\n        right: 16px; }\n    .collection .collection-item:last-child {\n      border-bottom: none; }\n    .collection .collection-item.active {\n      background-color: #ab47bc;\n      color: white; }\n      .collection .collection-item.active .secondary-content {\n        color: #fff; }\n  .collection a.collection-item {\n    display: block;\n    transition: .25s;\n    color: #ab47bc; }\n    .collection a.collection-item:not(.active):hover {\n      background-color: #ddd; }\n  .collection.with-header .collection-header {\n    background-color: #fff;\n    border-bottom: 1px solid #e0e0e0;\n    padding: 10px 20px; }\n  .collection.with-header .collection-item {\n    padding-left: 30px; }\n  .collection.with-header .collection-item.avatar {\n    padding-left: 72px; }\n\n.secondary-content {\n  float: right;\n  color: #ab47bc; }\n\n.collapsible .collection {\n  margin: 0;\n  border: none; }\n\n.video-container {\n  position: relative;\n  padding-bottom: 56.25%;\n  height: 0;\n  overflow: hidden; }\n  .video-container iframe, .video-container object, .video-container embed {\n    position: absolute;\n    top: 0;\n    left: 0;\n    width: 100%;\n    height: 100%; }\n\n.progress {\n  position: relative;\n  height: 4px;\n  display: block;\n  width: 100%;\n  background-color: #efddf2;\n  border-radius: 2px;\n  margin: 0.5rem 0 1rem 0;\n  overflow: hidden; }\n  .progress .determinate {\n    position: absolute;\n    top: 0;\n    left: 0;\n    bottom: 0;\n    background-color: #ab47bc;\n    transition: width .3s linear; }\n  .progress .indeterminate {\n    background-color: #ab47bc; }\n    .progress .indeterminate:before {\n      content: '';\n      position: absolute;\n      background-color: inherit;\n      top: 0;\n      left: 0;\n      bottom: 0;\n      will-change: left, right;\n      animation: indeterminate 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite; }\n    .progress .indeterminate:after {\n      content: '';\n      position: absolute;\n      background-color: inherit;\n      top: 0;\n      left: 0;\n      bottom: 0;\n      will-change: left, right;\n      animation: indeterminate-short 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite;\n      animation-delay: 1.15s; }\n\n@keyframes indeterminate {\n  0% {\n    left: -35%;\n    right: 100%; }\n  60% {\n    left: 100%;\n    right: -90%; }\n  100% {\n    left: 100%;\n    right: -90%; } }\n\n@keyframes indeterminate-short {\n  0% {\n    left: -200%;\n    right: 100%; }\n  60% {\n    left: 107%;\n    right: -8%; }\n  100% {\n    left: 107%;\n    right: -8%; } }\n\n/*******************\r\n  Utility Classes\r\n*******************/\n.hide {\n  display: none !important; }\n\n.left-align {\n  text-align: left; }\n\n.right-align {\n  text-align: right; }\n\n.center, .center-align {\n  text-align: center; }\n\n.left {\n  float: left !important; }\n\n.right {\n  float: right !important; }\n\n.no-select, input[type=range],\ninput[type=range] + .thumb {\n  user-select: none; }\n\n.circle {\n  border-radius: 50%; }\n\n.center-block {\n  display: block;\n  margin-left: auto;\n  margin-right: auto; }\n\n.truncate {\n  display: block;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis; }\n\n.no-padding {\n  padding: 0 !important; }\n\nspan.badge {\n  min-width: 3rem;\n  padding: 0 6px;\n  margin-left: 14px;\n  text-align: center;\n  font-size: 1rem;\n  line-height: 22px;\n  height: 22px;\n  color: #757575;\n  float: right;\n  box-sizing: border-box; }\n  span.badge.new {\n    font-weight: 300;\n    font-size: 0.8rem;\n    color: #fff;\n    background-color: #ab47bc;\n    border-radius: 2px; }\n  span.badge.new:after {\n    content: \" new\"; }\n  span.badge[data-badge-caption]::after {\n    content: \" \" attr(data-badge-caption); }\n\nnav ul a span.badge {\n  display: inline-block;\n  float: none;\n  margin-left: 4px;\n  line-height: 22px;\n  height: 22px;\n  -webkit-font-smoothing: auto; }\n\n.collection-item span.badge {\n  margin-top: calc(0.75rem - 11px); }\n\n.collapsible span.badge {\n  margin-left: auto; }\n\n.sidenav span.badge {\n  margin-top: calc(24px - 11px); }\n\n/* This is needed for some mobile phones to display the Google Icon font properly */\n.material-icons {\n  text-rendering: optimizeLegibility;\n  font-feature-settings: 'liga'; }\n\n.container {\n  margin: 0 auto;\n  max-width: 1280px;\n  width: 90%; }\n\n@media only screen and (min-width: 601px) {\n  .container {\n    width: 85%; } }\n\n@media only screen and (min-width: 993px) {\n  .container {\n    width: 70%; } }\n\n.col .row {\n  margin-left: -0.75rem;\n  margin-right: -0.75rem; }\n\n.section {\n  padding-top: 1rem;\n  padding-bottom: 1rem; }\n  .section.no-pad {\n    padding: 0; }\n  .section.no-pad-bot {\n    padding-bottom: 0; }\n  .section.no-pad-top {\n    padding-top: 0; }\n\n.row {\n  margin-left: auto;\n  margin-right: auto;\n  margin-bottom: 20px; }\n  .row:after {\n    content: \"\";\n    display: table;\n    clear: both; }\n  .row .col {\n    float: left;\n    box-sizing: border-box;\n    padding: 0 0.75rem;\n    min-height: 1px; }\n    .row .col[class*=\"push-\"], .row .col[class*=\"pull-\"] {\n      position: relative; }\n    .row .col.s1 {\n      width: 8.33333%;\n      margin-left: auto;\n      left: auto;\n      right: auto; }\n    .row .col.s2 {\n      width: 16.66667%;\n      margin-left: auto;\n      left: auto;\n      right: auto; }\n    .row .col.s3 {\n      width: 25%;\n      margin-left: auto;\n      left: auto;\n      right: auto; }\n    .row .col.s4 {\n      width: 33.33333%;\n      margin-left: auto;\n      left: auto;\n      right: auto; }\n    .row .col.s5 {\n      width: 41.66667%;\n      margin-left: auto;\n      left: auto;\n      right: auto; }\n    .row .col.s6 {\n      width: 50%;\n      margin-left: auto;\n      left: auto;\n      right: auto; }\n    .row .col.s7 {\n      width: 58.33333%;\n      margin-left: auto;\n      left: auto;\n      right: auto; }\n    .row .col.s8 {\n      width: 66.66667%;\n      margin-left: auto;\n      left: auto;\n      right: auto; }\n    .row .col.s9 {\n      width: 75%;\n      margin-left: auto;\n      left: auto;\n      right: auto; }\n    .row .col.s10 {\n      width: 83.33333%;\n      margin-left: auto;\n      left: auto;\n      right: auto; }\n    .row .col.s11 {\n      width: 91.66667%;\n      margin-left: auto;\n      left: auto;\n      right: auto; }\n    .row .col.s12 {\n      width: 100%;\n      margin-left: auto;\n      left: auto;\n      right: auto; }\n    .row .col.offset-s1 {\n      margin-left: 8.33333%; }\n    .row .col.pull-s1 {\n      right: 8.33333%; }\n    .row .col.push-s1 {\n      left: 8.33333%; }\n    .row .col.offset-s2 {\n      margin-left: 16.66667%; }\n    .row .col.pull-s2 {\n      right: 16.66667%; }\n    .row .col.push-s2 {\n      left: 16.66667%; }\n    .row .col.offset-s3 {\n      margin-left: 25%; }\n    .row .col.pull-s3 {\n      right: 25%; }\n    .row .col.push-s3 {\n      left: 25%; }\n    .row .col.offset-s4 {\n      margin-left: 33.33333%; }\n    .row .col.pull-s4 {\n      right: 33.33333%; }\n    .row .col.push-s4 {\n      left: 33.33333%; }\n    .row .col.offset-s5 {\n      margin-left: 41.66667%; }\n    .row .col.pull-s5 {\n      right: 41.66667%; }\n    .row .col.push-s5 {\n      left: 41.66667%; }\n    .row .col.offset-s6 {\n      margin-left: 50%; }\n    .row .col.pull-s6 {\n      right: 50%; }\n    .row .col.push-s6 {\n      left: 50%; }\n    .row .col.offset-s7 {\n      margin-left: 58.33333%; }\n    .row .col.pull-s7 {\n      right: 58.33333%; }\n    .row .col.push-s7 {\n      left: 58.33333%; }\n    .row .col.offset-s8 {\n      margin-left: 66.66667%; }\n    .row .col.pull-s8 {\n      right: 66.66667%; }\n    .row .col.push-s8 {\n      left: 66.66667%; }\n    .row .col.offset-s9 {\n      margin-left: 75%; }\n    .row .col.pull-s9 {\n      right: 75%; }\n    .row .col.push-s9 {\n      left: 75%; }\n    .row .col.offset-s10 {\n      margin-left: 83.33333%; }\n    .row .col.pull-s10 {\n      right: 83.33333%; }\n    .row .col.push-s10 {\n      left: 83.33333%; }\n    .row .col.offset-s11 {\n      margin-left: 91.66667%; }\n    .row .col.pull-s11 {\n      right: 91.66667%; }\n    .row .col.push-s11 {\n      left: 91.66667%; }\n    .row .col.offset-s12 {\n      margin-left: 100%; }\n    .row .col.pull-s12 {\n      right: 100%; }\n    .row .col.push-s12 {\n      left: 100%; }\n    @media only screen and (min-width: 601px) {\n      .row .col.m1 {\n        width: 8.33333%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.m2 {\n        width: 16.66667%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.m3 {\n        width: 25%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.m4 {\n        width: 33.33333%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.m5 {\n        width: 41.66667%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.m6 {\n        width: 50%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.m7 {\n        width: 58.33333%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.m8 {\n        width: 66.66667%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.m9 {\n        width: 75%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.m10 {\n        width: 83.33333%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.m11 {\n        width: 91.66667%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.m12 {\n        width: 100%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.offset-m1 {\n        margin-left: 8.33333%; }\n      .row .col.pull-m1 {\n        right: 8.33333%; }\n      .row .col.push-m1 {\n        left: 8.33333%; }\n      .row .col.offset-m2 {\n        margin-left: 16.66667%; }\n      .row .col.pull-m2 {\n        right: 16.66667%; }\n      .row .col.push-m2 {\n        left: 16.66667%; }\n      .row .col.offset-m3 {\n        margin-left: 25%; }\n      .row .col.pull-m3 {\n        right: 25%; }\n      .row .col.push-m3 {\n        left: 25%; }\n      .row .col.offset-m4 {\n        margin-left: 33.33333%; }\n      .row .col.pull-m4 {\n        right: 33.33333%; }\n      .row .col.push-m4 {\n        left: 33.33333%; }\n      .row .col.offset-m5 {\n        margin-left: 41.66667%; }\n      .row .col.pull-m5 {\n        right: 41.66667%; }\n      .row .col.push-m5 {\n        left: 41.66667%; }\n      .row .col.offset-m6 {\n        margin-left: 50%; }\n      .row .col.pull-m6 {\n        right: 50%; }\n      .row .col.push-m6 {\n        left: 50%; }\n      .row .col.offset-m7 {\n        margin-left: 58.33333%; }\n      .row .col.pull-m7 {\n        right: 58.33333%; }\n      .row .col.push-m7 {\n        left: 58.33333%; }\n      .row .col.offset-m8 {\n        margin-left: 66.66667%; }\n      .row .col.pull-m8 {\n        right: 66.66667%; }\n      .row .col.push-m8 {\n        left: 66.66667%; }\n      .row .col.offset-m9 {\n        margin-left: 75%; }\n      .row .col.pull-m9 {\n        right: 75%; }\n      .row .col.push-m9 {\n        left: 75%; }\n      .row .col.offset-m10 {\n        margin-left: 83.33333%; }\n      .row .col.pull-m10 {\n        right: 83.33333%; }\n      .row .col.push-m10 {\n        left: 83.33333%; }\n      .row .col.offset-m11 {\n        margin-left: 91.66667%; }\n      .row .col.pull-m11 {\n        right: 91.66667%; }\n      .row .col.push-m11 {\n        left: 91.66667%; }\n      .row .col.offset-m12 {\n        margin-left: 100%; }\n      .row .col.pull-m12 {\n        right: 100%; }\n      .row .col.push-m12 {\n        left: 100%; } }\n    @media only screen and (min-width: 993px) {\n      .row .col.l1 {\n        width: 8.33333%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.l2 {\n        width: 16.66667%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.l3 {\n        width: 25%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.l4 {\n        width: 33.33333%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.l5 {\n        width: 41.66667%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.l6 {\n        width: 50%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.l7 {\n        width: 58.33333%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.l8 {\n        width: 66.66667%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.l9 {\n        width: 75%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.l10 {\n        width: 83.33333%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.l11 {\n        width: 91.66667%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.l12 {\n        width: 100%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.offset-l1 {\n        margin-left: 8.33333%; }\n      .row .col.pull-l1 {\n        right: 8.33333%; }\n      .row .col.push-l1 {\n        left: 8.33333%; }\n      .row .col.offset-l2 {\n        margin-left: 16.66667%; }\n      .row .col.pull-l2 {\n        right: 16.66667%; }\n      .row .col.push-l2 {\n        left: 16.66667%; }\n      .row .col.offset-l3 {\n        margin-left: 25%; }\n      .row .col.pull-l3 {\n        right: 25%; }\n      .row .col.push-l3 {\n        left: 25%; }\n      .row .col.offset-l4 {\n        margin-left: 33.33333%; }\n      .row .col.pull-l4 {\n        right: 33.33333%; }\n      .row .col.push-l4 {\n        left: 33.33333%; }\n      .row .col.offset-l5 {\n        margin-left: 41.66667%; }\n      .row .col.pull-l5 {\n        right: 41.66667%; }\n      .row .col.push-l5 {\n        left: 41.66667%; }\n      .row .col.offset-l6 {\n        margin-left: 50%; }\n      .row .col.pull-l6 {\n        right: 50%; }\n      .row .col.push-l6 {\n        left: 50%; }\n      .row .col.offset-l7 {\n        margin-left: 58.33333%; }\n      .row .col.pull-l7 {\n        right: 58.33333%; }\n      .row .col.push-l7 {\n        left: 58.33333%; }\n      .row .col.offset-l8 {\n        margin-left: 66.66667%; }\n      .row .col.pull-l8 {\n        right: 66.66667%; }\n      .row .col.push-l8 {\n        left: 66.66667%; }\n      .row .col.offset-l9 {\n        margin-left: 75%; }\n      .row .col.pull-l9 {\n        right: 75%; }\n      .row .col.push-l9 {\n        left: 75%; }\n      .row .col.offset-l10 {\n        margin-left: 83.33333%; }\n      .row .col.pull-l10 {\n        right: 83.33333%; }\n      .row .col.push-l10 {\n        left: 83.33333%; }\n      .row .col.offset-l11 {\n        margin-left: 91.66667%; }\n      .row .col.pull-l11 {\n        right: 91.66667%; }\n      .row .col.push-l11 {\n        left: 91.66667%; }\n      .row .col.offset-l12 {\n        margin-left: 100%; }\n      .row .col.pull-l12 {\n        right: 100%; }\n      .row .col.push-l12 {\n        left: 100%; } }\n    @media only screen and (min-width: 1201px) {\n      .row .col.xl1 {\n        width: 8.33333%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.xl2 {\n        width: 16.66667%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.xl3 {\n        width: 25%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.xl4 {\n        width: 33.33333%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.xl5 {\n        width: 41.66667%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.xl6 {\n        width: 50%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.xl7 {\n        width: 58.33333%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.xl8 {\n        width: 66.66667%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.xl9 {\n        width: 75%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.xl10 {\n        width: 83.33333%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.xl11 {\n        width: 91.66667%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.xl12 {\n        width: 100%;\n        margin-left: auto;\n        left: auto;\n        right: auto; }\n      .row .col.offset-xl1 {\n        margin-left: 8.33333%; }\n      .row .col.pull-xl1 {\n        right: 8.33333%; }\n      .row .col.push-xl1 {\n        left: 8.33333%; }\n      .row .col.offset-xl2 {\n        margin-left: 16.66667%; }\n      .row .col.pull-xl2 {\n        right: 16.66667%; }\n      .row .col.push-xl2 {\n        left: 16.66667%; }\n      .row .col.offset-xl3 {\n        margin-left: 25%; }\n      .row .col.pull-xl3 {\n        right: 25%; }\n      .row .col.push-xl3 {\n        left: 25%; }\n      .row .col.offset-xl4 {\n        margin-left: 33.33333%; }\n      .row .col.pull-xl4 {\n        right: 33.33333%; }\n      .row .col.push-xl4 {\n        left: 33.33333%; }\n      .row .col.offset-xl5 {\n        margin-left: 41.66667%; }\n      .row .col.pull-xl5 {\n        right: 41.66667%; }\n      .row .col.push-xl5 {\n        left: 41.66667%; }\n      .row .col.offset-xl6 {\n        margin-left: 50%; }\n      .row .col.pull-xl6 {\n        right: 50%; }\n      .row .col.push-xl6 {\n        left: 50%; }\n      .row .col.offset-xl7 {\n        margin-left: 58.33333%; }\n      .row .col.pull-xl7 {\n        right: 58.33333%; }\n      .row .col.push-xl7 {\n        left: 58.33333%; }\n      .row .col.offset-xl8 {\n        margin-left: 66.66667%; }\n      .row .col.pull-xl8 {\n        right: 66.66667%; }\n      .row .col.push-xl8 {\n        left: 66.66667%; }\n      .row .col.offset-xl9 {\n        margin-left: 75%; }\n      .row .col.pull-xl9 {\n        right: 75%; }\n      .row .col.push-xl9 {\n        left: 75%; }\n      .row .col.offset-xl10 {\n        margin-left: 83.33333%; }\n      .row .col.pull-xl10 {\n        right: 83.33333%; }\n      .row .col.push-xl10 {\n        left: 83.33333%; }\n      .row .col.offset-xl11 {\n        margin-left: 91.66667%; }\n      .row .col.pull-xl11 {\n        right: 91.66667%; }\n      .row .col.push-xl11 {\n        left: 91.66667%; }\n      .row .col.offset-xl12 {\n        margin-left: 100%; }\n      .row .col.pull-xl12 {\n        right: 100%; }\n      .row .col.push-xl12 {\n        left: 100%; } }\n\nnav {\n  color: #fff;\n  background-color: #64B5F6;\n  width: 100%;\n  height: 56px;\n  line-height: 56px; }\n  nav.nav-extended {\n    height: auto; }\n    nav.nav-extended .nav-wrapper {\n      min-height: 56px;\n      height: auto; }\n    nav.nav-extended .nav-content {\n      position: relative;\n      line-height: normal; }\n  nav a {\n    color: #fff; }\n  nav i,\n  nav [class^=\"mdi-\"], nav [class*=\"mdi-\"],\n  nav i.material-icons {\n    display: block;\n    font-size: 24px;\n    height: 56px;\n    line-height: 56px; }\n  nav .nav-wrapper {\n    position: relative;\n    height: 100%; }\n  @media only screen and (min-width: 993px) {\n    nav a.sidenav-trigger {\n      display: none; } }\n  nav .sidenav-trigger {\n    float: left;\n    position: relative;\n    z-index: 1;\n    height: 56px;\n    margin: 0 18px; }\n    nav .sidenav-trigger i {\n      height: 56px;\n      line-height: 56px; }\n  nav .brand-logo {\n    position: absolute;\n    color: #fff;\n    display: inline-block;\n    font-size: 2.1rem;\n    padding: 0; }\n    nav .brand-logo.center {\n      left: 50%;\n      transform: translateX(-50%); }\n    @media only screen and (max-width: 992px) {\n      nav .brand-logo {\n        left: 50%;\n        transform: translateX(-50%); }\n        nav .brand-logo.left, nav .brand-logo.right {\n          padding: 0;\n          transform: none; }\n        nav .brand-logo.left {\n          left: 0.5rem; }\n        nav .brand-logo.right {\n          right: 0.5rem;\n          left: auto; } }\n    nav .brand-logo.right {\n      right: 0.5rem;\n      padding: 0; }\n    nav .brand-logo i,\n    nav .brand-logo [class^=\"mdi-\"], nav .brand-logo [class*=\"mdi-\"],\n    nav .brand-logo i.material-icons {\n      float: left;\n      margin-right: 15px; }\n  nav .nav-title {\n    display: inline-block;\n    font-size: 32px;\n    padding: 28px 0; }\n  nav ul {\n    margin: 0; }\n    nav ul li {\n      transition: background-color .3s;\n      float: left;\n      padding: 0; }\n      nav ul li.active {\n        background-color: rgba(0, 0, 0, 0.1); }\n    nav ul a {\n      transition: background-color .3s;\n      font-size: 1rem;\n      color: #fff;\n      display: block;\n      padding: 0 15px;\n      cursor: pointer; }\n      nav ul a.btn, nav ul a.btn-large, nav ul a.btn-large, nav ul a.btn-flat, nav ul a.btn-floating {\n        margin-top: -2px;\n        margin-left: 15px;\n        margin-right: 15px; }\n        nav ul a.btn > .material-icons, nav ul a.btn-large > .material-icons, nav ul a.btn-large > .material-icons, nav ul a.btn-flat > .material-icons, nav ul a.btn-floating > .material-icons {\n          height: inherit;\n          line-height: inherit; }\n      nav ul a:hover {\n        background-color: rgba(0, 0, 0, 0.1); }\n    nav ul.left {\n      float: left; }\n  nav form {\n    height: 100%; }\n  nav .input-field {\n    margin: 0;\n    height: 100%; }\n    nav .input-field input {\n      height: 100%;\n      font-size: 1.2rem;\n      border: none;\n      padding-left: 2rem; }\n      nav .input-field input:focus, nav .input-field input[type=text]:valid, nav .input-field input[type=password]:valid, nav .input-field input[type=email]:valid, nav .input-field input[type=url]:valid, nav .input-field input[type=date]:valid {\n        border: none;\n        box-shadow: none; }\n    nav .input-field label {\n      top: 0;\n      left: 0; }\n      nav .input-field label i {\n        color: rgba(255, 255, 255, 0.7);\n        transition: color .3s; }\n      nav .input-field label.active i {\n        color: #fff; }\n\n.navbar-fixed {\n  position: relative;\n  height: 56px;\n  z-index: 997; }\n  .navbar-fixed nav {\n    position: fixed; }\n\n@media only screen and (min-width: 601px) {\n  nav.nav-extended .nav-wrapper {\n    min-height: 64px; }\n  nav, nav .nav-wrapper i, nav a.sidenav-trigger, nav a.sidenav-trigger i {\n    height: 64px;\n    line-height: 64px; }\n  .navbar-fixed {\n    height: 64px; } }\n\na {\n  text-decoration: none; }\n\nhtml {\n  line-height: 1.5;\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Oxygen-Sans, Ubuntu, Cantarell, \"Helvetica Neue\", sans-serif;\n  font-weight: normal;\n  color: rgba(0, 0, 0, 0.87); }\n  @media only screen and (min-width: 0) {\n    html {\n      font-size: 14px; } }\n  @media only screen and (min-width: 992px) {\n    html {\n      font-size: 14.5px; } }\n  @media only screen and (min-width: 1200px) {\n    html {\n      font-size: 15px; } }\n\nh1, h2, h3, h4, h5, h6 {\n  font-weight: 400;\n  line-height: 1.3; }\n\nh1 a, h2 a, h3 a, h4 a, h5 a, h6 a {\n  font-weight: inherit; }\n\nh1 {\n  font-size: 4.2rem;\n  line-height: 110%;\n  margin: 2.8rem 0 1.68rem 0; }\n\nh2 {\n  font-size: 3.56rem;\n  line-height: 110%;\n  margin: 2.37333rem 0 1.424rem 0; }\n\nh3 {\n  font-size: 2.92rem;\n  line-height: 110%;\n  margin: 1.94667rem 0 1.168rem 0; }\n\nh4 {\n  font-size: 2.28rem;\n  line-height: 110%;\n  margin: 1.52rem 0 0.912rem 0; }\n\nh5 {\n  font-size: 1.64rem;\n  line-height: 110%;\n  margin: 1.09333rem 0 0.656rem 0; }\n\nh6 {\n  font-size: 1.15rem;\n  line-height: 110%;\n  margin: 0.76667rem 0 0.46rem 0; }\n\nem {\n  font-style: italic; }\n\nstrong {\n  font-weight: 500; }\n\nsmall {\n  font-size: 75%; }\n\n.light {\n  font-weight: 300; }\n\n.thin {\n  font-weight: 200; }\n\n@media only screen and (min-width: 360px) {\n  .flow-text {\n    font-size: 1.2rem; } }\n\n@media only screen and (min-width: 390px) {\n  .flow-text {\n    font-size: 1.224rem; } }\n\n@media only screen and (min-width: 420px) {\n  .flow-text {\n    font-size: 1.248rem; } }\n\n@media only screen and (min-width: 450px) {\n  .flow-text {\n    font-size: 1.272rem; } }\n\n@media only screen and (min-width: 480px) {\n  .flow-text {\n    font-size: 1.296rem; } }\n\n@media only screen and (min-width: 510px) {\n  .flow-text {\n    font-size: 1.32rem; } }\n\n@media only screen and (min-width: 540px) {\n  .flow-text {\n    font-size: 1.344rem; } }\n\n@media only screen and (min-width: 570px) {\n  .flow-text {\n    font-size: 1.368rem; } }\n\n@media only screen and (min-width: 600px) {\n  .flow-text {\n    font-size: 1.392rem; } }\n\n@media only screen and (min-width: 630px) {\n  .flow-text {\n    font-size: 1.416rem; } }\n\n@media only screen and (min-width: 660px) {\n  .flow-text {\n    font-size: 1.44rem; } }\n\n@media only screen and (min-width: 690px) {\n  .flow-text {\n    font-size: 1.464rem; } }\n\n@media only screen and (min-width: 720px) {\n  .flow-text {\n    font-size: 1.488rem; } }\n\n@media only screen and (min-width: 750px) {\n  .flow-text {\n    font-size: 1.512rem; } }\n\n@media only screen and (min-width: 780px) {\n  .flow-text {\n    font-size: 1.536rem; } }\n\n@media only screen and (min-width: 810px) {\n  .flow-text {\n    font-size: 1.56rem; } }\n\n@media only screen and (min-width: 840px) {\n  .flow-text {\n    font-size: 1.584rem; } }\n\n@media only screen and (min-width: 870px) {\n  .flow-text {\n    font-size: 1.608rem; } }\n\n@media only screen and (min-width: 900px) {\n  .flow-text {\n    font-size: 1.632rem; } }\n\n@media only screen and (min-width: 930px) {\n  .flow-text {\n    font-size: 1.656rem; } }\n\n@media only screen and (min-width: 960px) {\n  .flow-text {\n    font-size: 1.68rem; } }\n\n@media only screen and (max-width: 360px) {\n  .flow-text {\n    font-size: 1.2rem; } }\n\n.scale-transition {\n  transition: transform 0.3s cubic-bezier(0.53, 0.01, 0.36, 1.63) !important; }\n  .scale-transition.scale-out {\n    transform: scale(0);\n    transition: transform .2s !important; }\n  .scale-transition.scale-in {\n    transform: scale(1); }\n\n.card-panel {\n  transition: box-shadow .25s;\n  padding: 24px;\n  margin: 0.5rem 0 1rem 0;\n  border-radius: 2px;\n  background-color: #fff; }\n\n.card {\n  position: relative;\n  margin: 0.5rem 0 1rem 0;\n  background-color: #fff;\n  transition: box-shadow .25s;\n  border-radius: 2px; }\n  .card .card-title {\n    font-size: 24px;\n    font-weight: 300; }\n    .card .card-title.activator {\n      cursor: pointer; }\n  .card.small, .card.medium, .card.large {\n    position: relative; }\n    .card.small .card-image, .card.medium .card-image, .card.large .card-image {\n      max-height: 60%;\n      overflow: hidden; }\n    .card.small .card-image + .card-content, .card.medium .card-image + .card-content, .card.large .card-image + .card-content {\n      max-height: 40%; }\n    .card.small .card-content, .card.medium .card-content, .card.large .card-content {\n      max-height: 100%;\n      overflow: hidden; }\n    .card.small .card-action, .card.medium .card-action, .card.large .card-action {\n      position: absolute;\n      bottom: 0;\n      left: 0;\n      right: 0; }\n  .card.small {\n    height: 300px; }\n  .card.medium {\n    height: 400px; }\n  .card.large {\n    height: 500px; }\n  .card.horizontal {\n    display: flex; }\n    .card.horizontal.small .card-image, .card.horizontal.medium .card-image, .card.horizontal.large .card-image {\n      height: 100%;\n      max-height: none;\n      overflow: visible; }\n      .card.horizontal.small .card-image img, .card.horizontal.medium .card-image img, .card.horizontal.large .card-image img {\n        height: 100%; }\n    .card.horizontal .card-image {\n      max-width: 50%; }\n      .card.horizontal .card-image img {\n        border-radius: 2px 0 0 2px;\n        max-width: 100%;\n        width: auto; }\n    .card.horizontal .card-stacked {\n      display: flex;\n      flex-direction: column;\n      flex: 1;\n      position: relative; }\n      .card.horizontal .card-stacked .card-content {\n        flex-grow: 1; }\n  .card.sticky-action .card-action {\n    z-index: 2; }\n  .card.sticky-action .card-reveal {\n    z-index: 1;\n    padding-bottom: 64px; }\n  .card .card-image {\n    position: relative; }\n    .card .card-image img {\n      display: block;\n      border-radius: 2px 2px 0 0;\n      position: relative;\n      left: 0;\n      right: 0;\n      top: 0;\n      bottom: 0;\n      width: 100%; }\n    .card .card-image .card-title {\n      color: #fff;\n      position: absolute;\n      bottom: 0;\n      left: 0;\n      max-width: 100%;\n      padding: 24px; }\n  .card .card-content {\n    padding: 24px;\n    border-radius: 0 0 2px 2px; }\n    .card .card-content p {\n      margin: 0; }\n    .card .card-content .card-title {\n      display: block;\n      line-height: 32px;\n      margin-bottom: 8px; }\n      .card .card-content .card-title i {\n        line-height: 32px; }\n  .card .card-action {\n    position: relative;\n    border-top: 1px solid rgba(160, 160, 160, 0.2);\n    padding: 16px 24px; }\n    .card .card-action:last-child {\n      border-radius: 0 0 2px 2px; }\n    .card .card-action a:not(.btn):not(.btn-large):not(.btn-large):not(.btn-floating) {\n      color: #ffab40;\n      margin-right: 24px;\n      transition: color .3s ease;\n      text-transform: uppercase; }\n      .card .card-action a:not(.btn):not(.btn-large):not(.btn-large):not(.btn-floating):hover {\n        color: #ffd8a6; }\n  .card .card-reveal {\n    padding: 24px;\n    position: absolute;\n    background-color: #fff;\n    width: 100%;\n    overflow-y: auto;\n    left: 0;\n    top: 100%;\n    height: 100%;\n    z-index: 3;\n    display: none; }\n    .card .card-reveal .card-title {\n      cursor: pointer;\n      display: block; }\n\n#toast-container {\n  display: block;\n  position: fixed;\n  z-index: 10000; }\n  @media only screen and (max-width: 600px) {\n    #toast-container {\n      min-width: 100%;\n      bottom: 0%; } }\n  @media only screen and (min-width: 601px) and (max-width: 992px) {\n    #toast-container {\n      left: 5%;\n      bottom: 7%;\n      max-width: 90%; } }\n  @media only screen and (min-width: 993px) {\n    #toast-container {\n      top: 10%;\n      right: 7%;\n      max-width: 86%; } }\n\n.toast {\n  border-radius: 2px;\n  top: 35px;\n  width: auto;\n  margin-top: 10px;\n  position: relative;\n  max-width: 100%;\n  height: auto;\n  min-height: 48px;\n  line-height: 1.5em;\n  word-break: break-all;\n  background-color: #323232;\n  padding: 10px 25px;\n  font-size: 1.1rem;\n  font-weight: 300;\n  color: #fff;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  cursor: default; }\n  .toast .toast-action {\n    color: #eeff41;\n    font-weight: 500;\n    margin-right: -25px;\n    margin-left: 3rem; }\n  .toast.rounded {\n    border-radius: 24px; }\n  @media only screen and (max-width: 600px) {\n    .toast {\n      width: 100%;\n      border-radius: 0; } }\n\n.tabs {\n  position: relative;\n  overflow-x: auto;\n  overflow-y: hidden;\n  height: 48px;\n  width: 100%;\n  background-color: #fff;\n  margin: 0 auto;\n  white-space: nowrap; }\n  .tabs.tabs-transparent {\n    background-color: transparent; }\n    .tabs.tabs-transparent .tab a,\n    .tabs.tabs-transparent .tab.disabled a,\n    .tabs.tabs-transparent .tab.disabled a:hover {\n      color: rgba(255, 255, 255, 0.7); }\n    .tabs.tabs-transparent .tab a:hover,\n    .tabs.tabs-transparent .tab a.active {\n      color: #fff; }\n    .tabs.tabs-transparent .indicator {\n      background-color: #fff; }\n  .tabs.tabs-fixed-width {\n    display: flex; }\n    .tabs.tabs-fixed-width .tab {\n      flex-grow: 1; }\n  .tabs .tab {\n    display: inline-block;\n    text-align: center;\n    line-height: 48px;\n    height: 48px;\n    padding: 0;\n    margin: 0;\n    text-transform: uppercase; }\n    .tabs .tab a {\n      color: rgba(100, 181, 246, 0.7);\n      display: block;\n      width: 100%;\n      height: 100%;\n      padding: 0 24px;\n      font-size: 14px;\n      text-overflow: ellipsis;\n      overflow: hidden;\n      transition: color .28s ease; }\n      .tabs .tab a:hover, .tabs .tab a.active {\n        background-color: transparent;\n        color: #64B5F6; }\n    .tabs .tab.disabled a,\n    .tabs .tab.disabled a:hover {\n      color: rgba(100, 181, 246, 0.4);\n      cursor: default; }\n  .tabs .indicator {\n    position: absolute;\n    bottom: 0;\n    height: 2px;\n    background-color: #acd8fa;\n    will-change: left, right; }\n\n@media only screen and (max-width: 992px) {\n  .tabs {\n    display: flex; }\n    .tabs .tab {\n      flex-grow: 1; }\n      .tabs .tab a {\n        padding: 0 12px; } }\n\n.material-tooltip {\n  padding: 10px 8px;\n  font-size: 1rem;\n  z-index: 2000;\n  background-color: transparent;\n  border-radius: 2px;\n  color: #fff;\n  min-height: 36px;\n  line-height: 120%;\n  opacity: 0;\n  position: absolute;\n  text-align: center;\n  max-width: calc(100% - 4px);\n  overflow: hidden;\n  left: 0;\n  top: 0;\n  pointer-events: none;\n  visibility: hidden;\n  background-color: #323232; }\n\n.backdrop {\n  position: absolute;\n  opacity: 0;\n  height: 7px;\n  width: 14px;\n  border-radius: 0 0 50% 50%;\n  background-color: #323232;\n  z-index: -1;\n  transform-origin: 50% 0%;\n  visibility: hidden; }\n\n.btn, .btn-large,\n.btn-flat {\n  border: none;\n  border-radius: 2px;\n  display: inline-block;\n  height: 36px;\n  line-height: 36px;\n  padding: 0 2rem;\n  text-transform: uppercase;\n  vertical-align: middle;\n  -webkit-tap-highlight-color: transparent; }\n\n.btn.disabled, .disabled.btn-large,\n.btn-floating.disabled,\n.btn-large.disabled,\n.btn-flat.disabled,\n.btn:disabled,\n.btn-large:disabled,\n.btn-floating:disabled,\n.btn-large:disabled,\n.btn-flat:disabled,\n.btn[disabled],\n[disabled].btn-large,\n.btn-floating[disabled],\n.btn-large[disabled],\n.btn-flat[disabled] {\n  pointer-events: none;\n  background-color: #DFDFDF !important;\n  box-shadow: none;\n  color: #9F9F9F !important;\n  cursor: default; }\n  .btn.disabled:hover, .disabled.btn-large:hover,\n  .btn-floating.disabled:hover,\n  .btn-large.disabled:hover,\n  .btn-flat.disabled:hover,\n  .btn:disabled:hover,\n  .btn-large:disabled:hover,\n  .btn-floating:disabled:hover,\n  .btn-large:disabled:hover,\n  .btn-flat:disabled:hover,\n  .btn[disabled]:hover,\n  [disabled].btn-large:hover,\n  .btn-floating[disabled]:hover,\n  .btn-large[disabled]:hover,\n  .btn-flat[disabled]:hover {\n    background-color: #DFDFDF !important;\n    color: #9F9F9F !important; }\n\n.btn, .btn-large,\n.btn-floating,\n.btn-large,\n.btn-flat {\n  font-size: 1rem;\n  outline: 0; }\n  .btn i, .btn-large i,\n  .btn-floating i,\n  .btn-large i,\n  .btn-flat i {\n    font-size: 1.3rem;\n    line-height: inherit; }\n\n.btn:focus, .btn-large:focus,\n.btn-floating:focus {\n  background-color: #8a3898; }\n\n.btn, .btn-large {\n  text-decoration: none;\n  color: #fff;\n  background-color: #ab47bc;\n  text-align: center;\n  letter-spacing: .5px;\n  transition: background-color .2s ease-out;\n  cursor: pointer; }\n  .btn:hover, .btn-large:hover {\n    background-color: #b45ac3; }\n\n.btn-floating {\n  display: inline-block;\n  color: #fff;\n  position: relative;\n  overflow: hidden;\n  z-index: 1;\n  width: 40px;\n  height: 40px;\n  line-height: 40px;\n  padding: 0;\n  background-color: #ab47bc;\n  border-radius: 50%;\n  transition: background-color .3s;\n  cursor: pointer;\n  vertical-align: middle; }\n  .btn-floating:hover {\n    background-color: #ab47bc; }\n  .btn-floating:before {\n    border-radius: 0; }\n  .btn-floating.btn-large {\n    width: 56px;\n    height: 56px; }\n    .btn-floating.btn-large.halfway-fab {\n      bottom: -28px; }\n    .btn-floating.btn-large i {\n      line-height: 56px; }\n  .btn-floating.halfway-fab {\n    position: absolute;\n    right: 24px;\n    bottom: -20px; }\n    .btn-floating.halfway-fab.left {\n      right: auto;\n      left: 24px; }\n  .btn-floating i {\n    width: inherit;\n    display: inline-block;\n    text-align: center;\n    color: #fff;\n    font-size: 1.6rem;\n    line-height: 40px; }\n\nbutton.btn-floating {\n  border: none; }\n\n.fixed-action-btn {\n  position: fixed;\n  right: 23px;\n  bottom: 23px;\n  padding-top: 15px;\n  margin-bottom: 0;\n  z-index: 997; }\n  .fixed-action-btn.active ul {\n    visibility: visible; }\n  .fixed-action-btn.direction-left, .fixed-action-btn.direction-right {\n    padding: 0 0 0 15px; }\n    .fixed-action-btn.direction-left ul, .fixed-action-btn.direction-right ul {\n      text-align: right;\n      right: 64px;\n      top: 50%;\n      transform: translateY(-50%);\n      height: 100%;\n      left: auto;\n      width: 500px;\n      /*width 100% only goes to width of button container */ }\n      .fixed-action-btn.direction-left ul li, .fixed-action-btn.direction-right ul li {\n        display: inline-block;\n        margin: 7.5px 15px 0 0; }\n  .fixed-action-btn.direction-right {\n    padding: 0 15px 0 0; }\n    .fixed-action-btn.direction-right ul {\n      text-align: left;\n      direction: rtl;\n      left: 64px;\n      right: auto; }\n      .fixed-action-btn.direction-right ul li {\n        margin: 7.5px 0 0 15px; }\n  .fixed-action-btn.direction-bottom {\n    padding: 0 0 15px 0; }\n    .fixed-action-btn.direction-bottom ul {\n      top: 64px;\n      bottom: auto;\n      display: flex;\n      flex-direction: column-reverse; }\n      .fixed-action-btn.direction-bottom ul li {\n        margin: 15px 0 0 0; }\n  .fixed-action-btn.toolbar {\n    padding: 0;\n    height: 56px; }\n    .fixed-action-btn.toolbar.active > a i {\n      opacity: 0; }\n    .fixed-action-btn.toolbar ul {\n      display: flex;\n      top: 0;\n      bottom: 0;\n      z-index: 1; }\n      .fixed-action-btn.toolbar ul li {\n        flex: 1;\n        display: inline-block;\n        margin: 0;\n        height: 100%;\n        transition: none; }\n        .fixed-action-btn.toolbar ul li a {\n          display: block;\n          overflow: hidden;\n          position: relative;\n          width: 100%;\n          height: 100%;\n          background-color: transparent;\n          box-shadow: none;\n          color: #fff;\n          line-height: 56px;\n          z-index: 1; }\n          .fixed-action-btn.toolbar ul li a i {\n            line-height: inherit; }\n  .fixed-action-btn ul {\n    left: 0;\n    right: 0;\n    text-align: center;\n    position: absolute;\n    bottom: 64px;\n    margin: 0;\n    visibility: hidden; }\n    .fixed-action-btn ul li {\n      margin-bottom: 15px; }\n    .fixed-action-btn ul a.btn-floating {\n      opacity: 0; }\n  .fixed-action-btn .fab-backdrop {\n    position: absolute;\n    top: 0;\n    left: 0;\n    z-index: -1;\n    width: 40px;\n    height: 40px;\n    background-color: #ab47bc;\n    border-radius: 50%;\n    transform: scale(0); }\n\n.btn-flat {\n  box-shadow: none;\n  background-color: transparent;\n  color: #343434;\n  cursor: pointer;\n  transition: background-color .2s; }\n  .btn-flat:focus, .btn-flat:hover {\n    box-shadow: none; }\n  .btn-flat:focus {\n    background-color: rgba(0, 0, 0, 0.1); }\n  .btn-flat.disabled {\n    background-color: transparent !important;\n    color: #b3b3b3 !important;\n    cursor: default; }\n\n.btn-large {\n  height: 54px;\n  line-height: 54px; }\n  .btn-large i {\n    font-size: 1.6rem; }\n\n.btn-block {\n  display: block; }\n\n.dropdown-content {\n  background-color: #fff;\n  margin: 0;\n  display: none;\n  min-width: 100px;\n  overflow-y: auto;\n  opacity: 0;\n  position: absolute;\n  z-index: 999;\n  transform-origin: 0 0; }\n  .dropdown-content:focus {\n    outline: 0; }\n  .dropdown-content li {\n    clear: both;\n    color: rgba(0, 0, 0, 0.87);\n    cursor: pointer;\n    min-height: 50px;\n    line-height: 1.5rem;\n    width: 100%;\n    text-align: left; }\n    .dropdown-content li:hover, .dropdown-content li.active {\n      background-color: #eee; }\n    .dropdown-content li:focus {\n      outline: none;\n      background-color: #dadada; }\n    .dropdown-content li.divider {\n      min-height: 0;\n      height: 1px; }\n    .dropdown-content li > a, .dropdown-content li > span {\n      font-size: 16px;\n      color: #ab47bc;\n      display: block;\n      line-height: 22px;\n      padding: 14px 16px; }\n    .dropdown-content li > span > label {\n      top: 1px;\n      left: 0;\n      height: 18px; }\n    .dropdown-content li > a > i {\n      height: inherit;\n      line-height: inherit;\n      float: left;\n      margin: 0 24px 0 0;\n      width: 24px; }\n\n.input-field.col .dropdown-content [type=\"checkbox\"] + label {\n  top: 1px;\n  left: 0;\n  height: 18px;\n  transform: none; }\n\n/*!\r\n * Waves v0.6.0\r\n * http://fian.my.id/Waves\r\n *\r\n * Copyright 2014 Alfiana E. Sibuea and other contributors\r\n * Released under the MIT license\r\n * https://github.com/fians/Waves/blob/master/LICENSE\r\n */\n.waves-effect {\n  position: relative;\n  cursor: pointer;\n  display: inline-block;\n  overflow: hidden;\n  user-select: none;\n  -webkit-tap-highlight-color: transparent;\n  vertical-align: middle;\n  z-index: 1;\n  transition: .3s ease-out; }\n  .waves-effect .waves-ripple {\n    position: absolute;\n    border-radius: 50%;\n    width: 20px;\n    height: 20px;\n    margin-top: -10px;\n    margin-left: -10px;\n    opacity: 0;\n    background: rgba(0, 0, 0, 0.2);\n    transition: all 0.7s ease-out;\n    transition-property: transform, opacity;\n    transform: scale(0);\n    pointer-events: none; }\n  .waves-effect.waves-light .waves-ripple {\n    background-color: rgba(255, 255, 255, 0.45); }\n  .waves-effect.waves-red .waves-ripple {\n    background-color: rgba(244, 67, 54, 0.7); }\n  .waves-effect.waves-yellow .waves-ripple {\n    background-color: rgba(255, 235, 59, 0.7); }\n  .waves-effect.waves-orange .waves-ripple {\n    background-color: rgba(255, 152, 0, 0.7); }\n  .waves-effect.waves-purple .waves-ripple {\n    background-color: rgba(156, 39, 176, 0.7); }\n  .waves-effect.waves-green .waves-ripple {\n    background-color: rgba(76, 175, 80, 0.7); }\n  .waves-effect.waves-teal .waves-ripple {\n    background-color: rgba(0, 150, 136, 0.7); }\n  .waves-effect input[type=\"button\"], .waves-effect input[type=\"reset\"], .waves-effect input[type=\"submit\"] {\n    border: 0;\n    font-style: normal;\n    font-size: inherit;\n    text-transform: inherit;\n    background: none; }\n  .waves-effect img {\n    position: relative;\n    z-index: -1; }\n\n.waves-notransition {\n  transition: none !important; }\n\n.waves-circle {\n  transform: translateZ(0);\n  -webkit-mask-image: -webkit-radial-gradient(circle, white 100%, black 100%); }\n\n.waves-input-wrapper {\n  border-radius: 0.2em;\n  vertical-align: bottom; }\n  .waves-input-wrapper .waves-button-input {\n    position: relative;\n    top: 0;\n    left: 0;\n    z-index: 1; }\n\n.waves-circle {\n  text-align: center;\n  width: 2.5em;\n  height: 2.5em;\n  line-height: 2.5em;\n  border-radius: 50%;\n  -webkit-mask-image: none; }\n\n.waves-block {\n  display: block; }\n\n/* Firefox Bug: link not triggered */\n.waves-effect .waves-ripple {\n  z-index: -1; }\n\n.modal {\n  display: none;\n  position: fixed;\n  left: 0;\n  right: 0;\n  background-color: #fafafa;\n  padding: 0;\n  max-height: 70%;\n  width: 55%;\n  margin: auto;\n  overflow-y: auto;\n  border-radius: 2px;\n  will-change: top, opacity; }\n  @media only screen and (max-width: 992px) {\n    .modal {\n      width: 80%; } }\n  .modal h1, .modal h2, .modal h3, .modal h4 {\n    margin-top: 0; }\n  .modal .modal-content {\n    padding: 24px; }\n  .modal .modal-close {\n    cursor: pointer; }\n  .modal .modal-footer {\n    border-radius: 0 0 2px 2px;\n    background-color: #fafafa;\n    padding: 4px 6px;\n    height: 56px;\n    width: 100%;\n    text-align: right; }\n    .modal .modal-footer .btn, .modal .modal-footer .btn-large, .modal .modal-footer .btn-flat {\n      margin: 6px 0; }\n\n.modal-overlay {\n  position: fixed;\n  z-index: 999;\n  top: -25%;\n  left: 0;\n  bottom: 0;\n  right: 0;\n  height: 125%;\n  width: 100%;\n  background: #000;\n  display: none;\n  will-change: opacity; }\n\n.modal.modal-fixed-footer {\n  padding: 0;\n  height: 70%; }\n  .modal.modal-fixed-footer .modal-content {\n    position: absolute;\n    height: calc(100% - 56px);\n    max-height: 100%;\n    width: 100%;\n    overflow-y: auto; }\n  .modal.modal-fixed-footer .modal-footer {\n    border-top: 1px solid rgba(0, 0, 0, 0.1);\n    position: absolute;\n    bottom: 0; }\n\n.modal.bottom-sheet {\n  top: auto;\n  bottom: -100%;\n  margin: 0;\n  width: 100%;\n  max-height: 45%;\n  border-radius: 0;\n  will-change: bottom, opacity; }\n\n.collapsible {\n  border-top: 1px solid #ddd;\n  border-right: 1px solid #ddd;\n  border-left: 1px solid #ddd;\n  margin: 0.5rem 0 1rem 0; }\n\n.collapsible-header {\n  display: flex;\n  cursor: pointer;\n  -webkit-tap-highlight-color: transparent;\n  line-height: 1.5;\n  padding: 1rem;\n  background-color: #fff;\n  border-bottom: 1px solid #ddd; }\n  .collapsible-header i {\n    width: 2rem;\n    font-size: 1.6rem;\n    display: inline-block;\n    text-align: center;\n    margin-right: 1rem; }\n\n.collapsible-body {\n  display: none;\n  border-bottom: 1px solid #ddd;\n  box-sizing: border-box;\n  padding: 2rem; }\n\n.sidenav .collapsible,\n.sidenav.fixed .collapsible {\n  border: none;\n  box-shadow: none; }\n  .sidenav .collapsible li,\n  .sidenav.fixed .collapsible li {\n    padding: 0; }\n\n.sidenav .collapsible-header,\n.sidenav.fixed .collapsible-header {\n  background-color: transparent;\n  border: none;\n  line-height: inherit;\n  height: inherit;\n  padding: 0 16px; }\n  .sidenav .collapsible-header:hover,\n  .sidenav.fixed .collapsible-header:hover {\n    background-color: rgba(0, 0, 0, 0.05); }\n  .sidenav .collapsible-header i,\n  .sidenav.fixed .collapsible-header i {\n    line-height: inherit; }\n\n.sidenav .collapsible-body,\n.sidenav.fixed .collapsible-body {\n  border: 0;\n  background-color: #fff; }\n  .sidenav .collapsible-body li a,\n  .sidenav.fixed .collapsible-body li a {\n    padding: 0 23.5px 0 31px; }\n\n.collapsible.popout {\n  border: none;\n  box-shadow: none; }\n  .collapsible.popout > li {\n    box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);\n    margin: 0 24px;\n    transition: margin 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94); }\n  .collapsible.popout > li.active {\n    box-shadow: 0 5px 11px 0 rgba(0, 0, 0, 0.18), 0 4px 15px 0 rgba(0, 0, 0, 0.15);\n    margin: 16px 0; }\n\n.chip {\n  display: inline-block;\n  height: 32px;\n  font-size: 13px;\n  font-weight: 500;\n  color: rgba(0, 0, 0, 0.6);\n  line-height: 32px;\n  padding: 0 12px;\n  border-radius: 16px;\n  background-color: #e4e4e4;\n  margin-bottom: 5px;\n  margin-right: 5px; }\n  .chip:focus {\n    outline: none;\n    background-color: #26a69a;\n    color: #fff; }\n  .chip > img {\n    float: left;\n    margin: 0 8px 0 -12px;\n    height: 32px;\n    width: 32px;\n    border-radius: 50%; }\n  .chip .close {\n    cursor: pointer;\n    float: right;\n    font-size: 16px;\n    line-height: 32px;\n    padding-left: 8px; }\n\n.chips {\n  border: none;\n  border-bottom: 1px solid #9e9e9e;\n  box-shadow: none;\n  margin: 0 0 8px 0;\n  min-height: 45px;\n  outline: none;\n  transition: all .3s; }\n  .chips.focus {\n    border-bottom: 1px solid #26a69a;\n    box-shadow: 0 1px 0 0 #26a69a; }\n  .chips:hover {\n    cursor: text; }\n  .chips .input {\n    background: none;\n    border: 0;\n    color: rgba(0, 0, 0, 0.6);\n    display: inline-block;\n    font-size: 16px;\n    height: 3rem;\n    line-height: 32px;\n    outline: 0;\n    margin: 0;\n    padding: 0 !important;\n    width: 120px !important; }\n  .chips .input:focus {\n    border: 0 !important;\n    box-shadow: none !important; }\n  .chips .autocomplete-content {\n    margin-top: 0;\n    margin-bottom: 0; }\n\n.prefix ~ .chips {\n  margin-left: 3rem;\n  width: 92%;\n  width: calc(100% - 3rem); }\n\n.chips:empty ~ label {\n  font-size: 0.8rem;\n  transform: translateY(-140%); }\n\n.materialboxed {\n  display: block;\n  cursor: zoom-in;\n  position: relative;\n  transition: opacity .4s;\n  -webkit-backface-visibility: hidden; }\n  .materialboxed:hover:not(.active) {\n    opacity: .8; }\n  .materialboxed.active {\n    cursor: zoom-out; }\n\n#materialbox-overlay {\n  position: fixed;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  background-color: #292929;\n  z-index: 1000;\n  will-change: opacity; }\n\n.materialbox-caption {\n  position: fixed;\n  display: none;\n  color: #fff;\n  line-height: 50px;\n  bottom: 0;\n  left: 0;\n  width: 100%;\n  text-align: center;\n  padding: 0% 15%;\n  height: 50px;\n  z-index: 1000;\n  -webkit-font-smoothing: antialiased; }\n\nselect:focus {\n  outline: 1px solid #fbf7fc; }\n\nbutton:focus {\n  outline: none;\n  background-color: #b256c1; }\n\nlabel {\n  font-size: 0.8rem;\n  color: #acd8fa; }\n\n/* Text Inputs + Textarea\r\n   ========================================================================== */\n/* Style Placeholders */\n::placeholder {\n  color: white; }\n\n/* Text inputs */\ninput:not([type]),\ninput[type=text]:not(.browser-default),\ninput[type=password]:not(.browser-default),\ninput[type=email]:not(.browser-default),\ninput[type=url]:not(.browser-default),\ninput[type=time]:not(.browser-default),\ninput[type=date]:not(.browser-default),\ninput[type=datetime]:not(.browser-default),\ninput[type=datetime-local]:not(.browser-default),\ninput[type=tel]:not(.browser-default),\ninput[type=number]:not(.browser-default),\ninput[type=search]:not(.browser-default),\ntextarea.materialize-textarea {\n  background-color: transparent;\n  border: none;\n  border-bottom: 1px solid #acd8fa;\n  border-radius: 0;\n  outline: none;\n  height: 3rem;\n  width: 100%;\n  font-size: 16px;\n  margin: 0 0 8px 0;\n  padding: 0;\n  box-shadow: none;\n  box-sizing: content-box;\n  transition: box-shadow .3s, border .3s; }\n  input:not([type]):disabled, input:not([type])[readonly=\"readonly\"],\n  input[type=text]:not(.browser-default):disabled,\n  input[type=text]:not(.browser-default)[readonly=\"readonly\"],\n  input[type=password]:not(.browser-default):disabled,\n  input[type=password]:not(.browser-default)[readonly=\"readonly\"],\n  input[type=email]:not(.browser-default):disabled,\n  input[type=email]:not(.browser-default)[readonly=\"readonly\"],\n  input[type=url]:not(.browser-default):disabled,\n  input[type=url]:not(.browser-default)[readonly=\"readonly\"],\n  input[type=time]:not(.browser-default):disabled,\n  input[type=time]:not(.browser-default)[readonly=\"readonly\"],\n  input[type=date]:not(.browser-default):disabled,\n  input[type=date]:not(.browser-default)[readonly=\"readonly\"],\n  input[type=datetime]:not(.browser-default):disabled,\n  input[type=datetime]:not(.browser-default)[readonly=\"readonly\"],\n  input[type=datetime-local]:not(.browser-default):disabled,\n  input[type=datetime-local]:not(.browser-default)[readonly=\"readonly\"],\n  input[type=tel]:not(.browser-default):disabled,\n  input[type=tel]:not(.browser-default)[readonly=\"readonly\"],\n  input[type=number]:not(.browser-default):disabled,\n  input[type=number]:not(.browser-default)[readonly=\"readonly\"],\n  input[type=search]:not(.browser-default):disabled,\n  input[type=search]:not(.browser-default)[readonly=\"readonly\"],\n  textarea.materialize-textarea:disabled,\n  textarea.materialize-textarea[readonly=\"readonly\"] {\n    color: rgba(0, 0, 0, 0.42);\n    border-bottom: 1px dotted rgba(0, 0, 0, 0.42); }\n  input:not([type]):disabled + label,\n  input:not([type])[readonly=\"readonly\"] + label,\n  input[type=text]:not(.browser-default):disabled + label,\n  input[type=text]:not(.browser-default)[readonly=\"readonly\"] + label,\n  input[type=password]:not(.browser-default):disabled + label,\n  input[type=password]:not(.browser-default)[readonly=\"readonly\"] + label,\n  input[type=email]:not(.browser-default):disabled + label,\n  input[type=email]:not(.browser-default)[readonly=\"readonly\"] + label,\n  input[type=url]:not(.browser-default):disabled + label,\n  input[type=url]:not(.browser-default)[readonly=\"readonly\"] + label,\n  input[type=time]:not(.browser-default):disabled + label,\n  input[type=time]:not(.browser-default)[readonly=\"readonly\"] + label,\n  input[type=date]:not(.browser-default):disabled + label,\n  input[type=date]:not(.browser-default)[readonly=\"readonly\"] + label,\n  input[type=datetime]:not(.browser-default):disabled + label,\n  input[type=datetime]:not(.browser-default)[readonly=\"readonly\"] + label,\n  input[type=datetime-local]:not(.browser-default):disabled + label,\n  input[type=datetime-local]:not(.browser-default)[readonly=\"readonly\"] + label,\n  input[type=tel]:not(.browser-default):disabled + label,\n  input[type=tel]:not(.browser-default)[readonly=\"readonly\"] + label,\n  input[type=number]:not(.browser-default):disabled + label,\n  input[type=number]:not(.browser-default)[readonly=\"readonly\"] + label,\n  input[type=search]:not(.browser-default):disabled + label,\n  input[type=search]:not(.browser-default)[readonly=\"readonly\"] + label,\n  textarea.materialize-textarea:disabled + label,\n  textarea.materialize-textarea[readonly=\"readonly\"] + label {\n    color: rgba(0, 0, 0, 0.42); }\n  input:not([type]):focus:not([readonly]),\n  input[type=text]:not(.browser-default):focus:not([readonly]),\n  input[type=password]:not(.browser-default):focus:not([readonly]),\n  input[type=email]:not(.browser-default):focus:not([readonly]),\n  input[type=url]:not(.browser-default):focus:not([readonly]),\n  input[type=time]:not(.browser-default):focus:not([readonly]),\n  input[type=date]:not(.browser-default):focus:not([readonly]),\n  input[type=datetime]:not(.browser-default):focus:not([readonly]),\n  input[type=datetime-local]:not(.browser-default):focus:not([readonly]),\n  input[type=tel]:not(.browser-default):focus:not([readonly]),\n  input[type=number]:not(.browser-default):focus:not([readonly]),\n  input[type=search]:not(.browser-default):focus:not([readonly]),\n  textarea.materialize-textarea:focus:not([readonly]) {\n    border-bottom: 1px solid #ab47bc;\n    box-shadow: 0 1px 0 0 #ab47bc; }\n  input:not([type]):focus:not([readonly]) + label,\n  input[type=text]:not(.browser-default):focus:not([readonly]) + label,\n  input[type=password]:not(.browser-default):focus:not([readonly]) + label,\n  input[type=email]:not(.browser-default):focus:not([readonly]) + label,\n  input[type=url]:not(.browser-default):focus:not([readonly]) + label,\n  input[type=time]:not(.browser-default):focus:not([readonly]) + label,\n  input[type=date]:not(.browser-default):focus:not([readonly]) + label,\n  input[type=datetime]:not(.browser-default):focus:not([readonly]) + label,\n  input[type=datetime-local]:not(.browser-default):focus:not([readonly]) + label,\n  input[type=tel]:not(.browser-default):focus:not([readonly]) + label,\n  input[type=number]:not(.browser-default):focus:not([readonly]) + label,\n  input[type=search]:not(.browser-default):focus:not([readonly]) + label,\n  textarea.materialize-textarea:focus:not([readonly]) + label {\n    color: #ab47bc; }\n  input:not([type]):focus.valid ~ label,\n  input[type=text]:not(.browser-default):focus.valid ~ label,\n  input[type=password]:not(.browser-default):focus.valid ~ label,\n  input[type=email]:not(.browser-default):focus.valid ~ label,\n  input[type=url]:not(.browser-default):focus.valid ~ label,\n  input[type=time]:not(.browser-default):focus.valid ~ label,\n  input[type=date]:not(.browser-default):focus.valid ~ label,\n  input[type=datetime]:not(.browser-default):focus.valid ~ label,\n  input[type=datetime-local]:not(.browser-default):focus.valid ~ label,\n  input[type=tel]:not(.browser-default):focus.valid ~ label,\n  input[type=number]:not(.browser-default):focus.valid ~ label,\n  input[type=search]:not(.browser-default):focus.valid ~ label,\n  textarea.materialize-textarea:focus.valid ~ label {\n    color: #4CAF50; }\n  input:not([type]):focus.invalid ~ label,\n  input[type=text]:not(.browser-default):focus.invalid ~ label,\n  input[type=password]:not(.browser-default):focus.invalid ~ label,\n  input[type=email]:not(.browser-default):focus.invalid ~ label,\n  input[type=url]:not(.browser-default):focus.invalid ~ label,\n  input[type=time]:not(.browser-default):focus.invalid ~ label,\n  input[type=date]:not(.browser-default):focus.invalid ~ label,\n  input[type=datetime]:not(.browser-default):focus.invalid ~ label,\n  input[type=datetime-local]:not(.browser-default):focus.invalid ~ label,\n  input[type=tel]:not(.browser-default):focus.invalid ~ label,\n  input[type=number]:not(.browser-default):focus.invalid ~ label,\n  input[type=search]:not(.browser-default):focus.invalid ~ label,\n  textarea.materialize-textarea:focus.invalid ~ label {\n    color: #ff9800; }\n  input:not([type]).validate + label,\n  input[type=text]:not(.browser-default).validate + label,\n  input[type=password]:not(.browser-default).validate + label,\n  input[type=email]:not(.browser-default).validate + label,\n  input[type=url]:not(.browser-default).validate + label,\n  input[type=time]:not(.browser-default).validate + label,\n  input[type=date]:not(.browser-default).validate + label,\n  input[type=datetime]:not(.browser-default).validate + label,\n  input[type=datetime-local]:not(.browser-default).validate + label,\n  input[type=tel]:not(.browser-default).validate + label,\n  input[type=number]:not(.browser-default).validate + label,\n  input[type=search]:not(.browser-default).validate + label,\n  textarea.materialize-textarea.validate + label {\n    width: 100%; }\n\n/* Validation Sass Placeholders */\ninput.valid:not([type]), input.valid:not([type]):focus,\ninput[type=text].valid:not(.browser-default),\ninput[type=text].valid:not(.browser-default):focus,\ninput[type=password].valid:not(.browser-default),\ninput[type=password].valid:not(.browser-default):focus,\ninput[type=email].valid:not(.browser-default),\ninput[type=email].valid:not(.browser-default):focus,\ninput[type=url].valid:not(.browser-default),\ninput[type=url].valid:not(.browser-default):focus,\ninput[type=time].valid:not(.browser-default),\ninput[type=time].valid:not(.browser-default):focus,\ninput[type=date].valid:not(.browser-default),\ninput[type=date].valid:not(.browser-default):focus,\ninput[type=datetime].valid:not(.browser-default),\ninput[type=datetime].valid:not(.browser-default):focus,\ninput[type=datetime-local].valid:not(.browser-default),\ninput[type=datetime-local].valid:not(.browser-default):focus,\ninput[type=tel].valid:not(.browser-default),\ninput[type=tel].valid:not(.browser-default):focus,\ninput[type=number].valid:not(.browser-default),\ninput[type=number].valid:not(.browser-default):focus,\ninput[type=search].valid:not(.browser-default),\ninput[type=search].valid:not(.browser-default):focus,\ntextarea.materialize-textarea.valid,\ntextarea.materialize-textarea.valid:focus, .select-wrapper.valid > input.select-dropdown {\n  border-bottom: 1px solid #4CAF50;\n  box-shadow: 0 1px 0 0 #4CAF50; }\n\ninput.invalid:not([type]), input.invalid:not([type]):focus,\ninput[type=text].invalid:not(.browser-default),\ninput[type=text].invalid:not(.browser-default):focus,\ninput[type=password].invalid:not(.browser-default),\ninput[type=password].invalid:not(.browser-default):focus,\ninput[type=email].invalid:not(.browser-default),\ninput[type=email].invalid:not(.browser-default):focus,\ninput[type=url].invalid:not(.browser-default),\ninput[type=url].invalid:not(.browser-default):focus,\ninput[type=time].invalid:not(.browser-default),\ninput[type=time].invalid:not(.browser-default):focus,\ninput[type=date].invalid:not(.browser-default),\ninput[type=date].invalid:not(.browser-default):focus,\ninput[type=datetime].invalid:not(.browser-default),\ninput[type=datetime].invalid:not(.browser-default):focus,\ninput[type=datetime-local].invalid:not(.browser-default),\ninput[type=datetime-local].invalid:not(.browser-default):focus,\ninput[type=tel].invalid:not(.browser-default),\ninput[type=tel].invalid:not(.browser-default):focus,\ninput[type=number].invalid:not(.browser-default),\ninput[type=number].invalid:not(.browser-default):focus,\ninput[type=search].invalid:not(.browser-default),\ninput[type=search].invalid:not(.browser-default):focus,\ntextarea.materialize-textarea.invalid,\ntextarea.materialize-textarea.invalid:focus, .select-wrapper.invalid > input.select-dropdown {\n  border-bottom: 1px solid #ff9800;\n  box-shadow: 0 1px 0 0 #ff9800; }\n\ninput:not([type]).valid ~ .helper-text[data-success],\ninput:not([type]):focus.valid ~ .helper-text[data-success],\ninput:not([type]).invalid ~ .helper-text[data-error],\ninput:not([type]):focus.invalid ~ .helper-text[data-error],\ninput[type=text]:not(.browser-default).valid ~ .helper-text[data-success],\ninput[type=text]:not(.browser-default):focus.valid ~ .helper-text[data-success],\ninput[type=text]:not(.browser-default).invalid ~ .helper-text[data-error],\ninput[type=text]:not(.browser-default):focus.invalid ~ .helper-text[data-error],\ninput[type=password]:not(.browser-default).valid ~ .helper-text[data-success],\ninput[type=password]:not(.browser-default):focus.valid ~ .helper-text[data-success],\ninput[type=password]:not(.browser-default).invalid ~ .helper-text[data-error],\ninput[type=password]:not(.browser-default):focus.invalid ~ .helper-text[data-error],\ninput[type=email]:not(.browser-default).valid ~ .helper-text[data-success],\ninput[type=email]:not(.browser-default):focus.valid ~ .helper-text[data-success],\ninput[type=email]:not(.browser-default).invalid ~ .helper-text[data-error],\ninput[type=email]:not(.browser-default):focus.invalid ~ .helper-text[data-error],\ninput[type=url]:not(.browser-default).valid ~ .helper-text[data-success],\ninput[type=url]:not(.browser-default):focus.valid ~ .helper-text[data-success],\ninput[type=url]:not(.browser-default).invalid ~ .helper-text[data-error],\ninput[type=url]:not(.browser-default):focus.invalid ~ .helper-text[data-error],\ninput[type=time]:not(.browser-default).valid ~ .helper-text[data-success],\ninput[type=time]:not(.browser-default):focus.valid ~ .helper-text[data-success],\ninput[type=time]:not(.browser-default).invalid ~ .helper-text[data-error],\ninput[type=time]:not(.browser-default):focus.invalid ~ .helper-text[data-error],\ninput[type=date]:not(.browser-default).valid ~ .helper-text[data-success],\ninput[type=date]:not(.browser-default):focus.valid ~ .helper-text[data-success],\ninput[type=date]:not(.browser-default).invalid ~ .helper-text[data-error],\ninput[type=date]:not(.browser-default):focus.invalid ~ .helper-text[data-error],\ninput[type=datetime]:not(.browser-default).valid ~ .helper-text[data-success],\ninput[type=datetime]:not(.browser-default):focus.valid ~ .helper-text[data-success],\ninput[type=datetime]:not(.browser-default).invalid ~ .helper-text[data-error],\ninput[type=datetime]:not(.browser-default):focus.invalid ~ .helper-text[data-error],\ninput[type=datetime-local]:not(.browser-default).valid ~ .helper-text[data-success],\ninput[type=datetime-local]:not(.browser-default):focus.valid ~ .helper-text[data-success],\ninput[type=datetime-local]:not(.browser-default).invalid ~ .helper-text[data-error],\ninput[type=datetime-local]:not(.browser-default):focus.invalid ~ .helper-text[data-error],\ninput[type=tel]:not(.browser-default).valid ~ .helper-text[data-success],\ninput[type=tel]:not(.browser-default):focus.valid ~ .helper-text[data-success],\ninput[type=tel]:not(.browser-default).invalid ~ .helper-text[data-error],\ninput[type=tel]:not(.browser-default):focus.invalid ~ .helper-text[data-error],\ninput[type=number]:not(.browser-default).valid ~ .helper-text[data-success],\ninput[type=number]:not(.browser-default):focus.valid ~ .helper-text[data-success],\ninput[type=number]:not(.browser-default).invalid ~ .helper-text[data-error],\ninput[type=number]:not(.browser-default):focus.invalid ~ .helper-text[data-error],\ninput[type=search]:not(.browser-default).valid ~ .helper-text[data-success],\ninput[type=search]:not(.browser-default):focus.valid ~ .helper-text[data-success],\ninput[type=search]:not(.browser-default).invalid ~ .helper-text[data-error],\ninput[type=search]:not(.browser-default):focus.invalid ~ .helper-text[data-error],\ntextarea.materialize-textarea.valid ~ .helper-text[data-success],\ntextarea.materialize-textarea:focus.valid ~ .helper-text[data-success],\ntextarea.materialize-textarea.invalid ~ .helper-text[data-error],\ntextarea.materialize-textarea:focus.invalid ~ .helper-text[data-error], .select-wrapper.valid .helper-text[data-success],\n.select-wrapper.invalid ~ .helper-text[data-error] {\n  color: transparent;\n  user-select: none;\n  pointer-events: none; }\n\ninput:not([type]).valid ~ .helper-text:after,\ninput:not([type]):focus.valid ~ .helper-text:after,\ninput[type=text]:not(.browser-default).valid ~ .helper-text:after,\ninput[type=text]:not(.browser-default):focus.valid ~ .helper-text:after,\ninput[type=password]:not(.browser-default).valid ~ .helper-text:after,\ninput[type=password]:not(.browser-default):focus.valid ~ .helper-text:after,\ninput[type=email]:not(.browser-default).valid ~ .helper-text:after,\ninput[type=email]:not(.browser-default):focus.valid ~ .helper-text:after,\ninput[type=url]:not(.browser-default).valid ~ .helper-text:after,\ninput[type=url]:not(.browser-default):focus.valid ~ .helper-text:after,\ninput[type=time]:not(.browser-default).valid ~ .helper-text:after,\ninput[type=time]:not(.browser-default):focus.valid ~ .helper-text:after,\ninput[type=date]:not(.browser-default).valid ~ .helper-text:after,\ninput[type=date]:not(.browser-default):focus.valid ~ .helper-text:after,\ninput[type=datetime]:not(.browser-default).valid ~ .helper-text:after,\ninput[type=datetime]:not(.browser-default):focus.valid ~ .helper-text:after,\ninput[type=datetime-local]:not(.browser-default).valid ~ .helper-text:after,\ninput[type=datetime-local]:not(.browser-default):focus.valid ~ .helper-text:after,\ninput[type=tel]:not(.browser-default).valid ~ .helper-text:after,\ninput[type=tel]:not(.browser-default):focus.valid ~ .helper-text:after,\ninput[type=number]:not(.browser-default).valid ~ .helper-text:after,\ninput[type=number]:not(.browser-default):focus.valid ~ .helper-text:after,\ninput[type=search]:not(.browser-default).valid ~ .helper-text:after,\ninput[type=search]:not(.browser-default):focus.valid ~ .helper-text:after,\ntextarea.materialize-textarea.valid ~ .helper-text:after,\ntextarea.materialize-textarea:focus.valid ~ .helper-text:after, .select-wrapper.valid ~ .helper-text:after {\n  content: attr(data-success);\n  color: #4CAF50; }\n\ninput:not([type]).invalid ~ .helper-text:after,\ninput:not([type]):focus.invalid ~ .helper-text:after,\ninput[type=text]:not(.browser-default).invalid ~ .helper-text:after,\ninput[type=text]:not(.browser-default):focus.invalid ~ .helper-text:after,\ninput[type=password]:not(.browser-default).invalid ~ .helper-text:after,\ninput[type=password]:not(.browser-default):focus.invalid ~ .helper-text:after,\ninput[type=email]:not(.browser-default).invalid ~ .helper-text:after,\ninput[type=email]:not(.browser-default):focus.invalid ~ .helper-text:after,\ninput[type=url]:not(.browser-default).invalid ~ .helper-text:after,\ninput[type=url]:not(.browser-default):focus.invalid ~ .helper-text:after,\ninput[type=time]:not(.browser-default).invalid ~ .helper-text:after,\ninput[type=time]:not(.browser-default):focus.invalid ~ .helper-text:after,\ninput[type=date]:not(.browser-default).invalid ~ .helper-text:after,\ninput[type=date]:not(.browser-default):focus.invalid ~ .helper-text:after,\ninput[type=datetime]:not(.browser-default).invalid ~ .helper-text:after,\ninput[type=datetime]:not(.browser-default):focus.invalid ~ .helper-text:after,\ninput[type=datetime-local]:not(.browser-default).invalid ~ .helper-text:after,\ninput[type=datetime-local]:not(.browser-default):focus.invalid ~ .helper-text:after,\ninput[type=tel]:not(.browser-default).invalid ~ .helper-text:after,\ninput[type=tel]:not(.browser-default):focus.invalid ~ .helper-text:after,\ninput[type=number]:not(.browser-default).invalid ~ .helper-text:after,\ninput[type=number]:not(.browser-default):focus.invalid ~ .helper-text:after,\ninput[type=search]:not(.browser-default).invalid ~ .helper-text:after,\ninput[type=search]:not(.browser-default):focus.invalid ~ .helper-text:after,\ntextarea.materialize-textarea.invalid ~ .helper-text:after,\ntextarea.materialize-textarea:focus.invalid ~ .helper-text:after, .select-wrapper.invalid ~ .helper-text:after {\n  content: attr(data-error);\n  color: #ff9800; }\n\ninput:not([type]) + label:after,\ninput[type=text]:not(.browser-default) + label:after,\ninput[type=password]:not(.browser-default) + label:after,\ninput[type=email]:not(.browser-default) + label:after,\ninput[type=url]:not(.browser-default) + label:after,\ninput[type=time]:not(.browser-default) + label:after,\ninput[type=date]:not(.browser-default) + label:after,\ninput[type=datetime]:not(.browser-default) + label:after,\ninput[type=datetime-local]:not(.browser-default) + label:after,\ninput[type=tel]:not(.browser-default) + label:after,\ninput[type=number]:not(.browser-default) + label:after,\ninput[type=search]:not(.browser-default) + label:after,\ntextarea.materialize-textarea + label:after, .select-wrapper + label:after {\n  display: block;\n  content: \"\";\n  position: absolute;\n  top: 100%;\n  left: 0;\n  opacity: 0;\n  transition: .2s opacity ease-out, .2s color ease-out; }\n\n.input-field {\n  position: relative;\n  margin-top: 1rem;\n  margin-bottom: 1rem; }\n  .input-field.inline {\n    display: inline-block;\n    vertical-align: middle;\n    margin-left: 5px; }\n    .input-field.inline input,\n    .input-field.inline .select-dropdown {\n      margin-bottom: 1rem; }\n  .input-field.col label {\n    left: 0.75rem; }\n  .input-field.col .prefix ~ label,\n  .input-field.col .prefix ~ .validate ~ label {\n    width: calc(100% - 3rem - 1.5rem); }\n  .input-field > label {\n    color: #acd8fa;\n    position: absolute;\n    top: 0;\n    left: 0;\n    font-size: 1rem;\n    cursor: text;\n    transition: transform .2s ease-out, color .2s ease-out;\n    transform-origin: 0% 100%;\n    text-align: initial;\n    transform: translateY(12px); }\n    .input-field > label:not(.label-icon).active {\n      transform: translateY(-14px) scale(0.8);\n      transform-origin: 0 0; }\n  .input-field .helper-text {\n    position: relative;\n    min-height: 18px;\n    display: block;\n    font-size: 12px;\n    color: rgba(0, 0, 0, 0.54); }\n    .input-field .helper-text::after {\n      opacity: 1;\n      position: absolute;\n      top: 0;\n      left: 0; }\n  .input-field .prefix {\n    position: absolute;\n    width: 3rem;\n    font-size: 2rem;\n    transition: color .2s; }\n    .input-field .prefix.active {\n      color: #ab47bc; }\n  .input-field .prefix ~ input,\n  .input-field .prefix ~ textarea,\n  .input-field .prefix ~ label,\n  .input-field .prefix ~ .validate ~ label,\n  .input-field .prefix ~ .autocomplete-content {\n    margin-left: 3rem;\n    width: 92%;\n    width: calc(100% - 3rem); }\n  .input-field .prefix ~ label {\n    margin-left: 3rem; }\n  @media only screen and (max-width: 992px) {\n    .input-field .prefix ~ input {\n      width: 86%;\n      width: calc(100% - 3rem); } }\n  @media only screen and (max-width: 600px) {\n    .input-field .prefix ~ input {\n      width: 80%;\n      width: calc(100% - 3rem); } }\n\n/* Search Field */\n.input-field input[type=search] {\n  display: block;\n  line-height: inherit; }\n  .nav-wrapper .input-field input[type=search] {\n    height: inherit;\n    padding-left: 4rem;\n    width: calc(100% - 4rem);\n    border: 0;\n    box-shadow: none; }\n  .input-field input[type=search]:focus:not(.browser-default) {\n    background-color: #fff;\n    border: 0;\n    box-shadow: none;\n    color: #444; }\n    .input-field input[type=search]:focus:not(.browser-default) + label i,\n    .input-field input[type=search]:focus:not(.browser-default) ~ .mdi-navigation-close,\n    .input-field input[type=search]:focus:not(.browser-default) ~ .material-icons {\n      color: #444; }\n  .input-field input[type=search] + .label-icon {\n    transform: none;\n    left: 1rem; }\n  .input-field input[type=search] ~ .mdi-navigation-close,\n  .input-field input[type=search] ~ .material-icons {\n    position: absolute;\n    top: 0;\n    right: 1rem;\n    color: transparent;\n    cursor: pointer;\n    font-size: 2rem;\n    transition: .3s color; }\n\n/* Textarea */\ntextarea {\n  width: 100%;\n  height: 3rem;\n  background-color: transparent; }\n  textarea.materialize-textarea {\n    line-height: normal;\n    overflow-y: hidden;\n    /* prevents scroll bar flash */\n    padding: .8rem 0 .8rem 0;\n    /* prevents text jump on Enter keypress */\n    resize: none;\n    min-height: 3rem;\n    box-sizing: border-box; }\n\n.hiddendiv {\n  visibility: hidden;\n  white-space: pre-wrap;\n  word-wrap: break-word;\n  overflow-wrap: break-word;\n  /* future version of deprecated 'word-wrap' */\n  padding-top: 1.2rem;\n  /* prevents text jump on Enter keypress */\n  position: absolute;\n  top: 0;\n  z-index: -1; }\n\n/* Autocomplete */\n.autocomplete-content {\n  margin-top: -8px;\n  margin-bottom: 8px;\n  display: block;\n  opacity: 1;\n  position: static; }\n  .autocomplete-content li .highlight {\n    color: #444; }\n  .autocomplete-content li img {\n    height: 40px;\n    width: 40px;\n    margin: 5px 15px; }\n\n/* Character Counter */\n.character-counter {\n  min-height: 18px; }\n\n/* Radio Buttons\r\n   ========================================================================== */\n[type=\"radio\"]:not(:checked),\n[type=\"radio\"]:checked {\n  position: absolute;\n  opacity: 0;\n  pointer-events: none; }\n\n[type=\"radio\"]:not(:checked) + span,\n[type=\"radio\"]:checked + span {\n  position: relative;\n  padding-left: 35px;\n  cursor: pointer;\n  display: inline-block;\n  height: 25px;\n  line-height: 25px;\n  font-size: 1rem;\n  transition: .28s ease;\n  user-select: none; }\n\n[type=\"radio\"] + span:before,\n[type=\"radio\"] + span:after {\n  content: '';\n  position: absolute;\n  left: 0;\n  top: 0;\n  margin: 4px;\n  width: 16px;\n  height: 16px;\n  z-index: 0;\n  transition: .28s ease; }\n\n/* Unchecked styles */\n[type=\"radio\"]:not(:checked) + span:before,\n[type=\"radio\"]:not(:checked) + span:after,\n[type=\"radio\"]:checked + span:before,\n[type=\"radio\"]:checked + span:after,\n[type=\"radio\"].with-gap:checked + span:before,\n[type=\"radio\"].with-gap:checked + span:after {\n  border-radius: 50%; }\n\n[type=\"radio\"]:not(:checked) + span:before,\n[type=\"radio\"]:not(:checked) + span:after {\n  border: 2px solid #5a5a5a; }\n\n[type=\"radio\"]:not(:checked) + span:after {\n  transform: scale(0); }\n\n/* Checked styles */\n[type=\"radio\"]:checked + span:before {\n  border: 2px solid transparent; }\n\n[type=\"radio\"]:checked + span:after,\n[type=\"radio\"].with-gap:checked + span:before,\n[type=\"radio\"].with-gap:checked + span:after {\n  border: 2px solid #ab47bc; }\n\n[type=\"radio\"]:checked + span:after,\n[type=\"radio\"].with-gap:checked + span:after {\n  background-color: #ab47bc; }\n\n[type=\"radio\"]:checked + span:after {\n  transform: scale(1.02); }\n\n/* Radio With gap */\n[type=\"radio\"].with-gap:checked + span:after {\n  transform: scale(0.5); }\n\n/* Focused styles */\n[type=\"radio\"].tabbed:focus + span:before {\n  box-shadow: 0 0 0 10px rgba(0, 0, 0, 0.1); }\n\n/* Disabled Radio With gap */\n[type=\"radio\"].with-gap:disabled:checked + span:before {\n  border: 2px solid rgba(0, 0, 0, 0.42); }\n\n[type=\"radio\"].with-gap:disabled:checked + span:after {\n  border: none;\n  background-color: rgba(0, 0, 0, 0.42); }\n\n/* Disabled style */\n[type=\"radio\"]:disabled:not(:checked) + span:before,\n[type=\"radio\"]:disabled:checked + span:before {\n  background-color: transparent;\n  border-color: rgba(0, 0, 0, 0.42); }\n\n[type=\"radio\"]:disabled + span {\n  color: rgba(0, 0, 0, 0.42); }\n\n[type=\"radio\"]:disabled:not(:checked) + span:before {\n  border-color: rgba(0, 0, 0, 0.42); }\n\n[type=\"radio\"]:disabled:checked + span:after {\n  background-color: rgba(0, 0, 0, 0.42);\n  border-color: #949494; }\n\n/* Checkboxes\r\n   ========================================================================== */\n/* Remove default checkbox */\n[type=\"checkbox\"]:not(:checked),\n[type=\"checkbox\"]:checked {\n  position: absolute;\n  opacity: 0;\n  pointer-events: none; }\n\n[type=\"checkbox\"] {\n  /* checkbox aspect */ }\n  [type=\"checkbox\"] + span:not(.lever) {\n    position: relative;\n    padding-left: 35px;\n    cursor: pointer;\n    display: inline-block;\n    height: 25px;\n    line-height: 25px;\n    font-size: 1rem;\n    user-select: none; }\n  [type=\"checkbox\"] + span:not(.lever):before,\n  [type=\"checkbox\"]:not(.filled-in) + span:not(.lever):after {\n    content: '';\n    position: absolute;\n    top: 0;\n    left: 0;\n    width: 18px;\n    height: 18px;\n    z-index: 0;\n    border: 2px solid #5a5a5a;\n    border-radius: 1px;\n    margin-top: 3px;\n    transition: .2s; }\n  [type=\"checkbox\"]:not(.filled-in) + span:not(.lever):after {\n    border: 0;\n    transform: scale(0); }\n  [type=\"checkbox\"]:not(:checked):disabled + span:not(.lever):before {\n    border: none;\n    background-color: rgba(0, 0, 0, 0.42); }\n  [type=\"checkbox\"].tabbed:focus + span:not(.lever):after {\n    transform: scale(1);\n    border: 0;\n    border-radius: 50%;\n    box-shadow: 0 0 0 10px rgba(0, 0, 0, 0.1);\n    background-color: rgba(0, 0, 0, 0.1); }\n\n[type=\"checkbox\"]:checked + span:not(.lever):before {\n  top: -4px;\n  left: -5px;\n  width: 12px;\n  height: 22px;\n  border-top: 2px solid transparent;\n  border-left: 2px solid transparent;\n  border-right: 2px solid #ab47bc;\n  border-bottom: 2px solid #ab47bc;\n  transform: rotate(40deg);\n  backface-visibility: hidden;\n  transform-origin: 100% 100%; }\n\n[type=\"checkbox\"]:checked:disabled + span:before {\n  border-right: 2px solid rgba(0, 0, 0, 0.42);\n  border-bottom: 2px solid rgba(0, 0, 0, 0.42); }\n\n/* Indeterminate checkbox */\n[type=\"checkbox\"]:indeterminate + span:not(.lever):before {\n  top: -11px;\n  left: -12px;\n  width: 10px;\n  height: 22px;\n  border-top: none;\n  border-left: none;\n  border-right: 2px solid #ab47bc;\n  border-bottom: none;\n  transform: rotate(90deg);\n  backface-visibility: hidden;\n  transform-origin: 100% 100%; }\n\n[type=\"checkbox\"]:indeterminate:disabled + span:not(.lever):before {\n  border-right: 2px solid rgba(0, 0, 0, 0.42);\n  background-color: transparent; }\n\n[type=\"checkbox\"].filled-in + span:not(.lever):after {\n  border-radius: 2px; }\n\n[type=\"checkbox\"].filled-in + span:not(.lever):before,\n[type=\"checkbox\"].filled-in + span:not(.lever):after {\n  content: '';\n  left: 0;\n  position: absolute;\n  /* .1s delay is for check animation */\n  transition: border .25s, background-color .25s, width .20s .1s, height .20s .1s, top .20s .1s, left .20s .1s;\n  z-index: 1; }\n\n[type=\"checkbox\"].filled-in:not(:checked) + span:not(.lever):before {\n  width: 0;\n  height: 0;\n  border: 3px solid transparent;\n  left: 6px;\n  top: 10px;\n  transform: rotateZ(37deg);\n  transform-origin: 100% 100%; }\n\n[type=\"checkbox\"].filled-in:not(:checked) + span:not(.lever):after {\n  height: 20px;\n  width: 20px;\n  background-color: transparent;\n  border: 2px solid #5a5a5a;\n  top: 0px;\n  z-index: 0; }\n\n[type=\"checkbox\"].filled-in:checked + span:not(.lever):before {\n  top: 0;\n  left: 1px;\n  width: 8px;\n  height: 13px;\n  border-top: 2px solid transparent;\n  border-left: 2px solid transparent;\n  border-right: 2px solid #fff;\n  border-bottom: 2px solid #fff;\n  transform: rotateZ(37deg);\n  transform-origin: 100% 100%; }\n\n[type=\"checkbox\"].filled-in:checked + span:not(.lever):after {\n  top: 0;\n  width: 20px;\n  height: 20px;\n  border: 2px solid #ab47bc;\n  background-color: #ab47bc;\n  z-index: 0; }\n\n[type=\"checkbox\"].filled-in.tabbed:focus + span:not(.lever):after {\n  border-radius: 2px;\n  border-color: #5a5a5a;\n  background-color: rgba(0, 0, 0, 0.1); }\n\n[type=\"checkbox\"].filled-in.tabbed:checked:focus + span:not(.lever):after {\n  border-radius: 2px;\n  background-color: #ab47bc;\n  border-color: #ab47bc; }\n\n[type=\"checkbox\"].filled-in:disabled:not(:checked) + span:not(.lever):before {\n  background-color: transparent;\n  border: 2px solid transparent; }\n\n[type=\"checkbox\"].filled-in:disabled:not(:checked) + span:not(.lever):after {\n  border-color: transparent;\n  background-color: #949494; }\n\n[type=\"checkbox\"].filled-in:disabled:checked + span:not(.lever):before {\n  background-color: transparent; }\n\n[type=\"checkbox\"].filled-in:disabled:checked + span:not(.lever):after {\n  background-color: #949494;\n  border-color: #949494; }\n\n/* Switch\r\n   ========================================================================== */\n.switch,\n.switch * {\n  -webkit-tap-highlight-color: transparent;\n  user-select: none; }\n\n.switch label {\n  cursor: pointer; }\n\n.switch label input[type=checkbox] {\n  opacity: 0;\n  width: 0;\n  height: 0; }\n  .switch label input[type=checkbox]:checked + .lever {\n    background-color: #cbb4cf; }\n    .switch label input[type=checkbox]:checked + .lever:before, .switch label input[type=checkbox]:checked + .lever:after {\n      left: 18px; }\n    .switch label input[type=checkbox]:checked + .lever:after {\n      background-color: #ab47bc; }\n\n.switch label .lever {\n  content: \"\";\n  display: inline-block;\n  position: relative;\n  width: 36px;\n  height: 14px;\n  background-color: rgba(0, 0, 0, 0.38);\n  border-radius: 15px;\n  margin-right: 10px;\n  transition: background 0.3s ease;\n  vertical-align: middle;\n  margin: 0 16px; }\n  .switch label .lever:before, .switch label .lever:after {\n    content: \"\";\n    position: absolute;\n    display: inline-block;\n    width: 20px;\n    height: 20px;\n    border-radius: 50%;\n    left: 0;\n    top: -3px;\n    transition: left 0.3s ease, background .3s ease, box-shadow 0.1s ease, transform .1s ease; }\n  .switch label .lever:before {\n    background-color: rgba(171, 71, 188, 0.15); }\n  .switch label .lever:after {\n    background-color: #F1F1F1;\n    box-shadow: 0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12); }\n\ninput[type=checkbox]:checked:not(:disabled) ~ .lever:active::before,\ninput[type=checkbox]:checked:not(:disabled).tabbed:focus ~ .lever::before {\n  transform: scale(2.4);\n  background-color: rgba(171, 71, 188, 0.15); }\n\ninput[type=checkbox]:not(:disabled) ~ .lever:active:before,\ninput[type=checkbox]:not(:disabled).tabbed:focus ~ .lever::before {\n  transform: scale(2.4);\n  background-color: rgba(0, 0, 0, 0.08); }\n\n.switch input[type=checkbox][disabled] + .lever {\n  cursor: default;\n  background-color: rgba(0, 0, 0, 0.12); }\n\n.switch label input[type=checkbox][disabled] + .lever:after,\n.switch label input[type=checkbox][disabled]:checked + .lever:after {\n  background-color: #949494; }\n\n/* Select Field\r\n   ========================================================================== */\nselect {\n  display: none; }\n\nselect.browser-default {\n  display: block; }\n\nselect {\n  background-color: rgba(255, 255, 255, 0.9);\n  width: 100%;\n  padding: 5px;\n  border: 1px solid #f2f2f2;\n  border-radius: 2px;\n  height: 3rem; }\n\n.input-field select {\n  display: block;\n  position: absolute;\n  width: 0;\n  pointer-events: none;\n  height: 0;\n  top: 0;\n  left: 0;\n  opacity: 0; }\n\n.select-label {\n  position: absolute; }\n\n.select-wrapper {\n  position: relative; }\n  .select-wrapper.valid + label,\n  .select-wrapper.invalid + label {\n    width: 100%;\n    pointer-events: none; }\n  .select-wrapper input.select-dropdown {\n    position: relative;\n    cursor: pointer;\n    background-color: transparent;\n    border: none;\n    border-bottom: 1px solid #acd8fa;\n    outline: none;\n    height: 3rem;\n    line-height: 3rem;\n    width: 100%;\n    font-size: 16px;\n    margin: 0 0 8px 0;\n    padding: 0;\n    display: block;\n    user-select: none;\n    z-index: 1; }\n    .select-wrapper input.select-dropdown:focus {\n      border-bottom: 1px solid #ab47bc; }\n  .select-wrapper .caret {\n    position: absolute;\n    right: 0;\n    top: 0;\n    bottom: 0;\n    margin: auto 0;\n    z-index: 0;\n    fill: rgba(0, 0, 0, 0.87); }\n  .select-wrapper + label {\n    position: absolute;\n    top: -26px;\n    font-size: 0.8rem; }\n\nselect:disabled {\n  color: rgba(0, 0, 0, 0.42); }\n\n.select-wrapper.disabled + label {\n  color: rgba(0, 0, 0, 0.42); }\n\n.select-wrapper.disabled .caret {\n  fill: rgba(0, 0, 0, 0.42); }\n\n.select-wrapper input.select-dropdown:disabled {\n  color: rgba(0, 0, 0, 0.42);\n  cursor: default;\n  user-select: none; }\n\n.select-wrapper i {\n  color: rgba(0, 0, 0, 0.3); }\n\n.select-dropdown li.disabled,\n.select-dropdown li.disabled > span,\n.select-dropdown li.optgroup {\n  color: rgba(0, 0, 0, 0.3);\n  background-color: transparent; }\n\n.select-dropdown.dropdown-content li:hover {\n  background-color: rgba(0, 0, 0, 0.08); }\n\n.select-dropdown.dropdown-content li.selected {\n  background-color: rgba(0, 0, 0, 0.03); }\n\n.select-dropdown.dropdown-content li:focus {\n  background-color: rgba(0, 0, 0, 0.08); }\n\n.prefix ~ .select-wrapper {\n  margin-left: 3rem;\n  width: 92%;\n  width: calc(100% - 3rem); }\n\n.prefix ~ label {\n  margin-left: 3rem; }\n\n.select-dropdown li img {\n  height: 40px;\n  width: 40px;\n  margin: 5px 15px;\n  float: right; }\n\n.select-dropdown li.optgroup {\n  border-top: 1px solid #eee; }\n  .select-dropdown li.optgroup.selected > span {\n    color: rgba(0, 0, 0, 0.7); }\n  .select-dropdown li.optgroup > span {\n    color: rgba(0, 0, 0, 0.4); }\n  .select-dropdown li.optgroup ~ li.optgroup-option {\n    padding-left: 1rem; }\n\n/* File Input\r\n   ========================================================================== */\n.file-field {\n  position: relative; }\n  .file-field .file-path-wrapper {\n    overflow: hidden;\n    padding-left: 10px; }\n  .file-field input.file-path {\n    width: 100%; }\n  .file-field .btn, .file-field .btn-large {\n    float: left;\n    height: 3rem;\n    line-height: 3rem; }\n  .file-field span {\n    cursor: pointer; }\n  .file-field input[type=file] {\n    position: absolute;\n    top: 0;\n    right: 0;\n    left: 0;\n    bottom: 0;\n    width: 100%;\n    margin: 0;\n    padding: 0;\n    font-size: 20px;\n    cursor: pointer;\n    opacity: 0;\n    filter: alpha(opacity=0); }\n    .file-field input[type=file]::-webkit-file-upload-button {\n      display: none; }\n\n/* Range\r\n   ========================================================================== */\n.range-field {\n  position: relative; }\n\ninput[type=range],\ninput[type=range] + .thumb {\n  cursor: pointer; }\n\ninput[type=range] {\n  position: relative;\n  background-color: transparent;\n  border: none;\n  outline: none;\n  width: 100%;\n  margin: 15px 0;\n  padding: 0; }\n  input[type=range]:focus {\n    outline: none; }\n\ninput[type=range] + .thumb {\n  position: absolute;\n  top: 10px;\n  left: 0;\n  border: none;\n  height: 0;\n  width: 0;\n  border-radius: 50%;\n  background-color: #ab47bc;\n  margin-left: 7px;\n  transform-origin: 50% 50%;\n  transform: rotate(-45deg); }\n  input[type=range] + .thumb .value {\n    display: block;\n    width: 30px;\n    text-align: center;\n    color: #ab47bc;\n    font-size: 0;\n    transform: rotate(45deg); }\n  input[type=range] + .thumb.active {\n    border-radius: 50% 50% 50% 0; }\n    input[type=range] + .thumb.active .value {\n      color: #fff;\n      margin-left: -1px;\n      margin-top: 8px;\n      font-size: 10px; }\n\ninput[type=range] {\n  -webkit-appearance: none; }\n\ninput[type=range]::-webkit-slider-runnable-track {\n  height: 3px;\n  background: #c2c0c2;\n  border: none; }\n\ninput[type=range]::-webkit-slider-thumb {\n  border: none;\n  height: 14px;\n  width: 14px;\n  border-radius: 50%;\n  background: #ab47bc;\n  transition: box-shadow .3s;\n  -webkit-appearance: none;\n  background-color: #ab47bc;\n  transform-origin: 50% 50%;\n  margin: -5px 0 0 0; }\n\ninput[type=range].focused:focus:not(.active)::-webkit-slider-thumb {\n  box-shadow: 0 0 0 10px rgba(171, 71, 188, 0.26); }\n\ninput[type=range] {\n  /* fix for FF unable to apply focus style bug  */\n  border: 1px solid white;\n  /*required for proper track sizing in FF*/ }\n\ninput[type=range]::-moz-range-track {\n  height: 3px;\n  background: #c2c0c2;\n  border: none; }\n\ninput[type=range]::-moz-focus-inner {\n  border: 0; }\n\ninput[type=range]::-moz-range-thumb {\n  border: none;\n  height: 14px;\n  width: 14px;\n  border-radius: 50%;\n  background: #ab47bc;\n  transition: box-shadow .3s;\n  margin-top: -5px; }\n\ninput[type=range]:-moz-focusring {\n  outline: 1px solid #fff;\n  outline-offset: -1px; }\n\ninput[type=range].focused:focus:not(.active)::-moz-range-thumb {\n  box-shadow: 0 0 0 10px rgba(171, 71, 188, 0.26); }\n\ninput[type=range]::-ms-track {\n  height: 3px;\n  background: transparent;\n  border-color: transparent;\n  border-width: 6px 0;\n  /*remove default tick marks*/\n  color: transparent; }\n\ninput[type=range]::-ms-fill-lower {\n  background: #777; }\n\ninput[type=range]::-ms-fill-upper {\n  background: #ddd; }\n\ninput[type=range]::-ms-thumb {\n  border: none;\n  height: 14px;\n  width: 14px;\n  border-radius: 50%;\n  background: #ab47bc;\n  transition: box-shadow .3s; }\n\ninput[type=range].focused:focus:not(.active)::-ms-thumb {\n  box-shadow: 0 0 0 10px rgba(171, 71, 188, 0.26); }\n\n/***************\r\n    Nav List\r\n***************/\n.table-of-contents.fixed {\n  position: fixed; }\n\n.table-of-contents li {\n  padding: 2px 0; }\n\n.table-of-contents a {\n  display: inline-block;\n  font-weight: 300;\n  color: #757575;\n  padding-left: 16px;\n  height: 1.5rem;\n  line-height: 1.5rem;\n  letter-spacing: .4;\n  display: inline-block; }\n  .table-of-contents a:hover {\n    color: #a8a8a8;\n    padding-left: 15px;\n    border-left: 1px solid #64B5F6; }\n  .table-of-contents a.active {\n    font-weight: 500;\n    padding-left: 14px;\n    border-left: 2px solid #64B5F6; }\n\n.sidenav {\n  position: fixed;\n  width: 300px;\n  left: 0;\n  top: 0;\n  margin: 0;\n  transform: translateX(-100%);\n  height: 100%;\n  height: calc(100% + 60px);\n  height: -moz-calc(100%);\n  padding-bottom: 60px;\n  background-color: #fff;\n  z-index: 999;\n  overflow-y: auto;\n  will-change: transform;\n  backface-visibility: hidden;\n  transform: translateX(-105%); }\n  .sidenav.right-aligned {\n    right: 0;\n    transform: translateX(105%);\n    left: auto;\n    transform: translateX(100%); }\n  .sidenav .collapsible {\n    margin: 0; }\n  .sidenav li {\n    float: none;\n    line-height: 48px; }\n    .sidenav li.active {\n      background-color: rgba(0, 0, 0, 0.05); }\n  .sidenav li > a {\n    color: rgba(0, 0, 0, 0.87);\n    display: block;\n    font-size: 14px;\n    font-weight: 500;\n    height: 48px;\n    line-height: 48px;\n    padding: 0 32px; }\n    .sidenav li > a:hover {\n      background-color: rgba(0, 0, 0, 0.05); }\n    .sidenav li > a.btn, .sidenav li > a.btn-large, .sidenav li > a.btn-large, .sidenav li > a.btn-flat, .sidenav li > a.btn-floating {\n      margin: 10px 15px; }\n    .sidenav li > a.btn, .sidenav li > a.btn-large, .sidenav li > a.btn-large, .sidenav li > a.btn-floating {\n      color: #fff; }\n    .sidenav li > a.btn-flat {\n      color: #343434; }\n    .sidenav li > a.btn:hover, .sidenav li > a.btn-large:hover, .sidenav li > a.btn-large:hover {\n      background-color: #b45ac3; }\n    .sidenav li > a.btn-floating:hover {\n      background-color: #ab47bc; }\n    .sidenav li > a > i,\n    .sidenav li > a > [class^=\"mdi-\"], .sidenav li > a li > a > [class*=\"mdi-\"],\n    .sidenav li > a > i.material-icons {\n      float: left;\n      height: 48px;\n      line-height: 48px;\n      margin: 0 32px 0 0;\n      width: 24px;\n      color: rgba(0, 0, 0, 0.54); }\n  .sidenav .divider {\n    margin: 8px 0 0 0; }\n  .sidenav .subheader {\n    cursor: initial;\n    pointer-events: none;\n    color: rgba(0, 0, 0, 0.54);\n    font-size: 14px;\n    font-weight: 500;\n    line-height: 48px; }\n    .sidenav .subheader:hover {\n      background-color: transparent; }\n  .sidenav .user-view {\n    position: relative;\n    padding: 32px 32px 0;\n    margin-bottom: 8px; }\n    .sidenav .user-view > a {\n      height: auto;\n      padding: 0; }\n      .sidenav .user-view > a:hover {\n        background-color: transparent; }\n    .sidenav .user-view .background {\n      overflow: hidden;\n      position: absolute;\n      top: 0;\n      right: 0;\n      bottom: 0;\n      left: 0;\n      z-index: -1; }\n    .sidenav .user-view .circle, .sidenav .user-view .name, .sidenav .user-view .email {\n      display: block; }\n    .sidenav .user-view .circle {\n      height: 64px;\n      width: 64px; }\n    .sidenav .user-view .name,\n    .sidenav .user-view .email {\n      font-size: 14px;\n      line-height: 24px; }\n    .sidenav .user-view .name {\n      margin-top: 16px;\n      font-weight: 500; }\n    .sidenav .user-view .email {\n      padding-bottom: 16px;\n      font-weight: 400; }\n\n.drag-target {\n  height: 100%;\n  width: 10px;\n  position: fixed;\n  top: 0;\n  z-index: 998; }\n  .drag-target.right-aligned {\n    right: 0; }\n\n.sidenav.sidenav-fixed {\n  left: 0;\n  transform: translateX(0);\n  position: fixed; }\n  .sidenav.sidenav-fixed.right-aligned {\n    right: 0;\n    left: auto; }\n\n@media only screen and (max-width: 992px) {\n  .sidenav.sidenav-fixed {\n    transform: translateX(-105%); }\n    .sidenav.sidenav-fixed.right-aligned {\n      transform: translateX(105%); }\n  .sidenav a {\n    padding: 0 16px; }\n  .sidenav .user-view {\n    padding: 16px 16px 0; } }\n\n.sidenav .collapsible-body > ul:not(.collapsible) > li.active,\n.sidenav.sidenav-fixed .collapsible-body > ul:not(.collapsible) > li.active {\n  background-color: #64B5F6; }\n  .sidenav .collapsible-body > ul:not(.collapsible) > li.active a,\n  .sidenav.sidenav-fixed .collapsible-body > ul:not(.collapsible) > li.active a {\n    color: #fff; }\n\n.sidenav .collapsible-body {\n  padding: 0; }\n\n.sidenav-overlay {\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  opacity: 0;\n  height: 120vh;\n  background-color: rgba(0, 0, 0, 0.5);\n  z-index: 997;\n  display: none; }\n\n/*\r\n    @license\r\n    Copyright (c) 2014 The Polymer Project Authors. All rights reserved.\r\n    This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt\r\n    The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt\r\n    The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt\r\n    Code distributed by Google as part of the polymer project is also\r\n    subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt\r\n */\n/**************************/\n/* STYLES FOR THE SPINNER */\n/**************************/\n/*\r\n * Constants:\r\n *      STROKEWIDTH = 3px\r\n *      ARCSIZE     = 270 degrees (amount of circle the arc takes up)\r\n *      ARCTIME     = 1333ms (time it takes to expand and contract arc)\r\n *      ARCSTARTROT = 216 degrees (how much the start location of the arc\r\n *                                should rotate each time, 216 gives us a\r\n *                                5 pointed star shape (it's 360/5 * 3).\r\n *                                For a 7 pointed star, we might do\r\n *                                360/7 * 3 = 154.286)\r\n *      CONTAINERWIDTH = 28px\r\n *      SHRINK_TIME = 400ms\r\n */\n.preloader-wrapper {\n  display: inline-block;\n  position: relative;\n  width: 50px;\n  height: 50px; }\n  .preloader-wrapper.small {\n    width: 36px;\n    height: 36px; }\n  .preloader-wrapper.big {\n    width: 64px;\n    height: 64px; }\n  .preloader-wrapper.active {\n    /* duration: 360 * ARCTIME / (ARCSTARTROT + (360-ARCSIZE)) */\n    -webkit-animation: container-rotate 1568ms linear infinite;\n    animation: container-rotate 1568ms linear infinite; }\n\n@-webkit-keyframes container-rotate {\n  to {\n    -webkit-transform: rotate(360deg); } }\n\n@keyframes container-rotate {\n  to {\n    transform: rotate(360deg); } }\n\n.spinner-layer {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  opacity: 0;\n  border-color: #ab47bc; }\n\n.spinner-blue,\n.spinner-blue-only {\n  border-color: #4285f4; }\n\n.spinner-red,\n.spinner-red-only {\n  border-color: #db4437; }\n\n.spinner-yellow,\n.spinner-yellow-only {\n  border-color: #f4b400; }\n\n.spinner-green,\n.spinner-green-only {\n  border-color: #0f9d58; }\n\n/**\r\n * IMPORTANT NOTE ABOUT CSS ANIMATION PROPERTIES (keanulee):\r\n *\r\n * iOS Safari (tested on iOS 8.1) does not handle animation-delay very well - it doesn't\r\n * guarantee that the animation will start _exactly_ after that value. So we avoid using\r\n * animation-delay and instead set custom keyframes for each color (as redundant as it\r\n * seems).\r\n *\r\n * We write out each animation in full (instead of separating animation-name,\r\n * animation-duration, etc.) because under the polyfill, Safari does not recognize those\r\n * specific properties properly, treats them as -webkit-animation, and overrides the\r\n * other animation rules. See https://github.com/Polymer/platform/issues/53.\r\n */\n.active .spinner-layer.spinner-blue {\n  /* durations: 4 * ARCTIME */\n  -webkit-animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both, blue-fade-in-out 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n  animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both, blue-fade-in-out 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both; }\n\n.active .spinner-layer.spinner-red {\n  /* durations: 4 * ARCTIME */\n  -webkit-animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both, red-fade-in-out 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n  animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both, red-fade-in-out 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both; }\n\n.active .spinner-layer.spinner-yellow {\n  /* durations: 4 * ARCTIME */\n  -webkit-animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both, yellow-fade-in-out 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n  animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both, yellow-fade-in-out 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both; }\n\n.active .spinner-layer.spinner-green {\n  /* durations: 4 * ARCTIME */\n  -webkit-animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both, green-fade-in-out 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n  animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both, green-fade-in-out 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both; }\n\n.active .spinner-layer,\n.active .spinner-layer.spinner-blue-only,\n.active .spinner-layer.spinner-red-only,\n.active .spinner-layer.spinner-yellow-only,\n.active .spinner-layer.spinner-green-only {\n  /* durations: 4 * ARCTIME */\n  opacity: 1;\n  -webkit-animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n  animation: fill-unfill-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both; }\n\n@-webkit-keyframes fill-unfill-rotate {\n  12.5% {\n    -webkit-transform: rotate(135deg); }\n  /* 0.5 * ARCSIZE */\n  25% {\n    -webkit-transform: rotate(270deg); }\n  /* 1   * ARCSIZE */\n  37.5% {\n    -webkit-transform: rotate(405deg); }\n  /* 1.5 * ARCSIZE */\n  50% {\n    -webkit-transform: rotate(540deg); }\n  /* 2   * ARCSIZE */\n  62.5% {\n    -webkit-transform: rotate(675deg); }\n  /* 2.5 * ARCSIZE */\n  75% {\n    -webkit-transform: rotate(810deg); }\n  /* 3   * ARCSIZE */\n  87.5% {\n    -webkit-transform: rotate(945deg); }\n  /* 3.5 * ARCSIZE */\n  to {\n    -webkit-transform: rotate(1080deg); }\n  /* 4   * ARCSIZE */ }\n\n@keyframes fill-unfill-rotate {\n  12.5% {\n    transform: rotate(135deg); }\n  /* 0.5 * ARCSIZE */\n  25% {\n    transform: rotate(270deg); }\n  /* 1   * ARCSIZE */\n  37.5% {\n    transform: rotate(405deg); }\n  /* 1.5 * ARCSIZE */\n  50% {\n    transform: rotate(540deg); }\n  /* 2   * ARCSIZE */\n  62.5% {\n    transform: rotate(675deg); }\n  /* 2.5 * ARCSIZE */\n  75% {\n    transform: rotate(810deg); }\n  /* 3   * ARCSIZE */\n  87.5% {\n    transform: rotate(945deg); }\n  /* 3.5 * ARCSIZE */\n  to {\n    transform: rotate(1080deg); }\n  /* 4   * ARCSIZE */ }\n\n@-webkit-keyframes blue-fade-in-out {\n  from {\n    opacity: 1; }\n  25% {\n    opacity: 1; }\n  26% {\n    opacity: 0; }\n  89% {\n    opacity: 0; }\n  90% {\n    opacity: 1; }\n  100% {\n    opacity: 1; } }\n\n@keyframes blue-fade-in-out {\n  from {\n    opacity: 1; }\n  25% {\n    opacity: 1; }\n  26% {\n    opacity: 0; }\n  89% {\n    opacity: 0; }\n  90% {\n    opacity: 1; }\n  100% {\n    opacity: 1; } }\n\n@-webkit-keyframes red-fade-in-out {\n  from {\n    opacity: 0; }\n  15% {\n    opacity: 0; }\n  25% {\n    opacity: 1; }\n  50% {\n    opacity: 1; }\n  51% {\n    opacity: 0; } }\n\n@keyframes red-fade-in-out {\n  from {\n    opacity: 0; }\n  15% {\n    opacity: 0; }\n  25% {\n    opacity: 1; }\n  50% {\n    opacity: 1; }\n  51% {\n    opacity: 0; } }\n\n@-webkit-keyframes yellow-fade-in-out {\n  from {\n    opacity: 0; }\n  40% {\n    opacity: 0; }\n  50% {\n    opacity: 1; }\n  75% {\n    opacity: 1; }\n  76% {\n    opacity: 0; } }\n\n@keyframes yellow-fade-in-out {\n  from {\n    opacity: 0; }\n  40% {\n    opacity: 0; }\n  50% {\n    opacity: 1; }\n  75% {\n    opacity: 1; }\n  76% {\n    opacity: 0; } }\n\n@-webkit-keyframes green-fade-in-out {\n  from {\n    opacity: 0; }\n  65% {\n    opacity: 0; }\n  75% {\n    opacity: 1; }\n  90% {\n    opacity: 1; }\n  100% {\n    opacity: 0; } }\n\n@keyframes green-fade-in-out {\n  from {\n    opacity: 0; }\n  65% {\n    opacity: 0; }\n  75% {\n    opacity: 1; }\n  90% {\n    opacity: 1; }\n  100% {\n    opacity: 0; } }\n\n/**\r\n * Patch the gap that appear between the two adjacent div.circle-clipper while the\r\n * spinner is rotating (appears on Chrome 38, Safari 7.1, and IE 11).\r\n */\n.gap-patch {\n  position: absolute;\n  top: 0;\n  left: 45%;\n  width: 10%;\n  height: 100%;\n  overflow: hidden;\n  border-color: inherit; }\n\n.gap-patch .circle {\n  width: 1000%;\n  left: -450%; }\n\n.circle-clipper {\n  display: inline-block;\n  position: relative;\n  width: 50%;\n  height: 100%;\n  overflow: hidden;\n  border-color: inherit; }\n  .circle-clipper .circle {\n    width: 200%;\n    height: 100%;\n    border-width: 3px;\n    /* STROKEWIDTH */\n    border-style: solid;\n    border-color: inherit;\n    border-bottom-color: transparent !important;\n    border-radius: 50%;\n    -webkit-animation: none;\n    animation: none;\n    position: absolute;\n    top: 0;\n    right: 0;\n    bottom: 0; }\n  .circle-clipper.left .circle {\n    left: 0;\n    border-right-color: transparent !important;\n    -webkit-transform: rotate(129deg);\n    transform: rotate(129deg); }\n  .circle-clipper.right .circle {\n    left: -100%;\n    border-left-color: transparent !important;\n    -webkit-transform: rotate(-129deg);\n    transform: rotate(-129deg); }\n\n.active .circle-clipper.left .circle {\n  /* duration: ARCTIME */\n  -webkit-animation: left-spin 1333ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n  animation: left-spin 1333ms cubic-bezier(0.4, 0, 0.2, 1) infinite both; }\n\n.active .circle-clipper.right .circle {\n  /* duration: ARCTIME */\n  -webkit-animation: right-spin 1333ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;\n  animation: right-spin 1333ms cubic-bezier(0.4, 0, 0.2, 1) infinite both; }\n\n@-webkit-keyframes left-spin {\n  from {\n    -webkit-transform: rotate(130deg); }\n  50% {\n    -webkit-transform: rotate(-5deg); }\n  to {\n    -webkit-transform: rotate(130deg); } }\n\n@keyframes left-spin {\n  from {\n    transform: rotate(130deg); }\n  50% {\n    transform: rotate(-5deg); }\n  to {\n    transform: rotate(130deg); } }\n\n@-webkit-keyframes right-spin {\n  from {\n    -webkit-transform: rotate(-130deg); }\n  50% {\n    -webkit-transform: rotate(5deg); }\n  to {\n    -webkit-transform: rotate(-130deg); } }\n\n@keyframes right-spin {\n  from {\n    transform: rotate(-130deg); }\n  50% {\n    transform: rotate(5deg); }\n  to {\n    transform: rotate(-130deg); } }\n\n#spinnerContainer.cooldown {\n  /* duration: SHRINK_TIME */\n  -webkit-animation: container-rotate 1568ms linear infinite, fade-out 400ms cubic-bezier(0.4, 0, 0.2, 1);\n  animation: container-rotate 1568ms linear infinite, fade-out 400ms cubic-bezier(0.4, 0, 0.2, 1); }\n\n@-webkit-keyframes fade-out {\n  from {\n    opacity: 1; }\n  to {\n    opacity: 0; } }\n\n@keyframes fade-out {\n  from {\n    opacity: 1; }\n  to {\n    opacity: 0; } }\n\n.slider {\n  position: relative;\n  height: 400px;\n  width: 100%; }\n  .slider.fullscreen {\n    height: 100%;\n    width: 100%;\n    position: absolute;\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0; }\n    .slider.fullscreen ul.slides {\n      height: 100%; }\n    .slider.fullscreen ul.indicators {\n      z-index: 2;\n      bottom: 30px; }\n  .slider .slides {\n    background-color: #9e9e9e;\n    margin: 0;\n    height: 400px; }\n    .slider .slides li {\n      opacity: 0;\n      position: absolute;\n      top: 0;\n      left: 0;\n      z-index: 1;\n      width: 100%;\n      height: inherit;\n      overflow: hidden; }\n      .slider .slides li img {\n        height: 100%;\n        width: 100%;\n        background-size: cover;\n        background-position: center; }\n      .slider .slides li .caption {\n        color: #fff;\n        position: absolute;\n        top: 15%;\n        left: 15%;\n        width: 70%;\n        opacity: 0; }\n        .slider .slides li .caption p {\n          color: #e0e0e0; }\n      .slider .slides li.active {\n        z-index: 2; }\n  .slider .indicators {\n    position: absolute;\n    text-align: center;\n    left: 0;\n    right: 0;\n    bottom: 0;\n    margin: 0; }\n    .slider .indicators .indicator-item {\n      display: inline-block;\n      position: relative;\n      cursor: pointer;\n      height: 16px;\n      width: 16px;\n      margin: 0 12px;\n      background-color: #e0e0e0;\n      transition: background-color .3s;\n      border-radius: 50%; }\n      .slider .indicators .indicator-item.active {\n        background-color: #4CAF50; }\n\n.carousel {\n  overflow: hidden;\n  position: relative;\n  width: 100%;\n  height: 400px;\n  perspective: 500px;\n  transform-style: preserve-3d;\n  transform-origin: 0% 50%; }\n  .carousel.carousel-slider {\n    top: 0;\n    left: 0; }\n    .carousel.carousel-slider .carousel-fixed-item {\n      position: absolute;\n      left: 0;\n      right: 0;\n      bottom: 20px;\n      z-index: 1; }\n      .carousel.carousel-slider .carousel-fixed-item.with-indicators {\n        bottom: 68px; }\n    .carousel.carousel-slider .carousel-item {\n      width: 100%;\n      height: 100%;\n      min-height: 400px;\n      position: absolute;\n      top: 0;\n      left: 0; }\n      .carousel.carousel-slider .carousel-item h2 {\n        font-size: 24px;\n        font-weight: 500;\n        line-height: 32px; }\n      .carousel.carousel-slider .carousel-item p {\n        font-size: 15px; }\n  .carousel .carousel-item {\n    visibility: hidden;\n    width: 200px;\n    height: 200px;\n    position: absolute;\n    top: 0;\n    left: 0; }\n    .carousel .carousel-item > img {\n      width: 100%; }\n  .carousel .indicators {\n    position: absolute;\n    text-align: center;\n    left: 0;\n    right: 0;\n    bottom: 0;\n    margin: 0; }\n    .carousel .indicators .indicator-item {\n      display: inline-block;\n      position: relative;\n      cursor: pointer;\n      height: 8px;\n      width: 8px;\n      margin: 24px 4px;\n      background-color: rgba(255, 255, 255, 0.5);\n      transition: background-color .3s;\n      border-radius: 50%; }\n      .carousel .indicators .indicator-item.active {\n        background-color: #fff; }\n  .carousel.scrolling .carousel-item .materialboxed,\n  .carousel .carousel-item:not(.active) .materialboxed {\n    pointer-events: none; }\n\n.tap-target-wrapper {\n  width: 800px;\n  height: 800px;\n  position: fixed;\n  z-index: 1000;\n  visibility: hidden;\n  transition: visibility 0s .3s; }\n\n.tap-target-wrapper.open {\n  visibility: visible;\n  transition: visibility 0s; }\n  .tap-target-wrapper.open .tap-target {\n    transform: scale(1);\n    opacity: .95;\n    transition: transform 0.3s cubic-bezier(0.42, 0, 0.58, 1), opacity 0.3s cubic-bezier(0.42, 0, 0.58, 1); }\n  .tap-target-wrapper.open .tap-target-wave::before {\n    transform: scale(1); }\n  .tap-target-wrapper.open .tap-target-wave::after {\n    visibility: visible;\n    animation: pulse-animation 1s cubic-bezier(0.24, 0, 0.38, 1) infinite;\n    transition: opacity .3s,\r transform .3s,\r visibility 0s 1s; }\n\n.tap-target {\n  position: absolute;\n  font-size: 1rem;\n  border-radius: 50%;\n  background-color: #64B5F6;\n  box-shadow: 0 20px 20px 0 rgba(0, 0, 0, 0.14), 0 10px 50px 0 rgba(0, 0, 0, 0.12), 0 30px 10px -20px rgba(0, 0, 0, 0.2);\n  width: 100%;\n  height: 100%;\n  opacity: 0;\n  transform: scale(0);\n  transition: transform 0.3s cubic-bezier(0.42, 0, 0.58, 1), opacity 0.3s cubic-bezier(0.42, 0, 0.58, 1); }\n\n.tap-target-content {\n  position: relative;\n  display: table-cell; }\n\n.tap-target-wave {\n  position: absolute;\n  border-radius: 50%;\n  z-index: 10001; }\n  .tap-target-wave::before, .tap-target-wave::after {\n    content: '';\n    display: block;\n    position: absolute;\n    width: 100%;\n    height: 100%;\n    border-radius: 50%;\n    background-color: #ffffff; }\n  .tap-target-wave::before {\n    transform: scale(0);\n    transition: transform .3s; }\n  .tap-target-wave::after {\n    visibility: hidden;\n    transition: opacity .3s,\r transform .3s,\r visibility 0s;\n    z-index: -1; }\n\n.tap-target-origin {\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%);\n  z-index: 10002;\n  position: absolute !important; }\n  .tap-target-origin:not(.btn):not(.btn-large), .tap-target-origin:not(.btn):not(.btn-large):hover {\n    background: none; }\n\n@media only screen and (max-width: 600px) {\n  .tap-target, .tap-target-wrapper {\n    width: 600px;\n    height: 600px; } }\n\n.pulse {\n  overflow: visible;\n  position: relative; }\n  .pulse::before {\n    content: '';\n    display: block;\n    position: absolute;\n    width: 100%;\n    height: 100%;\n    top: 0;\n    left: 0;\n    background-color: inherit;\n    border-radius: inherit;\n    transition: opacity .3s, transform .3s;\n    animation: pulse-animation 1s cubic-bezier(0.24, 0, 0.38, 1) infinite;\n    z-index: -1; }\n\n@keyframes pulse-animation {\n  0% {\n    opacity: 1;\n    transform: scale(1); }\n  50% {\n    opacity: 0;\n    transform: scale(1.5); }\n  100% {\n    opacity: 0;\n    transform: scale(1.5); } }\n\n/* Modal */\n.datepicker-modal {\n  max-width: 325px;\n  min-width: 300px;\n  max-height: none; }\n\n.datepicker-container.modal-content {\n  display: flex;\n  flex-direction: column;\n  padding: 0; }\n\n.datepicker-controls {\n  display: flex;\n  justify-content: space-between;\n  width: 280px;\n  margin: 0 auto; }\n  .datepicker-controls .selects-container {\n    display: flex; }\n  .datepicker-controls .select-wrapper input {\n    border-bottom: none;\n    text-align: center;\n    margin: 0; }\n    .datepicker-controls .select-wrapper input:focus {\n      border-bottom: none; }\n  .datepicker-controls .select-wrapper .caret {\n    display: none; }\n  .datepicker-controls .select-year input {\n    width: 50px; }\n  .datepicker-controls .select-month input {\n    width: 70px; }\n\n.month-prev, .month-next {\n  margin-top: 4px;\n  cursor: pointer;\n  background-color: transparent;\n  border: none; }\n\n/* Date Display */\n.datepicker-date-display {\n  flex: 1;\n  background-color: #ab47bc;\n  color: #fff;\n  padding: 20px 22px;\n  font-weight: 500; }\n  .datepicker-date-display .year-text {\n    display: block;\n    font-size: 1.5rem;\n    line-height: 25px;\n    color: rgba(255, 255, 255, 0.7); }\n  .datepicker-date-display .date-text {\n    display: block;\n    font-size: 2.8rem;\n    line-height: 47px;\n    font-weight: 500; }\n\n/* Calendar */\n.datepicker-calendar-container {\n  flex: 2.5; }\n\n.datepicker-table {\n  width: 280px;\n  font-size: 1rem;\n  margin: 0 auto; }\n  .datepicker-table thead {\n    border-bottom: none; }\n  .datepicker-table th {\n    padding: 10px 5px;\n    text-align: center; }\n  .datepicker-table tr {\n    border: none; }\n  .datepicker-table abbr {\n    text-decoration: none;\n    color: #999; }\n  .datepicker-table td {\n    border-radius: 50%;\n    padding: 0; }\n    .datepicker-table td.is-today {\n      color: #ab47bc; }\n    .datepicker-table td.is-selected {\n      background-color: #ab47bc;\n      color: #fff; }\n    .datepicker-table td.is-outside-current-month, .datepicker-table td.is-disabled {\n      color: rgba(0, 0, 0, 0.3);\n      pointer-events: none; }\n\n.datepicker-day-button {\n  background-color: transparent;\n  border: none;\n  line-height: 38px;\n  display: block;\n  width: 100%;\n  border-radius: 50%;\n  padding: 0 5px;\n  cursor: pointer;\n  color: inherit; }\n  .datepicker-day-button:focus {\n    background-color: rgba(167, 77, 182, 0.25); }\n\n/* Footer */\n.datepicker-footer {\n  width: 280px;\n  margin: 0 auto;\n  padding-bottom: 5px;\n  display: flex;\n  justify-content: space-between; }\n\n.datepicker-clear,\n.datepicker-today,\n.datepicker-done {\n  color: #ab47bc;\n  padding: 0 1rem; }\n\n.datepicker-clear {\n  color: #ff9800; }\n\n/* Media Queries */\n@media only screen and (min-width: 601px) {\n  .datepicker-modal {\n    max-width: 625px; }\n  .datepicker-container.modal-content {\n    flex-direction: row; }\n  .datepicker-controls,\n  .datepicker-table,\n  .datepicker-footer {\n    width: 320px; }\n  .datepicker-day-button {\n    line-height: 44px; } }\n\n/* Timepicker Containers */\n.timepicker-modal {\n  max-width: 325px;\n  max-height: none; }\n\n.timepicker-container.modal-content {\n  display: flex;\n  flex-direction: column;\n  padding: 0; }\n\n.text-primary {\n  color: white; }\n\n/* Clock Digital Display */\n.timepicker-digital-display {\n  flex: 1;\n  background-color: #ab47bc;\n  padding: 10px;\n  font-weight: 300; }\n\n.timepicker-text-container {\n  font-size: 4rem;\n  font-weight: bold;\n  text-align: center;\n  color: rgba(173, 32, 32, 0.6);\n  font-weight: 400;\n  position: relative;\n  user-select: none; }\n\n.timepicker-span-hours,\n.timepicker-span-minutes,\n.timepicker-span-am-pm div {\n  cursor: pointer; }\n\n.timepicker-span-hours {\n  margin-right: 3px; }\n\n.timepicker-span-minutes {\n  margin-left: 3px; }\n\n.timepicker-display-am-pm {\n  font-size: 1.3rem;\n  position: absolute;\n  right: 1rem;\n  bottom: 1rem;\n  font-weight: 400; }\n\n/* Analog Clock Display */\n.timepicker-analog-display {\n  flex: 2.5; }\n\n.timepicker-plate {\n  background-color: #eee;\n  border-radius: 50%;\n  width: 270px;\n  height: 270px;\n  overflow: visible;\n  position: relative;\n  margin: auto;\n  margin-top: 25px;\n  margin-bottom: 5px;\n  user-select: none; }\n\n.timepicker-canvas,\n.timepicker-dial {\n  position: absolute;\n  left: 0;\n  right: 0;\n  top: 0;\n  bottom: 0; }\n\n.timepicker-minutes {\n  visibility: hidden; }\n\n.timepicker-tick {\n  border-radius: 50%;\n  color: rgba(0, 0, 0, 0.87);\n  line-height: 40px;\n  text-align: center;\n  width: 40px;\n  height: 40px;\n  position: absolute;\n  cursor: pointer;\n  font-size: 15px; }\n\n.timepicker-tick.active,\n.timepicker-tick:hover {\n  background-color: rgba(171, 71, 188, 0.25); }\n\n.timepicker-dial {\n  transition: transform 350ms, opacity 350ms; }\n\n.timepicker-dial-out {\n  opacity: 0; }\n  .timepicker-dial-out.timepicker-hours {\n    transform: scale(1.1, 1.1); }\n  .timepicker-dial-out.timepicker-minutes {\n    transform: scale(0.8, 0.8); }\n\n.timepicker-canvas {\n  transition: opacity 175ms; }\n  .timepicker-canvas line {\n    stroke: #ab47bc;\n    stroke-width: 4;\n    stroke-linecap: round; }\n\n.timepicker-canvas-out {\n  opacity: 0.25; }\n\n.timepicker-canvas-bearing {\n  stroke: none;\n  fill: #ab47bc; }\n\n.timepicker-canvas-bg {\n  stroke: none;\n  fill: #ab47bc; }\n\n/* Footer */\n.timepicker-footer {\n  margin: 0 auto;\n  padding: 5px 1rem;\n  display: flex;\n  justify-content: space-between; }\n\n.timepicker-clear {\n  color: #ff9800; }\n\n.timepicker-close {\n  color: #ab47bc; }\n\n.timepicker-clear,\n.timepicker-close {\n  padding: 0 20px; }\n\n/* Media Queries */\n@media only screen and (min-width: 601px) {\n  .timepicker-modal {\n    max-width: 600px; }\n  .timepicker-container.modal-content {\n    flex-direction: row; }\n  .timepicker-text-container {\n    top: 32%; }\n  .timepicker-display-am-pm {\n    position: relative;\n    right: auto;\n    bottom: auto;\n    text-align: center;\n    margin-top: 1.2rem; } }\n", ""]);

// exports


/***/ }),
/* 84 */
/***/ (function(module, exports, __webpack_require__) {


var content = __webpack_require__(85);

if(typeof content === 'string') content = [[module.i, content, '']];

var transform;
var insertInto;



var options = {"hmr":true}

options.transform = transform
options.insertInto = undefined;

var update = __webpack_require__(6)(content, options);

if(content.locals) module.exports = content.locals;

if(false) {
	module.hot.accept("!!../../node_modules/css-loader/index.js!../../node_modules/sass-loader/lib/loader.js!./master.css", function() {
		var newContent = require("!!../../node_modules/css-loader/index.js!../../node_modules/sass-loader/lib/loader.js!./master.css");

		if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];

		var locals = (function(a, b) {
			var key, idx = 0;

			for(key in a) {
				if(!b || a[key] !== b[key]) return false;
				idx++;
			}

			for(key in b) idx--;

			return idx === 0;
		}(content.locals, newContent.locals));

		if(!locals) throw new Error('Aborting CSS HMR due to changed css-modules locals.');

		update(newContent);
	});

	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 85 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(5)(false);
// imports


// module
exports.push([module.i, ".card-title.title {\n  font-weight: 300; }\n\n.description {\n  font-weight: 300;\n  font-size: 0.8rem; }\n\n.display {\n  height: 9rem; }\n\ndiv div.card-content.description {\n  padding: 10px 24px; }\n\ndiv.card div.card-action {\n  padding: 10px 24px; }\n\ndiv div div.chip {\n  height: 20px;\n  font-size: 11px;\n  line-height: 20px;\n  padding: 0 8px;\n  font-weight: 500; }\n\n.card .card-image span.card-title.title {\n  padding: 6px 24px; }\n\ni.material-icons.checks {\n  font-size: 19px;\n  padding: 4.2px 0px 0px 3.5px;\n  float: left;\n  margin: -3.4px -2px 0px -12px;\n  height: 27px;\n  width: 27px;\n  border-radius: 16px;\n  background: inherit; }\n\n.typeIcons.medium {\n  font-size: 6.5rem;\n  right: 0.5rem;\n  bottom: 1.8rem;\n  position: absolute;\n  opacity: 0.18; }\n\n.pointer {\n  cursor: pointer; }\n\nheader {\n  position: fixed;\n  top: 0;\n  width: 100%;\n  z-index: 4;\n  height: 5rem; }\n\nmain {\n  margin: 6rem 0; }\n\n.btn-floating {\n  z-index: 0; }\n", ""]);

// exports


/***/ }),
/* 86 */
/***/ (function(module, exports, __webpack_require__) {


var content = __webpack_require__(87);

if(typeof content === 'string') content = [[module.i, content, '']];

var transform;
var insertInto;



var options = {"hmr":true}

options.transform = transform
options.insertInto = undefined;

var update = __webpack_require__(6)(content, options);

if(content.locals) module.exports = content.locals;

if(false) {
	module.hot.accept("!!../../css-loader/index.js!../../sass-loader/lib/loader.js!./material-icons.css", function() {
		var newContent = require("!!../../css-loader/index.js!../../sass-loader/lib/loader.js!./material-icons.css");

		if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];

		var locals = (function(a, b) {
			var key, idx = 0;

			for(key in a) {
				if(!b || a[key] !== b[key]) return false;
				idx++;
			}

			for(key in b) idx--;

			return idx === 0;
		}(content.locals, newContent.locals));

		if(!locals) throw new Error('Aborting CSS HMR due to changed css-modules locals.');

		update(newContent);
	});

	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 87 */
/***/ (function(module, exports, __webpack_require__) {

var escape = __webpack_require__(88);
exports = module.exports = __webpack_require__(5)(false);
// imports


// module
exports.push([module.i, "@font-face {\n  font-family: 'Material Icons';\n  font-style: normal;\n  font-weight: 400;\n  src: url(" + escape(__webpack_require__(89)) + ");\n  /* For IE6-8 */\n  src: local(\"Material Icons\"), local(\"MaterialIcons-Regular\"), url(" + escape(__webpack_require__(90)) + ") format(\"woff2\"), url(" + escape(__webpack_require__(91)) + ") format(\"woff\"), url(" + escape(__webpack_require__(92)) + ") format(\"truetype\"); }\n\n.material-icons {\n  font-family: 'Material Icons';\n  font-weight: normal;\n  font-style: normal;\n  font-size: 24px;\n  /* Preferred icon size */\n  display: inline-block;\n  line-height: 1;\n  text-transform: none;\n  letter-spacing: normal;\n  word-wrap: normal;\n  white-space: nowrap;\n  direction: ltr;\n  /* Support for all WebKit browsers. */\n  -webkit-font-smoothing: antialiased;\n  /* Support for Safari and Chrome. */\n  text-rendering: optimizeLegibility;\n  /* Support for Firefox. */\n  -moz-osx-font-smoothing: grayscale;\n  /* Support for IE. */\n  font-feature-settings: 'liga'; }\n", ""]);

// exports


/***/ }),
/* 88 */
/***/ (function(module, exports) {

module.exports = function escape(url) {
    if (typeof url !== 'string') {
        return url
    }
    // If url is already wrapped in quotes, remove them
    if (/^['"].*['"]$/.test(url)) {
        url = url.slice(1, -1);
    }
    // Should url be wrapped?
    // See https://drafts.csswg.org/css-values-3/#urls
    if (/["'() \t\n]/.test(url)) {
        return '"' + url.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"'
    }

    return url
}


/***/ }),
/* 89 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__.p + "./img/MaterialIcons-Regular.eot?e79bfd88537def476913f3ed52f4f4b3";

/***/ }),
/* 90 */
/***/ (function(module, exports) {

module.exports = "data:application/font-woff;base64,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"

/***/ }),
/* 91 */
/***/ (function(module, exports) {

module.exports = "data:application/font-woff;base64,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"

/***/ }),
/* 92 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__.p + "./img/MaterialIcons-Regular.ttf?a37b0c01c0baf1888ca812cc0508f6e2";

/***/ })
],[33]);