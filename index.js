let wasmWorker = new Worker('wasm-worker.js');

class Sprite {
    constructor(src) {
        this.url = src;
        this.image = new Image();
        this.x = 0;
        this.y = 0;
        this._centX = 0;
        this._centY = 0;
        this._loaded = new Promise((resolve, reject) => {
            this.image.onload = () => {
                this.origW = this.image.width;
                this.origH = this.image.height;
                this.w = this.image.width;
                this.h = this.image.height;
                this.centX = 0;
                this.centY = 0;
                resolve();
            }
            this.image.onerror = (err) => reject(err);
        })
        
    }

    get centX () {
        return this._centX
    }

    set centX (x) {
        this.x = x - Math.floor(this.w / 2)
        this._centX = x
    }

    get centY () {
        return this._centY
    }

    set centY (y) {
        this.y = y - Math.floor(this.h / 2)
        this._centY = y
    }

    load() {
        this.image.src = this.url;
        return this._loaded;
    }

    draw(ctx) {
        ctx.drawImage(this.image, this.x, this.y, this.w, this.h);
    }

    scale(ratio) {
        this.w = Math.floor(this.origW * ratio);
        this.h = Math.floor(this.origH * ratio);
        this.centX = this.centX;
        this.centY = this.centY;
    }
}

class Origin {
    constructor() {
        this.netcanvas = document.createElement("canvas");
        this.nctx = this.netcanvas.getContext('2d');
        this.polycanvas = document.createElement("canvas");
        this.pctx = this.netcanvas.getContext('2d');
        this.bufferCanvas = document.createElement("canvas");
        this.bctx = this.bufferCanvas.getContext('2d');
        this.gridImage = new Image();
        this.currentImageData = null;
    }

    load(src) {
        return new Promise((resolve, reject) => {
            this.gridImage.onload = () => {
                this.pctx.clearRect(0, 0, this.polycanvas.width, this.polycanvas.height);
                this.polycanvas.width = this.gridImage.width;
                this.polycanvas.height = this.gridImage.height;

                this.nctx.clearRect(0, 0, this.netcanvas.width, this.netcanvas.height);
                this.netcanvas.width = this.gridImage.width;
                this.netcanvas.height = this.gridImage.height;
                this.netcanvas.drawImage(this.gridImage, 0, 0);

                this.bctx.clearRect(0, 0, this.bctx.width, this.bctx.height);
            }
            this.gridImage.src = src
        })
    }

    putImageData(imgData) {
        this.currentImageData = imgData;
        this.pctx.putImageData(imgData, 0, 0)
    }

    getScaledImageData(ratio) {
        this.bctx.width = this.pctx.width
        this.bctx.height = this.pctx.height

        this.bctx.putImageData(this.currentImageData, 0, 0)
        this.bctx.scale(ratio, ratio)
        return this.bctx.getImageData()
    }
}


window.onload = function() {
    var c=document.getElementById("myCanvas");
    var co=document.getElementById("outCanvas");
    var cc=document.getElementById("centCanvas");
    c.width = co.width = cc.width =800
    c.height = co.height = cc.height = 800
    var ctx=c.getContext("2d");
    var ctxo=co.getContext("2d");
    var ctxc=cc.getContext("2d");

    var origin = new Origin();
    var sFront = new Sprite("./images/pizzab_annotated_boundry.png");
    var sBack = new Sprite("./images/pizzab.jpg");

    c.onclick = e => {
        wasmWorker.postMessage({cmd: 'click', coor: {x: e.offsetX, y: e.offsetY}});
    }
    

    wasmWorker.onmessage = function (e) {
        perfwasm1 = performance.now();
        console.log(`WASM: ${perfwasm1}`, e.data);
        if (e.data.msg instanceof ImageData) {
            ctxc.putImageData(e.data.msg, 0, 0)
        }
        e.data = null
    }

    origin.load("./images/pizzab_annotated_boundry.png")
        .then(() => {
            
        })

    sBack.load().then(() => {
        sBack.centX = co.width / 2;
        sBack.centY = co.height / 2;
        const scale = co.width / sBack.origW
        if (scale < 1) {
            sBack.scale(scale)
        }

        sBack.draw(ctxo)
    })

    sFront.load().then(() => {
        sFront.centX = c.width / 2;
        sFront.centY = c.height / 2;
        const scale = c.width / sFront.origW
        if (scale < 1) {
            sFront.scale(scale)
        }

        sFront.draw(ctx)
        setTimeout(() => {
            sendImageData()
        }, 500)
    })

    function sendImageData() {
        let message = { cmd: 'imageNew', img: ctx.getImageData(0, 0, c.width, c.height)};
        wasmWorker.postMessage(message);
    }    
};


