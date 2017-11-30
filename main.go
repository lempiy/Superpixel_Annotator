package main

import (
	"github.com/lempiy/SLIC"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	"os"
	"image/png"
	"flag"
	"runtime"
	"fmt"
	"image/color"
)

func writePNG(img image.Image, filename string) {
	fi, _ := os.Create(filename)
	png.Encode(fi, img)
}

func main() {
	flag.Parse()

	nc := runtime.NumCPU()
	runtime.GOMAXPROCS(nc)

	superpixels := 200 // number of superpixels
	compactness := 20.0 // compactness ratio (between distance and color)
	iterations := 10 // number of slic iterations


	file_name := flag.Arg(0)
	file, err := os.Open(file_name)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer file.Close()

	src_img, _, err := image.Decode(file)
	if err != nil {
		fmt.Println(err, "Could not decode image:", file_name)
		return
	}

	w := src_img.Bounds().Size().X
	h := src_img.Bounds().Size().Y
	dst := image.NewRGBA(
		image.Rectangle{
			image.Point{X: 0, Y: 0},
			image.Point{X: w, Y: h},
			})

	superpixelsize := slic.SuperPixelSizeForCount(w, h, superpixels)

	s := slic.MakeSlic(src_img, compactness, superpixelsize)
	s.Run(iterations)

	writePNG(s.DrawEdgesToImage(dst, color.RGBA{255, 255, 255, 255}, true), "out.png")
}