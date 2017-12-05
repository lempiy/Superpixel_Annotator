package main

import (
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
	"github.com/DragonTailSystems/AnnotationTool.v.2/handlers"
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
	e.Logger.Fatal(e.Start(":" + PORT))
}