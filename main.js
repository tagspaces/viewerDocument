/* Copyright (c) 2013-present The TagSpaces Authors.
 * Use of this source code is governed by the MIT license which can be found in the LICENSE.txt file. */

'use strict';

sendMessageToHost({ command: 'loadDefaultTextContent' });

var $documentContent;
var mammoth;

$(document).ready(init);
function init() {
  var locale = getParameterByName('locale');
  initI18N(locale, 'ns.viewerDocument.json');

  var searchQuery = getParameterByName('query');

  var extSettings;
  loadExtSettings();

  $documentContent = $('#documentContent');

  var styles = ['', 'solarized-dark', 'github', 'metro-vibes', 'clearness', 'clearness-dark'];
  var currentStyleIndex = 0;
  if (extSettings && extSettings.styleIndex) {
    currentStyleIndex = extSettings.styleIndex;
  }

  var zoomSteps = ['zoomSmallest', 'zoomSmaller', 'zoomSmall', 'zoomDefault', 'zoomLarge', 'zoomLarger', 'zoomLargest'];
  var currentZoomState = 3;
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
    var settings = {
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
  var hasURLProtocol = function(url) {
    return (
      url.indexOf('http://') === 0 ||
      url.indexOf('https://') === 0 ||
      url.indexOf('file://') === 0 ||
      url.indexOf('data:') === 0
    );
  };

  $documentContent.find('img[src]').each(function() {
    var currentSrc = $(this).attr('src');
    if (!hasURLProtocol(currentSrc)) {
      var path = (isWeb ? '' : 'file://') + fileDirectory + '/' + currentSrc;
      $(this).attr('src', path);
    }
  });

  $documentContent.find('a[href]').each(function() {
    var currentSrc = $(this).attr('href');
    var path;

    if(currentSrc.indexOf('#') === 0 ) {
      // Leave the default link behaviour by internal links
    } else {
      if (!hasURLProtocol(currentSrc)) {
        var path = (isWeb ? '' : 'file://') + fileDirectory + '/' + currentSrc;
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
  // console.log('setContent', content);
  console.log('fileDirectory', fileDirectory);
  console.log('sourceURL', sourceURL);
  // handleFileSelect(content);

  var bodyRegex = /\<body[^>]*\>([^]*)\<\/body/m; // jshint ignore:line
  var bodyContent;

  try {
    bodyContent = content.match(bodyRegex)[1];
  } catch (e) {
    console.log('Error parsing the body of the HTML document. ' + e);
    bodyContent = content;
  }

  var sourceURLRegex = /data-sourceurl='([^']*)'/m; // jshint ignore:line
  var regex = new RegExp(sourceURLRegex);
  sourceURL = content.match(regex);
  var url = sourceURL ? sourceURL[1] : undefined;

  // removing all scripts from the document
  var cleanedBodyContent = bodyContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  //
  // $documentContent = $('#documentContent');
  // $documentContent.empty().append(cleanedBodyContent);

  if (fileDirectory && fileDirectory.startsWith('file://')) {
    fileDirectory = fileDirectory.substring(('file://').length, fileDirectory.length);
  }

  fixingEmbeddingOfLocalImages($documentContent, fileDirectory);
}

function handleFileSelect(event) {
  readFileInputEventAsArrayBuffer(event, function(arrayBuffer) {
    mammoth.convertToHtml({arrayBuffer: arrayBuffer})
      .then(displayResult)
      .done();
  });
}

function displayResult(result) {
  document.getElementById("output").innerHTML = result.value;

  var messageHtml = result.messages.map(function(message) {
    return '<li class="' + message.type + '">' + escapeHtml(message.message) + "</li>";
  }).join("");

  $documentContent = $('#documentContent');
  $documentContent.empty().append(document.getElementById("messages").innerHTML = "<ul>" + messageHtml + "</ul>");
}

function readFileInputEventAsArrayBuffer(event, callback) {
  var file = event.target.files[0];

  var reader = new FileReader();

  reader.onload = function(loadEvent) {
    var arrayBuffer = loadEvent.target.result;
    callback(arrayBuffer);
  };

  reader.readAsArrayBuffer(file);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
