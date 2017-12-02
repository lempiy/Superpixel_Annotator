var Module = {
    onRuntimeInitialized: function() {
        postMessage({msg: 'ready'});
    }
};
importScripts('cv-wasm.js');
self.onmessage = function (e) {
	switch (e.data.cmd) {
        case 'imageNew':
        console.log('imageNew recieved')
            getContours(e.data.img, e.data.initial);
            break;
        case 'click':
            drawSegment([e.data.coor.x, e.data.coor.y], e.data.color)
            break;
	}
}


let contours, hierarchy, dst, segments, w, h, gis;

function drawSegment(point, clr) {
    let color = new cv.Scalar(clr[0], clr[1],
        clr[2], 255);
    for (let i = 0; i < contours.size(); ++i) {
        let pip = cv.pointPolygonTest(contours.get(i), point, false)
        if (pip === 1 && i !== gis) {
            cv.drawContours(segments, contours, i, color, cv.LineTypes.FILLED.value, cv.LineTypes.LINE_8.value, hierarchy, 100, [0,0]);
        }
    }
    segments = segments;
    color.delete();
    postMessage({msg: new ImageData(new Uint8ClampedArray(segments.data()), w, h), poly: true});
}

function getContours(imageData, initial) {
    let tresh = 1;
    let max_tresh = 1;
    w = imageData.width;
    h = imageData.height;
    let img = cv.matFromArray(imageData, cv.CV_8UC4);

    dst = cv.Mat.zeros(img.cols, img.rows, cv.CV_8UC4);
    mask = cv.Mat.zeros(0, 0, cv.CV_8U);

    img.convertTo(dst, cv.CV_8U, 1, 0);
    let zero = new cv.Scalar(0, 0, 0, 0)
    dst.setTo(zero, mask)
    
    cv.cvtColor(img, img, cv.ColorConversionCodes.COLOR_RGBA2GRAY.value, 0);

    cv.threshold(img, img, tresh, max_tresh, cv.ThresholdTypes.THRESH_BINARY.value);

    contours = new cv.MatVector();
    hierarchy = new cv.Mat();

    cv.findContours(img, contours, hierarchy, cv.RetrievalModes.RETR_CCOMP.value, cv.ContourApproximationModes.CHAIN_APPROX_SIMPLE.value, [0,0])

    let gsarea = 0;

    for (let i = 0; i < contours.size(); ++i) {
        let area = cv.contourArea(contours.get(i), false)
        if (area > gsarea) {
            gis = i;
            gsarea = area;
        }
    }
    imageData = null
    if (initial) {
        segments = dst.clone()
    }
    img.delete(); mask.delete(); zero.delete(); dst.delete();
}
