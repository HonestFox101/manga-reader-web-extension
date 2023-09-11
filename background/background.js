const Utils = {
    /**
     * 横线改驼峰
     * @param {string} str 
     * @returns
     */
    line2hump: (str) => {
        let arr = str.split("-")
        for(let i = 1; i < arr.length; i++){
            arr[i] = arr[i].slice(0,1).toUpperCase() + arr[i].slice(1)
        }
        return arr.join("")
    }
}

const data = {
    pageCount: 0,
    imageSrcList: [],
    episodeName: "",
}


chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        // console.log(sender.tab ?
        //     "from a content script:" + sender.tab.url :
        //     "from the extension");
        // console.log('request action: ' + request.action)
        if (request.action.startsWith("get-")){
            let k = Utils.line2hump(request.action.substring(4))
            sendResponse(data[k])
        }
        else if (request.action.startsWith("set-")){
            let k = Utils.line2hump(request.action.substring(4))
            data[k] = request.data
            sendResponse(data[k])
        }
    }
);