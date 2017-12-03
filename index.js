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

    static fromCanvas(canvas) {
        const sprite = new Sprite();
        sprite._loaded = Promise.resolve()
        sprite.url = null;
        sprite.image = canvas;
        sprite.x = 0;
        sprite.y = 0;
        sprite._centX = 0;
        sprite._centY = 0;
        sprite.origW = sprite.image.width;
        sprite.origH = sprite.image.height;
        sprite.w = sprite.image.width;
        sprite.h = sprite.image.height;
        sprite.centX = 0;
        sprite.centY = 0;
        return sprite;
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
        if (!this.image) return;
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
        document.body.appendChild(this.polycanvas)
        this.gridImage = new Image();
        this.currentImageData = null;
        this.clickX = [];
        this.clickY = [];
        this.clickDrag = [];
    }

    addClick(x, y, dragging) {
        this.clickX.push(x);
        this.clickY.push(y);
        this.clickDrag.push(dragging);
    }

    drawContour(){
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

    clearLines() {
        this.clickX = [];
        this.clickY = [];
        this.clickDrag = [];
    }

    transformCoords(coords, scale, netCoords) {
        return {
            x: (coords.x - netCoords.x) / scale,
            y: (coords.y - netCoords.y) / scale,
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
        this.sCent = null
        this.clickX = [];
        this.clickY = [];
        this.clickDrag = [];
        this.shiftFactor = 0.0;
        this.shiftX = 0;
        this.shiftY = 0;
        this.clickCallback = cbs.clickGreedCallback.bind(this)
        this.mousedownCallback = cbs.mousedownCallback.bind(this)
        this.mousemoveCallback = cbs.mousemoveCallback.bind(this)
        this.mouseupCallback = cbs.mouseupCallback.bind(this)
        this.wheelCallback = cbs.wheelCallback.bind(this)
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
    }

    addClick(x, y, dragging) {
        this.clickX.push(x);
        this.clickY.push(y);
        this.clickDrag.push(dragging);
    }

    drawContour(width){
        this.ctx.strokeStyle = "#ffffff";
        this.ctx.lineJoin = "round";
        this.ctx.lineWidth = width;
                  
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

    clearLines() {
        this.clickX = [];
        this.clickY = [];
        this.clickDrag = [];
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
        this.c.addEventListener('wheel', (e) => {
            event.preventDefault()
            return this.wheelCallback(e)
        })
    }

    clear() {
        this.ctx.clearRect(0, 0, this.c.width, this.c.height);
        this.ctxo.clearRect(0, 0, this.co.width, this.co.height);
        this.ctxc.clearRect(0, 0, this.cc.width, this.cc.height);
    }

    loadSprites(frontUrl, backUrl) {
        this.clear()
        this.sFront = new Sprite(frontUrl); 
        this.sBack = new Sprite(backUrl);
        return Promise.all([this.sFront.load(),  this.sBack.load()])
    }

    setScale(scale, isCenter, shiftX, shiftY) {
        this.clear()
        if (shiftX) {
            this.shiftX += shiftX
        }
        if (shiftY) {
            this.shiftY += shiftY
        }
        if (isCenter) {
            console.log(this.shiftX, this.shiftY)
            this.sBack.centX = this.co.width * 0.5 + (this.co.width * this.shiftX);
            this.sBack.centY = this.co.height * 0.5 + (this.co.height * this.shiftY);

            this.sFront.centX = this.c.width * 0.5 + (this.c.width * this.shiftX);
            this.sFront.centY = this.c.height * 0.5 + (this.co.height * this.shiftY);
            if (this.sCent) {
                this.sCent.centX = this.cc.width * 0.5 + (this.cc.width * this.shiftX);
                this.sCent.centY = this.cc.height * 0.5 + (this.co.height * this.shiftY);
            }
        }

        this.sBack.scale(scale)
        this.sFront.scale(scale)
        if (this.sCent) this.sCent.scale(scale)

        this.draw()

        this.scale = scale
    }

    draw() {
        this.sBack.draw(this.ctxo)
        this.sFront.draw(this.ctx)
        if (this.sCent) this.sCent.draw(this.ctxc);
    }
}

class UndoQueue {

    constructor(length) {
        this.length = length;
        this._queue = [];
        this.cursor = null;
    }

    addToQueue(action) {
        if (this.cursor === null || (this._queue.length !== this.length && this.cursor === this._queue.length - 1)) {
            this._queue.push(action)
            this.cursor = this._queue.length - 1;
        } else if (this.cursor && this.cursor === this._queue.length - 1) {
            this._queue.shift()
            this._queue.push(action)
        } else {
            this.cursor++;
            this._queue[this.cursor] = action
        }
    }

    getPrivious() {
        if (this.cursor) {
            this.cursor--
            return this._queue[this.cursor]
        }
        return null
    }

    getNext() {
        if (this._queue.length && this.cursor !== this._queue.length - 1) {
            this.cursor++
            return this._queue[this.cursor]
        }
        return null
    }
}

class Annotator {
    constructor(width, height) {
        this.hover = false;
        this.undoq = null;
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
            mouseupCallback,
            wheelCallback
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
            self.hover = true;
            if (!self.canDraw()) return;
            var mouseX = e.pageX - e.target.offsetLeft;
            var mouseY = e.pageY - e.target.offsetTop;
            let coords = this.origin.transformCoords({x: mouseX, y: mouseY}, this.scale, {x: this.sFront.x, y: this.sFront.y})
                  
            self.paint = true;
            this.addClick(mouseX, mouseY);
            this.drawContour(Math.round(2*this.scale));
            this.origin.addClick(coords.x, coords.y);
            this.origin.drawContour();
        }

        function mousemoveCallback (e) {
            if (!self.canDraw()) return;
            var mouseX = e.pageX - e.target.offsetLeft;
            var mouseY = e.pageY - e.target.offsetTop;
            let coords = this.origin.transformCoords({x: mouseX, y: mouseY}, this.scale, {x: this.sFront.x, y: this.sFront.y})
                  
            if (self.paint) {
                this.addClick(mouseX, mouseY, true);
                this.drawContour(Math.round(2*this.scale));
                this.origin.addClick(coords.x, coords.y, true);
                this.origin.drawContour();
            }
        }

        function mouseupCallback (e) {
            self.hover = true;
            if (!self.canDraw()) return;
            self.paint = false;
            this.clearLines()
            this.origin.clearLines()
            self.undoq.addToQueue({type: 'draw', 
                contours: this.origin.nctx.getImageData(0, 0, this.origin.netcanvas.width, this.origin.netcanvas.height),
                segments: this.origin.pctx.getImageData(0, 0, this.origin.polycanvas.width, this.origin.polycanvas.height),
            })
        }

        function wheelCallback (e) {
            var mouseX = e.pageX - e.target.offsetLeft;
            var mouseY = e.pageY - e.target.offsetTop;
            const isLeft = mouseX < this.cc.width * 0.5;
            const isTop = mouseY < this.cc.height * 0.5;
            const canvasCenterX = this.cc.width * 0.5;
            const canvasCenterY = this.cc.height * 0.5;
            const maxShiftStep = 0.05;
            const outSetX = Math.abs(canvasCenterX - mouseX);
            const outSetY = Math.abs(canvasCenterY - mouseY);
            const shiftX = outSetX * maxShiftStep / canvasCenterX;
            const shiftY = outSetY * maxShiftStep / canvasCenterY;
            if (e.deltaY < 0) {
                if (Annotator.isPointInCircle(mouseX, mouseY, canvasCenterX, canvasCenterY, Math.floor(this.size.width / 8))) {
                    this.setScale(this.scale + 0.1, false)
                } else if (!isTop && isLeft) {
                    this.setScale(this.scale + 0.1, true,
                        shiftX, -shiftY)
                } else if (isTop && isLeft) {
                    this.setScale(this.scale + 0.1, true,
                        shiftX, shiftY)
                } else if (isTop && !isLeft) {
                    this.setScale(this.scale + 0.1, true,
                        -shiftX, shiftY)
                } else {
                    this.setScale(this.scale + 0.1, true,
                        -shiftX, -shiftY)
                }
            } else {
                if (Annotator.isPointInCircle(mouseX, mouseY, canvasCenterX, canvasCenterY, Math.floor(this.size.width / 8))) {
                    this.setScale(this.scale - 0.1, false)
                } else if (!isTop && isLeft) {
                    this.setScale(this.scale - 0.1, true,
                        -shiftX, shiftY)
                } else if (isTop && isLeft) {
                    this.setScale(this.scale - 0.1, true,
                        -shiftX, -shiftY)
                } else if (isTop && !isLeft) {
                    this.setScale(this.scale - 0.1, true,
                        shiftX, -shiftY)
                } else {
                    this.setScale(this.scale - 0.1, true,
                        shiftX, shiftY)
                }
            }
        }
    }

    static isPointInCircle(x, y, cx, cy, radius) {
        return Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) <= radius
    }

    canFill() {
        return this.state === 'fill' && this.currentColor
    }

    canDraw() {
        return this.state === 'contour'
    }

    undoSegments(segments) {
        this.origin.putImageData(segments);
        this.view.ctxc.clearRect(0, 0, this.view.cc.width, this.view.cc.height)
        this.view.sCent.draw(this.view.ctxc)
        this.putPolygonsToWorker()
    }

    undoContours(contours) {
        this.origin.nctx.clearRect(0, 0, this.origin.netcanvas.width, this.origin.netcanvas.height)
        this.origin.nctx.putImageData(contours, 0,0)
        this.view.ctx.clearRect(0, 0, this.view.c.width, this.view.c.height)
        this.view.sFront.draw(this.view.ctx)
        if (this.state === 'fill') {
            this.imageDataToWorker(false)
        }
    }

    undo() {
        const action = this.undoq.getPrivious()
        if (action) {
            switch (action.type) {
                case 'fill':
                    this.undoSegments(action.segments)
                    this.undoContours(action.contours)
                    break;
                case 'draw':
                    this.undoContours(action.contours)
                    this.undoSegments(action.segments)
                    break;
                case 'initial':
                    this.undoContours(action.contours)
                    this.origin.pctx.clearRect(0, 0, this.origin.polycanvas.width, this.origin.polycanvas.height)
                    this.view.ctxc.clearRect(0, 0, this.view.cc.width, this.view.cc.height)
                    this.view.sCent.draw(this.view.ctxc)
                    this.putPolygonsToWorker()
                    break;
            }
        }
    }

    loadNewImage(imageSrc, gridSrc) {
        return this.view.loadSprites(gridSrc, imageSrc)
            .then((data) => {
                this.undoq = new UndoQueue(5);
                return this.origin.load(data[0])
            })
            .then(() => {
                const wratio = this.view.size.width / this.view.sBack.origW
                const hratio = this.view.size.height /this.view.sBack.origH
                const ratio = wratio > hratio ? hratio : wratio
                this.view.sFront.image = this.origin.netcanvas;
                this.view.shiftFactor = 0.0;
                this.view.sCent = Sprite.fromCanvas(this.origin.polycanvas);
                this.view.setScale(ratio, true)
                return this.cvReady ? Promise.resolve() : this.workerReady
            })
            .then(() => {
                this.undoq.addToQueue({type: 'initial', 
                    contours: this.origin.nctx.getImageData(0, 0, this.origin.netcanvas.width, this.origin.netcanvas.height),
                })
                this.imageDataToWorker(true)
            })
    }

    imageDataToWorker(initial) {
        let message = { cmd: 'imageNew', img: this.origin.nctx.getImageData(0, 0, this.origin.netcanvas.width, this.origin.netcanvas.height), initial: !!initial};
        wasmWorker.postMessage(message)
    }

    putPolygonsToWorker() {
        let message = { cmd: 'put', img: this.origin.pctx.getImageData(0, 0, this.origin.polycanvas.width, this.origin.polycanvas.height)};
        wasmWorker.postMessage(message)
    }

    listenWorker() {
        wasmWorker.onmessage = (e) => {
            let perfwasm1 = performance.now();
            if (e.data.msg === "ready") {
                console.log("READY")
                this.cvReady = true;
                this.resolver()
            }
            if (e.data.msg instanceof ImageData) {
                this.origin.putImageData(e.data.msg)
                this.view.sCent.draw(this.view.ctxc)
                this.undoq.addToQueue({type: 'fill', segments: e.data.msg, contours: this.origin.nctx.getImageData(0, 0, this.origin.netcanvas.width, this.origin.netcanvas.height)})
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
    window.tool.controls.emitter.subscribe('Undo', data => {
        annotator.undo()
    })
});
