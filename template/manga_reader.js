window.onload = () => {
    const reader = ReaderFactory.createOrGetReader()
    Object.assign(self, {reader})
}

const ReaderFactory = (() => {
    class Reader {
        episodeName = ""
        startPageIndex = 0
        endPageIndex = 0
        pageCount = 0
        menuEnable = false
        preloadPageCount = 10
        imageSrcList = []
        imageSrcBlobCacheMap = new Map()

        constructor() {
            this.init()
        }

        /**
         * 初始化
         */
        async init() {
            await this.registerEvent()
            await this.initialData()
            await this.firstRendering()
        }

        /**
         * 注册页面事件
         */ 
        async registerEvent() {
            document.querySelector(".menu-switch").onclick = () => this.toggleMenuState()
            document.querySelector(".go-left").onclick = () => this.nextPage()
            document.querySelector(".go-right").onclick = () => this.prevPage()
            document.querySelector(".page-fixed").onclick = () => this.jumpTo(this.startPageIndex - 1)
            document.onkeydown = (ev) => {
                switch (ev.key) {
                    case "ArrowLeft":
                        this.nextPage()
                        break;
                    case "ArrowRight":
                        this.prevPage()
                        break;
                    default:
                        break;
                }
            }
        }

        /**
         * 初始化数据
         */
        async initialData() {
            while (this.pageCount == 0) {
                this.pageCount = (await Utils.getGlobalData('page-count')) || 0
                await Utils.delay(.2)
            }
            while (this.episodeName == "") {
                this.episodeName = (await Utils.getGlobalData("episode-name")) || ""
                await Utils.delay(.2)
            }
            (async () => {
                while (this.imageSrcList.length < this.pageCount) {
                    this.imageSrcList = (await Utils.getGlobalData("image-src-list")) || []
                    await Utils.delay(.5)
                }
            })()
        }

        /**
         * 开始渲染数据到页面
         */
        async firstRendering() {
            while (this.pageCount == "")
                await Utils.delay(.2)
            document.querySelector(".page-count").innerHTML = this.pageCount;

            while (this.episodeName == "")
                await Utils.delay(.2)
            document.querySelector(".episode-name").innerHTML = this.episodeName

            while (this.imageSrcList.length == 0)
                await Utils.delay(.2)
            this.jumpTo(this.startPageIndex);
        }

        /**
         * 切换选项菜单状态
         */
        async toggleMenuState() {
            this.menuEnable = !this.menuEnable
            let menus = document.querySelectorAll(".menu")
            for (const menu of menus) {
                if (this.menuEnable)
                    menu.classList.remove("disable")
                else if (!this.menuEnable && !menu.classList.contains("disable"))
                    menu.classList.add("disable")
            }
        }

        /**
         * 下一页
         */
        async nextPage() {
            this.jumpTo(this.endPageIndex + 1)
        }

        /**
         * 上一页
         */
        async prevPage() {
            // TODO 确定前两页的情况，根据情况
            this.jumpTo(this.startPageIndex - 2)
        }
        
        /**
         * 跳转到指定页
         * @param {int} index 
         * @returns
         */
        async jumpTo(index) {
            this.preloadImageTask(index)
            if (index >= Math.min(this.imageSrcList.length, this.pageCount) || index < 0)
                return
            this.startPageIndex = index
            
            let src1 = this.imageSrcList[index]
            if(this.imageSrcBlobCacheMap.has(src1)){
                let blob = this.imageSrcBlobCacheMap.get(src1)
                src1 = URL.createObjectURL(blob)
            }

            this.clearImage()
            this.renderImage(src1)

            let size1 = await Utils.getNaturalSize(src1)
            if (size1.width > size1.height || index >= this.pageCount - 1) {
                this.endPageIndex = index
                document.querySelector(".page-index").innerHTML = this.startPageIndex + 1
            } else {
                let src2 = this.imageSrcList[index + 1]
                if(this.imageSrcBlobCacheMap.has(src2)){
                    let blob = this.imageSrcBlobCacheMap.get(src2)
                    src2 = URL.createObjectURL(blob)
                }

                let size2 = await Utils.getNaturalSize(src2)
                if (size2.width > size2.height) {
                    this.endPageIndex = index
                    document.querySelector(".page-index").innerHTML = this.startPageIndex + 1
                } else {
                    this.endPageIndex = index + 1
                    this.renderImage(src2, 1)
                    document.querySelector(".page-index").innerHTML = `${this.startPageIndex + 1}-${this.endPageIndex + 1}`
                }
            }
        }

        /**
         * 预加载从初始索引开始接下去的n张图片（n == this.preloadPageCount)
         * @param {int} initial 初始索引
         * @returns 
         */
        async preloadImageTask(initial = 0) {
            if (initial < 0)
                return
            for (
                let index = initial;
                index < Math.min(initial + 1 + this.preloadPageCount, this.imageSrcList.length);
                index++
            ) {
                const src = this.imageSrcList[index]
                if (!this.imageSrcBlobCacheMap.has(src)) {
                    let resp = await fetch(src, {mode: "no-cors", method: "get"})
                    let blob = await resp.blob()
                    this.imageSrcBlobCacheMap.set(src, blob)
                }
            }
        }

        /**
         * 渲染图片到页面。
         * @param {string} src 图片地址
         * @param {0|1} pos 0为页1，1为页2。
         */
        renderImage(src, pos = 0) {
            let page1 = document.querySelector('.page1');
            let page2 = document.querySelector('.page2');
            page1.style.maxWidth = pos == 0 ? "100vw" : "50vw";
            page2.style.maxWidth = pos == 0 ? "0vw" : "50vw";
            (pos == 0 ? page1 : page2).src = src;
        }

        /**
         * 图片清空
         */
        clearImage() {
            document.querySelectorAll('.page').forEach(page => page.src == '')
        }
    }

    var instance = null;
    return {
        /**
         * 创建MangaReader单例
         * @returns {Reader}
         */
        createOrGetReader() {
            if (!instance)
                instance = new Reader()
            return instance
        }
    }
})()

const Utils = {
    /**
     * 等待若干秒
     * @param {number} 延迟的时间（单位秒） 
     * @returns 
     */
    delay(seconds) {
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    },

    /**
     * 获取图片大小
     * @param {string} src 
     * @returns 
     */
    getNaturalSize(src) {
        return new Promise(resolve => {
            let img = new Image()
            img.src = src
            img.onload = () => {
                let size = { width: img.naturalWidth, height: img.naturalHeight }
                resolve(size)
            }
        })
    },
    
    /**
     * 获取全局变量
     * @param {string} key 
     * @returns
     */
    async getGlobalData(key) {
        const dat = await chrome.storage.local.get(key)
        return dat[key] || null
    },
}
