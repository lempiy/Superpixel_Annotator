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
	"image/draw"
)

func WritePNG(img image.Image, file_path string) (*os.File, error) {
	fi, err := os.Create(file_path)
	if err != nil {
		return nil, err
	}
	err = png.Encode(fi, img)
	return fi, err
}

func RunSLIC(file_name, output_path string, size int, compactness float64, iterations int) (*os.File, error) {

	nc := runtime.NumCPU()
	runtime.GOMAXPROCS(nc)

	file, err := os.Open(file_name)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	srcImg, _, err := image.Decode(file)
	if err != nil {
		fmt.Println(err, "Could not decode image:", file.Name())
		return nil, err
	}

	w := srcImg.Bounds().Size().X
	h := srcImg.Bounds().Size().Y
	dst := image.NewRGBA(
		image.Rectangle{
			image.Point{X: 0, Y: 0},
			image.Point{X: w, Y: h},
		})

	Rect(dst, 0, 0, w-1, h-1, color.RGBA{255, 255, 0, 255})

	s := slic.MakeSlic(srcImg, compactness, size)
	s.Run(iterations)

	return WritePNG(s.DrawEdgesToImage(dst, color.RGBA{255, 255, 0, 255}, false), output_path)
}


func HLine(img draw.Image, x1, y, x2 int, col color.RGBA) {
	for ; x1 <= x2; x1++ {
		img.Set(x1, y, col)
	}
}


func VLine(img draw.Image, x, y1, y2 int, col color.RGBA) {
	for ; y1 <= y2; y1++ {
		img.Set(x, y1, col)
	}
}


func Rect(img draw.Image, x1, y1, x2, y2 int, col color.RGBA) {
	HLine(img, x1, y1, x2, col)
	HLine(img, x1, y2, x2, col)
	VLine(img, x1, y1, y2, col)
	VLine(img, x2, y1, y2, col)
}