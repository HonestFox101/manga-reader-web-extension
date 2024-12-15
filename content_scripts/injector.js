window.onload = () => {
    if (
        (document.location.hostname.match('copymanga') || document.location.hostname.match('mangacopy') ) &&
        document.location.pathname.match(/\/comic\/.*\/chapter\/.*/g)
    ) {
        InjectorFactory.buildOrGetCopyMangaInjector()
    } else if (
        document.location.hostname == 'manhua.dmzj.com' &&
        document.location.pathname.match(/\/.+\/.+[0-9]+\.shtml/g)
    ) {
        InjectorFactory.buildOrGetDMZJMangaInjector()
    }
}

const InjectorFactory = (() => {
    class Injector {
        pageCount = 0
        imageSrcList = []
        enable = true
        switchButton = document.createElement("div")
        frame = document.createElement("iframe")
        episodeName = ""

        constructor() {
            this.init()
        }

        /**
         * 初始化
         */
        init() {
            this.createMangaReaderFrame()
            this.createSwitchButton()
            this.registerEvents()
        }

        /**
         * 创建漫画阅读器开关按钮
         */
        createSwitchButton() {
            // Create Menu
            let style = document.createElement('style')
            style.innerHTML = `
            .switch-button {
                position: fixed;
                top: 30px;
                right: 10px;
                display: flex;
                flex-flow: column nowrap;
                align-items: center;
                justify-content: center;
                opacity: 75%;
                border: 2px solid white;
                background-color: black;
                width: 25px;
                height: 25px;
                font-size: 15px;
                text-align: center;
                vertical-align: middle;
                color: white;
                margin: 3px;
                border-radius: 5px;
            }
            .switch-button:hover {
                cursor: pointer;
                background-color: white;
                color: black;
            }
            `
            document.head.appendChild(style)

            this.switchButton = document.createElement("div")
            this.switchButton.classList.add("switch-button")
            this.switchButton.innerText = "M"
            document.body.appendChild(this.switchButton)
        }
        
        /**
         * 创建漫画阅读器框架
         */
        createMangaReaderFrame() {
            // Create create MangaReader Frame
            let style = document.createElement("style")
            style.innerHTML = `
            .reader-frame {
                position: fixed;
                top: 0px;
                left: 0px;
                width: 100vw;
                height: 100vh;
                border: 0;
            }
            `
            document.head.appendChild(style)

            let template_url = chrome.runtime.getURL("template/manga_reader.html")
            this.frame = document.createElement('iframe')
            this.frame.title = "reader-frame"
            this.frame.classList.add("reader-frame")
            this.frame.src = template_url
            document.body.appendChild(this.frame)
        }

        /**
         * 注册行为事件
         */
        registerEvents() {
            this.switchButton.onclick = (ev) => {
                this.enable = !this.enable
                this.frame.style.display = this.enable ? "" : "none"
            }
        }
    }

    class CopyMangaInjector extends Injector {
        constructor() {
            super()
            document.querySelector("body > h4.header").style.display = this.enable ? "none" : ""
            this.initialData()
        }

        // override
        async registerEvents() {
            this.switchButton.onclick = (ev) => {
                this.enable = !this.enable
                this.frame.style.display = this.enable ? "" : "none"
                document.querySelector("body > h4.header").style.display = this.enable ? "none" : ""
            }
        }

        async initialData() {
            await Utils.removeGlobalData("page-count", "episode-name", "image-src-list")
            this.pageCount = Number(document.querySelector("body > div:nth-child(2) > span.comicCount").innerText)
            await Utils.setGlobalData("page-count", this.pageCount)

            this.episodeName = document.querySelector("body > h4").innerHTML.replace("/", "|")
            await Utils.setGlobalData('episode-name', this.episodeName)

            this.updateImageSrcListTask()
        }

        async updateImageSrcListTask() {
            if (this.pageCount == this.imageSrcList.length) {
                return;
            }
            if (Utils.randint(0, 15) >= 1) {
                scrollBy(0, Utils.randint(300, 300))
            } else {
                scrollTo(0, 0)
            }
            let imgs = document.querySelectorAll("body > div.container-fluid.comicContent > div > ul > li > img")
            this.imageSrcList.length = 0
            for (const img of imgs) {
                this.imageSrcList.push(img.getAttribute("data-src"))
            }

            await Utils.setGlobalData('image-src-list', this.imageSrcList)

            await Utils.delay(0.5 + Math.random())
            this.updateImageSrcListTask()
        }
    }

    class DMZJInjector extends Injector {
        constructor() {
            super()
            document.querySelector("#center_box > a.img_land_prev").style.display = this.enable ? 'none' : ''
            document.querySelector('#center_box > a.img_land_next').style.display = this.enable ? 'none' : ''
            this.initialData()
        }

        // override
        async registerEvents() {
            this.switchButton.onclick = (ev) => {
                this.enable = !this.enable
                this.frame.style.display = this.enable ? "" : "none"
                document.querySelector("#center_box > a.img_land_prev").style.display = this.enable ? 'none' : ''
                document.querySelector('#center_box > a.img_land_next').style.display = this.enable ? 'none' : ''
            }
        }

        async initialData() {
            await Utils.removeGlobalData()

            this.pageCount = document.querySelector("#page_select").options.length
            Utils.setGlobalData("page-count", this.pageCount)

            this.episodeName = document.querySelector("body > div:nth-child(8) > div.display_middle > h1 > a").innerHTML
                + "|"
                + document.querySelector("body > div:nth-child(8) > div.display_middle > span").innerHTML
            Utils.setGlobalData('episode-name', this.episodeName)

            this.imageSrcList = []
            for (const option of document.querySelector("#page_select").options) {
                this.imageSrcList.push("https:" + option.value)
            }
            Utils.setGlobalData('image-src-list', this.imageSrcList)
        }
    }

    var instance;
    return {
        buildOrGetCopyMangaInjector() {
            if (!instance)
                instance = new CopyMangaInjector()
            return instance
        },
        buildOrGetDMZJMangaInjector() {
            if (!instance)
                instance = new DMZJInjector()
            return instance
        }
    }
})()

const Utils = {
    delay(seconds) {
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    },
    randint(start, size) {
        return start + Math.floor(Math.random() * size)
    },
    /**
     * 清理全局变量
     * @param  {...string} values 
     */
    async removeGlobalData(...values) {
        await chrome.storage.local.remove(values)
    },
    /**
     * 设置全局变量
     * @param {string} key 
     * @param {*} value
     * @returns 
     */
    async setGlobalData(key, value) {
        await chrome.storage.local.set({[key]: value})
    }
}