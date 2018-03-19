/* Copyright (c) 2018-present The TagSpaces Authors.
 * Use of this source code is governed by the MIT license which can be found in the LICENSE.txt file. */

 /* globals $, sendMessageToHost, getParameterByName, initI18N */

var ExcelJS;
let $documentContent;
const filePath = getParameterByName('file');
const fileExt = filePath
  .split('.')
  .pop()
  .toLowerCase();

sendMessageToHost({ command: 'loadDefaultTextContent' });

$(document).ready(init);
function init() {
  const locale = getParameterByName('locale');
  initI18N(locale, 'ns.viewerDocument.json');

  const searchQuery = getParameterByName('query');

  let extSettings;
  loadExtSettings();

  $documentContent = $('#documentContent');

  const zoomSteps = ['zoomSmallest', 'zoomSmaller', 'zoomSmall', 'zoomDefault', 'zoomLarge', 'zoomLarger', 'zoomLargest'];
  let currentZoomState = 3;
  if (extSettings && extSettings.zoomState) {
    currentZoomState = extSettings.zoomState;
  }

  $documentContent.removeClass();
  $documentContent.addClass('markdown ' + zoomSteps[currentZoomState]);

  function saveExtSettings() {
    const settings = {
      zoomState: currentZoomState
    };
    localStorage.setItem('viewerDocumentSettings', JSON.stringify(settings));
  }

  function loadExtSettings() {
    extSettings = JSON.parse(localStorage.getItem('viewerDocumentSettings'));
  }
}

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

  $documentContent.find('a[href]').each((index, link) => {
    let currentSrc = $(link).attr('href');
    let path;

    if (currentSrc.indexOf('#') === 0) {
      // Leave the default link behaviour by internal links
    } else {
      if (!hasURLProtocol(currentSrc)) {
        path = (isWeb ? '' : 'file://') + fileDirectory + '/' + currentSrc;
        $(link).attr('href', path);
      }

      $(link).off();
      $(link).on('click', (e) => {
        e.preventDefault();
        if (path) {
          currentSrc = encodeURIComponent(path);
        }
        sendMessageToHost({ command: 'openLinkExternally', link: currentSrc });
      });
    }
  });
}

function setContent(content, fileDirectory, sourceURL) {
  switch (fileExt) {
    case 'docx':
      readDoc(content, fileDirectory);
      break;
    case 'xlsx':
      readXLSX(content, fileDirectory);
      break;
    default:
      throw "Dosen't recognize a extension."
  }
}

function readDoc(content, fileDirectory) {
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

  JSZipUtils.getBinaryContent(filePath, (err, data) => {
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


function readXLSX(content, fileDirectory) {
  // read from a file
  // const workbook = new ExcelJS.Workbook();
  // workbook.xlsx.readFile(filePath).then((workbook) => {
  //     // use workbook
  //     console.log(workbook);
  //     const inboundWorksheet = workbook.getWorksheet(1); //or name of the worksheet
  //     inboundWorksheet.eachRow({ includeEmpty: true }, function(row, rowNumber) {
  //       console.log("Row " + rowNumber + " = " + JSON.stringify(row.values));
  //     });
  //   });

  // var options = {
  //   filename: filePath,
  //   useStyles: true,
  //   useSharedStrings: true
  // };
  // console.log(new ExcelJS.Workbook());
  // var workbook = new ExcelJS.stream.xlsx.WorkbookWriter(options);

  var wb = new ExcelJS.Workbook();
  var ws = wb.addWorksheet('blort');

  ws.getCell('A1').value = 'Hello, World!';
  ws.getCell('A2').value = 7;

  wb.xlsx.writeBuffer()
    .then(function(buffer) {
      var wb2 = new ExcelJS.Workbook();
      return wb2.xlsx.load(buffer)
        .then(function() {
          var ws2 = wb2.getWorksheet('blort');

          done();
        });
    })
    .catch(function(error) {
      throw error;
    })

  // const workbook = new ExcelJS.Workbook();
  // console.log(workbook);
  //
  // workbook.xlsx.readFile(filePath)
  //   .then((work) => {
  //     console.log(work);
  //
  //     /*get the worksheet with ID 1*/
  //     const sheet = work.getWorksheet(1);
  //
  //     /*or do this if you know what your sheet's standard name*/
  //     // const sheet = work.getWorksheet('Sheet1');
  //
  //     sheet.columns = [
  //       {key: 'no', width: 10},
  //       {key: 'name', width: 20},
  //       {key: 'address', width: 20},
  //       {key: 'job', width: 20},
  //       {key: 'birthdate', width: 20, numFmt: 'dd-mm-yyyy h:mm'},
  //     ];
  //
  //     data.forEach(function(item, index) {
  //       /* I'm pretty sure sheet.addRow() always add to the last filled row + 1*/
  //       sheet.addRow({
  //         no: item[0].no,
  //         name: item[0].name,
  //         address: item[0].address,
  //         job: item[0].job,
  //         birthdate: item[0].birthdate
  //       });
  //     });

  //     workbook.xlsx.writeFile("NewFile.xlsx").then(function() {
  //       console.log("xls file is written.");
  //       fs.readFile("NewFile.xlsx",function(err,buff) {
  //         fs.unlink("NewFile.xlsx",function(err){});
  //         res.setHeader('Content-disposition', 'attachment; filename=NewFile.xlsx');
  //         res.end(buff, 'binary');
  //       });
  //     });
  //   });

}
