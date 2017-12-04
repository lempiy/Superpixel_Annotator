package tools

import (
	"github.com/lempiy/SLIC"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	"os"
	"image/png"
	"image/color"
	"runtime"
	"fmt"
)

func WritePNG(img image.Image, file_path string) error {
	fi, err := os.Create(file_path)
	if err != nil {
		return err
	}
	return png.Encode(fi, img)
}

func RunSLIC(file *os.File, output_path string) error {

	nc := runtime.NumCPU()
	runtime.GOMAXPROCS(nc)

	superpixels := 200 // number of superpixels
	compactness := 20.0 // compactness ratio (between distance and color)
	iterations := 10 // number of slic iterations

	srcImg, _, err := image.Decode(file)
	if err != nil {
		fmt.Println(err, "Could not decode image:", file.Name())
		return err
	}

	w := srcImg.Bounds().Size().X
	h := srcImg.Bounds().Size().Y
	dst := image.NewRGBA(
		image.Rectangle{
			image.Point{X: 0, Y: 0},
			image.Point{X: w, Y: h},
		})

	superpixelsize := slic.SuperPixelSizeForCount(w, h, superpixels)

	s := slic.MakeSlic(srcImg, compactness, superpixelsize)
	s.Run(iterations)

	return WritePNG(s.DrawEdgesToImage(dst, color.RGBA{255, 255, 255, 255}, true), output_path)
}