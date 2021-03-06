const ipc = require('electron').ipcRenderer
const amdLoader = require(__dirname + '/../../node_modules/monaco-editor/min/vs/loader.js');
const path = require('path')
const amdRequire = amdLoader.require;
const amdDefine = amdLoader.require.define
const btnRunInstQury = document.getElementById('btnRunInstQury')
const bndlContainer = document.getElementById('enable-bundle-container')
const selectBundle = document.getElementById('select-bundle')
const electron = require('electron')
const dialog = electron.remote.dialog
var editor = null
var filtEditor = null
const fontSizeArray = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32]
const fontFamilyArray = ["Arial", "Courier", "Consolas", "Hack", "Menlo", "Monaco", "Times New Roman" ]
var currentFontSizeIndex = 3
var currentFontFamilyIndex = 5
var fileDecorList = []
var filtDecorList = []
var bookMarkedLines = []
function uriFromPath(_path) {
	var pathName = path.resolve(_path).replace(/\\/g, '/');
	if (pathName.length > 0 && pathName.charAt(0) !== '/') {
		pathName = '/' + pathName;
	}
	return encodeURI('file://' + pathName);
}

var isResizing = false;
var last_mouse_pos;
dragDiv = document.getElementById("drag")
dragDiv.addEventListener("mousedown", function(event){
    isResizing = true
    last_mouse_pos = event.y
    // console.log("Started resizing")
})

selectBundle.addEventListener('change', function(){
    ipc.send('enable-bundle', selectBundle.value, bookMarkedLines)
})
btnRunInstQury.addEventListener('click', function(e){
    // console.log("Instantly filtering logs")
    let instaQueryTxt = document.getElementById('txtInstQryArea')
    let clrInstBg = document.getElementById('clrInstBg')
    let clrInstFg = document.getElementById('clrInstFg')
    let filename = document.getElementById("file-info").innerHTML
    ipc.send('create-instant-query', {"query": instaQueryTxt.value, "bgColor": clrInstBg.value, "fgColor": clrInstFg.value, "filename": filename}, bookMarkedLines)
    
})
document.addEventListener('mousemove', function(e){
    if (isResizing) {
        container = document.getElementById("container")
        bigContainer = document.getElementById("big-container")
        filtContainer = document.getElementById("filter-container")
        // console.log("Computed height: ", parseInt(getComputedStyle(container, '').height))
        // console.log(event.clientY)
        delta = last_mouse_pos - event.clientY
        last_mouse_pos = event.clientY

        // console.log(delta)
        container.style.height = parseInt(getComputedStyle(container, "").height) - delta + "px"
        // console.log("mod height: ", container.style.height)
        filtContainer.style.height = parseInt(getComputedStyle(filtContainer,"").height) + delta + "px"
        // console.log(event.clientX)
    }
})
document.addEventListener('mouseup', function(e){
    isResizing = false
    // console.log("Done resizing")

})
amdRequire.config({
	baseUrl: uriFromPath(path.join(__dirname, '../../node_modules/monaco-editor/min'))
});


function addMouseListenerForEditor(editor) {
    console.log("Addeing mouse event listener")
    editor.onMouseDown(function (e) {
        //console.log('mousedown - ' + e.target.toString());
        if([2, 3, 4].indexOf(e.target.type) !== -1){
            //The user has clicked on the gutter area.
            if (bookMarkedLines.indexOf(e.target.position.lineNumber) === -1){
                //This line is clicked to bookmark
                bookMarkedLines.push(e.target.position.lineNumber)
            } else {
                //This line is already bookmarked have to remove it
                bookMarkedLines.splice(bookMarkedLines.indexOf(e.target.position.lineNumber), 1)
            }
            bookMarkedLines.sort((a, b) => a - b)
        }
        ipc.send('add-bookmark', bookMarkedLines)
    });
}


ipc.on('Display-File', function(event, contents){
    // console.log("Received file contents:");
    fileInfo = document.getElementById("file-info")
    fileInfo.innerHTML = contents.filename
    updateLogViewWindow(contents, "container")
    bndlContainer.style.display = 'block'
    contents = null
    // addMouseListenerForEditor(editor)
})

ipc.on("File-Content-Response", function(content){
    updateLogViewWindow(content, "container")
})

function mapLineNumbers(origlineNo) {
    if (origlineNo < linemap.length) {
		return linemap[origlineNo];
	}
	return origlineNo;
}
var linemap = []
ipc.on("Filtered-Output", function(event, filteredContent){
    // console.log("Received filtered output", filteredContent)
    linemap = filteredContent.lines
    linemap.unshift(0)
    updateLogViewWindow(filteredContent,"filter-container")
})

function updateLogDecorations(viewEditor, line, cssRule) {
    removePreviousDecors()
    for (let index = 0; index < cssRule.length; index++) {
        const elementArr = cssRule[index];
        bookmarked = false
        let element = ""
        for(let elemArrIndex = 0; elemArrIndex<elementArr.length; elemArrIndex++){
            element = elementArr[elemArrIndex]
            if (element !== "Bookmark"){
                if (viewEditor === filtEditor){
                    decor = viewEditor.deltaDecorations([], [{
                        range: new monaco.Range(index + 1, 1, index + 1, 1),
                        options: {
                            isWholeLine: true,
                            inlineClassName: element
                        }
                    }])
                    filtDecorList.push(decor)
                } else {
                    decor = viewEditor.deltaDecorations([], [{
                        range: new monaco.Range(line[index + 1], 1, line[index + 1], 1),
                        options: {
                            isWholeLine: true,
                            inlineClassName: element
                        }
                    }])
                    fileDecorList.push(decor)
                }
            } else {
                if (viewEditor === filtEditor){
                    decor = viewEditor.deltaDecorations([], [{
                        range: new monaco.Range(index + 1, 1, index + 1, 1),
                        options: {
                            isWholeLine: true,
                            glyphMarginClassName: 'bookmark'
                        }
                    }])
                    filtDecorList.push(decor)
                } else {
                    decor = viewEditor.deltaDecorations([], [{
                        range: new monaco.Range(line[index + 1], 1, line[index + 1], 1),
                        options: {
                            isWholeLine: true,
                            glyphMarginClassName: 'bookmark'
                        }
                    }])
                    fileDecorList.push(decor)
                }

            }

        }

    }
} 


function removePreviousDecors() {
    if(editor !== null) {
        fileDecorList = editor.deltaDecorations(fileDecorList, [])
    }
    if(filtEditor !== null){
        filtDecorList = editor.deltaDecorations(filtDecorList, [])
    }
}

function updateLogViewWindow(content, containerId) {
    amdRequire(['vs/editor/editor.main'], function() {

        
        // console.log("About to create an editor", typeof(content))
        if (containerId === "container"){
            
            if (editor === null) {
                editor = monaco.editor.create(document.getElementById(containerId), {
                    value: content.logs.join('\n'),
                    automaticLayout: true,
                    readOnly: true,
                    glyphMargin: true,
                    minimap: {enabled:false},
                    fontSize: fontSizeArray[currentFontSizeIndex],
                    fontFamily: fontFamilyArray[currentFontFamilyIndex]
                });
                addMouseListenerForEditor(editor)
            } else {
                editor.setValue(content.logs.join('\n'))
            }
            // addMouseListenerForEditor(editor)
        } else {
            if (filtEditor === null ){
                filtEditor = monaco.editor.create(document.getElementById(containerId), {
                    value: content.logs.join('\n'),
                    automaticLayout: true,
                    lineNumbers: mapLineNumbers,
                    readOnly: true,
                    glyphMargin: true,
                    minimap: {enabled:false},
                    fontSize: fontSizeArray[currentFontSizeIndex],
                    fontFamily: fontFamilyArray[currentFontFamilyIndex]
                })
            } else {
                filtEditor.setValue(content.logs.join('\n'))
            }
            
            // dialog.showErrorBox("Applied Rules", "Applied Rules:" + content.rules)
            updateLogDecorations(filtEditor, content.lines, content.rules)
            updateLogDecorations(editor, content.lines, content.rules)
            filtEditor.onMouseDown(filterEditerMouseDown)

        }
		;
	}, function(arg){
        // console.log("Error in display: ", arg)
    });
}

function filterEditerMouseDown(event) {

        clickedLine = event.target.position.lineNumber;
        mappedLine = mapLineNumbers(clickedLine)
        if(editor !== null && editor !== undefined) {
            editor.revealLine(mappedLine)
            editor.focus()
        }
}

ipc.on('update-css-styles', function(event, cssText){
    style = document.getElementById('viewer-css')
    // console.log("style: ", style)
    style = document.createElement("style")
    style.setAttribute("id", "viewer-css")
    style.innerHTML = cssText
    style.setAttribute('type', 'text/css')
    document.body.appendChild(style)
})

ipc.on('update-insta-css-style', function(event, cssText){
    style = document.getElementById('insta-query-style')
    //console.log("style: ", style)
    style.innerHTML = cssText
})

ipc.on('Increase-Font-Size', function(event){
    //console.log("Received command to increase fontsize")
    if (currentFontSizeIndex != fontSizeArray.length - 2){
        currentFontSizeIndex += 1
        if (filtEditor !== null) {
            filtEditor.updateOptions({
                fontSize: fontSizeArray[currentFontSizeIndex]
            })
        }
        
        if(editor !== null){
            editor.updateOptions({
                fontSize: fontSizeArray[currentFontSizeIndex]
            })
        }
        
    }
})

ipc.on('Decrease-Font-Size', function(event){
    // console.log("Received command to decrease fontsize")
    if (currentFontSizeIndex != 0){
        currentFontSizeIndex -= 1
        if (filtEditor !== null ){
            filtEditor.updateOptions({
                fontSize: fontSizeArray[currentFontSizeIndex]
            })
        }
        if (editor !== null) {
            editor.updateOptions({
                fontSize: fontSizeArray[currentFontSizeIndex]
            })
        }
    }
})

function createOptionHTML(listOfOptions){
    var optionHTML = ""
    for (option in listOfOptions ){
        optionHTML = optionHTML + '<option value="'+ listOfOptions[option] +'">'+ listOfOptions[option]+ '</option>'
    }
    return optionHTML
}

ipc.on('bundle-names', function(event, bundlenames){
    bundlenames.unshift("None")
    optionHTML = createOptionHTML(bundlenames)
    selectBundle.innerHTML = optionHTML
})

ipc.on('update-preferences', function(event, preferenceObj){
    if (filtEditor !== null){
        filtEditor.updateOptions({
            fontSize: preferenceObj.fontSize,
            fontFamily: preferenceObj.fontFamily
        })
    }
    if (editor !== null){
        editor.updateOptions({
            fontSize: preferenceObj.fontSize,
            fontFamily: preferenceObj.fontFamily
        })
    }
    currentFontSizeIndex = fontSizeArray.indexOf(parseInt(preferenceObj.fontSize))
    currentFontFamilyIndex = fontFamilyArray.indexOf(preferenceObj.fontFamily)
    // console.log({currentFontFamilyIndex, currentFontSizeIndex})
    monaco.editor.setTheme(preferenceObj.theme)
})
