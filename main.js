/* Copyright (c) 2013-present The TagSpaces Authors.
 * Use of this source code is governed by the MIT license which can be found in the LICENSE.txt file. */

'use strict';

sendMessageToHost({ command: 'loadDefaultTextContent' });

var JSZip, JSZipUtils;
let $documentContent;
const filePath = getParameterByName('file');

$(document).ready(init);
function init() {
  const locale = getParameterByName('locale');
  initI18N(locale, 'ns.viewerDocument.json');

  const searchQuery = getParameterByName('query');

  let extSettings;
  loadExtSettings();

  $documentContent = $('#documentContent');

  const styles = ['', 'solarized-dark', 'github', 'metro-vibes', 'clearness', 'clearness-dark'];
  let currentStyleIndex = 0;
  if (extSettings && extSettings.styleIndex) {
    currentStyleIndex = extSettings.styleIndex;
  }

  const zoomSteps = ['zoomSmallest', 'zoomSmaller', 'zoomSmall', 'zoomDefault', 'zoomLarge', 'zoomLarger', 'zoomLargest'];
  let currentZoomState = 3;
  if (extSettings && extSettings.zoomState) {
    currentZoomState = extSettings.zoomState;
  }

  $documentContent.removeClass();
  $documentContent.addClass('markdown ' + styles[currentStyleIndex] + ' ' + zoomSteps[currentZoomState]);

  $('#changeStyleButton').on('click', function() {
    currentStyleIndex = currentStyleIndex + 1;
    if (currentStyleIndex >= styles.length) {
      currentStyleIndex = 0;
    }
    $documentContent.removeClass();
    $documentContent.addClass('markdown ' + styles[currentStyleIndex] + ' ' + zoomSteps[currentZoomState]);
    saveExtSettings();
  });

  $('#resetStyleButton').on('click', function() {
    currentStyleIndex = 0;
    $documentContent.removeClass();
    $documentContent.addClass('markdown ' + styles[currentStyleIndex] + ' ' + zoomSteps[currentZoomState]);
    saveExtSettings();
  });

  $('#zoomInButton').on('click', function() {
    currentZoomState++;
    if (currentZoomState >= zoomSteps.length) {
      currentZoomState = 6;
    }
    $documentContent.removeClass();
    $documentContent.addClass('markdown ' + styles[currentStyleIndex] + ' ' + zoomSteps[currentZoomState]);
    saveExtSettings();
  });

  $('#zoomOutButton').on('click', function() {
    currentZoomState--;
    if (currentZoomState < 0) {
      currentZoomState = 0;
    }
    $documentContent.removeClass();
    $documentContent.addClass('markdown ' + styles[currentStyleIndex] + ' ' + zoomSteps[currentZoomState]);
    saveExtSettings();
  });

  $('#zoomResetButton').on('click', function() {
    currentZoomState = 3;
    $documentContent.removeClass();
    $documentContent.addClass('markdown ' + styles[currentStyleIndex] + ' ' + zoomSteps[currentZoomState]);
    saveExtSettings();
  });

  function saveExtSettings() {
    const settings = {
      'styleIndex': currentStyleIndex,
      'zoomState': currentZoomState
    };
    localStorage.setItem('viewerDocumentSettings', JSON.stringify(settings));
  }

  function loadExtSettings() {
    extSettings = JSON.parse(localStorage.getItem('viewerDocumentSettings'));
  }

  // Menu: hide readability items
  $('#readabilityFont').hide();
  $('#readabilityFontSize').hide();
  $('#themeStyle').hide();
  $('#readabilityOff').hide();
};

// fixing embedding of local images
function fixingEmbeddingOfLocalImages($documentContent, fileDirectory) {
  const hasURLProtocol = function(url) {
    return (
      url.indexOf('http://') === 0 ||
      url.indexOf('https://') === 0 ||
      url.indexOf('file://') === 0 ||
      url.indexOf('data:') === 0
    );
  };

  $documentContent.find('img[src]').each(function() {
    const currentSrc = $(this).attr('src');
    if (!hasURLProtocol(currentSrc)) {
      const path = (isWeb ? '' : 'file://') + fileDirectory + '/' + currentSrc;
      $(this).attr('src', path);
    }
  });

  $documentContent.find('a[href]').each(function() {
    let currentSrc = $(this).attr('href');
    let path;

    if(currentSrc.indexOf('#') === 0 ) {
      // Leave the default link behaviour by internal links
    } else {
      if (!hasURLProtocol(currentSrc)) {
        const path = (isWeb ? '' : 'file://') + fileDirectory + '/' + currentSrc;
        $(this).attr('href', path);
      }

      $(this).off();
      $(this).on('click', function(e) {
        e.preventDefault();
        if (path) {
          currentSrc = encodeURIComponent(path);
        }
        sendMessageToHost({command: 'openLinkExternally', link: currentSrc});
      });
    }
  });
}

function setContent(content, fileDirectory, sourceURL) {

  const options = {
    convertImage: mammoth.images.imgElement((image) => {
      return image.read("base64").then((imageBuffer) => {
        return {
          src: "data:" + image.contentType + ";base64," + imageBuffer
        };
      });
    }),
    styleMap: [
      "p[style-name='Section Title'] => h1:fresh",
      "p[style-name='Subsection Title'] => h2:fresh"
    ]
  };

  JSZipUtils.getBinaryContent(filePath ,(err, data) => {
    if (err) {
      throw err; // or handle err
    }
    mammoth.convertToHtml({ arrayBuffer: data }, options).then((result) => {
      // console.log(result);
      // const html = result.value; // The generated HTML
      // const messages = result.messages; // Any messages, such as warnings during conversion
      displayDocument(result);
    }).done();
  });

  if (fileDirectory && fileDirectory.startsWith('file://')) {
    fileDirectory = fileDirectory.substring(('file://').length, fileDirectory.length);
  }

  fixingEmbeddingOfLocalImages($documentContent, fileDirectory);
}

function displayDocument(result) {
  // document.getElementById("output").innerHTML = result.value;
  // const messageHtml = result.messages.map((message) => {
  //   return '<li class="' + message.type + '">' + escapeHtml(message.message) + "</li>";
  // }).join("");
  // const appendedContent = document.getElementById("messages").innerHTML = "<ul>" + messageHtml + "</ul>";

  const bodyRegex = /\<body[^>]*\>([^]*)\<\/body/m; // jshint ignore:line
  let bodyContent;
  const content = result.value;
  // const warrningMessage = result.message;

  // const UTF8_BOM = '\ufeff';
  // let docContent = content;
  // if (docContent.indexOf(UTF8_BOM) === 0) {
  //   docContent = docContent.substring(1, docContent.length);
  // }

  try {
    bodyContent = content.match(bodyRegex)[1];
  } catch (e) {
    console.log('Error parsing the body of the HTML document. ' + e);
    bodyContent = content;
  }

  // const sourceURLRegex = /data-sourceurl='([^']*)'/m; // jshint ignore:line
  // const regex = new RegExp(sourceURLRegex);
  // sourceURL = content.match(regex);
  // const url = sourceURL ? sourceURL[1] : undefined;

  // removing all scripts from the document
  const cleanedBodyContent = bodyContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  $documentContent = $('#documentContent');
  $documentContent.empty().append(cleanedBodyContent);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
