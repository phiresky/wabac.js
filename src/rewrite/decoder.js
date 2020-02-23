"use strict";

import brotliDecode from 'brotli/decompress';

import { Inflate } from 'pako';

import { makeRwResponse } from '../utils.js';


// ===========================================================================
async function decodeResponse(response, contentEncoding, transferEncoding) {
  const origContent = new Uint8Array(await response.arrayBuffer());
  let content = origContent;

  try {
    if (transferEncoding === "chunked") {
      content = dechunkArrayBuffer(content);
    }
  } catch (e) {
    console.log("Chunk-Encoding Ignored: " + e);
  }

  try {
    if (contentEncoding === "br") {
      content = brotliDecode(content);

    } else if (contentEncoding === "gzip" || transferEncoding === "gzip") {
      const inflator = new Inflate();

      inflator.push(content, true);

      // if error occurs (eg. not gzip), use original arraybuffer
      if (inflator.result && !inflator.err) {
        content = inflator.result;
      }
    }
  } catch(e) {
    console.log("Content-Encoding Ignored: " + e);
  }

  return makeRwResponse(content, response);
}

// ===========================================================================
function dechunkArrayBuffer(data) {
  let readOffset = 0;
  let writeOffset = 0;

  const decoder = new TextDecoder("utf-8");

  while (readOffset < data.length) {
    let i = readOffset;

    // check hex digits, 0-9, A-Z, a-z
    while ((data[i] >= 48 && data[i] <= 57) ||
           (data[i] >= 65 && data[i] <= 70) ||
           (data[i] >= 97 && data[i] <= 102)) {
      i++;
    }

    // doesn't start with number, return original
    if (i === 0) {
      return data;
    }

    // ensure \r\n\r\n
    if (data[i] != 13 || data[i + 1] != 10) {
      return data;
    }

    i += 2;

    var chunkLength = parseInt(decoder.decode(data.subarray(readOffset, i)), 16);

    if (chunkLength == 0) {
      break;
    }

    data.set(data.subarray(i, i + chunkLength), writeOffset);

    i += chunkLength;

    writeOffset += chunkLength;

    if (data[i] == 13 && data[i + 1] == 10) {
      i += 2;
    }

    readOffset = i;
  }

  return data.subarray(0, writeOffset);
}

export { decodeResponse };


