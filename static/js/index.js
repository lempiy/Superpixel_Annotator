let wasmWorker = new Worker('wasm-worker.js');

const drawRect = (x,y, ctx) => {
    ctx.rect(x, y, 4, 4);
    ctx.stroke();
}


function line(imd, x0, y0, x1, y1, color, width) {
    var dx = Math.abs(x1-x0);
    var dy = Math.abs(y1-y0);
    var sx = (x0 < x1) ? 1 : -1;
    var sy = (y0 < y1) ? 1 : -1;
    var err = dx-dy;
    var counter = 0

    while(true) {
        getPointsAround(imd, x0, y0, color, width);
        if (Math.abs(x0-x1)<0.0001 && Math.abs(y0-y1)<0.0001) break;
        if (counter > 10) {
            break
        }
        var e2 = 2*err;
        if (e2 >-dy) {
            err -= dy; x0  += sx;
        }
        if (e2 < dx) {
            err += dx; y0  += sy; 
        }
        counter++
    }
}

function distance(p1, p2) {
   dx = p2.x - p1.x; dx *= dx;
   dy = p2.y - p1.y; dy *= dy;
   return Math.sqrt( dx + dy );
}

function getPointsAround(imd, x, y, color, r) {
    let amount = 0
    for (var j=x-r; j<=x+r; j++) {
        for (var k=y-r; k<=y+r; k++) {
            if (distance({x:j,y:k},{x:x,y:y}) <= r) {
                amount++
                setPixelXY(imd, Math.floor(j), Math.floor(k), color)
            }
        }
    }
}

function setPixel(imgData, index, color) {
    var i = index*4, d = imgData.data;
    //console.log('before', "R", d[i], 'G', d[i+1], 'B', d[i+2], 'A', d[i+3])
    d[i] = color[0]; d[i+1] = color[1];
    d[i+2] = color[2]; d[i+3] = color[3];
    //console.log('after', "R", d[i], 'G', d[i+1], 'B', d[i+2], 'A', d[i+3])
}

function setPixelXY(imgData, x, y, color) {
    setPixel(imgData, y*imgData.width+x, color);
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
        // document.body.appendChild(this.netcanvas)
        this.polycanvas = document.createElement("canvas");
        this.savingcanvas = document.createElement("canvas");
        // document.body.appendChild(this.polycanvas)
        this.pctx = this.polycanvas.getContext('2d');
        this.sctx = this.savingcanvas.getContext('2d');
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
        this.nctx.strokeStyle = "#ffff00";
        this.nctx.lineJoin = "miter";
        this.nctx.lineWidth = 1;
        //this.nctx.translate(0.5, 0.5);
                  
        for (var i=0; i < this.clickX.length; i++) {		
            this.nctx.beginPath();
            if (this.clickDrag[i] && i){
                this.nctx.moveTo(Math.floor(this.clickX[i-1])-0.5, Math.floor(this.clickY[i-1])-0.5);
            } else {
                this.nctx.moveTo(Math.floor(this.clickX[i]-1)-0.5, Math.floor(this.clickY[i])-0.5);
            }
            this.nctx.lineTo(Math.floor(this.clickX[i])-0.5, Math.floor(this.clickY[i])-0.5);
            this.nctx.closePath();
            this.nctx.stroke();
        }
        //this.nctx.translate(0, 0);
    }

    drawBrush(width, color){
        const imd = this.pctx.getImageData(0, 0, this.polycanvas.width, this.polycanvas.height)
        for (var i=0; i < this.clickX.length - 1; i++) {
            this.pctx.fillStyle ='#ffffff';
            
            console.log(Math.floor(this.clickX[i]), Math.floor(this.clickY[i]),
            Math.floor(this.clickX[i+1]), Math.floor(this.clickY[i+1]))
            line(imd,
                Math.floor(this.clickX[i]), Math.floor(this.clickY[i]),
                Math.floor(this.clickX[i+1]), Math.floor(this.clickY[i+1]),
                color, width);
            this.pctx.rect(Math.floor(this.clickX[i]), Math.floor(this.clickY[i]),4,4);
            this.pctx.rect(Math.floor(this.clickX[i+1]), Math.floor(this.clickY[i+1]),4,4);
        }
        for (var i=0; i < this.clickX.length - 1; i++) {
            this.pctx.fillStyle ='#ffffff';
            this.pctx.rect(Math.floor(this.clickX[i]), Math.floor(this.clickY[i]),4,4);
            this.pctx.rect(Math.floor(this.clickX[i+1]), Math.floor(this.clickY[i+1]),4,4);
        }
        this.pctx.putImageData(imd, 0, 0)
    }

    drawEraser(width){
        this.pctx.strokeStyle = `rgba(0,0,0,0)`;
        this.pctx.lineJoin = "round";
        this.pctx.lineWidth = width;
                  
        for (var i=0; i < this.clickX.length; i++) {		
            this.pctx.beginPath();
            if (this.clickDrag[i] && i){
                this.pctx.moveTo(Math.floor(this.clickX[i-1])-0.5, Math.floor(this.clickY[i-1]) - 0.5);
            } else {
                this.pctx.moveTo(Math.floor(this.clickX[i]-1)-0.5, Math.floor(this.clickY[i]) - 0.5);
            }
            this.pctx.lineTo(Math.floor(this.clickX[i])-0.5, Math.floor(this.clickY[i])-0.5);
            this.pctx.closePath();
            this.pctx.stroke();
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

    drawSaving() {
        this.sctx.clearRect(0, 0, this.savingcanvas.width, this.savingcanvas.height);
        this.savingcanvas.width = this.polycanvas.width
        this.savingcanvas.height = this.polycanvas.height
        this.sctx.fillStyle = "#010203";
        this.sctx.fillRect(0, 0, this.savingcanvas.width, this.savingcanvas.height);
        this.sctx.drawImage(this.polycanvas, 0, 0)
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
        this.zoomLvl = 1;
        this.dragZoom = false;
        this.dragStart = null;
        this.mergeState = false;
        this.mergePoint1 = null;
        this.mergePoint2 = null;
        this.clickCallback = cbs.clickGreedCallback.bind(this)
        this.mousedownCallback = cbs.mousedownCallback.bind(this)
        this.mousemoveCallback = cbs.mousemoveCallback.bind(this)
        this.mouseupCallback = cbs.mouseupCallback.bind(this)
        this.wheelCallback = cbs.wheelCallback.bind(this)
        this._netShown = true;
    }

    get netShown() {
        return this._netShown;
    }

    set netShown(value) {
        this._netShown = value;
        if (!this._netShown) this.c.classList.add('transparent')
        else this.c.classList.remove('transparent')
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
        this.ctx.strokeStyle = "#ffff00";
        this.ctx.lineJoin = "miter";
        this.ctx.lineWidth = width;
                  
        for (var i=0; i < this.clickX.length; i++) {		
            this.ctx.beginPath();
            if (this.clickDrag[i] && i){
                this.ctx.moveTo(Math.floor(this.clickX[i-1])-0.5, Math.floor(this.clickY[i-1]) - 0.5);
            } else {
                this.ctx.moveTo(Math.floor(this.clickX[i]-1)-0.5, Math.floor(this.clickY[i]) - 0.5);
            }
            this.ctx.lineTo(Math.floor(this.clickX[i])-0.5, Math.floor(this.clickY[i])-0.5);
            this.ctx.closePath();
            this.ctx.stroke();
        }
    }

    drawBrush(width, color){
        this.sCent.draw(this.ctxc)
    }

    drawEraser(width){
        this.ctxc.strokeStyle = `rgba(0,0,0,255)`;
        this.ctxc.lineJoin = "round";
        this.ctxc.lineWidth = width;
                  
        for (var i=0; i < this.clickX.length; i++) {		
            this.ctxc.beginPath();
            if (this.clickDrag[i] && i){
                this.ctxc.moveTo(Math.floor(this.clickX[i-1])-0.5, Math.floor(this.clickY[i-1]) - 0.5);
            } else {
                this.ctxc.moveTo(Math.floor(this.clickX[i]-1)-0.5, Math.floor(this.clickY[i]) - 0.5);
            }
            this.ctxc.lineTo(Math.floor(this.clickX[i])-0.5, Math.floor(this.clickY[i])-0.5);
            this.ctxc.closePath();
            this.ctxc.stroke();
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
            this.shiftX += shiftX;
        }
        if (shiftY) {
            this.shiftY += shiftY;
        }
        if (isCenter) {
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
        this.inputAllowed = false;
        this.hover = false;
        this.undoq = null;
        this.cvReady = false;
        this.resolver = null;
        this.currentName = "";
        this.listenWorker();
        this.workerReady = new Promise((resolve, reject) => {
            this.resolver = resolve
        })
        var self = this;
        this.currentColor = null;
        this.state = 'fill';
        this.origin = new Origin();
        this.currentThicknessBrush = 10;
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
            if (!self.inputAllowed) return;
            if (this.dragZoom || this.dragStart) return;
            // 'this' will be Annotator view
            var coorX = e.pageX - e.target.offsetLeft;
            var coorY = e.pageY - e.target.offsetTop;
            let coords = this.origin.transformCoords({x: coorX, y: coorY}, this.scale, {x: this.sFront.x, y: this.sFront.y})
            // drawRect(coorX, coorY, this.ctx);
            // drawRect(coords.x, coords.y, this.origin.nctx);
            if (this.mergeState) {
                if (!this.mergePoint1) {
                    console.log('mergePoint1', coords)
                    this.mergePoint1 = coords
                    return
                }
                if (!this.mergePoint2) {
                    console.log('mergePoint2', coords)
                    this.mergePoint2 = coords
                    let message = { cmd: 'merge', point1: this.mergePoint1, point2: this.mergePoint2};
                    wasmWorker.postMessage(message)
                    this.mergePoint1 = null
                    this.mergePoint2 = null
                    return
                }
            }
            if (self.canFill()) {
                wasmWorker.postMessage({cmd: 'click', color: self.currentColor, coor: this.origin.transformCoords({x: coorX, y: coorY}, this.scale, {x: this.sFront.x, y: this.sFront.y})});
            }
        }

        function mousedownCallback (e) {
            if (!self.inputAllowed) return;
            if (this.dragZoom) {
                this.dragStart = {x: e.pageX - e.target.offsetLeft, y: e.pageY - e.target.offsetTop}
                return
            }
            if (!self.canDraw()) return;
            var mouseX = e.pageX - e.target.offsetLeft;
            var mouseY = e.pageY - e.target.offsetTop;
            let coords = this.origin.transformCoords({x: mouseX, y: mouseY}, this.scale, {x: this.sFront.x, y: this.sFront.y})
                  
            self.paint = true;
            
            this.addClick(mouseX, mouseY);
            this.origin.addClick(coords.x, coords.y);
            if (self.state === 'contour') {
                this.drawContour(1);
                this.origin.drawContour();
            } else if (self.state === 'brush' && self.currentColor) {
                this.origin.drawBrush(self.currentThicknessBrush, self.currentColor)
                this.drawBrush();
            }
        }

        function mousemoveCallback (e) {
            if (!self.inputAllowed) return;
            if (this.dragZoom && this.dragStart) {
                var mouseX = e.pageX - e.target.offsetLeft;
                var mouseY = e.pageY - e.target.offsetTop;
                const isLeft = mouseX < this.dragStart.x;
                const isTop = mouseY < this.dragStart.y;
                const dragStartPointX =  this.dragStart.x;
                const dragStartPointY = this.dragStart.y;
                const maxShiftStep = 0.5;
                const outSetX = Math.abs(dragStartPointX - mouseX);
                const outSetY = Math.abs(dragStartPointY - mouseY);
                const shiftX = outSetX * maxShiftStep / dragStartPointX;
                const shiftY = outSetY * maxShiftStep / dragStartPointY;
                if (!isTop && isLeft) {
                    this.setScale(this.scale, true,
                        -shiftX, shiftY)
                } else if (isTop && isLeft) {
                    this.setScale(this.scale, true,
                        -shiftX, -shiftY)
                } else if (isTop && !isLeft) {
                    this.setScale(this.scale, true,
                        shiftX, -shiftY)
                } else {
                    this.setScale(this.scale, true,
                        shiftX, shiftY)
                }
                this.dragStart = {x: e.pageX - e.target.offsetLeft, y: e.pageY - e.target.offsetTop}
                return
            }
            if (!self.canDraw()) return;
            var mouseX = e.pageX - e.target.offsetLeft;
            var mouseY = e.pageY - e.target.offsetTop;
            let coords = this.origin.transformCoords({x: mouseX, y: mouseY}, this.scale, {x: this.sFront.x, y: this.sFront.y})
                  
            if (self.paint) {
                this.addClick(mouseX, mouseY, true);
                this.origin.addClick(coords.x, coords.y, true);
                if (self.state === 'contour') {
                    this.drawContour(1);
                    this.origin.drawContour();
                } else if (self.state === 'brush' && self.currentColor) {
                    this.origin.drawBrush(self.currentThicknessBrush, self.currentColor)
                    this.drawBrush();
                }
            }
        }

        function mouseupCallback (e) {
            if (!self.inputAllowed) return;
            if (this.dragStart) {
                this.dragStart = null
                return
            }
            if (!self.canDraw()) return;
            self.paint = false;
            this.clearLines()
            this.origin.clearLines()
            if (self.state === 'contour' || self.state === 'brush') {
                self.undoq.addToQueue({type: 'draw', 
                    contours: this.origin.nctx.getImageData(0, 0, this.origin.netcanvas.width, this.origin.netcanvas.height),
                    segments: this.origin.pctx.getImageData(0, 0, this.origin.polycanvas.width, this.origin.polycanvas.height),
                })
            }
        }

        function wheelCallback (e) {
            if (!self.inputAllowed) return;
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
                this.zoomLvl++;
            } else {
                if (this.zoomLvl === 1) return;
                let zShiftX, zShiftY;
                if (this.shiftX !== 0) {
                    if (this.shiftX > 0) {
                        zShiftX = -this.shiftX / (this.zoomLvl - 1);
                    } else {
                        zShiftX = -this.shiftX / (this.zoomLvl - 1);
                    }
                }
                if (this.shiftY !== 0) {
                    if (this.shiftY > 0) {
                        zShiftY = -this.shiftY / (this.zoomLvl - 1);
                    } else {
                        zShiftY = -this.shiftY / (this.zoomLvl - 1);
                    }
                }
                this.setScale(this.scale - 0.1, true,
                    zShiftX, zShiftY)
                this.zoomLvl--;
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
        return this.state === 'contour' || this.state === 'brush'
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
            if (e.data.event === "newSegments") {
                this.origin.putImageData(e.data.msg)
                this.view.ctxc.clearRect(0, 0, this.view.cc.width, this.view.cc.height)
                this.view.sCent.draw(this.view.ctxc)
                this.undoq.addToQueue({type: 'fill', segments: e.data.msg, contours: this.origin.nctx.getImageData(0, 0, this.origin.netcanvas.width, this.origin.netcanvas.height)})
            }
            if (e.data.event === "newCnts") {
                this.origin.nctx.clearRect(0, 0, this.origin.netcanvas.width, this.origin.netcanvas.height)
                this.view.ctx.clearRect(0, 0, this.view.c.width, this.view.c.height)
                this.origin.nctx.putImageData(e.data.msg, 0, 0)
                this.view.sFront.draw(this.view.ctx)
                this.undoq.addToQueue({type: 'draw', 
                    contours: this.origin.nctx.getImageData(0, 0, this.origin.netcanvas.width, this.origin.netcanvas.height),
                    segments: this.origin.pctx.getImageData(0, 0, this.origin.polycanvas.width, this.origin.polycanvas.height),
                })
            }
            if (e.data.event === "saveResult") {
                this.origin.sctx.clearRect(0, 0, this.origin.savingcanvas.width, this.origin.savingcanvas.height)
                this.origin.sctx.putImageData(e.data.msg, 0, 0)
                console.log("DO SAVE!")
                this.origin.savingcanvas.toBlob((blob)=> {
                    const fd = new FormData();
                    fd.append('image', blob, this.currentName+'_colored.png');
                    this.save(fd)
                })
            }
        }
    }
    upload(f) {
        fetch("/upload", {
            method: "POST",
            body: f
        })
        .then(res => {
            return res.json()
        })
        .then(res => {
            window.tool.spinner.hide()
            if (res.success) {
                this.currentName = res.name
                this.loadNewImage(res.image+"?time="+Date.now(), res.image_net+"?time="+Date.now())
                this.inputAllowed = true;
            }
        })
        .catch(err => {
            window.tool.spinner.hide()
        })
    }
    save(data) {
        fetch("/save", {
            method: "POST",
            body: data
        })
        .then(res => {
            return res.json()
        })
        .then(res => {
            if (res.success) {
                alert("Colored map saved!")
            } else {
                alert("Colored map not saved!")
            }
        })
    }
}

$(function () {
    const annotator = new Annotator(window.innerWidth-510, window.innerHeight);
    window.addEventListener("resize", e => {
        annotator.view.resize({width:window.innerWidth-510, height: window.innerHeight})
    });

    window.addEventListener('keydown', e => {
        if (!annotator.inputAllowed) return;
        if (e.which === 16)  { // SHIFT
            annotator.view.dragZoom = true
        } else if (e.which === 17) {
            annotator.view.mergeState = true
        }
    })

    window.addEventListener('keyup', e => {
        if (!annotator.inputAllowed) return;
        if (e.which === 16)  { // SHIFT
            annotator.view.dragZoom = false
            annotator.view.dragStart = false;
        } else if (e.which === 17) { //CTRL
            annotator.view.mergeState = false
        }
    })

    window.tool.annotation.emitter.subscribe("input:list", data => {
        if (data.value) {
            annotator.currentColor = [...data.color, 255]
        } else {
            annotator.currentColor = null
        }
    })
    window.tool.sauce.emitter.subscribe("input:list", data => {
        if (data.value) {
            annotator.currentColor = [...data.color, 255]
        } else {
            annotator.currentColor = null
        }
    })
    window.tool.controls.emitter.subscribe('Custom Contour', data => {
        if (!annotator.inputAllowed) return;
        if (data.state !== 'contour') {
            window.tool.controls.changeState('contour')
            annotator.state = 'contour'
        }
    })
    window.tool.controls.emitter.subscribe('Brush', data => {
        if (!annotator.inputAllowed) return;
        if (data.state !== 'brush') {
            window.tool.controls.changeState('brush')
            annotator.state = 'brush'
        }
    })

    window.tool.controls.emitter.subscribe('Change Thickness', data => {
        annotator.currentThicknessBrush = +data.event.target.value
    })

    window.tool.controls.emitter.subscribe('Zone Marker', data => {
        if (!annotator.inputAllowed) return;
        if (data.state !== 'fill') {
            annotator.imageDataToWorker(false)
            window.tool.controls.changeState('fill')
            annotator.state = 'fill'
        }
    })
    window.tool.controls.emitter.subscribe('Undo', data => {
        if (!annotator.inputAllowed) return;
        annotator.undo()
    })
    window.tool.controls.emitter.subscribe('New file', data => {
        var promise = new Promise(resolve => {
            window.tool.slic.show(resolve)
        })
        promise.then(e => {
            window.tool.spinner.show()
            const file = data.event.currentTarget.files[0];
            var f = new FormData()
            f.append('image', file, file.name)
            f.append("size", e.size)
            f.append("compactness", e.compactness)
            f.append("iterations", e.iterations)
            annotator.upload(f)
            data.event.currentTarget.value = "";
        })
    })
    window.tool.controls.emitter.subscribe('Show/Hide Net', data => {
        annotator.view.netShown = !annotator.view.netShown
        if (annotator.view.netShown) data.event.currentTarget.classList.add('actived')
        else data.event.currentTarget.classList.remove('actived')
    })
    window.tool.controls.emitter.subscribe('Save', data => {
        if (!annotator.inputAllowed) return;
        annotator.origin.drawSaving()
        let message = { cmd: 'save', img: annotator.origin.sctx.getImageData(0, 0, annotator.origin.savingcanvas.width, annotator.origin.savingcanvas.height)};
        wasmWorker.postMessage(message)
    })
});


