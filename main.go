package main

import (
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
	"github.com/DragonTailSystems/AnnotationTool.v.2/handlers"
	"os/exec"
	"fmt"
	"runtime"
	"time"
)

func main() {
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	PORT := "5000"
	r := e.Router()
	handlers.Run(r)
	e.Static("/", "static")
	e.Static("/images", "images")
	go func() {
		<-time.After(time.Second)
		openbrowser("http://0.0.0.0:"+PORT)
	}()
	e.Logger.Fatal(e.Start(":" + PORT))
}

func openbrowser(url string) {
	var err error

	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = fmt.Errorf("unsupported platform")
	}
	if err != nil {
		fmt.Println(err)
	}

}
