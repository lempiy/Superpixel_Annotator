package handlers

import (
	"os"
	"io"
	"net/http"
	"github.com/labstack/echo"
	"github.com/DragonTailSystems/AnnotationTool.v.2/tools"
)

func Upload(c echo.Context) error {

	//-----------
	// Read file
	//-----------

	// Source
	file, err := c.FormFile("file")
	if err != nil {
		return err
	}
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	// Destination
	dst, err := os.Create(file.Filename)
	if err != nil {
		return err
	}
	defer dst.Close()

	// Copy
	if _, err = io.Copy(dst, src); err != nil {
		return err
	}

	tools.RunSLIC(dst, "images")

	return c.JSON(http.StatusOK,  map[string]bool{
		"success": true,
	})
}