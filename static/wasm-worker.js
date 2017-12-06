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
        case 'put':
            putSegments(e.data.img);
            break;
        case 'merge':
            mergeSegments([e.data.point1.x, e.data.point1.y],[e.data.point2.x, e.data.point2.y])
            break;
	}
}


let contours, hierarchy, dst, segments, w, h, gis;

function putSegments(imageData) {
    let img = cv.matFromArray(imageData, cv.CV_8UC4);
    img.convertTo(segments, cv.CV_8U, 1, 0);
    img.delete();
}

function drawSegment(point, clr) {
    let color = new cv.Scalar(clr[0], clr[1],
        clr[2], 255);

    for (let i = 0; i < contours.size(); ++i) {
        let pip = cv.pointPolygonTest(contours.get(i), point, false)
        if (pip === 1 && i !== gis) {
            cv.drawContours(segments, contours, i, color, -1, cv.LineTypes.LINE_8.value,  hierarchy, 100, [0,0]);
        }
    }
    segments = segments;
    postMessage({event: 'newSegments', msg: new ImageData(new Uint8ClampedArray(segments.data()), w, h), poly: true});
    color.delete();
}

function mergeSegments(point1, point2) {
    console.log('Begin merge', performance.now())
    let color = new cv.Scalar(255, 255,
        0, 255);
    let trnsp = new cv.Scalar(0, 0,
        0, 0);
    let contour1 = null;
    let ci1 = null;
    let contour2 = null;
    let ci2 = null;
    let tresh = 1;
    let max_tresh = 1;
    for (let i = 0; i < contours.size(); ++i) {
        let pip1 = cv.pointPolygonTest(contours.get(i), point1, false)
        let pip2 = cv.pointPolygonTest(contours.get(i), point2, false)
        if (pip1 === 1 && i !== gis) {
            contour1 = contours.get(i)
            ci1 = i
        }
        if (pip2 === 1 && i !== gis) {
            contour2 = contours.get(i)
            ci2 = i
        }
    }
    tmp = segments.clone();
    out = segments.clone();
    mask = cv.Mat.zeros(0, 0, cv.CV_8U);

    cnts = new cv.MatVector();
    hrar = new cv.Mat();

    let zero = new cv.Scalar(0, 0, 0, 0)
    tmp.setTo(zero, mask)
    out.setTo(zero, mask)
    cv.drawContours(tmp, contours, ci1, color, cv.LineTypes.FILLED.value, cv.LineTypes.LINE_8.value, hierarchy, 100, [0,0]);
    cv.drawContours(tmp, contours, ci2, color, cv.LineTypes.FILLED.value, cv.LineTypes.LINE_8.value, hierarchy, 100, [0,0]);

    console.log("AREA", cv.contourArea(contours.get(ci1), false), cv.contourArea(contours.get(ci2), false))
    cv.cvtColor(tmp, tmp, cv.ColorConversionCodes.COLOR_RGBA2GRAY.value, 0);
    cv.threshold(tmp, tmp, tresh, max_tresh, cv.ThresholdTypes.THRESH_BINARY.value);

    cv.findContours(tmp, cnts, hrar, cv.RetrievalModes.RETR_CCOMP.value, cv.ContourApproximationModes.CHAIN_APPROX_NONE.value, [0,0])
    tmp.setTo(zero, mask)
    // draw prev contours
    for (let i = 0; i < contours.size(); ++i) {
        if (ci1 === i || ci2 === i || i === gis) continue;
        if (cv.contourArea(contours.get(i), false) > 100) {
            cv.drawContours(out, contours, i, color, 1, 0, hierarchy, 0, [0,0]);
            //cv.drawContours(tmp, contours, i, color, 2, cv.LineTypes.LINE_8.value, hierarchy, 100, [0,0]);
        }
    }
    console.log( cv.LineTypes.LINE_8.value)
    // draw merged contour
    cv.drawContours(out, cnts, cnts.size()-1, trnsp, -1, 0, hrar, 0, [0,0]);
    cv.drawContours(out, cnts, cnts.size()-1, color, 1, 0, hrar, 0, [0,0]);
    // cv.drawContours(tmp, cnts, cnts.size()-1, trnsp, -1, cv.LineTypes.LINE_8.value, hrar, 100, [0,0]);
    // cv.drawContours(tmp, cnts, cnts.size()-1, color, 1, cv.LineTypes.LINE_8.value, hrar, 100, [0,0]);
    var imd = new ImageData(new Uint8ClampedArray(out.data()), w, h)
    postMessage({event:'newCnts', msg: imd, poly: true});
    
    tmp.delete(); mask.delete(); cnts.delete(); hrar.delete();
    getContours(imd, false)
    console.log('End merge', performance.now())
}

function getContours(imageData, initial) {
    if (initial) {
        // Clean up memory on new image
        if (contours) contours.delete(); contours = null;
        if (hierarchy) hierarchy.delete(); hierarchy = null;
        if (segments) segments.delete(); segments = null;
    }
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

    cv.findContours(img, contours, hierarchy, cv.RetrievalModes.RETR_CCOMP.value, cv.ContourApproximationModes.CHAIN_APPROX_NONE.value, [0,0])

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
