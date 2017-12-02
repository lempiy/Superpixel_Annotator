let wasmWorker = new Worker('wasm-worker.js');

const drawRect = (x,y, ctx) => {
    ctx.rect(x, y, 4, 4);
    ctx.stroke();
}

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
                resolve(this.image);
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
        document.body.appendChild(this.netcanvas)
        this.pctx = this.polycanvas.getContext('2d');
        this.bufferCanvas = document.createElement("canvas");
        document.body.appendChild(this.polycanvas)
        this.bctx = this.bufferCanvas.getContext('2d');
        this.gridImage = new Image();
        this.currentImageData = null;
        document.body.appendChild(this.bufferCanvas)
        this.clickX = [];
        this.clickY = [];
        this.clickDrag = [];
    }

    addClick(x, y, dragging) {
        this.clickX.push(x);
        this.clickY.push(y);
        this.clickDrag.push(dragging);
    }

    redraw(){
        this.nctx.strokeStyle = "#ffffff";
        this.nctx.lineJoin = "round";
        this.nctx.lineWidth = 2;
                  
        for (var i=0; i < this.clickX.length; i++) {		
            this.nctx.beginPath();
            if (this.clickDrag[i] && i){
                this.nctx.moveTo(this.clickX[i-1], this.clickY[i-1]);
            } else {
                this.nctx.moveTo(this.clickX[i]-1, this.clickY[i]);
            }
            this.nctx.lineTo(this.clickX[i], this.clickY[i]);
            this.nctx.closePath();
            this.nctx.stroke();
        }
    }

    transformCoords(coords, scale, netCoords) {
        return {
            x: Math.floor((coords.x - netCoords.x) / scale),
            y: Math.floor((coords.y - netCoords.y) / scale),
        }
    }

    init() {
        this.pctx.clearRect(0, 0, this.polycanvas.width, this.polycanvas.height);
        this.polycanvas.width = this.gridImage.width;
        this.polycanvas.height = this.gridImage.height;

        this.nctx.clearRect(0, 0, this.netcanvas.width, this.netcanvas.height);
        this.netcanvas.width = this.gridImage.width;
        this.netcanvas.height = this.gridImage.height;
        this.nctx.drawImage(this.gridImage, 0, 0);

        this.bctx.clearRect(0, 0, this.bctx.width, this.bctx.height);
    }

    load(src) {
        if (typeof src === "string") {
            return new Promise((resolve, reject) => {
                this.gridImage.onload = () => {
                    this.init()
                    resolve()
                }
                this.gridImage.onerror = () => reject()
                this.gridImage.src = src
            })
        } else {
            this.gridImage = src
            this.init();
            return Promise.resolve()
        }
    }

    putImageData(imgData) {
        this.currentImageData = imgData;
        this.pctx.putImageData(imgData, 0, 0)
    }

    getScaledImageData(ratio) {
        this.bufferCanvas.width = this.polycanvas.width * ratio
        this.bufferCanvas.height = this.polycanvas.height * ratio
        
        this.bctx.drawImage(this.polycanvas, 0, 0, this.bufferCanvas.width, this.bufferCanvas.height)
        return this.bctx.getImageData(0, 0, this.bufferCanvas.width, this.bufferCanvas.height)
    }
}

class View {
    constructor(viewSize, origin, cbs) {
        this.scale = 1;
        this.size = viewSize
        this.origin = origin;
        this.c = document.getElementById("myCanvas");
        this.co = document.getElementById("outCanvas");
        this.cc = document.getElementById("centCanvas");
        this.c.width = this.co.width = this.cc.width = viewSize.width
        this.c.height = this.co.height = this.cc.height = viewSize.height
        this.ctx = this.c.getContext("2d");
        this.ctxo = this.co.getContext("2d");
        this.ctxc = this.cc.getContext("2d");
        this.attachEvent()
        this.sFront = null
        this.sBack = null
        this.clickX = [];
        this.clickY = [];
        this.clickDrag = [];
        this.clickCallback = cbs.clickGreedCallback.bind(this)
        this.mousedownCallback = cbs.mousedownCallback.bind(this)
        this.mousemoveCallback = cbs.mousemoveCallback.bind(this)
        this.mouseupCallback = cbs.mouseupCallback.bind(this)
    }

    resize(viewSize) {
        this.clear()
        this.size = viewSize
        this.c.width = this.co.width = this.cc.width = viewSize.width
        this.c.height = this.co.height = this.cc.height = viewSize.height
        const wratio = this.size.width / this.sBack.origW
        const hratio = this.size.height /this.sBack.origH
        const ratio = wratio > hratio ? hratio : wratio
        this.setScale(ratio, true)
        this.ctxc.putImageData(this.origin.getScaledImageData(this.scale), this.sFront.x, this.sFront.y)
    }

    addClick(x, y, dragging) {
        this.clickX.push(x);
        this.clickY.push(y);
        this.clickDrag.push(dragging);
    }

    redraw(){        
        this.ctx.strokeStyle = "#ffffff";
        this.ctx.lineJoin = "round";
        this.ctx.lineWidth = 2;
                  
        for (var i=0; i < this.clickX.length; i++) {		
            this.ctx.beginPath();
            if (this.clickDrag[i] && i){
                this.ctx.moveTo(this.clickX[i-1], this.clickY[i-1]);
            } else {
                this.ctx.moveTo(this.clickX[i]-1, this.clickY[i]);
            }
            this.ctx.lineTo(this.clickX[i], this.clickY[i]);
            this.ctx.closePath();
            this.ctx.stroke();
        }
    }

    attachEvent() {
        this.c.onclick = e => {
            return this.clickCallback(e)
        }
        this.c.addEventListener('mousedown', (e) => {
            return this.mousedownCallback(e)
        })
        this.c.addEventListener('mousemove', (e) => {
            return this.mousemoveCallback(e)
        })
        this.c.addEventListener('mouseup', (e) => {
            return this.mouseupCallback(e)
        })
    }

    clear() {
        this.ctx.clearRect(0, 0, this.c.width, this.c.height);
        this.ctxo.clearRect(0, 0, this.co.width, this.co.height);
        this.ctxc.clearRect(0, 0, this.cc.width, this.cc.height);
    }

    loadSprites(frontUrl, backUrl) {
        this.clear()
        this.sFront= new Sprite(frontUrl); 
        this.sBack= new Sprite(backUrl); 
        return Promise.all([this.sFront.load(),  this.sBack.load()])
    }

    setScale(scale, isCenter) {
        if (isCenter) {
            this.sBack.centX = this.co.width * 0.5;
            this.sBack.centY = this.co.height * 0.5;

            this.sFront.centX = this.c.width * 0.5;
            this.sFront.centY = this.c.height * 0.5;
        }

        this.sBack.scale(scale)
        this.sFront.scale(scale)

        this.draw()

        this.scale = scale
    }

    draw() {
        this.sBack.draw(this.ctxo)
        this.sFront.draw(this.ctx)
    }
}

class Annotator {
    constructor(width, height) {
        this.cvReady = false;
        this.resolver = null;
        this.listenWorker();
        this.workerReady = new Promise((resolve, reject) => {
            this.resolver = resolve
        })
        var self = this;
        this.currentColor = null;
        this.state = 'fill';
        this.origin = new Origin();
        this.view = new View({width: width, height: height}, this.origin, 
        {
            clickGreedCallback, 
            mousedownCallback, 
            mousemoveCallback,
            mouseupCallback
        })
        this.paint = false;
        
        function clickGreedCallback (e) {
            // 'this' will be Annotator view
            var coorX = e.pageX - e.target.offsetLeft;
            var coorY = e.pageY - e.target.offsetTop;
            let coords = this.origin.transformCoords({x: coorX, y: coorY}, this.scale, {x: this.sFront.x, y: this.sFront.y})
            // drawRect(coorX, coorY, this.ctx);
            // drawRect(coords.x, coords.y, this.origin.nctx);
            if (self.canFill()) {
                wasmWorker.postMessage({cmd: 'click', color: self.currentColor, coor: this.origin.transformCoords({x: coorX, y: coorY}, this.scale, {x: this.sFront.x, y: this.sFront.y})});
            }
        }

        function mousedownCallback (e) {
            if (!self.canDraw()) return;
            var mouseX = e.pageX - e.target.offsetLeft;
            var mouseY = e.pageY - e.target.offsetTop;
            let coords = this.origin.transformCoords({x: mouseX, y: mouseY}, this.scale, {x: this.sFront.x, y: this.sFront.y})
                  
            self.paint = true;
            this.addClick(mouseX, mouseY);
            this.redraw();
            this.origin.addClick(coords.x, coords.y);
            this.origin.redraw();
        }

        function mousemoveCallback (e) {
            if (!self.canDraw()) return;
            var mouseX = e.pageX - e.target.offsetLeft;
            var mouseY = e.pageY - e.target.offsetTop;
            let coords = this.origin.transformCoords({x: mouseX, y: mouseY}, this.scale, {x: this.sFront.x, y: this.sFront.y})
                  
            if (self.paint) {
                this.addClick(mouseX, mouseY, true);
                this.redraw();
                this.origin.addClick(coords.x, coords.y, true);
                this.origin.redraw();
            }
        }

        function mouseupCallback (e) {
            if (!self.canDraw()) return;
            self.paint = false;
        }
    }

    canFill() {
        console.log( this.state === 'fill', this.currentColor)
        return this.state === 'fill' && this.currentColor
    }

    canDraw() {
        return this.state === 'contour'
    }

    loadNewImage(imageSrc, gridSrc) {
        return this.view.loadSprites(gridSrc, imageSrc)
            .then((data) => {
                const wratio = this.view.size.width / this.view.sBack.origW
                const hratio = this.view.size.height /this.view.sBack.origH
                const ratio = wratio > hratio ? hratio : wratio
                this.view.setScale(ratio, true)
                return this.origin.load(data[0])
            })
            .then(() => {
                return this.cvReady ? Promise.resolve() : this.workerReady
            })
            .then(() => {
                this.imageDataToWorker(true)
            })
    }

    imageDataToWorker(initial) {
        let message = { cmd: 'imageNew', img: this.origin.nctx.getImageData(0, 0, this.origin.netcanvas.width, this.origin.netcanvas.height), initial: !!initial};
        wasmWorker.postMessage(message)
    }

    listenWorker() {
        wasmWorker.onmessage = (e) => {
            let perfwasm1 = performance.now();
            if (e.data.msg === "ready") {
                console.log("READy", this.resolver)
                this.cvReady = true;
                this.resolver()
            }
            if (e.data.msg instanceof ImageData) {
                this.origin.putImageData(e.data.msg)
                this.view.ctxc.putImageData(this.origin.getScaledImageData(this.view.scale), this.view.sFront.x, this.view.sFront.y)
            }
        }
    }

}

$(function () {
    const annotator = new Annotator(window.innerWidth-510, window.innerHeight);
    annotator.loadNewImage("./images/pep.jpg", "./images/pep_annotated_boundry.png")
    window.addEventListener("resize", e => {
        annotator.view.resize({width:window.innerWidth-510, height: window.innerHeight})
    });

    window.tool.annotation.emitter.subscribe("input:list", data => {
        if (data.value) {
            annotator.currentColor = data.color
        } else {
            annotator.currentColor = null
        }
    })
    window.tool.sauce.emitter.subscribe("input:list", data => {
        if (data.value) {
            annotator.currentColor = data.color
        } else {
            annotator.currentColor = null
        }
    })
    window.tool.controls.emitter.subscribe('Custom Contour', data => {
        if (data.state !== 'contour') {
            window.tool.controls.changeState('contour')
            annotator.state = 'contour'
        }
    })
    window.tool.controls.emitter.subscribe('Zone Marker', data => {
        if (data.state !== 'fill') {
            annotator.imageDataToWorker(false)
            window.tool.controls.changeState('fill')
            annotator.state = 'fill'
        }
    })
});
