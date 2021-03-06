const electron = require('electron')
const appManager = require('../appManager')
const path = require('path')
const ipc = electron.ipcRenderer
const app = electron.remote.app
const dialog = electron.remote.dialog
const BrowserWindow = electron.remote.BrowserWindow

const bundleLstDisp = document.getElementById('bndWnd_bndlLst')
const queryLstDisp = document.getElementById('bndWnd_qryLst')
const addBundle = document.getElementById('bndWnd_addBndlBtn')
const rmBundle = document.getElementById('bndWnd_rmBndlBtn')
const importBundle = document.getElementById('bndWnd_imprtBndlBtn')
const exportBundle = document.getElementById('bndWnd_exptBndlBtn')
const moveUpQuery = document.getElementById('bndWnd_mvUpBtn')
const moveDnQuery = document.getElementById('bndWnd_mvDnBtn')

function createOptionHTML(listOfOptions, cssclass){
    var optionHTML = ""
    for (option in listOfOptions ){
        optionHTML = optionHTML + '<option class="' + cssclass +'" value="'+ listOfOptions[option] +'">'+ listOfOptions[option]+ '</option>'
    }
    return optionHTML
}

function createQueryLstHTML(queryCollection){
    queryLst = Object.keys(queryCollection)
    var optionHTML = ""
    for(query in queryCollection){
        optionHTML = optionHTML + '<option id='+ queryCollection[query]["qid"] +' style="background-color:' + queryCollection[query]["color"]["bgColor"]+ '; color:' + queryCollection[query]["color"]["fgColor"] + '" value="'+ queryCollection[query]["query"] +'">'+ queryCollection[query]["query"]+ '</option>'
    }
    return optionHTML
}

function getRequiredInfo(selectedInfo = 0){
    // appManager.initializeBundles(app.getAppPath())
    appManager.initializeBundles(app.getPath("userData"))
    // appManager.initializeBundles(app.getAppPath() + "/../test/")
    let bundleHandler = appManager.getBundleHandler()
    bundleList = bundleHandler.getAllBundleNames()
    // console.log(bundleList)
    optLstHtml = createOptionHTML(bundleList, "opt")
    // console.log("Option HTML Str: ", optLstHtml)
    // console.log("Selected Info: ", selectedInfo)
    bundleLstDisp.innerHTML = optLstHtml
    selectedBundle = bundleHandler.getBundle(bundleList[selectedInfo])
    // console.log("Selected bundle: ", selectedBundle)
    // console.log("Selected Bundle's Query list: ", selectedBundle.queryCollection)
    qryLstHtml = createQueryLstHTML(selectedBundle.queryCollection)
    queryLstDisp.innerHTML = qryLstHtml
    // console.log("Query List HTML: ", qryLstHtml)
}

ipc.on('Bundle-Obj-Response', function(event, selectedBundle){
    // console.log("Selected bundle: ", selectedBundle)
    // console.log("Selected Bundle's Query list: ", selectedBundle.queryCollection)
    qryLstHtml = createQueryLstHTML(selectedBundle.queryCollection)
    queryLstDisp.innerHTML = qryLstHtml
    // console.log("Query List HTML: ", qryLstHtml)

})

bundleLstDisp.addEventListener('change', function(value){
    // let bundleHandler = appManager.getBundleHandler()
    // console.log("Changed Value: ", bundleLstDisp.value)
    // selectedBundle = bundleHandler.getBundle(bundleLstDisp.value)
    ipc.send('Bundle-Obj-Request', bundleLstDisp.value)
})

bundleLstDisp.addEventListener('dblclick', function(event){
    // console.log("Double Clicked on bundle: ", bundleLstDisp.value)
    ipc.send('Show-Bundle-Edit-Window', bundleLstDisp.value)
})


addBundle.addEventListener('click', function(event){
    // console.log("Add button clicked: ", event)
    // let modalPath = path.join("file://", __dirname, "./updateBundleWindow.html")
    // win = new BrowserWindow({height:280, width:760,webPreferences: {
    //     nodeIntegration: true
    //   },
    //  resizable: false,
    // maximizable: false})
    // win.on('close', ()=>{win = null})
    // win.loadURL(modalPath)
    // win.webContents.openDevTools()
    // win.on('ready-to-show', function(){
    //     win.show()
    // })
    // win.on('did-finish-load',function(){
    //     console.log("Emitting event Show-Bundle-Edit-Window")
    //     win.webContents.send("Show-Bundle-Edit-Window")
    //     ipc.send('Test-Msg', "Alllloooo")
    // })
    ipc.send('Show-Bundle-Edit-Window')
})


rmBundle.addEventListener('click', function(event){
    // console.log("Delete button clicked: ", bundleLstDisp.value)
    ipc.send('Delete-Bundle-Request', bundleLstDisp.value)
})


importBundle.addEventListener('click', function(event){
    // console.log("Import button clicked: ", event)
    dialog.showOpenDialog({properties:["openFile"]},function(fileName){
        // console.log("Import bundle from file: ", fileName);
        ipc.send("Import-Bundle-File", fileName)
    })
})


exportBundle.addEventListener('click', function(event){
    // console.log("Export button clicked: ", event)
    bundleToExport = bundleLstDisp.value
    if(bundleToExport === null || bundleToExport === undefined || bundleToExport === ""){
        dialog.showErrorBox("Select Error", "Select a bundle to export!")

    } else {
        dialog.showSaveDialog({"buttonLabel": "Export"}, function(fileName){
            // console.log("fileName: ", fileName, " Bundle: ", bundleToExport)
            if (fileName !== null && fileName !== undefined && fileName !== "" && bundleToExport !== null && bundleToExport !== undefined && bundleToExport !== ""){
                ipc.send("Export-Bundle-File", {"fileName": fileName, "bundleToExport": bundleToExport})
            }
        })
    }
    
})

function changePriority(event){
    
    bundleName = ""
    // console.log(event.path[1].id)
    if(bundleLstDisp.value === undefined || bundleLstDisp.value === null || bundleLstDisp.value === ""){
        bundleName = bundleLstDisp[0].value
    } else {
        bundleName = bundleLstDisp.value
    }
    // console.log("BundleName: ", bundleName, " Query: ", queryLstDisp[queryLstDisp.selectedIndex].id)
    if(queryLstDisp.selectedIndex != -1){
        obj={}
        obj["bundlename"] = bundleName
        obj["qid"] = queryLstDisp[queryLstDisp.selectedIndex].id
        if (event.path[1].id === "bndWnd_mvUpBtn"){
            obj["direction"] = "Up"
        } else {
            obj["direction"] = "Down"
        }
        ipc.send("Query-Priority-Change", obj)
    } else {
        dialog.showErrorBox("Select Error", "Select a query to change priority!")
    }
    
}
moveUpQuery.addEventListener('click', changePriority)

moveDnQuery.addEventListener('click', changePriority)
// moveDnQuery.addEventListener('click', function(event){
//     console.log("BundleName: ", bundleLstDisp.value, " Query: ", queryLstDisp.value)
//     console.log("BundleName: ", bundleLstDisp.value, " Query: ", queryLstDisp[queryLstDisp.selectedIndex].id)
// })

ipc.on('All-Bundle-Response', function(event, bundleInfo){
    // console.log("Received Bundle Info: ", {bundleInfo})
    bundleNameList = []
    for (obj in bundleInfo){
        bundleNameList.push(bundleInfo[obj].bundleName)
    }
    // bundleNameList = Object.keys(bundleInfo)
    // console.log(bundleNameList)
    optLstHtml = createOptionHTML(bundleNameList, "opt")
    bundleLstDisp.innerHTML = optLstHtml
    selectedBundle = bundleInfo[0]
    // console.log("Selected Bundle's Query list: ", selectedBundle.queryCollection)
    qryLstHtml = createQueryLstHTML(selectedBundle.queryCollection)
    queryLstDisp.innerHTML = qryLstHtml
    // console.log("Query List HTML: ", qryLstHtml)
})
ipc.on('Show-Bundle-Window', function(){
    // console.log("Received Shhow-Bundle-Window in BundleWindow.js")
    // getRequiredInfo()
    ipc.send("All-Bundle-Request")
})

ipc.on('Test-Msg-Reply', function(){
    // console.log("Received Test-Msg-Reply")
})

ipc.on('Show-Bundle-Edit-Window', function(){
    // console.log("Received Shhow-Bundle-Edit-Window in BundleWindow.js")
})